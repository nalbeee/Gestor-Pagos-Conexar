import { Link } from 'react-router-dom';

export default function Inicio() {
  const modulos = [
    { title: 'Gestión de Obras', desc: 'Controla el gasto en empleados por obra.', to: '/obras', color: 'bg-brand-violet' },
    { title: 'Empleados', desc: 'Altas, modificaciones y tarifas.', to: '/empleados', color: 'bg-brand-green' },
    { title: 'Resúmenes', desc: 'Visualiza pagos semanales y mensuales.', to: '/resumenes', color: 'bg-gray-800' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido al Gestor</h1>
      <p className="text-gray-500 mb-8">Selecciona un módulo para comenzar a operar.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modulos.map((mod, idx) => (
          <Link 
            key={idx} 
            to={mod.to}
            className="group block p-6 bg-brand-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100"
          >
            <div className={`w-12 h-12 rounded-lg ${mod.color} text-brand-white flex items-center justify-center mb-4`}>
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{mod.title}</h2>
            <p className="text-gray-500 text-sm">{mod.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}