import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function RegistroSemana() {
  const { idObra } = useParams();
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const urlFecha = searchParams.get('fecha');
  
  // CLAVE: Definimos en qué modo estamos trabajando
  const modoEdicion = Boolean(urlFecha);

  const [obra, setObra] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  
  const [fechaReferencia, setFechaReferencia] = useState(urlFecha || getHoyString());
  const [diasSemana, setDiasSemana] = useState([]);
  const [registrosExistentes, setRegistrosExistentes] = useState([]);
  const [conflictos, setConflictos] = useState({});

  useEffect(() => {
    fetchDatosBase();
  }, [idObra]);

  useEffect(() => {
    generarYPrecargarSemana(fechaReferencia);
  }, [fechaReferencia]);

  useEffect(() => {
    if (empleadosSeleccionados.length > 0 && diasSemana.length > 0) {
      fetchRegistrosParaConflictos();
    } else {
      setRegistrosExistentes([]);
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

  const generarYPrecargarSemana = async (fechaStr) => {
    const d = new Date(fechaStr + 'T12:00:00');
    const diaSemana = d.getDay(); 
    const diffAlLunes = diaSemana === 0 ? -6 : 1 - diaSemana; 
    const lunes = new Date(d);
    lunes.setDate(d.getDate() + diffAlLunes);

    const viernesAnterior = new Date(lunes);
    viernesAnterior.setDate(lunes.getDate() - 3);

    const configDias = [
      { label: 'Vie. Ant. (Solo Extras)', offset: 0, isVieAnt: true },
      { label: 'Sábado (Ant.)', offset: 1, isVieAnt: false },
      { label: 'Domingo (Ant.)', offset: 2, isVieAnt: false },
      { label: 'Lunes', offset: 3, isVieAnt: false },
      { label: 'Martes', offset: 4, isVieAnt: false },
      { label: 'Miércoles', offset: 5, isVieAnt: false },
      { label: 'Jueves', offset: 6, isVieAnt: false },
      { label: 'Viernes (Corte 17hs)', offset: 7, isVieAnt: false },
    ];

    let nuevaSemana = configDias.map(config => {
      const temp = new Date(viernesAnterior);
      temp.setDate(viernesAnterior.getDate() + config.offset);
      return {
        fecha: temp.toISOString().split('T')[0],
        nombre: config.label,
        activo: false,
        horaInicio: config.isVieAnt ? '17:00' : '08:00',
        horaFin: config.isVieAnt ? '20:00' : '17:00',
        deCorrido: false,
        esFeriado: false,
        esViernesExtra: config.isVieAnt,
        esViernesActual: config.offset === 7
      };
    });

    // SOLO PRECARGAMOS SI ESTAMOS EN MODO EDICIÓN
    if (modoEdicion) {
      const fechas = nuevaSemana.map(d => d.fecha);
      const { data: precarga } = await supabase
        .from('registro_trabajo')
        .select('*')
        .eq('obra_id', idObra)
        .in('fecha', fechas);

      if (precarga && precarga.length > 0) {
        const empsUnicos = [...new Set(precarga.map(r => r.empleado_id))];
        setEmpleadosSeleccionados(empsUnicos);

        nuevaSemana = nuevaSemana.map(dia => {
          const reg = precarga.find(r => r.fecha === dia.fecha && r.es_viernes_extra === dia.esViernesExtra);
          if (reg) {
            return { 
              ...dia, 
              activo: true, 
              horaInicio: reg.hora_inicio, 
              horaFin: reg.hora_fin, 
              deCorrido: reg.de_corrido,
              esFeriado: reg.es_feriado || false 
            };
          }
          return dia;
        });
      }
    }

    setDiasSemana(nuevaSemana);
  };

  const fetchRegistrosParaConflictos = async () => {
    const fechas = diasSemana.map(d => d.fecha);
    const { data } = await supabase
      .from('registro_trabajo')
      .select('fecha, es_viernes_extra, hora_inicio, hora_fin, empleado_id, empleados(nombre, apellido), obras(id, nombre)')
      .in('fecha', fechas)
      .in('empleado_id', empleadosSeleccionados);

    if (data) {
      setRegistrosExistentes(data);
    } else {
      setRegistrosExistentes([]);
    }
  };

  const toggleEmpleado = (empId) => {
    setEmpleadosSeleccionados(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const updateDia = (idx, campo, valor) => {
    const nuevosDias = [...diasSemana];
    if (campo === 'horaFin' && nuevosDias[idx].esViernesActual && valor > '17:00') {
      alert('Corte de semana: El viernes actual solo permite registrar horas hasta las 17:00.');
      valor = '17:00';
    }
    nuevosDias[idx][campo] = valor;
    setDiasSemana(nuevosDias);
  };

  const erroresPorDia = useMemo(() => {
    const errores = {};
    diasSemana.forEach((dia, idx) => {
      if (!dia.activo) return;
      const conflictosDia = [];

      empleadosSeleccionados.forEach(empId => {
        const emp = empleados.find(e => e.id === empId);
        if (!emp) return; 

        const regsBD = registrosExistentes.filter(r => 
          r.empleado_id === empId && 
          r.fecha === dia.fecha && 
          r.es_viernes_extra === dia.esViernesExtra
        );

        regsBD.forEach(r => {
          // ESCUDO DE LÓGICA DE NEGOCIO:
          // Si estamos en MODO EDICIÓN, ignoramos los registros de esta misma obra (porque los vamos a reemplazar).
          // Si estamos en MODO NUEVO, NO IGNORAMOS NADA, se evalúa contra TODAS las obras, incluso esta misma.
          if (modoEdicion && r.obras.id === idObra) {
            return;
          }

          if (chequearSuperposicion(dia.horaInicio, dia.horaFin, r.hora_inicio, r.hora_fin)) {
            conflictosDia.push(`${emp.nombre} ${emp.apellido} (Ya cargado: ${r.hora_inicio} a ${r.hora_fin} en "${r.obras.nombre}")`);
          }
        });
      });

      if (conflictosDia.length > 0) errores[idx] = conflictosDia;
    });
    return errores;
  }, [diasSemana, empleadosSeleccionados, registrosExistentes, empleados, idObra, modoEdicion]);

  const calculosEnVivo = useMemo(() => {
    const resumen = [];
    let costoTotalObra = 0;

    empleadosSeleccionados.forEach(empId => {
      const emp = empleados.find(e => e.id === empId);
      if (!emp) return; 

      let totalPagar = 0;
      const desgloses = { base: 0, extra: 0, sab: 0, dom: 0 };

      diasSemana.forEach((dia, idx) => {
        if (dia.activo && !erroresPorDia[idx]) {
          const { hBase, hExtra, hSab, hDom } = calcularHorasDia(dia);
          desgloses.base += hBase;
          desgloses.extra += hExtra;
          desgloses.sab += hSab;
          desgloses.dom += hDom;
          totalPagar += (hBase * emp.tarifa_base) + (hExtra * emp.tarifa_extra) + (hSab * emp.tarifa_sabado) + (hDom * emp.tarifa_domingo);
        }
      });

      costoTotalObra += totalPagar;
      resumen.push({ emp, desgloses, totalPagar });
    });

    return { resumen, costoTotalObra };
  }, [empleadosSeleccionados, diasSemana, empleados, erroresPorDia]);

  const handleGuardar = async () => {
    if (empleadosSeleccionados.length === 0) return alert('Debes seleccionar al menos un empleado.');
    
    const hayErrores = diasSemana.some((dia, idx) => dia.activo && erroresPorDia[idx]);
    if (hayErrores) return alert('Corrige los horarios superpuestos (marcados en rojo) antes de guardar.');

    const diasActivos = diasSemana.filter(d => d.activo);
    if (diasActivos.length === 0) return alert('Debes marcar al menos un día válido.');

    setIsSaving(true);

    // Si estamos editando, primero borramos el bloque viejo de esta obra en esta semana
    if (modoEdicion) {
      const fechasGrid = diasSemana.map(d => d.fecha);
      await supabase
        .from('registro_trabajo')
        .delete()
        .eq('obra_id', idObra)
        .in('empleado_id', empleadosSeleccionados)
        .in('fecha', fechasGrid)
        .eq('pagado', false); 
    }

    // Preparamos los registros nuevos (tanto para Crear como para Editar)
    const registrosInsertar = [];
    empleadosSeleccionados.forEach(empId => {
      const emp = empleados.find(e => e.id === empId);
      if (!emp) return;

      diasActivos.forEach(dia => {
        registrosInsertar.push({
          obra_id: idObra,
          empleado_id: emp.id,
          fecha: dia.fecha,
          hora_inicio: dia.horaInicio,
          hora_fin: dia.horaFin,
          de_corrido: dia.deCorrido,
          es_feriado: dia.esFeriado,
          es_viernes_extra: dia.esViernesExtra,
          tarifa_base_aplicada: emp.tarifa_base,
          tarifa_extra_aplicada: emp.tarifa_extra,
          tarifa_sabado_aplicada: emp.tarifa_sabado,
          tarifa_domingo_aplicada: emp.tarifa_domingo,
          pagado: false
        });
      });
    });

    if (registrosInsertar.length > 0) {
      const { error } = await supabase.from('registro_trabajo').insert(registrosInsertar);
      if (error) {
        alert('Error al guardar: ' + error.message);
        setIsSaving(false);
        return;
      }
    }
    
    setIsSaving(false);
    // Tras guardar, volvemos al detalle de la obra si creamos, o al historial si editamos
    if (modoEdicion) {
      navigate(`/obras/${idObra}/cargas`);
    } else {
      navigate(`/obras/${idObra}`);
    }
  };

  const empleadosFiltrados = empleados.filter(e => 
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Cargando módulo de registro...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-32">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {modoEdicion ? 'Editar Carga Semanal' : 'Registrar Nuevo Trabajo'}
          </h1>
          <p className="text-brand-violet font-semibold text-lg">{obra?.nombre}</p>
        </div>
        {modoEdicion && (
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
            Modo Edición Activado
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-gray-800 mb-4">1. Seleccionar Empleados</h2>
          <input 
            type="text" 
            placeholder="Buscar por nombre..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg mb-4 bg-gray-50 focus:ring-brand-violet"
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
                  className="w-5 h-5 text-brand-violet rounded"
                />
                <span className={`font-medium ${empleadosSeleccionados.includes(emp.id) ? 'text-brand-violet' : 'text-gray-700'}`}>
                  {emp.apellido}, {emp.nombre}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">2. Días y Horarios</h2>
              <input 
                type="date" 
                value={fechaReferencia}
                onChange={(e) => setFechaReferencia(e.target.value)}
                className="p-2 border border-brand-violet text-brand-violet font-semibold rounded-lg"
              />
            </div>

            {empleadosSeleccionados.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                Selecciona al menos un empleado para habilitar la grilla.
              </div>
            ) : (
              <div className="space-y-3">
                {diasSemana.map((dia, idx) => {
                  const tieneError = Boolean(erroresPorDia[idx]);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col p-4 rounded-lg border transition-all
                        ${tieneError ? 'bg-red-50 border-red-300' : 
                          dia.activo ? 'bg-white border-brand-violet shadow-sm' : 'bg-gray-50 border-gray-200'}
                      `}
                    >
                      <div className="flex flex-col xl:flex-row items-center gap-4">
                        <label className="flex items-center gap-3 w-full xl:w-1/3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={dia.activo}
                            onChange={(e) => updateDia(idx, 'activo', e.target.checked)}
                            className={`w-5 h-5 rounded ${tieneError ? 'text-red-500 focus:ring-red-500' : 'text-brand-violet'}`}
                          />
                          <div>
                            <p className={`font-bold capitalize ${dia.activo ? (tieneError ? 'text-red-600' : 'text-brand-violet') : 'text-gray-600'}`}>{dia.nombre}</p>
                            <p className="text-xs text-gray-400">{dia.fecha}</p>
                          </div>
                        </label>

                        <div className={`flex flex-wrap items-center gap-3 w-full xl:w-2/3 ${dia.activo ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                          <input 
                            type="time" 
                            value={dia.horaInicio} 
                            onChange={(e) => updateDia(idx, 'horaInicio', e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-violet"
                          />
                          <span className="text-gray-400">a</span>
                          <input 
                            type="time" 
                            value={dia.horaFin} 
                            onChange={(e) => updateDia(idx, 'horaFin', e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-violet"
                          />
                          
                          <div className="flex items-center gap-4 ml-auto">
                            <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-600 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={dia.deCorrido}
                                onChange={(e) => updateDia(idx, 'deCorrido', e.target.checked)}
                                className="rounded text-brand-green focus:ring-brand-green"
                              />
                              De Corrido
                            </label>

                            {dia.nombre !== 'Domingo (Ant.)' && (
                              <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-red-500 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={dia.esFeriado}
                                  onChange={(e) => updateDia(idx, 'esFeriado', e.target.checked)}
                                  className="rounded text-red-500 focus:ring-red-500"
                                />
                                Feriado
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {dia.activo && tieneError && (
                        <div className="mt-3 text-red-600 text-sm font-medium bg-red-100 p-2 rounded flex gap-2 items-start">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          <div>
                            <strong>Conflicto de Horario:</strong>
                            <ul className="list-disc pl-4 mt-1">
                              {erroresPorDia[idx].map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                          </div>
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

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 shadow-2xl z-50">
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
              className="bg-brand-violet hover:bg-purple-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : (modoEdicion ? 'Actualizar Semana' : 'Guardar Nuevo Registro')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// NUEVA CALCULO LOCAL
function calcularHorasDia(diaConfig) {
  const [hI, mI] = diaConfig.horaInicio.split(':').map(Number);
  const [hF, mF] = diaConfig.horaFin.split(':').map(Number);
  let totalHoras = (hF + mF / 60) - (hI + mI / 60);
  if (totalHoras < 0) totalHoras += 24;

  const dayOfWeek = new Date(diaConfig.fecha + 'T12:00:00').getDay();
  let hBase = 0, hExtra = 0, hSab = 0, hDom = 0;

  if (dayOfWeek === 0 || diaConfig.esFeriado) {
    hDom = totalHoras + (diaConfig.deCorrido ? 1 : 0);
  } else if (dayOfWeek === 6) {
    hSab = totalHoras + (diaConfig.deCorrido ? 1 : 0);
  } else if (diaConfig.esViernesExtra) {
    hExtra = totalHoras + (diaConfig.deCorrido ? 1 : 0);
  } else if (diaConfig.esViernesActual) {
    hBase = Math.min(totalHoras, 9);
    hExtra = diaConfig.deCorrido ? 1 : 0; 
  } else {
    hBase = Math.min(totalHoras, 9);
    hExtra = Math.max(0, totalHoras - 9) + (diaConfig.deCorrido ? 1 : 0);
  }

  return { hBase, hExtra, hSab, hDom };
}

function timeToMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function chequearSuperposicion(inicio1, fin1, inicio2, fin2) {
  let i1 = timeToMins(inicio1);
  let f1 = timeToMins(fin1);
  if (f1 <= i1) f1 += 24 * 60; 

  let i2 = timeToMins(inicio2);
  let f2 = timeToMins(fin2);
  if (f2 <= i2) f2 += 24 * 60;

  return (i1 < f2) && (f1 > i2);
}

function getHoyString() {
  const h = new Date();
  return h.toISOString().split('T')[0];
}