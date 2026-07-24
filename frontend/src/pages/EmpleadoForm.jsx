import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function EmpleadoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (isEditing) {
      cargarEmpleado();
    }
  }, [id]);

  const cargarEmpleado = async () => {
    const { data } = await supabase.from('empleados').select('*').eq('id', id).single();
    if (data) {
      setValue('nombre', data.nombre);
      setValue('apellido', data.apellido);
      setValue('telefono', data.telefono);
      setValue('observaciones', data.observaciones);
      setValue('pago_diario', data.pago_diario); 
    }
  };

  const onSubmit = async (data) => {
    // Convertimos a número para asegurar los cálculos
    const pago_diario = parseFloat(data.pago_diario);
    
    // Aplicamos tus reglas de negocio matemáticas
    const tarifa_base = pago_diario / 9;
    const tarifa_extra = tarifa_base * 1.5;
    const tarifa_sabado = tarifa_base * 1.75;
    const tarifa_domingo = tarifa_base * 2;

    // Preparamos el objeto final para Supabase
    const empleadoData = {
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      observaciones: data.observaciones,
      pago_diario: pago_diario,
      tarifa_base: tarifa_base,
      tarifa_extra: tarifa_extra,
      tarifa_sabado: tarifa_sabado,
      tarifa_domingo: tarifa_domingo, // <-- ¡COMA AÑADIDA AQUÍ!
      activo: true
    };

    let result;
    if (isEditing) {
      result = await supabase.from('empleados').update(empleadoData).eq('id', id);
    } else {
      result = await supabase.from('empleados').insert([empleadoData]);
    }

    // Si hay un error en la base de datos, te avisa en pantalla
    if (result.error) {
      console.error('Error al guardar en Supabase:', result.error.message);
      alert('Error al guardar: ' + result.error.message);
      return; // Corta la ejecución para que no te redirija si falló
    }

    navigate('/empleados');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input 
              {...register('nombre', { required: 'Requerido' })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
            />
            {errors.nombre && <span className="text-red-500 text-xs">{errors.nombre.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
            <input 
              {...register('apellido', { required: 'Requerido' })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
            />
            {errors.apellido && <span className="text-red-500 text-xs">{errors.apellido.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input 
              {...register('telefono')}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-brand-violet mb-1">Pago por Día (Jornada 9hs)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input 
                type="number" 
                step="0.01" 
                {...register('pago_diario', { required: 'Requerido', min: 1 })}
                className="w-full p-2 pl-7 border border-brand-violet rounded-lg focus:ring-brand-violet focus:border-brand-violet bg-purple-50"
              />
            </div>
            {errors.pago_diario && <span className="text-red-500 text-xs">{errors.pago_diario.message}</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (Opcional)</label>
          <textarea 
            {...register('observaciones')}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
            rows="3"
          ></textarea>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-brand-violet hover:bg-purple-700 text-brand-white px-6 py-2 rounded-lg font-medium shadow-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Empleado'}
          </button>
        </div>
      </form>
    </div>
  );
}