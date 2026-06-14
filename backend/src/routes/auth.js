const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Utilizador e password obrigatórios' });

  const { rows } = await pool.query(
    "SELECT * FROM users WHERE username = $1 AND active = true", [username]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, username, email, role FROM users WHERE id = $1", [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilizador não encontrado' });
  res.json(rows[0]);
}));

router.put('/password', requireAuth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ error: 'Nova password deve ter pelo menos 4 caracteres' });

  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
  if (!(await bcrypt.compare(currentPassword, rows[0].password_hash)))
    return res.status(400).json({ error: 'Password actual incorrecta' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2", [hash, req.user.id]);
  res.json({ message: 'Password alterada com sucesso' });
}));

module.exports = router;
