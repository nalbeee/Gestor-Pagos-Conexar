import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ObraHistorialCargas() {
  const { idObra } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState(null);
  const [semanas, setSemanas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatos();
  }, [idObra]);

  const fetchDatos = async () => {
    setLoading(true);
    const { data: dataObra } = await supabase.from('obras').select('nombre').eq('id', idObra).single();
    if (dataObra) setObra(dataObra);

    const { data: dataRegs } = await supabase
      .from('registro_trabajo')
      .select('*, empleados(nombre, apellido)')
      .eq('obra_id', idObra);
    
    if (dataRegs) {
      setSemanas(agruparPorSemanaDeNegocio(dataRegs));
    }
    setLoading(false);
  };

  // NUEVO MOTOR: Agrupa exactamente con tu lógica de 8 días
  const agruparPorSemanaDeNegocio = (registros) => {
    const grupos = {};
    
    registros.forEach(reg => {
      // Usamos la función auxiliar para saber a qué "Lunes" pertenece este registro
      const lunesStr = getLunesReferencia(reg.fecha, reg.es_viernes_extra);

      if (!grupos[lunesStr]) {
        grupos[lunesStr] = {
          lunes: lunesStr,
          empleados: new Set(),
          tienePendientes: false,
          totalCargas: 0
        };
      }
      
      grupos[lunesStr].empleados.add(`${reg.empleados.nombre} ${reg.empleados.apellido}`);
      grupos[lunesStr].totalCargas++;
      if (!reg.pagado) grupos[lunesStr].tienePendientes = true;
    });

    return Object.values(grupos).sort((a, b) => b.lunes.localeCompare(a.lunes));
  };

  if (loading) return <div className="p-8 text-center">Cargando historial de la obra...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Historial de Semanas</h1>
          <p className="text-brand-violet font-semibold text-lg">{obra?.nombre}</p>
        </div>
        <Link to={`/obras/${idObra}`} className="text-gray-500 hover:text-brand-violet font-medium flex items-center gap-2">
          &larr; Volver a la obra
        </Link>
      </div>

      <div className="grid gap-6">
        {semanas.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border text-center text-gray-500">No hay trabajo registrado en esta obra.</div>
        ) : (
          semanas.map((sem, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:shadow-md">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  Corte de Semana: Lunes {new Date(sem.lunes + 'T12:00:00').toLocaleDateString()}
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  (Incluye Vie, Sab y Dom previos). {sem.totalCargas} registros de jornada guardados.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(sem.empleados).map((emp, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border">
                      {emp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                {sem.tienePendientes ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                    Tiene pagos pendientes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Semana Cerrada (Pagada)
                  </span>
                )}
                
                <button 
                  onClick={() => navigate(`/registro-semana/${idObra}?fecha=${sem.lunes}`)}
                  className="w-full md:w-auto px-6 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-bold text-sm"
                >
                  Editar esta Semana
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// =====================================
// MAGIA MATEMÁTICA: Detectar a qué semana de carga pertenece un día
// =====================================
function getLunesReferencia(fechaStr, esViernesExtra) {
  const d = new Date(fechaStr + 'T12:00:00');
  const day = d.getDay(); // 0=Dom, 1=Lun, 5=Vie, 6=Sab
  const lunes = new Date(d);

  if (day === 5 && esViernesExtra) {
    // Es el Viernes Extra. Su bloque de semana es el Lunes que le sigue (+3 días)
    lunes.setDate(d.getDate() + 3);
  } else if (day === 6) {
    // Es Sábado. Su bloque es el Lunes que le sigue (+2 días)
    lunes.setDate(d.getDate() + 2);
  } else if (day === 0) {
    // Es Domingo. Su bloque es el Lunes que le sigue (+1 día)
    lunes.setDate(d.getDate() + 1);
  } else {
    // Es de Lunes a Viernes (Base). Pertenece a la semana actual. Retrocedemos hasta el Lunes.
    const diff = 1 - day;
    lunes.setDate(d.getDate() + diff);
  }
  
  return lunes.toISOString().split('T')[0];
}