import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [authError, setAuthError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setAuthError(null);

    // Intentamos iniciar sesión con Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setAuthError('Correo o contraseña incorrectos.');
      setIsSubmitting(false);
    } else {
      // Si el login es exitoso, Supabase actualiza el AuthContext y redirigimos
      navigate('/inicio');
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Cabecera del Login */}
        <div className="bg-brand-violet p-8 text-center flex flex-col items-center">
          <img 
            src="/logo-conexar.png" 
            alt="Logo Conexar" 
            className="w-16 h-16 object-contain mb-3 bg-white rounded-full p-2 shadow-sm"
          />
          <h2 className="text-2xl font-bold text-white">conexar</h2>
          <p className="text-purple-200 mt-1 text-sm">Gestión Operativa y Pagos</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Iniciar Sesión</h3>
          
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 text-center border border-red-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input 
                type="email"
                {...register('email', { required: 'El correo es obligatorio' })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
                placeholder="usuario@conexar.com"
              />
              {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input 
                type="password"
                {...register('password', { required: 'La contraseña es obligatoria' })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-brand-violet focus:border-brand-violet"
                placeholder="••••••••"
              />
              {errors.password && <span className="text-red-500 text-xs">{errors.password.message}</span>}
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-brand-green hover:bg-emerald-600 text-white p-3 rounded-lg font-bold shadow-md transition-colors mt-4 disabled:opacity-70"
            >
              {isSubmitting ? 'Verificando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
      <p className="text-gray-400 text-sm mt-8">© 2026 Conexar. Todos los derechos reservados.</p>
    </div>
  );
}