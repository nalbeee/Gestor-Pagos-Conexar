import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularMontoRegistro } from '../../utils/calculos';

export default function ResumenObras() {
  const [obras, setObras] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    // Solo obras en vigencia (sin fecha fin)
    const { data: obrasActivas } = await supabase.from('obras').select('*').is('fecha_fin', null).eq('activo', true);
    if (obrasActivas) setObras(obrasActivas);

    // Traemos TODOS los registros de esas obras activas para hacer matemáticas locales
    if (obrasActivas && obrasActivas.length > 0) {
      const idsObras = obrasActivas.map(o => o.id);
      const { data: regs } = await supabase.from('registro_trabajo').select('*, empleados(nombre, apellido)').in('obra_id', idsObras);
      
      if (regs) {
        const regsCalculados = regs.map(r => ({ ...r, calculos: calcularMontoRegistro(r) }));
        setRegistros(regsCalculados);
      }
    }
  };

  const obrasProcesadas = useMemo(() => {
    return obras.map(obra => {
      // Filtramos registros por obra
      let regsObra = registros.filter(r => r.obra_id === obra.id);
      
      // Aplicamos filtro de calculadora si existen las fechas
      if (fechaDesde) regsObra = regsObra.filter(r => r.fecha >= fechaDesde);
      if (fechaHasta) regsObra = regsObra.filter(r => r.fecha <= fechaHasta);

      // Calculamos total
      const totalGastado = regsObra.reduce((acc, curr) => acc + curr.calculos.total, 0);
      
      // Extraemos empleados únicos
      const empleadosUnicos = [];
      const map = new Map();
      regsObra.forEach(r => {
        if (!map.has(r.empleado_id)) {
          map.set(r.empleado_id, true);
          empleadosUnicos.push(`${r.empleados.apellido}, ${r.empleados.nombre}`);
        }
      });

      return { ...obra, totalGastado, empleadosUnicos };
    });
  }, [obras, registros, fechaDesde, fechaHasta]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Resumen General de Obras</h1>

      {/* Calculadora de Costos (Filtros) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8 flex flex-col md:flex-row gap-6 items-end bg-brand-light">
        <div>
          <label className="block text-sm font-bold text-brand-violet mb-2">Calculadora de Costos (Desde)</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="p-2 border rounded-lg w-full" />
        </div>
        <div>
          <label className="block text-sm font-bold text-brand-violet mb-2">Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="p-2 border rounded-lg w-full" />
        </div>
        <button onClick={() => {setFechaDesde(''); setFechaHasta('');}} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
          Limpiar Fechas
        </button>
      </div>

      {/* Lista de Obras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {obrasProcesadas.map(obra => (
          <div key={obra.id} className="bg-white rounded-xl shadow-md border overflow-hidden">
            <div className="bg-gray-800 p-4 text-white flex justify-between items-center">
              <h2 className="font-bold text-lg">{obra.nombre}</h2>
              <span className="bg-brand-violet px-3 py-1 rounded-full text-xs">Vigente</span>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-sm uppercase mb-1">Gasto en Empleados (Periodo seleccionado)</p>
              <p className="text-4xl font-bold text-brand-green mb-6">${obra.totalGastado.toFixed(2)}</p>
              
              <div className="border-t pt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Empleados que participaron:</p>
                <div className="flex flex-wrap gap-2">
                  {obra.empleadosUnicos.length > 0 
                    ? obra.empleadosUnicos.map((emp, i) => <span key={i} className="bg-gray-100 text-xs px-2 py-1 rounded">{emp}</span>)
                    : <span className="text-gray-400 text-xs">Sin registros en estas fechas</span>
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}