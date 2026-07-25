import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function RegistroSemana() {
  const { idObra } = useParams();
  const navigate = useNavigate();

  // Estados de carga y entidades
  const [obra, setObra] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados del Formulario (Inputs de usuario)
  const [busqueda, setBusqueda] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [fechaReferencia, setFechaReferencia] = useState(getHoyString());
  const [diasSemana, setDiasSemana] = useState([]);
  
  // Estado de Validaciones
  const [conflictos, setConflictos] = useState({}); // { '2026-08-15': 'Juan Perez' }

  // 1. Inicialización
  useEffect(() => {
    fetchDatosBase();
  }, [idObra]);

  // 2. Efecto para generar la semana al cambiar la fecha de referencia
  useEffect(() => {
    generarSemana(fechaReferencia);
  }, [fechaReferencia]);

  // 3. Efecto para buscar conflictos si cambian los empleados o la semana
  useEffect(() => {
    if (empleadosSeleccionados.length > 0 && diasSemana.length > 0) {
      verificarConflictos();
    } else {
      setConflictos({});
    }
  }, [empleadosSeleccionados, fechaReferencia]);

  const fetchDatosBase = async () => {
    setLoading(true);
    const { data: dataObra } = await supabase.from('obras').select('*').eq('id', idObra).single();
    if (dataObra) setObra(dataObra);

    const { data: dataEmp } = await supabase.from('empleados').select('*').eq('activo', true).order('apellido');
    if (dataEmp) setEmpleados(dataEmp);
    setLoading(false);
  };

  const generarSemana = (fechaStr) => {
    const d = new Date(fechaStr + 'T12:00:00'); // Forzamos mediodía para evitar saltos de zona horaria
    const diaSemana = d.getDay();
    const diff = d.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); // Ajustar para encontrar el Lunes
    const lunes = new Date(d.setDate(diff));

    const nuevaSemana = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(lunes);
      temp.setDate(lunes.getDate() + i);
      nuevaSemana.push({
        fecha: temp.toISOString().split('T')[0],
        nombre: temp.toLocaleDateString('es-ES', { weekday: 'long' }),
        activo: false,
        horaInicio: '08:00',
        horaFin: '17:00',
        deCorrido: false,
      });
    }
    setDiasSemana(nuevaSemana);
  };

  const verificarConflictos = async () => {
    const fechas = diasSemana.map(d => d.fecha);
    const { data } = await supabase
      .from('registro_trabajo')
      .select('fecha, empleado_id, empleados(nombre, apellido)')
      .in('fecha', fechas)
      .in('empleado_id', empleadosSeleccionados);

    if (data && data.length > 0) {
      const nuevosConflictos = {};
      data.forEach(reg => {
        if (!nuevosConflictos[reg.fecha]) nuevosConflictos[reg.fecha] = [];
        nuevosConflictos[reg.fecha].push(`${reg.empleados.nombre} ${reg.empleados.apellido}`);
      });
      setConflictos(nuevosConflictos);
    } else {
      setConflictos({});
    }
  };

  const toggleEmpleado = (empId) => {
    setEmpleadosSeleccionados(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const updateDia = (idx, campo, valor) => {
    const nuevosDias = [...diasSemana];
    nuevosDias[idx][campo] = valor;
    setDiasSemana(nuevosDias);
  };

  // ==========================================
  // LOGICA CORE: Cálculo de Horas y Dineros
  // ==========================================
  const calculosEnVivo = useMemo(() => {
    const resumen = [];
    let costoTotalObra = 0;

    empleadosSeleccionados.forEach(empId => {
      const emp = empleados.find(e => e.id === empId);
      let totalPagar = 0;
      const desgloses = { base: 0, extra: 0, sab: 0, dom: 0 };

      diasSemana.forEach(dia => {
        // Solo calculamos si el día está activo y NO tiene conflicto para este grupo
        if (dia.activo && !conflictos[dia.fecha]) {
          const { hBase, hExtra, hSab, hDom } = calcularHorasDia(dia);
          
          desgloses.base += hBase;
          desgloses.extra += hExtra;
          desgloses.sab += hSab;
          desgloses.dom += hDom;

          totalPagar += (hBase * emp.tarifa_base) + (hExtra * emp.tarifa_extra) + 
                        (hSab * emp.tarifa_sabado) + (hDom * emp.tarifa_domingo);
        }
      });

      costoTotalObra += totalPagar;
      resumen.push({ emp, desgloses, totalPagar });
    });

    return { resumen, costoTotalObra };
  }, [empleadosSeleccionados, diasSemana, empleados, conflictos]);

  const handleGuardar = async () => {
    if (empleadosSeleccionados.length === 0) return alert('Debes seleccionar al menos un empleado.');
    
    const diasActivosValidos = diasSemana.filter(d => d.activo && !conflictos[d.fecha]);
    if (diasActivosValidos.length === 0) return alert('Debes marcar al menos un día válido.');

    setIsSaving(true);
    const registrosInsertar = [];

    // Cruzamos la matriz: Empleados Seleccionados X Días Activos
    empleadosSeleccionados.forEach(empId => {
      const emp = empleados.find(e => e.id === empId);
      
      diasActivosValidos.forEach(dia => {
        registrosInsertar.push({
          obra_id: idObra,
          empleado_id: emp.id,
          fecha: dia.fecha,
          hora_inicio: dia.horaInicio,
          hora_fin: dia.horaFin,
          de_corrido: dia.deCorrido,
          // CONGELAMIENTO FINANCIERO CRUCIAL
          tarifa_base_aplicada: emp.tarifa_base,
          tarifa_extra_aplicada: emp.tarifa_extra,
          tarifa_sabado_aplicada: emp.tarifa_sabado,
          tarifa_domingo_aplicada: emp.tarifa_domingo,
          pagado: false
        });
      });
    });

    const { error } = await supabase.from('registro_trabajo').insert(registrosInsertar);
    
    setIsSaving(false);
    if (error) {
      alert('Error al guardar. La BD rechazó la operación: ' + error.message);
    } else {
      navigate(`/obras/${idObra}`);
    }
  };

  const empleadosFiltrados = empleados.filter(e => 
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Cargando módulo de registro...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Cargar Semana</h1>
        <p className="text-brand-violet font-semibold text-lg">{obra?.nombre}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: Selección de Empleados */}
        <div className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-gray-800 mb-4">1. Seleccionar Empleados</h2>
          <input 
            type="text" 
            placeholder="Buscar por nombre..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg mb-4 bg-gray-50 focus:ring-brand-violet focus:bg-white transition-colors"
          />
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {empleadosFiltrados.map(emp => (
              <label 
                key={emp.id} 
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all
                  ${empleadosSeleccionados.includes(emp.id) ? 'bg-purple-50 border-brand-violet' : 'border-gray-100 hover:bg-gray-50'}
                `}
              >
                <input 
                  type="checkbox" 
                  checked={empleadosSeleccionados.includes(emp.id)}
                  onChange={() => toggleEmpleado(emp.id)}
                  className="w-5 h-5 text-brand-violet rounded focus:ring-brand-violet"
                />
                <span className={`font-medium ${empleadosSeleccionados.includes(emp.id) ? 'text-brand-violet' : 'text-gray-700'}`}>
                  {emp.apellido}, {emp.nombre}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* COLUMNA CENTRAL Y DERECHA: Grilla de Días y Selector de Fecha */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">2. Días y Horarios</h2>
              <input 
                type="date" 
                value={fechaReferencia}
                onChange={(e) => setFechaReferencia(e.target.value)}
                className="p-2 border border-brand-violet text-brand-violet font-semibold rounded-lg"
                title="Selecciona cualquier día de la semana a cargar"
              />
            </div>

            {empleadosSeleccionados.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                Selecciona al menos un empleado para habilitar la grilla.
              </div>
            ) : (
              <div className="space-y-3">
                {diasSemana.map((dia, idx) => {
                  const tieneConflicto = conflictos[dia.fecha];
                  return (
                    <div 
                      key={dia.fecha} 
                      className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-lg border transition-all
                        ${tieneConflicto ? 'bg-red-50 border-red-200 opacity-75' : 
                          dia.activo ? 'bg-white border-brand-violet shadow-sm' : 'bg-gray-50 border-gray-200'}
                      `}
                    >
                      {/* Checkbox y Fecha */}
                      <label className="flex items-center gap-3 w-full md:w-1/3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          disabled={tieneConflicto}
                          checked={dia.activo && !tieneConflicto}
                          onChange={(e) => updateDia(idx, 'activo', e.target.checked)}
                          className="w-5 h-5 text-brand-violet rounded disabled:opacity-50"
                        />
                        <div>
                          <p className={`font-bold capitalize ${dia.activo && !tieneConflicto ? 'text-brand-violet' : 'text-gray-600'}`}>{dia.nombre}</p>
                          <p className="text-xs text-gray-400">{dia.fecha}</p>
                        </div>
                      </label>

                      {/* Controles de Hora (Solo si está activo y sin conflicto) */}
                      {!tieneConflicto ? (
                        <div className={`flex items-center gap-4 w-full md:w-2/3 ${dia.activo ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                          <input 
                            type="time" 
                            value={dia.horaInicio} 
                            onChange={(e) => updateDia(idx, 'horaInicio', e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm w-full"
                          />
                          <span className="text-gray-400">a</span>
                          <input 
                            type="time" 
                            value={dia.horaFin} 
                            onChange={(e) => updateDia(idx, 'horaFin', e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm w-full"
                          />
                          <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={dia.deCorrido}
                              onChange={(e) => updateDia(idx, 'deCorrido', e.target.checked)}
                              className="rounded text-brand-green focus:ring-brand-green"
                            />
                            De Corrido
                          </label>
                        </div>
                      ) : (
                        <div className="w-full md:w-2/3 text-red-500 text-sm font-medium flex items-center gap-2">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                           Conflicto: {tieneConflicto.join(', ')} ya tienen horas este día.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL FLOTANTE INFERIOR: Resumen en Vivo */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 shadow-2xl z-50 transform transition-transform">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex-1 w-full overflow-x-auto text-white">
            {empleadosSeleccionados.length === 0 ? (
              <p className="text-gray-400 text-sm">El resumen aparecerá al cargar horas.</p>
            ) : (
              <div className="flex gap-6 min-w-max">
                {calculosEnVivo.resumen.map(item => (
                  <div key={item.emp.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 min-w-[200px]">
                    <p className="font-bold text-brand-green text-sm truncate">{item.emp.nombre} {item.emp.apellido}</p>
                    <div className="text-xs text-gray-400 mt-1 grid grid-cols-2 gap-1">
                      <span>Base: {item.desgloses.base.toFixed(1)}h</span>
                      <span>Ext: {item.desgloses.extra.toFixed(1)}h</span>
                      <span>Sab: {item.desgloses.sab.toFixed(1)}h</span>
                      <span>Dom: {item.desgloses.dom.toFixed(1)}h</span>
                    </div>
                    <p className="text-white font-bold text-lg mt-2 border-t border-gray-600 pt-1">
                      ${item.totalPagar.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 bg-gray-800 p-4 rounded-xl border border-gray-700 w-full md:w-auto shrink-0">
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wider font-bold">Costo Semana</p>
              <p className="text-3xl font-bold text-white">${calculosEnVivo.costoTotalObra.toFixed(2)}</p>
            </div>
            <button 
              onClick={handleGuardar}
              disabled={isSaving || calculosEnVivo.costoTotalObra === 0}
              className="bg-brand-violet hover:bg-purple-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Confirmar y Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// FUNCIÓN AUXILIAR DE NEGOCIO (Lógica Matemática)
// ==========================================
function calcularHorasDia(diaConfig) {
  // 1. Extraer hora inicio y fin (Ej: '08:00' -> 8.0)
  const [hI, mI] = diaConfig.horaInicio.split(':').map(Number);
  const [hF, mF] = diaConfig.horaFin.split(':').map(Number);
  
  let totalHoras = (hF + mF / 60) - (hI + mI / 60);
  if (totalHoras < 0) totalHoras += 24; // Por si se trabaja de noche cruzando las 00:00

  // 2. Averiguar qué día de la semana es la fecha
  const dateObj = new Date(diaConfig.fecha + 'T12:00:00');
  const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sab

  let hBase = 0, hExtra = 0, hSab = 0, hDom = 0;

  if (dayOfWeek === 0) {
    // DOMINGO: Todo es hora domingo
    hDom = totalHoras + (diaConfig.deCorrido ? 1 : 0);
  } else if (dayOfWeek === 6) {
    // SÁBADO: Todo es hora sábado
    hSab = totalHoras + (diaConfig.deCorrido ? 1 : 0);
  } else {
    // LUNES A VIERNES: Límite de 9hs base
    hBase = Math.min(totalHoras, 9);
    hExtra = Math.max(0, totalHoras - 9) + (diaConfig.deCorrido ? 1 : 0);
  }

  return { hBase, hExtra, hSab, hDom };
}

// Función auxiliar para tener siempre un Lunes por defecto al abrir
function getHoyString() {
  const h = new Date();
  return h.toISOString().split('T')[0];
}