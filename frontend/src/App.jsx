import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Inicio from './pages/Inicio';
import Obras from './pages/Obras';
import Empleados from './pages/Empleados';
import Resumenes from './pages/Resumenes';
import EmpleadoForm from './pages/EmpleadoForm';
import EmpleadoDetalle from './pages/EmpleadoDetalle';
import ObraForm from './pages/ObraForm';
import ObraDetalle from './pages/ObraDetalle';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/empleados" element={<Empleados />} />
          <Route path="/empleados/nuevo" element={<EmpleadoForm />} />
          <Route path="/empleados/editar/:id" element={<EmpleadoForm />} />
          <Route path="/empleados/:id" element={<EmpleadoDetalle />} />
          <Route path="/resumenes" element={<Resumenes />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/obras/nueva" element={<ObraForm />} />
          <Route path="/obras/editar/:id" element={<ObraForm />} />
          <Route path="/obras/:id" element={<ObraDetalle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;