const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./secret.db');

// Jadval yaratamiz (agar yo‘q bo‘lsa)
db.run(`
CREATE TABLE IF NOT EXISTS secrets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_id TEXT,
  message TEXT,
  secret_key TEXT UNIQUE
)
`);

module.exports = db;
