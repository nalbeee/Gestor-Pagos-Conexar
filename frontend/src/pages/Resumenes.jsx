import { Link } from 'react-router-dom';

export default function Resumenes() {
  const tarjetas = [
    {
      titulo: 'Empleado Semanal',
      desc: 'Liquidación de pagos pendientes y realización de pagos.',
      to: '/resumenes/empleado-semanal',
      color: 'bg-brand-violet'
    },
    {
      titulo: 'Empleados Mensual',
      desc: 'Rendimiento mensual, calendarios y desglose por obra.',
      to: '/resumenes/empleado-mensual',
      color: 'bg-brand-green'
    },
    {
      titulo: 'Resumen Obras',
      desc: 'Cálculo de costos totales y gastos por rango de fechas.',
      to: '/resumenes/obras',
      color: 'bg-gray-800'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Centro de Resúmenes y Pagos</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tarjetas.map((t, idx) => (
          <Link key={idx} to={t.to} className="group block bg-brand-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all border border-gray-100 transform hover:-translate-y-1">
            <div className={`w-14 h-14 rounded-full ${t.color} text-white flex items-center justify-center mb-6 shadow-md`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{t.titulo}</h2>
            <p className="text-gray-500 text-sm">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}