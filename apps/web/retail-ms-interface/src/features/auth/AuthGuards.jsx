import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export function RequireAuth() {
  const user = useAppStore(state => state.authUser);
  const location = useLocation();
  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <Outlet />;
}

export function PublicOnly({ children }) {
  const user = useAppStore(state => state.authUser);
  const location = useLocation();
  if (user) {
    const intended = location.state?.from;
    return <Navigate to={typeof intended === 'string' && intended.startsWith('/') ? intended : '/'} replace />;
  }
  return children;
}

export function RequirePermission({ permission, children }) {
  const user = useAppStore(state => state.authUser);
  if (!user?.permissions?.includes(permission)) return <Navigate to="/" replace />;
  return children;
}
