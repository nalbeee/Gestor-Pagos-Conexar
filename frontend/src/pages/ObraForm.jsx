import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ObraForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (isEditing) {
      cargarObra();
    }
  }, [id]);

  const cargarObra = async () => {
    const { data } = await supabase.from('obras').select('*').eq('id', id).single();
    if (data) {
      setValue('nombre', data.nombre);
      setValue('ubicacion', data.ubicacion);
      setValue('fecha_inicio', data.fecha_inicio);
    }
  };

  const onSubmit = async (data) => {
    const obraData = {
      nombre: data.nombre,
      ubicacion: data.ubicacion,
      fecha_inicio: data.fecha_inicio,
      activo: true
    };

    let result;
    if (isEditing) {
      result = await supabase.from('obras').update(obraData).eq('id', id);
    } else {
      result = await supabase.from('obras').insert([obraData]);
    }

    if (result.error) {
      alert('Error al guardar: ' + result.error.message);
      return;
    }

    navigate('/obras');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Editar Obra' : 'Nueva Obra'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Obra</label>
          <input 
            {...register('nombre', { required: 'El nombre es obligatorio' })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
          />
          {errors.nombre && <span className="text-red-500 text-xs">{errors.nombre.message}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación (Localidad)</label>
            <input 
              {...register('ubicacion', { required: 'La ubicación es obligatoria' })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
            />
            {errors.ubicacion && <span className="text-red-500 text-xs">{errors.ubicacion.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
            <input 
              type="date"
              {...register('fecha_inicio', { required: 'La fecha de inicio es obligatoria' })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
            />
            {errors.fecha_inicio && <span className="text-red-500 text-xs">{errors.fecha_inicio.message}</span>}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-brand-violet hover:bg-purple-700 text-brand-white px-6 py-2 rounded-lg font-medium shadow-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Obra'}
          </button>
        </div>
      </form>
    </div>
  );
}