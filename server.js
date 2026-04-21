import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');

// ensure DB directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const app = express();
app.use(express.json({ limit: '1mb' }));

// DB
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const getStmt = db.prepare('SELECT value, updated_at FROM kv WHERE key = ?');
const setStmt = db.prepare('INSERT INTO kv(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at');

// API
app.get('/api/state', (req, res) => {
  const row = getStmt.get('state');
  if (!row) return res.json({ state: null, updatedAt: null });
  let parsed = null;
  try { parsed = JSON.parse(row.value); } catch { parsed = null; }
  res.json({ state: parsed, updatedAt: row.updated_at });
});

app.post('/api/state', (req, res) => {
  const state = req.body?.state;
  if (state === undefined) return res.status(400).json({ error: 'Missing state' });
  const now = Date.now();
  setStmt.run('state', JSON.stringify(state), now);
  res.json({ ok: true, updatedAt: now });
});

// Static site
app.use(express.static(__dirname, { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`Produktion app listening on :${PORT}`);
  console.log(`DB: ${DB_PATH}`);
});
