// server.js — FlyRank Internship, Backend Track, Week 2, Assignment A1
// A small CRUD API for a to-do list.

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
