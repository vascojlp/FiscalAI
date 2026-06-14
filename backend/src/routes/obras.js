const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth);

router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.*, u.username AS created_by_name,
      (SELECT COUNT(*) FROM visitas v WHERE v.obra_id = o.id) AS total_visitas
    FROM obras o
    LEFT JOIN users u ON u.id = o.created_by
    WHERE o.ativa = true
    ORDER BY o.created_at DESC
  `);
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.*, u.username AS created_by_name
    FROM obras o LEFT JOIN users u ON u.id = o.created_by
    WHERE o.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Obra não encontrada' });
  res.json(rows[0]);
}));

router.post('/', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { nome, localizacao, tipo, dono_da_obra, empreiteiro, contrato } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome da obra obrigatório' });
  const { rows } = await pool.query(
    "INSERT INTO obras (nome,localizacao,tipo,dono_da_obra,empreiteiro,contrato,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [nome, localizacao, tipo, dono_da_obra, empreiteiro, contrato, req.user.id]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { nome, localizacao, tipo, dono_da_obra, empreiteiro, contrato } = req.body;
  const { rows } = await pool.query(
    "UPDATE obras SET nome=$1,localizacao=$2,tipo=$3,dono_da_obra=$4,empreiteiro=$5,contrato=$6,updated_at=NOW() WHERE id=$7 RETURNING *",
    [nome, localizacao, tipo, dono_da_obra, empreiteiro, contrato, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Obra não encontrada' });
  res.json(rows[0]);
}));

router.delete('/:id', requireRole('admin'), wrap(async (req, res) => {
  await pool.query("UPDATE obras SET ativa=false,updated_at=NOW() WHERE id=$1", [req.params.id]);
  res.json({ message: 'Obra arquivada' });
}));

module.exports = router;
