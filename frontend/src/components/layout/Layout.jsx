import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-brand-light font-sans text-gray-800 overflow-hidden">
      {/* Botón menú móvil */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-brand-violet text-brand-white rounded-md shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Fondo oscuro para móvil al abrir menú */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar Responsive */}
      <div className={`fixed inset-y-0 left-0 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
        <Sidebar closeSidebar={() => setIsSidebarOpen(false)} />
      </div>

      {/* Contenedor donde cargan las páginas */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        <div className="p-6 md:p-10 w-full max-w-7xl mx-auto pt-20 md:pt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}