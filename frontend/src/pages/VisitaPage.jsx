import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { C, AREAS, CONDICOES, URGENCIAS, ESTADOS_NC, urgenciaColor, estadoColor } from '../constants';

const TABS = ['📋 Dados', '🌤️ Campo', '📷 Fotos', '⚠️ NCs', '📄 Relatório'];

function Inp({ label, value, onChange, type = 'text', opts, rows }) {
  const s = { width: '100%', padding: '9px 11px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {type === 'select'
        ? <select value={value} onChange={e => onChange(e.target.value)} style={s}>{opts.map(o => <option key={o}>{o}</option>)}</select>
        : type === 'textarea'
          ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows || 4} style={{ ...s, resize: 'vertical' }} />
          : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={s} />
      }
    </div>
  );
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:800;color:#1E3A5F;margin:20px 0 8px;padding-top:16px;border-top:1px solid #E2E8F0">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0;color:#1E293B">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function VisitaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ['admin', 'writer'].includes(user?.role);
  const fileRef = useRef();

  const [visita, setVisita] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [weatherSaved, setWeatherSaved] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Editable fields
  const [dados, setDados] = useState({ data: '', numero_visita: 1, fiscal: '', condicoes: CONDICOES[0] });
  const [campo, setCampo] = useState({ observacoes: '', condicoes: CONDICOES[0] });
  const [clima, setClima] = useState({ temp: '', humidade: '', vento: '', uv: '' });

  const load = async () => {
    try {
      const v = await api.getVisita(id);
      setVisita(v);
      setFotos(v.fotos || []);
      setNcs(v.ncs || []);
      setDados({ data: v.data?.split('T')[0] || '', numero_visita: v.numero_visita, fiscal: v.fiscal || '', condicoes: v.condicoes || CONDICOES[0] });
      setCampo({ observacoes: v.observacoes || '', condicoes: v.condicoes || CONDICOES[0] });
      setClima({
        temp: v.temp != null ? String(v.temp) : '',
        humidade: v.humidade != null ? String(v.humidade) : '',
        vento: v.vento != null ? String(v.vento) : '',
        uv: v.uv != null ? String(v.uv) : '',
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const flash = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  // ── Save Dados ─────────────────────────────────────────────────────────
  const saveDados = async ({ saveNcs = false } = {}) => {
    setSaving(true);
    try {
      await api.updateVisita(id, { ...dados, observacoes: campo.observacoes, ...clima });
      if (saveNcs && ncs.length) {
        await Promise.all(ncs.map(nc => api.updateNC(id, nc.id, nc)));
      }
      flash(saveNcs ? 'Visita e NCs guardados ✓' : 'Dados guardados ✓');
    } catch (e) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  // ── Fotos ──────────────────────────────────────────────────────────────
  const handleFiles = async (files) => {
    const remaining = 8 - fotos.length;
    const toAdd = Array.from(files).slice(0, remaining);
    if (!toAdd.length) return;
    setUploadingFoto(true);
    for (const file of toAdd) {
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async e => {
          const base64 = e.target.result.split(',')[1];
          try {
            const saved = await api.addFoto(id, {
              imagem_data: base64,
              media_type: file.type,
              area: AREAS[0],
              nota: '',
              ordem: fotos.length,
            });
            // Attach preview for display
            setFotos(prev => [...prev, { ...saved, preview: e.target.result }]);
          } catch (err) { flash(err.message, true); }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setUploadingFoto(false);
  };

  const updateFotoMeta = async (fotoId, field, value) => {
    setFotos(prev => prev.map(f => f.id === fotoId ? { ...f, [field]: value } : f));
    try { await api.updateFoto(id, fotoId, { area: fotos.find(f => f.id === fotoId)?.area, nota: fotos.find(f => f.id === fotoId)?.nota, [field]: value }); }
    catch (e) { flash(e.message, true); }
  };

  const deleteFoto = async (fotoId) => {
    setFotos(prev => prev.filter(f => f.id !== fotoId));
    try { await api.deleteFoto(id, fotoId); }
    catch (e) { flash(e.message, true); }
  };

  // ── NCs ────────────────────────────────────────────────────────────────
  const addNC = async () => {
    try {
      const nc = await api.addNC(id, { area: AREAS[0], descricao: '', urgencia: 'Média' });
      setNcs(prev => [...prev, nc]);
    } catch (e) { flash(e.message, true); }
  };

  const updateNC = async (ncId, field, value) => {
    let updatedNC;
    setNcs(prev => prev.map(n => {
      if (n.id !== ncId) return n;
      updatedNC = { ...n, [field]: value };
      return updatedNC;
    }));
    if (!updatedNC) return;
    try { await api.updateNC(id, ncId, updatedNC); }
    catch (e) { flash(e.message, true); }
  };

  const deleteNC = async (ncId) => {
    setNcs(prev => prev.filter(n => n.id !== ncId));
    try { await api.deleteNC(id, ncId); }
    catch (e) { flash(e.message, true); }
  };

  // ── Generate ───────────────────────────────────────────────────────────
  const generate = async () => {
    // Save current state first
    await api.updateVisita(id, { ...dados, observacoes: campo.observacoes });
    setGenerating(true); setError('');
    try {
      const { relatorio } = await api.generateRelatorio(id);
      setVisita(v => ({ ...v, relatorio }));
      flash('Relatório gerado com sucesso ✓');
    } catch (e) { flash(e.message, true); }
    finally { setGenerating(false); }
  };

  const getWeatherDescription = (code) => {
    const map = {
      0: 'Céu limpo',
      1: 'Parcialmente nublado',
      2: 'Nublado',
      3: 'Nuvens carregadas',
      45: 'Nevoeiro',
      48: 'Nevoeiro gelado',
      51: 'Chuvisco leve',
      53: 'Chuvisco moderado',
      55: 'Chuvisco denso',
      56: 'Chuvisco gelado leve',
      57: 'Chuvisco gelado denso',
      61: 'Chuva leve',
      63: 'Chuva moderada',
      65: 'Chuva forte',
      66: 'Chuva congelante leve',
      67: 'Chuva congelante forte',
      71: 'Neve leve',
      73: 'Neve moderada',
      75: 'Neve forte',
      77: 'Granizo',
      80: 'Aguaceiros leves',
      81: 'Aguaceiros moderados',
      82: 'Aguaceiros fortes',
      85: 'Neve leve',
      86: 'Neve forte',
      95: 'Trovoada',
      96: 'Trovoada com granizo leve',
      99: 'Trovoada com granizo forte',
    };
    return map[code] || 'Condições meteorológicas atuais';
  };

  const getBrowserCoords = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation não suportado pelo browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve(position.coords),
      error => reject(new Error(error.message || 'Não foi possível obter localização.')),
      { timeout: 15000 }
    );
  });

  const fetchIpLocation = async () => {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('Falha ao obter localização por IP.');
    return res.json();
  };

  const autoFillWeather = async () => {
    setFetchingWeather(true);
    setError('');
    try {
      let latitude;
      let longitude;
      try {
        const coords = await getBrowserCoords();
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch {
        const ipLocation = await fetchIpLocation();
        latitude = ipLocation.latitude;
        longitude = ipLocation.longitude;
      }

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m,uv_index&timezone=auto`);
      if (!weatherRes.ok) throw new Error('Falha ao obter dados meteorológicos.');
      const data = await weatherRes.json();
      const current = data.current_weather;
      const weatherTime = current.time;
      const hourly = data.hourly || {};
      const times = hourly.time || [];
      let timeIndex = times.indexOf(weatherTime);
      if (timeIndex < 0 && weatherTime) {
        const shortTime = weatherTime.slice(0, 16);
        timeIndex = times.findIndex(t => t.startsWith(shortTime));
      }
      const humidity = timeIndex >= 0 && Array.isArray(hourly.relativehumidity_2m)
        ? Math.round(hourly.relativehumidity_2m[timeIndex])
        : null;
      const uv = timeIndex >= 0 && Array.isArray(hourly.uv_index)
        ? Math.round(hourly.uv_index[timeIndex])
        : null;
      const conditions = getWeatherDescription(current.weathercode);

      const nextClima = {
        temp: String(Math.round(current.temperature)),
        humidade: humidity != null ? String(humidity) : '',
        vento: String(Math.round(current.windspeed)),
        uv: uv != null ? String(uv) : '',
      };
      const nextDados = { ...dados, condicoes: conditions };

      setClima(nextClima);
      setCampo(prev => ({ ...prev, condicoes: conditions }));
      setDados(nextDados);

      await api.updateVisita(id, { ...nextDados, observacoes: campo.observacoes, ...nextClima });
      setWeatherSaved(true);
      setTimeout(() => setWeatherSaved(false), 3000);
      flash('Clima preenchido automaticamente e guardado ✓');
    } catch (e) {
      setWeatherSaved(false);
      flash(e.message || 'Erro ao preencher o clima automaticamente.', true);
    } finally {
      setFetchingWeather(false);
    }
  };

  const generateWeatherText = async () => {
    const temperature = clima.temp !== '' ? `${clima.temp}ºC` : 'temperatura não especificada';
    const humidity = clima.humidade !== '' ? `${clima.humidade}% de humidade` : 'humidade não especificada';
    const wind = clima.vento !== '' ? `vento de ${clima.vento} km/h` : 'vento não especificado';
    const uv = clima.uv !== '' ? `índice UV ${clima.uv}` : 'índice UV não especificado';
    const conditions = campo.condicoes || 'condições meteorológicas não especificadas';
    const paragraph = `Condições meteorológicas no momento: ${conditions}, com ${temperature}, ${humidity}, ${wind} e ${uv}.`;
    const nextObservacoes = paragraph + (campo.observacoes ? '\n\n' + campo.observacoes : '');
    setCampo(prev => ({ ...prev, observacoes: nextObservacoes }));
    try {
      await api.updateVisita(id, { ...dados, observacoes: nextObservacoes, ...clima });
      flash('Descrição meteorológica gerada e guardada ✓');
    } catch (e) {
      flash(e.message, true);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>A carregar visita…</div>;
  if (!visita) return <div style={{ textAlign: 'center', color: C.red, padding: 60 }}>Visita não encontrada</div>;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        <Link to="/" style={{ color: C.navy, textDecoration: 'none', fontWeight: 600 }}>Obras</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <Link to={`/obras/${visita.obra_id}`} style={{ color: C.navy, textDecoration: 'none', fontWeight: 600 }}>{visita.obra_nome}</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>Visita n.º {visita.numero_visita}</span>
      </div>

      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em' }}>
            Visita n.º {visita.numero_visita}
            {visita.relatorio_gerado_at && (
              <span style={{ marginLeft: 10, fontSize: 11, background: C.greenBg, color: C.green, border: `1px solid ${C.greenBdr}`, borderRadius: 6, padding: '3px 8px', fontWeight: 700, verticalAlign: 'middle' }}>✓ Relatório gerado</span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            {new Date(visita.data).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {visita.fiscal && ` · 👷 ${visita.fiscal}`} · {visita.condicoes}
          </p>
        </div>
      </div>

      {/* Flash messages */}
      {success && <div style={{ background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 8, padding: '10px 14px', color: C.green, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{success}</div>}
      {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `2px solid ${C.border}`, marginBottom: 24 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 800 : 500,
            color: tab === i ? C.navy : C.muted,
            borderBottom: tab === i ? `3px solid ${C.navy}` : '3px solid transparent',
            marginBottom: -2, transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Dados ─────────────────────────────────────────────────── */}
      {tab === 0 && (
        <div style={{ maxWidth: 560 }}>
          <Inp label="Data da Visita" type="date" value={dados.data} onChange={v => setDados(p => ({ ...p, data: v }))} />
          <Inp label="N.º da Visita" type="number" value={dados.numero_visita} onChange={v => setDados(p => ({ ...p, numero_visita: v }))} />
          <Inp label="Fiscal Responsável" value={dados.fiscal} onChange={v => setDados(p => ({ ...p, fiscal: v }))} />

          <div style={{ background: C.bg, borderRadius: 10, padding: 16, marginTop: 8, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Informação da Obra</div>
            {[['Obra', visita.obra_nome], ['Localização', visita.localizacao], ['Tipo', visita.tipo], ['Dono de Obra', visita.dono_da_obra], ['Empreiteiro', visita.empreiteiro], ['Contrato', visita.contrato]]
              .filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 100, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
          </div>

          {canEdit && (
            <button onClick={saveDados} disabled={saving} style={{ marginTop: 20, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'A guardar…' : '💾 Guardar Dados'}
            </button>
          )}
        </div>
      )}

      {/* ── Tab 1: Campo ─────────────────────────────────────────────────── */}
      {tab === 1 && (
        <div style={{ maxWidth: 560 }}>
          <Inp label="Condições Climatéricas" type="select" value={campo.condicoes} onChange={v => { setCampo(p => ({ ...p, condicoes: v })); setDados(p => ({ ...p, condicoes: v })); }} opts={CONDICOES} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Inp label="Temperatura (ºC)" type="number" value={clima.temp} onChange={v => setClima(p => ({ ...p, temp: v }))} />
            <Inp label="Humidade (%)" type="number" value={clima.humidade} onChange={v => setClima(p => ({ ...p, humidade: v }))} />
            <Inp label="Vento (km/h)" type="number" value={clima.vento} onChange={v => setClima(p => ({ ...p, vento: v }))} />
            <Inp label="Índice UV" type="number" value={clima.uv} onChange={v => setClima(p => ({ ...p, uv: v }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <button onClick={autoFillWeather} disabled={fetchingWeather} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: fetchingWeather ? 'not-allowed' : 'pointer' }}>
              {fetchingWeather ? 'A obter clima…' : '🌦️ Auto preencher e guardar clima'}
            </button>
            <button onClick={generateWeatherText} style={{ background: C.slate, color: C.white, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              🌤️ Gerar descrição meteorológica
            </button>
          </div>
          {weatherSaved && <div style={{ color: C.green, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Clima guardado automaticamente ✓</div>}
          <Inp label="Observações de Campo" type="textarea" value={campo.observacoes} onChange={v => setCampo(p => ({ ...p, observacoes: v }))} rows={8} />
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Descreve o estado geral da obra, trabalhos em execução, conformidades e outros registos relevantes.
          </p>
          {canEdit && (
            <button onClick={saveDados} disabled={saving} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'A guardar…' : '💾 Guardar'}
            </button>
          )}
        </div>
      )}

      {/* ── Tab 2: Fotos ─────────────────────────────────────────────────── */}
      {tab === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: C.muted }}>
              {fotos.length}/8 fotos · As fotos são guardadas automaticamente
            </div>
            {canEdit && fotos.length < 8 && (
              <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                <button style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: uploadingFoto ? 0.6 : 1 }}>
                  {uploadingFoto ? 'A carregar…' : '+ Adicionar Fotos'}
                </button>
                <input type="file" accept="image/*" multiple disabled={uploadingFoto}
                  onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
            )}
          </div>

          {fotos.length === 0
            ? (
              <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 60, textAlign: 'center', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sem fotos registadas</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Clica em "+ Adicionar Fotos" para carregar</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {fotos.map((foto, i) => (
                  <div key={foto.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={foto.preview || api.fotoUrl(id, foto.id)}
                        alt={`Foto ${i + 1}`}
                        style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: C.white, borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>
                        Foto {i + 1}
                      </div>
                      {canEdit && (
                        <button onClick={() => deleteFoto(foto.id)} style={{
                          position: 'absolute', top: 6, right: 6, background: 'rgba(220,38,38,0.85)', color: C.white,
                          border: 'none', borderRadius: 5, width: 26, height: 26, cursor: 'pointer', fontSize: 13,
                        }}>✕</button>
                      )}
                    </div>
                    <div style={{ padding: 10 }}>
                      <select value={foto.area} onChange={e => updateFotoMeta(foto.id, 'area', e.target.value)} disabled={!canEdit}
                        style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, marginBottom: 6 }}>
                        {AREAS.map(a => <option key={a}>{a}</option>)}
                      </select>
                      <input value={foto.nota || ''} onChange={e => updateFotoMeta(foto.id, 'nota', e.target.value)} placeholder="Nota da foto…" disabled={!canEdit}
                        style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── Tab 3: NCs ───────────────────────────────────────────────────── */}
      {tab === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 14, color: C.muted }}>{ncs.length} não-conformidade{ncs.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {canEdit && (
                <button onClick={addNC} style={{ background: C.red, color: C.white, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Registar NC
                </button>
              )}
              {canEdit && (
                <button onClick={() => saveDados({ saveNcs: true })} disabled={saving} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'A guardar…' : '💾 Gravar Visita'}
                </button>
              )}
            </div>
          </div>

          {ncs.length === 0
            ? <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 48, textAlign: 'center', color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sem não-conformidades registadas</div>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ncs.map((nc, i) => {
                  const uc = urgenciaColor(nc.urgencia);
                  const ec = estadoColor(nc.estado);
                  return (
                    <div key={nc.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ background: C.redBg, color: C.red, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
                            NC-{String(i + 1).padStart(2, '0')}
                          </span>
                          <span style={{ background: uc.bg, color: uc.text, border: `1px solid ${uc.border}`, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                            {nc.urgencia}
                          </span>
                          <span style={{ background: ec.bg, color: ec.text, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                            {nc.estado}
                          </span>
                        </div>
                        {canEdit && (
                          <button onClick={() => deleteNC(nc.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Área</label>
                          <select value={nc.area} onChange={e => updateNC(nc.id, 'area', e.target.value)} disabled={!canEdit}
                            style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}>
                            {AREAS.map(a => <option key={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Urgência</label>
                          <select value={nc.urgencia} onChange={e => updateNC(nc.id, 'urgencia', e.target.value)} disabled={!canEdit}
                            style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}>
                            {URGENCIAS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Estado</label>
                          <select value={nc.estado} onChange={e => updateNC(nc.id, 'estado', e.target.value)} disabled={!canEdit}
                            style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}>
                            {ESTADOS_NC.map(e => <option key={e}>{e}</option>)}
                          </select>
                        </div>
                      </div>
                      <textarea value={nc.descricao || ''} onChange={e => updateNC(nc.id, 'descricao', e.target.value)}
                        placeholder="Descrição da não-conformidade…" rows={2} disabled={!canEdit}
                        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ── Tab 4: Relatório ─────────────────────────────────────────────── */}
      {tab === 4 && (
        <div>
          {canEdit && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Gerar Relatório com IA</div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
                O relatório é gerado com base nos dados da visita, fotos ({fotos.length}) e NCs ({ncs.length}) registados.
                Os dados actuais serão guardados antes da geração.
              </p>
              <button onClick={generate} disabled={generating} style={{
                background: generating ? C.slate : C.amber, color: C.navy, border: 'none',
                borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}>
                {generating ? '⏳ A gerar relatório…' : '✨ Gerar Relatório'}
              </button>
            </div>
          )}

          {visita.relatorio
            ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>Relatório Técnico de Fiscalização</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Gerado em {new Date(visita.relatorio_gerado_at).toLocaleString('pt-PT')}
                  </div>
                </div>
                <div
                  style={{ fontSize: 13, lineHeight: 1.7, color: C.text }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(visita.relatorio) }}
                />

                {fotos.length > 0 && (
                  <div style={{ marginTop: 28, borderTop: `2px solid ${C.border}`, paddingTop: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 14 }}>ANEXO — REGISTO FOTOGRÁFICO</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {fotos.map((f, i) => (
                        <div key={f.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                          <img src={f.preview || api.fotoUrl(id, f.id)} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                          <div style={{ padding: '7px 10px' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: C.navy }}>Foto {i + 1} — {f.area}</div>
                            {f.nota && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{f.nota}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
            : (
              <div style={{ textAlign: 'center', color: C.muted, padding: 48, background: C.card, borderRadius: 12, border: `1px dashed ${C.border}` }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhum relatório gerado ainda</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Preenche os dados e clica em "Gerar Relatório"</div>
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
