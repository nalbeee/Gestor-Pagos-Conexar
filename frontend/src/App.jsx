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
import RegistroSemana from './pages/RegistroSemana';
import EmpleadoSemanal from './pages/resumenes/EmpleadoSemanal';
import ResumenObras from './pages/resumenes/ResumenObras';
import EmpleadoMensual from './pages/resumenes/EmpleadoMensual';

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
          <Route path="/resumenes/empleado-semanal" element={<EmpleadoSemanal />} />
          <Route path="/resumenes/obras" element={<ResumenObras />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/obras/nueva" element={<ObraForm />} />
          <Route path="/obras/editar/:id" element={<ObraForm />} />
          <Route path="/obras/:id" element={<ObraDetalle />} />
          <Route path="/registro-semana/:idObra" element={<RegistroSemana />} />
          <Route path="/resumenes/empleado-mensual" element={<EmpleadoMensual />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;