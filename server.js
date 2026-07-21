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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
