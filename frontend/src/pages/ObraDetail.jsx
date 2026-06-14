import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { C, CONDICOES } from '../constants';

export default function ObraDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ['admin', 'writer'].includes(user?.role);

  const [obra, setObra] = useState(null);
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ data: new Date().toISOString().split('T')[0], numero_visita: '1', fiscal: '', condicoes: CONDICOES[0] });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [o, v] = await Promise.all([api.getObra(id), api.getVisitas(id)]);
      setObra(o);
      setVisitas(v);
      setEditForm({ nome: o.nome, localizacao: o.localizacao, tipo: o.tipo, dono_da_obra: o.dono_da_obra, empreiteiro: o.empreiteiro, contrato: o.contrato });
      const nextNum = v.length > 0 ? Math.max(...v.map(x => x.numero_visita)) + 1 : 1;
      setForm(f => ({ ...f, numero_visita: String(nextNum) }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const createVisita = async () => {
    setSaving(true); setError('');
    try {
      const v = await api.createVisita({ obra_id: id, ...form });
      navigate(`/visitas/${v.id}`);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveObra = async () => {
    setSaving(true); setError('');
    try {
      const updated = await api.updateObra(id, editForm);
      setObra(updated);
      setEditModal(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = (label, key, obj, setObj, type = 'text') => (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <input type={type} value={obj[key] || ''} onChange={e => setObj(p => ({ ...p, [key]: e.target.value }))}
        style={{ width: '100%', padding: '9px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13 }} />
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>A carregar…</div>;
  if (!obra) return <div style={{ textAlign: 'center', color: C.red, padding: 60 }}>Obra não encontrada</div>;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        <Link to="/" style={{ color: C.navy, textDecoration: 'none', fontWeight: 600 }}>Obras</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{obra.nome}</span>
      </div>

      {/* Obra card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em' }}>{obra.nome}</h1>
            {obra.tipo && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{obra.tipo}</div>}
          </div>
          {canEdit && (
            <button onClick={() => setEditModal(true)} style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 14px', fontSize: 12, cursor: 'pointer', color: C.muted, fontWeight: 600 }}>
              ✏️ Editar
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
          {[['📍 Localização', obra.localizacao], ['🏛️ Dono de Obra', obra.dono_da_obra], ['🏗️ Empreiteiro', obra.empreiteiro], ['📄 Contrato', obra.contrato]]
            .filter(([, v]) => v).map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: C.slate, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l.split(' ').slice(1).join(' ')}</div>
                <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{v}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Visitas header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>
          Visitas <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>({visitas.length})</span>
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/relatorios/${id}`} style={{
            background: '#6f42c1', color: C.white, border: 'none', borderRadius: 8, padding: '9px 18px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block'
          }}>
            📋 Relatórios
          </Link>
          {canEdit && (
            <button onClick={() => setModal(true)} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nova Visita
            </button>
          )}
        </div>
      </div>

      {/* Visitas list */}
      {visitas.length === 0
        ? <div style={{ textAlign: 'center', color: C.muted, padding: 48, background: C.card, borderRadius: 12, border: `1px dashed ${C.border}` }}>
            Nenhuma visita registada. Clica em "+ Nova Visita".
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visitas.map(v => (
              <div key={v.id} onClick={() => navigate(`/visitas/${v.id}`)} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
              onMouseLeave={e => e.currentTarget.style.background = C.card}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ background: `${C.navy}15`, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: C.navy, fontWeight: 800 }}>V{v.numero_visita}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                      Visita n.º {v.numero_visita} — {new Date(v.data).toLocaleDateString('pt-PT')}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {v.fiscal && `👷 ${v.fiscal} · `}{v.condicoes}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {v.total_fotos > 0 && <span style={{ fontSize: 12, color: C.muted }}>📷 {v.total_fotos}</span>}
                  {v.total_ncs > 0 && <span style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>⚠️ {v.total_ncs} NC</span>}
                  {v.relatorio_gerado_at && <span style={{ fontSize: 11, background: C.greenBg, color: C.green, border: `1px solid ${C.greenBdr}`, borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>✓ Relatório</span>}
                  <span style={{ color: C.slate, fontSize: 16 }}>›</span>
                </div>
              </div>
            ))}
          </div>
      }

      {/* Modal Nova Visita */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: C.white, borderRadius: 14, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 20 }}>Nova Visita</h2>
            {error && <div style={{ background: C.redBg, color: C.red, borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {inp('Data da Visita', 'data', form, setForm, 'date')}
            {inp('N.º da Visita', 'numero_visita', form, setForm, 'number')}
            {inp('Fiscal Responsável', 'fiscal', form, setForm)}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Condições Climatéricas</label>
              <select value={form.condicoes} onChange={e => setForm(p => ({ ...p, condicoes: e.target.value }))}
                style={{ width: '100%', padding: '9px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13 }}>
                {CONDICOES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontSize: 13, cursor: 'pointer', color: C.muted }}>Cancelar</button>
              <button onClick={createVisita} disabled={saving} style={{ flex: 2, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'A criar…' : 'Criar e Abrir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Obra */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setEditModal(false)}>
          <div style={{ background: C.white, borderRadius: 14, padding: 28, width: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 20 }}>Editar Obra</h2>
            {error && <div style={{ background: C.redBg, color: C.red, borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {inp('Nome', 'nome', editForm, setEditForm)}
            {inp('Localização', 'localizacao', editForm, setEditForm)}
            {inp('Dono de Obra', 'dono_da_obra', editForm, setEditForm)}
            {inp('Empreiteiro', 'empreiteiro', editForm, setEditForm)}
            {inp('N.º Contrato', 'contrato', editForm, setEditForm)}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditModal(false)} style={{ flex: 1, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontSize: 13, cursor: 'pointer', color: C.muted }}>Cancelar</button>
              <button onClick={saveObra} disabled={saving} style={{ flex: 2, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
