const express = require('express');
const cors = require('cors');
const { pool, seedAdmin } = require('./db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const obrasRoutes = require('./routes/obras');
const visitasRoutes = require('./routes/visitas');
const relatoriosRoutes = require('./routes/relatorios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/obras', obrasRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// Global error handler
app.use((err, req, res, _next) => {
  console.error('❌', err.message);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Base de dados ligada');
    await seedAdmin();
    app.listen(PORT, () => console.log(`🚀 Backend a correr na porta ${PORT}`));
  } catch (err) {
    console.error('❌ Falha ao iniciar:', err.message);
    process.exit(1);
  }
}

start();
