import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { C } from '../constants';

const ROLES = ['admin', 'writer', 'viewer'];
const roleColor = r => ({ admin: { bg: '#EFF6FF', color: '#1D4ED8' }, writer: { bg: '#F0FDF4', color: '#166534' }, viewer: { bg: '#F8FAFC', color: '#475569' } }[r] || {});

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const { user: me } = useAuth();

  const load = () => api.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const flash = (msg, err = false) => {
    if (err) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ username: '', email: '', password: '', role: 'viewer' });
    setError('');
    setModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ username: u.username, email: u.email || '', password: '', role: u.role });
    setError('');
    setModal(true);
  };

  const save = async () => {
    if (!form.username.trim()) return setError('Username obrigatório');
    setSaving(true); setError('');
    try {
      if (editUser) {
        const updated = await api.updateUser(editUser.id, form);
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        flash('Utilizador actualizado ✓');
      } else {
        if (!form.password) return setError('Password obrigatória para novo utilizador');
        const created = await api.createUser(form);
        setUsers(prev => [...prev, created]);
        flash('Utilizador criado ✓');
      }
      setModal(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    if (u.id === me.id) return flash('Não podes desactivar a tua conta', true);
    try {
      const updated = await api.updateUser(u.id, { active: !u.active });
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x));
      flash(`Utilizador ${updated.active ? 'activado' : 'desactivado'} ✓`);
    } catch (e) { flash(e.message, true); }
  };

  const deleteUser = async (u) => {
    if (u.id === me.id) return flash('Não podes eliminar a tua conta', true);
    if (!confirm(`Eliminar utilizador "${u.username}"?`)) return;
    try {
      await api.deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      flash('Utilizador eliminado ✓');
    } catch (e) { flash(e.message, true); }
  };

  const changeMyPassword = async () => {
    if (pwForm.newPassword !== pwForm.confirm) return setError('Passwords não coincidem');
    if (pwForm.newPassword.length < 4) return setError('Mínimo 4 caracteres');
    setSaving(true); setError('');
    try {
      await api.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      flash('Password alterada com sucesso ✓');
      setPwModal(false);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = (label, key, obj, setObj, type = 'text') => (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <input type={type} value={obj[key]} onChange={e => setObj(p => ({ ...p, [key]: e.target.value }))}
        style={{ width: '100%', padding: '9px 11px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, outline: 'none' }} />
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>A carregar…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.navy }}>Gestão de Utilizadores</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{users.length} utilizador{users.length !== 1 ? 'es' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setError(''); setPwModal(true); }} style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer', color: C.muted, fontWeight: 600 }}>
            🔑 Alterar a minha password
          </button>
          <button onClick={openCreate} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Novo Utilizador
          </button>
        </div>
      </div>

      {success && <div style={{ background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 8, padding: '10px 14px', color: C.green, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{success}</div>}
      {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {['Utilizador', 'Email', 'Role', 'Estado', 'Criado em', 'Acções'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const rc = roleColor(u.role);
              return (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none', opacity: u.active ? 1 : 0.5 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{u.username}</div>
                    {u.id === me.id && <div style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>← és tu</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{u.email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: rc.bg, color: rc.color, borderRadius: 5, padding: '3px 9px', fontSize: 12, fontWeight: 700 }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: u.active ? C.greenBg : C.redBg, color: u.active ? C.green : C.red, borderRadius: 5, padding: '3px 9px', fontSize: 12, fontWeight: 700 }}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.muted }}>{new Date(u.created_at).toLocaleDateString('pt-PT')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: C.muted }}>Editar</button>
                      <button onClick={() => toggleActive(u)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: u.active ? C.orange : C.green }}>
                        {u.active ? 'Desactivar' : 'Activar'}
                      </button>
                      {u.id !== me.id && (
                        <button onClick={() => deleteUser(u)} style={{ background: 'none', border: `1px solid ${C.redBdr}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: C.red }}>Eliminar</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal utilizador */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: C.white, borderRadius: 14, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 18 }}>{editUser ? 'Editar Utilizador' : 'Novo Utilizador'}</h2>
            {error && <div style={{ background: C.redBg, color: C.red, borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {inp('Username', 'username', form, setForm)}
            {inp('Email', 'email', form, setForm, 'email')}
            {inp(editUser ? 'Nova Password (deixa em branco para não alterar)' : 'Password *', 'password', form, setForm, 'password')}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: '100%', padding: '9px 11px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13 }}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontSize: 13, cursor: 'pointer', color: C.muted }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'A guardar…' : (editUser ? 'Guardar' : 'Criar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal alterar password própria */}
      {pwModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setPwModal(false)}>
          <div style={{ background: C.white, borderRadius: 14, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 18 }}>Alterar a minha Password</h2>
            {error && <div style={{ background: C.redBg, color: C.red, borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {inp('Password Actual', 'currentPassword', pwForm, setPwForm, 'password')}
            {inp('Nova Password', 'newPassword', pwForm, setPwForm, 'password')}
            {inp('Confirmar Nova Password', 'confirm', pwForm, setPwForm, 'password')}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPwModal(false)} style={{ flex: 1, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontSize: 13, cursor: 'pointer', color: C.muted }}>Cancelar</button>
              <button onClick={changeMyPassword} disabled={saving} style={{ flex: 2, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'A alterar…' : 'Alterar Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
