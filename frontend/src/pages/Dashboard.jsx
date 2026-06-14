import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { C, TIPOS_OBRA } from '../constants';

const field = (label, value, onChange, type = 'text', opts) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
    {type === 'select'
      ? <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13 }}>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      : <input type={type} value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '9px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13 }} />
    }
  </div>
);

export default function Dashboard() {
  const [obras, setObras] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: '', localizacao: '', tipo: TIPOS_OBRA[0], dono_da_obra: '', empreiteiro: '', contrato: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = ['admin', 'writer'].includes(user?.role);

  const load = () => api.getObras().then(setObras).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const createObra = async () => {
    if (!form.nome.trim()) return setError('Nome da obra obrigatório');
    setSaving(true); setError('');
    try {
      const obra = await api.createObra(form);
      setModal(false);
      setForm({ nome: '', localizacao: '', tipo: TIPOS_OBRA[0], dono_da_obra: '', empreiteiro: '', contrato: '' });
      navigate(`/obras/${obra.id}`);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const filtered = obras.filter(o =>
    o.nome.toLowerCase().includes(search.toLowerCase()) ||
    (o.localizacao || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>A carregar obras…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em' }}>Obras</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{obras.length} obra{obras.length !== 1 ? 's' : ''} activa{obras.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal(true)} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Nova Obra
          </button>
        )}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Pesquisar obras…"
        style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, marginBottom: 20, outline: 'none' }} />

      {/* Grid */}
      {filtered.length === 0
        ? <div style={{ textAlign: 'center', color: C.muted, padding: 60, background: C.card, borderRadius: 12, border: `1px dashed ${C.border}` }}>
            {obras.length === 0 ? 'Nenhuma obra criada. Clica em "+ Nova Obra" para começar.' : 'Nenhum resultado para a pesquisa.'}
          </div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(o => (
              <div key={o.id} onClick={() => navigate(`/obras/${o.id}`)} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20,
                cursor: 'pointer', transition: 'box-shadow 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, lineHeight: 1.3 }}>{o.nome}</div>
                  <span style={{ background: `${C.navy}15`, color: C.navy, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {o.total_visitas} visita{o.total_visitas !== '1' ? 's' : ''}
                  </span>
                </div>
                {o.localizacao && <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>📍 {o.localizacao}</div>}
                {o.tipo && <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>{o.tipo}</div>}
                {o.empreiteiro && <div style={{ fontSize: 11, color: C.slate }}>🏗️ {o.empreiteiro}</div>}
                <div style={{ marginTop: 12, fontSize: 11, color: C.slate, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                  Criada por {o.created_by_name} · {new Date(o.created_at).toLocaleDateString('pt-PT')}
                </div>
              </div>
            ))}
          </div>
      }

      {/* Modal Nova Obra */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: C.white, borderRadius: 14, padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 20 }}>Nova Obra</h2>
            {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 7, padding: '9px 12px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {field('Nome da Obra *', form.nome, v => setForm(p => ({ ...p, nome: v })))}
            {field('Localização', form.localizacao, v => setForm(p => ({ ...p, localizacao: v })))}
            {field('Tipo de Obra', form.tipo, v => setForm(p => ({ ...p, tipo: v })), 'select', TIPOS_OBRA)}
            {field('Dono de Obra', form.dono_da_obra, v => setForm(p => ({ ...p, dono_da_obra: v })))}
            {field('Empreiteiro', form.empreiteiro, v => setForm(p => ({ ...p, empreiteiro: v })))}
            {field('N.º Contrato', form.contrato, v => setForm(p => ({ ...p, contrato: v })))}
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontSize: 14, cursor: 'pointer', color: C.muted }}>Cancelar</button>
              <button onClick={createObra} disabled={saving} style={{ flex: 2, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'A criar…' : 'Criar Obra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
