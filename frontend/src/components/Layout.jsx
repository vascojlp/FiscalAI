import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { C } from '../constants';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <nav style={{
        background: C.navy, height: 56, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link to="/" style={{ color: C.amber, fontWeight: 900, fontSize: 22, textDecoration: 'none', letterSpacing: '-0.03em' }}>
          FiscalAI
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {user?.role === 'admin' && (
            <Link to="/admin/users" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
              👥 Utilizadores
            </Link>
          )}
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            {user?.username} · <span style={{ color: C.amber, textTransform: 'capitalize' }}>{user?.role}</span>
          </span>
          <button onClick={() => { logout(); navigate('/login'); }} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: C.white, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            Sair
          </button>
        </div>
      </nav>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
        <Outlet />
      </main>
    </div>
  );
}
