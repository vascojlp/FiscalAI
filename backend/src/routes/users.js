const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth, requireRole('admin'));

router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, username, email, role, active, created_at FROM users ORDER BY created_at"
  );
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username) return res.status(400).json({ error: 'Username obrigatório' });
  const hash = await bcrypt.hash(password || 'changeme123', 10);
  const { rows } = await pool.query(
    "INSERT INTO users (username, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role, active",
    [username, email || null, hash, role || 'viewer']
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const { username, email, role, active, password } = req.body;
  const sets = [], vals = [];
  let i = 1;
  if (username)            { sets.push(`username=$${i++}`);       vals.push(username); }
  if (email !== undefined) { sets.push(`email=$${i++}`);          vals.push(email); }
  if (role)                { sets.push(`role=$${i++}`);           vals.push(role); }
  if (active !== undefined){ sets.push(`active=$${i++}`);         vals.push(active); }
  if (password)            { sets.push(`password_hash=$${i++}`);  vals.push(await bcrypt.hash(password, 10)); }
  sets.push('updated_at=NOW()');
  vals.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(',')} WHERE id=$${i} RETURNING id, username, email, role, active`,
    vals
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilizador não encontrado' });
  res.json(rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'Não podes eliminar a tua própria conta' });
  await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
  res.json({ message: 'Utilizador eliminado' });
}));

module.exports = router;
