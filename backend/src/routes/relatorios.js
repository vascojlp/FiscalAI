const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth);

// ── GET: Listar relatórios por obra ────────────────────────────────────────
router.get('/obra/:obra_id', wrap(async (req, res) => {
  const { obra_id } = req.params;
  const { rows } = await pool.query(
    `SELECT r.id, r.titulo, r.versao, r.status, r.created_at, r.updated_at,
            r.visita_id, v.data AS visita_data, v.numero_visita,
            u.username AS created_by_name, ub.username AS edited_by_name
     FROM relatorios r
     LEFT JOIN visitas v ON v.id = r.visita_id
     LEFT JOIN users u ON u.id = r.created_by
     LEFT JOIN users ub ON ub.id = r.edited_by
     WHERE r.obra_id = $1
     ORDER BY r.updated_at DESC`,
    [obra_id]
  );
  res.json(rows);
}));

// ── GET: Listar relatórios por visita ────────────────────────────────────────
router.get('/visita/:visita_id', wrap(async (req, res) => {
  const { visita_id } = req.params;
  const { rows } = await pool.query(
    `SELECT r.id, r.titulo, r.versao, r.status, r.created_at, r.updated_at,
            u.username AS created_by_name, ub.username AS edited_by_name
     FROM relatorios r
     LEFT JOIN users u ON u.id = r.created_by
     LEFT JOIN users ub ON ub.id = r.edited_by
     WHERE r.visita_id = $1
     ORDER BY r.versao DESC, r.updated_at DESC`,
    [visita_id]
  );
  res.json(rows);
}));

// ── GET: Obter um relatório específico ────────────────────────────────────────
router.get('/:id', wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, u.username AS created_by_name, ub.username AS edited_by_name
     FROM relatorios r
     LEFT JOIN users u ON u.id = r.created_by
     LEFT JOIN users ub ON ub.id = r.edited_by
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Relatório não encontrado' });
  res.json(rows[0]);
}));

// ── POST: Criar novo relatório ────────────────────────────────────────
router.post('/', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { visita_id, obra_id, titulo, conteudo, status, tags } = req.body;
  
  if (!visita_id || !obra_id || !titulo || !conteudo) {
    return res.status(400).json({ error: 'Campos obrigatórios: visita_id, obra_id, titulo, conteudo' });
  }

  const { rows } = await pool.query(
    `INSERT INTO relatorios (visita_id, obra_id, titulo, conteudo, status, tags, created_by, edited_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [visita_id, obra_id, titulo, conteudo, status || 'draft', tags || [], req.user.id, req.user.id]
  );

  res.status(201).json(rows[0]);
}));

// ── PUT: Atualizar relatório ────────────────────────────────────────
router.put('/:id', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { titulo, conteudo, status, tags } = req.body;
  const { id } = req.params;

  // Validar permissões (apenas criador ou admin podem editar)
  const { rows: existing } = await pool.query(
    `SELECT * FROM relatorios WHERE id = $1`,
    [id]
  );

  if (!existing[0]) {
    return res.status(404).json({ error: 'Relatório não encontrado' });
  }

  // Incrementar versão ao editar conteúdo
  const novaVersao = conteudo ? existing[0].versao + 1 : existing[0].versao;

  const { rows } = await pool.query(
    `UPDATE relatorios 
     SET titulo = COALESCE($1, titulo),
         conteudo = COALESCE($2, conteudo),
         status = COALESCE($3, status),
         tags = COALESCE($4, tags),
         versao = $5,
         edited_by = $6,
         updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [titulo, conteudo, status, tags, novaVersao, req.user.id, id]
  );

  res.json(rows[0]);
}));

// ── DELETE: Eliminar relatório ────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { id } = req.params;

  const { rows: existing } = await pool.query(
    `SELECT * FROM relatorios WHERE id = $1`,
    [id]
  );

  if (!existing[0]) {
    return res.status(404).json({ error: 'Relatório não encontrado' });
  }

  await pool.query(`DELETE FROM relatorios WHERE id = $1`, [id]);
  res.json({ message: 'Relatório eliminado com sucesso' });
}));

// ── POST: Copiar relatório ────────────────────────────────────────
router.post('/:id/copy', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { id } = req.params;
  const { nova_visita_id, novo_titulo } = req.body;

  const { rows: original } = await pool.query(
    `SELECT * FROM relatorios WHERE id = $1`,
    [id]
  );

  if (!original[0]) {
    return res.status(404).json({ error: 'Relatório não encontrado' });
  }

  // Se não especificar nova_visita_id, usar a mesma
  const visita = nova_visita_id || original[0].visita_id;
  const titulo = novo_titulo || `${original[0].titulo} (Cópia)`;

  const { rows: novoRelatorio } = await pool.query(
    `INSERT INTO relatorios (visita_id, obra_id, titulo, conteudo, status, tags, created_by, edited_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [visita, original[0].obra_id, titulo, original[0].conteudo, 'draft', original[0].tags, req.user.id, req.user.id]
  );

  res.status(201).json(novoRelatorio[0]);
}));

// ── GET: Exportar relatório como PDF/DOCX ────────────────────────────────────────
router.get('/:id/export/:format', wrap(async (req, res) => {
  const { id, format } = req.params;

  if (!['pdf', 'docx', 'txt', 'md'].includes(format)) {
    return res.status(400).json({ error: 'Formato inválido. Use: pdf, docx, txt ou md' });
  }

  const { rows } = await pool.query(
    `SELECT r.*, v.data AS visita_data, o.nome AS obra_nome
     FROM relatorios r
     LEFT JOIN visitas v ON v.id = r.visita_id
     LEFT JOIN obras o ON o.id = r.obra_id
     WHERE r.id = $1`,
    [id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: 'Relatório não encontrado' });
  }

  const relatorio = rows[0];

  if (format === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${relatorio.titulo}.txt"`);
    const content = `RELATÓRIO DE FISCALIZAÇÃO
===============================================

Título: ${relatorio.titulo}
Obra: ${relatorio.obra_nome}
Data Visita: ${relatorio.visita_data}
Versão: ${relatorio.versao}
Status: ${relatorio.status}
Data Criação: ${new Date(relatorio.created_at).toLocaleString('pt-PT')}
Data Atualização: ${new Date(relatorio.updated_at).toLocaleString('pt-PT')}

CONTEÚDO:
===============================================

${relatorio.conteudo}`;
    res.send(content);
  } else if (format === 'md') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${relatorio.titulo}.md"`);
    const content = `# ${relatorio.titulo}

**Obra:** ${relatorio.obra_nome}  
**Data Visita:** ${relatorio.visita_data}  
**Versão:** ${relatorio.versao}  
**Status:** ${relatorio.status}  
**Criado em:** ${new Date(relatorio.created_at).toLocaleString('pt-PT')}  
**Atualizado em:** ${new Date(relatorio.updated_at).toLocaleString('pt-PT')}  

---

${relatorio.conteudo}`;
    res.send(content);
  } else if (format === 'pdf' || format === 'docx') {
    // Para PDF e DOCX, retornar instrução para usar bibliotecas
    res.status(501).json({ 
      message: 'Export para PDF/DOCX requer instalação de bibliotecas adicionais',
      suggestion: 'Use formato TXT ou MD por enquanto, ou instale pdfkit/docx'
    });
  }
}));

module.exports = router;
