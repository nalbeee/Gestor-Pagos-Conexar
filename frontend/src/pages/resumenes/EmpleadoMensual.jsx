import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularMontoRegistro } from '../../utils/calculos';

export default function EmpleadoMensual() {
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  
  const [registros, setRegistros] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [selectedMes, setSelectedMes] = useState('');

  // 1. Cargar lista de empleados
  useEffect(() => {
    supabase.from('empleados').select('id, nombre, apellido').eq('activo', true).order('apellido')
      .then(({ data }) => setEmpleados(data || []));
  }, []);

  // 2. Al elegir empleado, traer TODO su historial y buscar qué meses trabajó
  useEffect(() => {
    if (selectedEmpId) {
      fetchHistorial();
    } else {
      setRegistros([]);
      setMesesDisponibles([]);
      setSelectedMes('');
    }
  }, [selectedEmpId]);

  const fetchHistorial = async () => {
    const { data } = await supabase
      .from('registro_trabajo')
      .select('*, obras(nombre)')
      .eq('empleado_id', selectedEmpId)
      .order('fecha', { ascending: true });

    if (data) {
      const procesados = data.map(reg => ({ ...reg, calculos: calcularMontoRegistro(reg) }));
      setRegistros(procesados);

      // Extraer los meses únicos en formato 'YYYY-MM'
      const mesesUnicos = [...new Set(procesados.map(r => r.fecha.substring(0, 7)))].sort().reverse();
      setMesesDisponibles(mesesUnicos);
      
      if (mesesUnicos.length > 0) {
        setSelectedMes(mesesUnicos[0]); // Autoseleccionar el más reciente
      } else {
        setSelectedMes('');
      }
    }
  };

  // 3. Filtrar los registros solo para el mes seleccionado
  const registrosDelMes = useMemo(() => {
    if (!selectedMes) return [];
    return registros.filter(r => r.fecha.startsWith(selectedMes));
  }, [registros, selectedMes]);

  // 4. Calcular el desglose de ganancias agrupado por Obra
  const desglosePorObra = useMemo(() => {
    const resumen = {};
    registrosDelMes.forEach(reg => {
      const nombreObra = reg.obras.nombre;
      if (!resumen[nombreObra]) {
        resumen[nombreObra] = { base: 0, extra: 0, sab: 0, dom: 0, total: 0 };
      }
      resumen[nombreObra].base += reg.calculos.montoBase;
      resumen[nombreObra].extra += reg.calculos.montoExtra;
      resumen[nombreObra].sab += reg.calculos.montoSab;
      resumen[nombreObra].dom += reg.calculos.montoDom;
      resumen[nombreObra].total += reg.calculos.total;
    });
    return Object.entries(resumen).map(([nombre, montos]) => ({ nombre, ...montos }));
  }, [registrosDelMes]);

  const granTotalMes = desglosePorObra.reduce((acc, curr) => acc + curr.total, 0);

  // 5. Utilidades para dibujar el Calendario Real
  const infoCalendario = useMemo(() => {
    if (!selectedMes) return null;
    const [anioStr, mesStr] = selectedMes.split('-');
    const anio = parseInt(anioStr, 10);
    const mesIndex = parseInt(mesStr, 10) - 1; // 0 = Enero

    const diasEnMes = new Date(anio, mesIndex + 1, 0).getDate();
    const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1);
    
    // Para alinear el día 1 con su día de la semana (L, M, X...)
    const primerDiaSemana = new Date(anio, mesIndex, 1).getDay(); // 0 = Dom, 1 = Lun
    const offsetBlancos = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    const nombreMes = new Date(anio, mesIndex, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    return { 
      diasArray, 
      offsetBlancos,
      nombreMes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1) 
    };
  }, [selectedMes]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Rendimiento Mensual de Empleados</h1>

      {/* Selectores */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8 flex flex-col md:flex-row gap-6 bg-brand-light">
        <div className="w-full md:w-1/2">
          <label className="block text-sm font-bold text-brand-violet mb-2">1. Seleccionar Empleado</label>
          <select 
            value={selectedEmpId} 
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-brand-violet bg-white"
          >
            <option value="">-- Elige un empleado --</option>
            {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.apellido}, {emp.nombre}</option>)}
          </select>
        </div>
        
        <div className="w-full md:w-1/2">
          <label className="block text-sm font-bold text-brand-violet mb-2">2. Seleccionar Mes de Trabajo</label>
          <select 
            value={selectedMes} 
            onChange={(e) => setSelectedMes(e.target.value)}
            disabled={mesesDisponibles.length === 0}
            className="w-full p-3 border rounded-lg focus:ring-brand-violet bg-white disabled:bg-gray-100"
          >
            {mesesDisponibles.length === 0 && <option value="">Sin registros</option>}
            {mesesDisponibles.map(mes => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tablero de Resultados */}
      {selectedMes && infoCalendario && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Calendario */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-bold text-gray-800 mb-4 capitalize">{infoCalendario.nombreMes}</h3>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 mb-2">{d}</div>
              ))}
              
              {/* Espacios vacíos para alinear el calendario */}
              {Array.from({ length: infoCalendario.offsetBlancos }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}

              {infoCalendario.diasArray.map(dia => {
                const fechaStr = `${selectedMes}-${String(dia).padStart(2, '0')}`;
                const trabajoDelDia = registrosDelMes.find(r => r.fecha === fechaStr);
                
                return (
                  <div 
                    key={dia} 
                    className={`aspect-square flex items-center justify-center rounded text-sm transition-colors
                      ${trabajoDelDia ? 'bg-brand-violet text-white font-bold cursor-help shadow-sm' : 'bg-gray-50 text-gray-500'}
                    `}
                    title={trabajoDelDia ? `Obra: ${trabajoDelDia.obras.nombre}` : 'Día libre'}
                  >
                    {dia}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 text-xs text-gray-500 flex items-center gap-2">
              <div className="w-3 h-3 bg-brand-violet rounded-sm"></div> Días marcados indican trabajo registrado
            </div>
          </div>

          {/* Columna Derecha: Tabla de Desglose y Total */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border overflow-x-auto flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Desglose de Ganancias por Obra</h3>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3">Obra</th>
                    <th className="p-3">Base</th>
                    <th className="p-3">Extra</th>
                    <th className="p-3">Sábado</th>
                    <th className="p-3">Dom/Fer</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {desglosePorObra.map((obra, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-brand-violet">{obra.nombre}</td>
                      <td className="p-3 text-gray-600">${obra.base.toFixed(2)}</td>
                      <td className="p-3 text-gray-600">${obra.extra.toFixed(2)}</td>
                      <td className="p-3 text-gray-600">${obra.sab.toFixed(2)}</td>
                      <td className="p-3 text-gray-600">${obra.dom.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-gray-800">${obra.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cuadro de Total */}
            <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider font-bold">Ganancia Total del Mes</p>
                <p className="text-xs text-gray-500 mt-1">Suma de todas las obras en {infoCalendario.nombreMes}</p>
              </div>
              <span className="text-5xl font-bold text-brand-green">${granTotalMes.toFixed(2)}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}