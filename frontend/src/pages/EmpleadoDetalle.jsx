import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function EmpleadoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchEmpleadoYRegistros();
  }, [id]);

  const fetchEmpleadoYRegistros = async () => {
    // 1. Cargar datos del empleado
    const { data: empData } = await supabase.from('empleados').select('*').eq('id', id).single();
    if (empData) setEmpleado(empData);

    // 2. Cargar registros reales de trabajo de este empleado desde la base de datos
    const { data: regData } = await supabase
      .from('registro_trabajo')
      .select('fecha, obras(nombre)')
      .eq('empleado_id', id);

    if (regData) setRegistros(regData);
  };

  const handleBorrar = async () => {
    // Soft Delete: Pasamos activo a false en lugar de borrar el registro
    await supabase.from('empleados').update({ activo: false }).eq('id', id);
    setIsDeleteModalOpen(false);
    navigate('/empleados');
  };

  if (!empleado) return <div className="p-8 text-center">Cargando detalle...</div>;

  // Calculamos los nombres e información de los meses dinámicamente
  const infoMesActual = getInfoMes(0);
  const infoMesAnterior = getInfoMes(-1);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cabecera y Botones */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">{empleado.nombre} {empleado.apellido}</h1>
          <p className="text-lg text-gray-500 mt-1 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            {empleado.telefono || 'Sin teléfono registrado'}
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
            to={`/empleados/editar/${empleado.id}`}
            className="px-4 py-2 bg-brand-violet text-brand-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow-sm"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Datos Financieros Principales */}
      <div className="mb-10">
        <div className="bg-brand-violet text-brand-white p-6 rounded-xl shadow-md mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium opacity-90">Pago por Día (Jornada de 9hs)</h2>
            <span className="text-4xl font-bold">${Number(empleado.pago_diario || 0).toFixed(2)}</span>
          </div>
          <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>

        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Desglose calculado por hora</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TarjetaFinanciera titulo="Hora Base" monto={empleado.tarifa_base} bg="bg-white" />
          <TarjetaFinanciera titulo="Hora Extra (x1.5)" monto={empleado.tarifa_extra} bg="bg-brand-light" />
          <TarjetaFinanciera titulo="Sábados (x1.75)" monto={empleado.tarifa_sabado} bg="bg-purple-50" />
          <TarjetaFinanciera titulo="Dom/Feriado (x2)" monto={empleado.tarifa_domingo} bg="bg-green-50" />
        </div>
      </div>

      {/* Calendarios Dinámicos Reales */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Registro de Obras Trabajadas</h2>
      
      {/* CAMBIO: Mes anterior a la izquierda, Mes actual a la derecha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CalendarioMes 
          titulo={`Mes Anterior (${infoMesAnterior.nombreMes})`} 
          infoMes={infoMesAnterior}
          registros={registros}
        />
        <CalendarioMes 
          titulo={`Mes Actual (${infoMesActual.nombreMes})`} 
          infoMes={infoMesActual}
          registros={registros}
        />
      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleBorrar}
        title="¿Borrar empleado?"
        message={`Estás a punto de borrar a ${empleado.nombre}. Este empleado no aparecerá en las listas, pero su historial financiero se mantendrá intacto en las obras pasadas.`}
      />
    </div>
  );
}

// Subcomponente para reutilizar las tarjetas de dinero
function TarjetaFinanciera({ titulo, monto, bg }) {
  return (
    <div className={`${bg} p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center`}>
      <span className="text-xs font-medium text-gray-500 mb-1">{titulo}</span>
      <span className="text-xl font-bold text-gray-800">${Number(monto || 0).toFixed(2)}</span>
    </div>
  );
}

// Función auxiliar para obtener el mes, año y días correspondientes
function getInfoMes(offsetMeses = 0) {
  const fecha = new Date();
  fecha.setDate(1); // Evitamos desbordes entre meses de distinta cantidad de días
  fecha.setMonth(fecha.getMonth() + offsetMeses);

  const nombreMes = fecha.toLocaleString('es-ES', { month: 'long' });
  const nombreCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  const anio = fecha.getFullYear();
  const mesNumero = fecha.getMonth(); // 0 a 11

  // Cantidad exacta de días que tiene este mes
  const diasEnMes = new Date(anio, mesNumero + 1, 0).getDate();
  
  // CAMBIO: Calculamos el espacio en blanco necesario para que el día 1 caiga en su lugar correcto
  const primerDiaSemana = fecha.getDay(); // 0 = Dom, 1 = Lun, 6 = Sab
  const offsetBlancos = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  return {
    nombreMes: nombreCapitalizado,
    diasEnMes,
    mesNumero,
    anio,
    offsetBlancos // Agregamos esta propiedad al retorno
  };
}

// Subcomponente de Calendario que lee la información real de Supabase
function CalendarioMes({ titulo, infoMes, registros }) {
  const dias = Array.from({ length: infoMes.diasEnMes }, (_, i) => i + 1);
  // CAMBIO: Creamos un arreglo con los espacios en blanco
  const blancos = Array.from({ length: infoMes.offsetBlancos }, (_, i) => i);

  return (
    <div className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-brand-violet mb-4">{titulo}</h3>
      <div className="grid grid-cols-7 gap-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-400">{d}</div>
        ))}
        
        {/* CAMBIO: Imprimimos los cuadros invisibles antes de los días */}
        {blancos.map(b => (
          <div key={`blank-${b}`} className="aspect-square"></div>
        ))}

        {dias.map(dia => {
          // Formateamos la fecha en 'YYYY-MM-DD' para comparar con los registros de la base de datos
          const mesStr = String(infoMes.mesNumero + 1).padStart(2, '0');
          const diaStr = String(dia).padStart(2, '0');
          const fechaStr = `${infoMes.anio}-${mesStr}-${diaStr}`;

          // Buscamos si hay un registro de trabajo en esta fecha específica
          const registroDelDia = registros.find(r => r.fecha === fechaStr);
          const trabajoEnDia = Boolean(registroDelDia);
          const nombreObra = registroDelDia?.obras?.nombre || 'Obra asignada';

          return (
            <div 
              key={dia} 
              className={`aspect-square flex items-center justify-center rounded text-sm transition-colors
                ${trabajoEnDia ? 'bg-brand-violet text-white font-bold cursor-help shadow-sm' : 'bg-gray-50 text-gray-600'}
              `}
              title={trabajoEnDia ? `Trabajó en: ${nombreObra}` : 'Sin registro'}
            >
              {dia}
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
        <div className="w-3 h-3 bg-brand-violet rounded-sm"></div> Días con registro en obra
      </div>
    </div>
  );
}