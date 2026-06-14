import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import '../css/RelatoriosPage.css';

export default function RelatoriosPage() {
  const { obraId } = useParams();
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    status: 'draft',
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadRelatorios = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getRelatoriosPorObra(obraId);
      setRelatorios(data || []);
      setError('');
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [obraId]);

  useEffect(() => {
    loadRelatorios();
  }, [loadRelatorios]);

  const handleAddRelatorio = async () => {
    try {
      if (!formData.titulo || !formData.conteudo) {
        setError('Preencha título e conteúdo');
        return;
      }

      if (editingId) {
        await api.updateRelatorio(editingId, formData);
      } else {
        await api.createRelatorio({
          obra_id: obraId,
          visita_id: formData.visita_id || null,
          ...formData,
        });
      }

      setFormData({ titulo: '', conteudo: '', status: 'draft' });
      setEditingId(null);
      setShowForm(false);
      setError('');
      await loadRelatorios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRelatorio = async (id) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este relatório?')) return;
    try {
      await api.deleteRelatorio(id);
      setError('');
      await loadRelatorios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditRelatorio = (rel) => {
    setFormData({
      titulo: rel.titulo,
      conteudo: rel.conteudo,
      status: rel.status,
      visita_id: rel.visita_id,
    });
    setEditingId(rel.id);
    setShowForm(true);
  };

  const handleCopyRelatorio = async (id) => {
    try {
      const novoTitulo = prompt('Título da cópia:');
      if (!novoTitulo) return;
      await api.copyRelatorio(id, { novo_titulo: novoTitulo });
      setError('');
      await loadRelatorios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportRelatorio = (id, format) => {
    const url = api.exportRelatorio(id, format);
    window.location.href = url;
  };

  const filteredRelatorios = relatorios.filter(rel => {
    const matchStatus = filterStatus === 'all' || rel.status === filterStatus;
    const matchSearch =
      rel.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rel.visita_data && rel.visita_data.includes(searchTerm));
    return matchStatus && matchSearch;
  });

  return (
    <div className="relatorios-page">
      <div className="relatorios-header">
        <h2>📋 Gestão de Relatórios</h2>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (!showForm) setEditingId(null);
        }}>
          {showForm ? '✕ Cancelar' : '➕ Novo Relatório'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="relatorios-form">
          <h3>{editingId ? '✏️ Editar' : '🆕 Novo'} Relatório</h3>
          <input
            type="text"
            placeholder="Título do relatório"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            className="form-input"
          />
          <textarea
            placeholder="Conteúdo do relatório (markdown suportado)"
            value={formData.conteudo}
            onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
            className="form-textarea"
            rows="15"
          />
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="form-select"
          >
            <option value="draft">Rascunho</option>
            <option value="review">Em Revisão</option>
            <option value="approved">Aprovado</option>
            <option value="archived">Arquivado</option>
          </select>
          <div className="form-buttons">
            <button className="btn-primary" onClick={handleAddRelatorio}>
              {editingId ? '💾 Guardar Alterações' : '💾 Criar Relatório'}
            </button>
            <button className="btn-secondary" onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setFormData({ titulo: '', conteudo: '', status: 'draft' });
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="relatorios-filters">
        <input
          type="text"
          placeholder="🔍 Pesquisar por título ou data..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-input"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">Todos os Status</option>
          <option value="draft">Rascunho</option>
          <option value="review">Em Revisão</option>
          <option value="approved">Aprovado</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>

      {loading ? (
        <p className="loading">Carregando relatórios...</p>
      ) : filteredRelatorios.length === 0 ? (
        <p className="empty-state">Nenhum relatório encontrado</p>
      ) : (
        <div className="relatorios-list">
          {filteredRelatorios.map(rel => (
            <div key={rel.id} className={`relatorio-card status-${rel.status}`}>
              <div className="relatorio-header-card">
                <div>
                  <h3>{rel.titulo}</h3>
                  <p className="relatorio-meta">
                    <span className="status-badge">{rel.status}</span>
                    <span className="version">v{rel.versao}</span>
                    {rel.visita_data && <span className="date">📅 {rel.visita_data}</span>}
                  </p>
                  <p className="relatorio-info">
                    Criado por: <strong>{rel.created_by_name || 'Desconhecido'}</strong>
                    {rel.edited_by_name && ` | Editado por: ${rel.edited_by_name}`}
                  </p>
                  <p className="relatorio-timestamps">
                    Criado: {new Date(rel.created_at).toLocaleString('pt-PT')} |
                    Atualizado: {new Date(rel.updated_at).toLocaleString('pt-PT')}
                  </p>
                </div>
              </div>

              <div className="relatorio-preview">
                {rel.conteudo.substring(0, 200)}
                {rel.conteudo.length > 200 ? '...' : ''}
              </div>

              <div className="relatorio-actions">
                <button
                  className="btn-small btn-edit"
                  onClick={() => handleEditRelatorio(rel)}
                  title="Editar"
                >
                  ✏️ Editar
                </button>
                <button
                  className="btn-small btn-copy"
                  onClick={() => handleCopyRelatorio(rel.id)}
                  title="Duplicar"
                >
                  📋 Copiar
                </button>
                <div className="export-buttons">
                  <button
                    className="btn-small btn-export"
                    onClick={() => handleExportRelatorio(rel.id, 'txt')}
                    title="Exportar como TXT"
                  >
                    📄 TXT
                  </button>
                  <button
                    className="btn-small btn-export"
                    onClick={() => handleExportRelatorio(rel.id, 'md')}
                    title="Exportar como Markdown"
                  >
                    📝 MD
                  </button>
                </div>
                <button
                  className="btn-small btn-delete"
                  onClick={() => handleDeleteRelatorio(rel.id)}
                  title="Eliminar"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
