import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { C } from '../constants';

const inp = {
  width: '100%', padding: '10px 12px',
  border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, outline: 'none',
};

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async () => {
    if (!form.username || !form.password) return setError('Preenche todos os campos');
    setLoading(true); setError('');
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 40, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: C.navy, letterSpacing: '-0.03em' }}>FiscalAI</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Relatórios de obra inteligentes</div>
        </div>

        {error && (
          <div style={{ background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilizador</label>
          <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={inp} placeholder="admin" autoFocus />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
          <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={inp} placeholder="••••••" />
        </div>

        <button onClick={submit} disabled={loading} style={{
          width: '100%', background: loading ? C.slate : C.navy, color: C.white,
          border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          {loading ? 'A entrar…' : 'Entrar'}
        </button>

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: C.muted }}>
          Acesso por defeito: <strong>admin / admin</strong>
        </p>
      </div>
    </div>
  );
}
