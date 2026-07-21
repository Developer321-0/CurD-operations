// server.js — FlyRank Internship, Backend Track, Week 2, Assignment A1
// Stage 0: hello server. Started from a plain Node http server with two
// endpoints (/ and /time) and grows from here, stage by stage.

import http from 'node:http';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/') {
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'first API endpoint.' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/time') {
    res.statusCode = 200;
    res.end(JSON.stringify({ currentTime: new Date().toISOString() }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
