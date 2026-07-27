import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    // Si no hay sesión, lo redirigimos al login, pero guardamos la ruta 
    // a la que intentaba ir (por si queremos devolverlo ahí tras el login)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si está logueado, renderizamos el contenido normal (El Layout con el Sidebar)
  return children;
}