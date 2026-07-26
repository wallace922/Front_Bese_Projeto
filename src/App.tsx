
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cadastro from './pages/Cadastro';
import Busca from './pages/Busca';
import PFNRDashboard from './pages/PFNRDashboard';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas — exigem autenticação */}
          <Route path="/"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/cadastro" element={<PrivateRoute><Cadastro /></PrivateRoute>} />
          <Route path="/busca"    element={<PrivateRoute><Busca /></PrivateRoute>} />
          <Route path="/pfnr"     element={<PrivateRoute><PFNRDashboard /></PrivateRoute>} />

          {/* Rota exclusiva de ADMIN */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

          {/* Fallback: redireciona para login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
