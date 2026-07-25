import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ui/ConfirmModal';
import { calcularMontoRegistro } from '../utils/calculos';

export default function ObraDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [obra, setObra] = useState(null);
  const [gastoTotal, setGastoTotal] = useState(0);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempFechaFin, setTempFechaFin] = useState('');

  useEffect(() => {
    fetchObraYGastos();
  }, [id]);

  const fetchObraYGastos = async () => {
    // 1. Traer datos de la obra
    const { data: obraData } = await supabase.from('obras').select('*').eq('id', id).single();
    if (obraData) setObra(obraData);

    // 2. Traer todos los registros de trabajo de esta obra
    const { data: registrosData } = await supabase
      .from('registro_trabajo')
      .select('*')
      .eq('obra_id', id);

    // 3. Procesar matemáticamente los registros y sumar el total
    if (registrosData && registrosData.length > 0) {
      const gastoCalculado = registrosData.reduce((acumulador, registro) => {
        const calculo = calcularMontoRegistro(registro);
        return acumulador + calculo.total;
      }, 0);
      
      setGastoTotal(gastoCalculado); 
    } else {
      setGastoTotal(0);
    }
  };

  const handleBorrar = async () => {
    await supabase.from('obras').update({ activo: false }).eq('id', id);
    setIsDeleteModalOpen(false);
    navigate('/obras');
  };

  const handleGuardarFechaFin = async () => {
    if (!tempFechaFin) return;
    await supabase.from('obras').update({ fecha_fin: tempFechaFin }).eq('id', id);
    setObra({ ...obra, fecha_fin: tempFechaFin });
    setShowEndDatePicker(false);
  };

  const handleEliminarFechaFin = async () => {
    await supabase.from('obras').update({ fecha_fin: null }).eq('id', id);
    setObra({ ...obra, fecha_fin: null });
  };

  if (!obra) return <div className="p-8 text-center">Cargando detalle...</div>;

  return (
    <div className="max-w-5xl mx-auto flex flex-col min-h-[80vh]">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">{obra.nombre}</h1>
          <p className="text-lg text-gray-500 mt-1 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {obra.ubicacion}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
          >
            Borrar
          </button>
          <button className="px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm">
            Historial de Cambios
          </button>
          <Link 
            to={`/obras/editar/${obra.id}`}
            className="px-4 py-2 bg-brand-violet text-brand-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow-sm"
          >
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-auto">
        
        <div className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="mb-4">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Fecha de Inicio</span>
            <p className="text-xl font-semibold text-gray-800">{new Date(obra.fecha_inicio).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Estado / Fecha Fin</span>
            <p className="text-xl font-semibold text-gray-800">
              {obra.fecha_fin ? new Date(obra.fecha_fin).toLocaleDateString() : <span className="text-brand-green">En Vigencia</span>}
            </p>
          </div>
        </div>

        <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
               <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.311c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.311c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
             </svg>
          </div>
          <span className="text-sm font-medium text-gray-300 mb-1 z-10">Monto total gastado en empleados hasta el momento</span>
          <span className="text-5xl font-bold text-brand-green z-10">$ {gastoTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        
        <Link 
          to={`/registro-semana/${obra.id}`} 
          className="bg-brand-violet hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-transform transform hover:-translate-y-1 w-full md:w-auto text-center"
        >
          Registrar Trabajo de la Semana
        </Link>

        <div className="w-full md:w-auto flex justify-end">
          {!obra.fecha_fin ? (
            showEndDatePicker ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <input 
                  type="date" 
                  value={tempFechaFin}
                  onChange={(e) => setTempFechaFin(e.target.value)}
                  className="p-2 border border-brand-violet rounded-lg focus:ring-brand-violet"
                />
                <button onClick={handleGuardarFechaFin} className="bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600">Guardar</button>
                <button onClick={() => setShowEndDatePicker(false)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-200">Cancelar</button>
              </div>
            ) : (
              <button 
                onClick={() => setShowEndDatePicker(true)}
                className="bg-gray-100 text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors w-full md:w-auto"
              >
                Fijar Fecha Fin
              </button>
            )
          ) : (
            <button 
              onClick={handleEliminarFechaFin}
              className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors w-full md:w-auto"
            >
              Eliminar Fecha Fin
            </button>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleBorrar}
        title="¿Borrar Obra?"
        message={`Estás a punto de borrar "${obra.nombre}". La obra dejará de aparecer en la vigencia, pero todo su historial de gastos permanecerá intacto.`}
      />
    </div>
  );
}