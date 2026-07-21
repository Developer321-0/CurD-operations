// server.js — FlyRank Internship, Backend Track, Week 2, Assignment A1
// A small CRUD API for a to-do list.

import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiSpec = JSON.parse(readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8'));
const customCss = readFileSync(path.join(__dirname, 'swagger-theme.css'), 'utf-8');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

// --- Stage 2: read endpoints (in-memory "database") ---------------------

let tasks = [
  { id: 1, title: 'Buy milk', done: false },
  { id: 2, title: 'Write report', done: false },
  { id: 3, title: 'Walk the dog', done: true },
];
let nextId = 4;

app.get('/tasks', (req, res) => {
  let result = tasks;
  const { done, search } = req.query;

  if (done !== undefined) {
    const wantDone = done === 'true';
    result = result.filter((t) => t.done === wantDone);
  }
  if (search) {
    const needle = String(search).toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(needle));
  }

  res.status(200).json(result);
});

app.get('/stats', (req, res) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  res.status(200).json({ total, done, open: total - done });
});

app.post('/reset', (req, res) => {
  tasks = [
    { id: 1, title: 'Buy milk', done: false },
    { id: 2, title: 'Write report', done: false },
    { id: 3, title: 'Walk the dog', done: true },
  ];
  nextId = 4;
  res.status(200).json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(200).json(task);
});

// --- Stage 3: create -----------------------------------------------------

app.post('/tasks', (req, res) => {
  const { title } = req.body ?? {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required and must not be empty' });
  }
  const newTask = { id: nextId++, title, done: false };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// --- Stage 4: update & delete --------------------------------------------

app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
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

  if (title !== undefined) task.title = title;
  if (done !== undefined) task.done = done;
  res.status(200).json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  tasks.splice(index, 1);
  res.status(204).end();
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
