import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** Bloqueia acesso a rotas exclusivas de ADMIN. Redireciona USER para o Dashboard. */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
