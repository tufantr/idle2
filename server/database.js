const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'fantasy-idle.db'), { verbose: console.log });

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    game_state TEXT,
    last_saved INTEGER DEFAULT 0
  );
`);

module.exports = db;
