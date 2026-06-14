import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ObraDetail from './pages/ObraDetail';
import VisitaPage from './pages/VisitaPage';
import RelatoriosPage from './pages/RelatoriosPage';
import AdminUsers from './pages/AdminUsers';

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 14, color: '#64748B' }}>
      A carregar…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="obras/:id" element={<ObraDetail />} />
            <Route path="visitas/:id" element={<VisitaPage />} />
            <Route path="relatorios/:obraId" element={<RelatoriosPage />} />
            <Route path="admin/users" element={<Guard roles={['admin']}><AdminUsers /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
