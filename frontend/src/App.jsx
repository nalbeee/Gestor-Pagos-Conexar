import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Inicio from './pages/Inicio';

// --- Módulo de Empleados ---
import Empleados from './pages/Empleados';
import EmpleadoForm from './pages/EmpleadoForm';
import EmpleadoDetalle from './pages/EmpleadoDetalle';

// --- Módulo de Obras y Registro ---
import Obras from './pages/Obras';
import ObraForm from './pages/ObraForm';
import ObraDetalle from './pages/ObraDetalle';
import RegistroSemana from './pages/RegistroSemana';
import ObraHistorialCargas from './pages/ObraHistorialCargas';

// --- Módulo de Resúmenes ---
import Resumenes from './pages/Resumenes';
import EmpleadoSemanal from './pages/resumenes/EmpleadoSemanal';
import ResumenObras from './pages/resumenes/ResumenObras';
import EmpleadoMensual from './pages/resumenes/EmpleadoMensual';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* RUTA PÚBLICA (No requiere sesión) */}
          <Route path="/login" element={<Login />} />

          {/* RUTAS PRIVADAS (Bloqueadas por ProtectedRoute) */}
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Redirección inicial */}
            <Route path="/" element={<Navigate to="/inicio" replace />} />
            <Route path="/inicio" element={<Inicio />} />
            
            {/* Rutas de Empleados */}
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/empleados/nuevo" element={<EmpleadoForm />} />
            <Route path="/empleados/editar/:id" element={<EmpleadoForm />} />
            <Route path="/empleados/:id" element={<EmpleadoDetalle />} />

            {/* Rutas de Obras */}
            <Route path="/obras" element={<Obras />} />
            <Route path="/obras/nueva" element={<ObraForm />} />
            <Route path="/obras/editar/:id" element={<ObraForm />} />
            <Route path="/obras/:id" element={<ObraDetalle />} />
            <Route path="/obras/:idObra/cargas" element={<ObraHistorialCargas />} />

            {/* Ruta de Registro Semanal */}
            <Route path="/registro-semana/:idObra" element={<RegistroSemana />} />

            {/* Rutas de Resúmenes */}
            <Route path="/resumenes" element={<Resumenes />} />
            <Route path="/resumenes/empleado-semanal" element={<EmpleadoSemanal />} />
            <Route path="/resumenes/obras" element={<ResumenObras />} />
            <Route path="/resumenes/empleado-mensual" element={<EmpleadoMensual />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;