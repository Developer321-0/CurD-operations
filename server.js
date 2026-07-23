// server.js — FlyRank Internship, Backend Track, Week 2, Assignment A4
// Adds Supabase-backed authentication (sign up, log in, log out) and
// protected routes on top of the existing SQLite-backed CRUD API.

import 'dotenv/config';
import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import swaggerUi from 'swagger-ui-express';
import { supabase } from './lib/supabaseClient.js';
import { authRouter } from './routes/auth.js';
import { requireAuth } from './middleware/authGuard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiSpec = JSON.parse(readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8'));
const customCss = readFileSync(path.join(__dirname, 'swagger-theme.css'), 'utf-8');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Stage 1: auth routes --------------------------------------------------
app.use('/auth', authRouter);

// --- Stage 2: public route --------------------------------------------------
app.get('/public/info', (req, res) => {
  res.status(200).json({ message: 'Welcome stranger! This info is public.' });
});

// --- Stage 4: protected routes, now guarded by shared middleware ----------
app.get('/protected/profile', requireAuth, (req, res) => {
  const { id, email, created_at } = req.user;
  res.status(200).json({ id, email, created_at });
});

app.get('/protected/dashboard', requireAuth, (req, res) => {
  // Second protected route added purely to prove the middleware is
  // reusable -- no new auth code was written for this route.
  res.status(200).json({ message: `Welcome back, ${req.user.email}`, userId: req.user.id });
});

// --- Stage 0: create the database ----------------------------------------
// node:sqlite is built into Node (18.20+/22.5+, stable behind an
// experimental flag) — like Python's sqlite3, nothing to `npm install`.
// Opening a file that doesn't exist yet creates it.
const DB_PATH = path.join(__dirname, 'tasks.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks (title)');

const rowCount = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
if (rowCount === 0) {
  // Wrapped in a transaction: either all three seed rows land, or none do.
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  db.exec('BEGIN');
  try {
    insert.run('Buy milk', 0);
    insert.run('Write report', 0);
    insert.run('Walk the dog', 1);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function rowToTask(row) {
  return { id: row.id, title: row.title, done: Boolean(row.done) };
}

// --- Stage 5: Swagger UI --------------------------------------------------
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customCss,
    customSiteTitle: 'FlyRank Task API — Docs',
  })
);

// --- Stage 1: root and health endpoints --------------------------------

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks'],
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Stage 1: read endpoints (now backed by SQL SELECTs) ----------------

app.get('/tasks', (req, res) => {
  const { done, search, sort } = req.query;
  let sql = 'SELECT * FROM tasks';
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('title LIKE ?');
    params.push(`%${search}%`);
  }
  if (done !== undefined) {
    clauses.push('done = ?');
    params.push(done === 'true' ? 1 : 0);
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  if (sort === 'title') sql += ' ORDER BY title';

  const rows = db.prepare(sql).all(...params);
  res.status(200).json(rows.map(rowToTask));
});

app.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
  const done = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE done = 1').get().n;
  res.status(200).json({ total, done, open: total - done });
});

app.post('/reset', (req, res) => {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM tasks');
    const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
    insert.run('Buy milk', 0);
    insert.run('Write report', 0);
    insert.run('Walk the dog', 1);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  const rows = db.prepare('SELECT * FROM tasks').all();
  res.status(200).json(rows.map(rowToTask));
});

app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(200).json(rowToTask(row));
});

// --- Stage 3: create -----------------------------------------------------

app.post('/tasks', (req, res) => {
  const { title } = req.body ?? {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required and must not be empty' });
  }
  const result = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)').run(title, 0);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(rowToTask(row));
});

// --- Stage 4: update & delete --------------------------------------------

app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body ?? {};
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({ error: 'title must not be empty' });
  }
  if (done !== undefined && typeof done !== 'boolean') {
    return res.status(400).json({ error: 'done must be a boolean' });
  }
  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'provide title and/or done to update' });
  }

  const newTitle = title !== undefined ? title : existing.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : existing.done;
  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, id);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(200).json(rowToTask(row));
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).end();
});

app.listen(PORT, async () => {
  // Stage 0 checkpoint: an actual network round-trip to Supabase's auth
  // health endpoint, not just "did the client object construct" (a bad
  // URL/key still constructs a client without throwing, so that alone
  // proves nothing).
  try {
   const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/health`, {
  headers: { apikey: process.env.SUPABASE_KEY },
});
    if (!res.ok) throw new Error(`Supabase responded with ${res.status}`);
    console.log(`Server running and connected to Supabase (http://localhost:${PORT})`);
  } catch (err) {
    console.error(`Server running on http://localhost:${PORT}, but could NOT reach Supabase:`, err.message);
    console.error('Check SUPABASE_URL and SUPABASE_KEY in your .env file.');
  }
});
