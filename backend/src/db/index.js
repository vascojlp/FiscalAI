const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedAdmin() {
  const { rows } = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  if (rows.length === 0) {
    const hash = await bcrypt.hash('admin', 10);
    await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@fiscalai.pt', $1, 'admin')",
      [hash]
    );
    console.log('✅ Utilizador admin criado (admin / admin)');
  }
}

module.exports = { pool, seedAdmin };
