import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchObras();
  }, [page]);

  const fetchObras = async () => {
    setLoading(true);
    const from = (page - 1) * 10;
    const to = from + 9;
    
    const { data, error } = await supabase
      .from('obras')
      .select('id, nombre, ubicacion, fecha_inicio')
      .eq('activo', true)
      .range(from, to)
      .order('fecha_inicio', { ascending: false });

    if (!error && data) {
      setObras(data);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-brand-violet">Obras</h1>
        <Link 
          to="/obras/nueva"
          className="bg-brand-green hover:bg-emerald-600 text-brand-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Nueva Obra
        </Link>
      </div>

      <div className="bg-brand-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando obras...</div>
        ) : obras.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay obras registradas.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {obras.map((obra) => (
              <li key={obra.id}>
                <Link to={`/obras/${obra.id}`} className="block hover:bg-brand-light transition-colors p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-800">{obra.nombre}</p>
                      <p className="text-sm text-gray-500">{obra.ubicacion}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-brand-violet font-medium disabled:text-gray-300">Anterior</button>
        <span className="text-gray-500">Página {page}</span>
        <button onClick={() => setPage(p => p + 1)} className="text-brand-violet font-medium">Siguiente</button>
      </div>
    </div>
  );
}