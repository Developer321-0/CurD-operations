// test_checkpoints.js — proves the assignment's own checkpoints against a
// live server. Run with: npm test  (spawns and kills the server itself).
import { spawn } from 'node:child_process';

const BASE = 'http://localhost:3000';

function startServer() {
  const proc = spawn('node', ['server.js'], { stdio: 'ignore' });
  return proc;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let failed = false;
function check(label, condition) {
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${label}`);
  if (!condition) failed = true;
}

async function main() {
  // --- basic endpoints -----------------------------------------------
  let server = startServer();
  await sleep(1000);
  try {
    let r = await fetch(`${BASE}/`);
    check('GET / -> 200', r.status === 200);

    r = await fetch(`${BASE}/health`);
    let body = await r.json();
    check('GET /health -> {"status":"ok"}', r.status === 200 && body.status === 'ok');

    r = await fetch(`${BASE}/tasks`);
    body = await r.json();
    check('GET /tasks -> 3 seeded tasks', r.status === 200 && body.length === 3);

    r = await fetch(`${BASE}/tasks/1`);
    check('GET /tasks/1 -> 200', r.status === 200);

    r = await fetch(`${BASE}/tasks/99`);
    body = await r.json();
    check('GET /tasks/99 -> 404 + error JSON', r.status === 404 && body.error === 'Task 99 not found');

    r = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Persisted-in-memory task' }),
    });
    body = await r.json();
    check('POST /tasks valid -> 201', r.status === 201);
    const newId = body.id;

    r = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    check('POST /tasks empty body -> 400', r.status === 400);

    r = await fetch(`${BASE}/tasks/${newId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Persisted-in-memory task', done: true }),
    });
    body = await r.json();
    check('PUT existing task -> 200, done=true', r.status === 200 && body.done === true);

    r = await fetch(`${BASE}/tasks/999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    });
    check('PUT unknown id -> 404', r.status === 404);

    r = await fetch(`${BASE}/tasks/${newId}`, { method: 'DELETE' });
    check('DELETE existing task -> 204', r.status === 204);

    r = await fetch(`${BASE}/tasks/${newId}`, { method: 'DELETE' });
    check('DELETE already-deleted task -> 404', r.status === 404);

    r = await fetch(`${BASE}/docs/`);
    check('GET /docs -> 200 (Swagger UI)', r.status === 200);

    r = await fetch(`${BASE}/tasks?search=milk`);
    body = await r.json();
    check('GET /tasks?search=milk filters correctly', r.status === 200 && body.every((t) => t.title.toLowerCase().includes('milk')));

    r = await fetch(`${BASE}/stats`);
    body = await r.json();
    check('GET /stats -> total/done/open', r.status === 200 && typeof body.total === 'number');
  } finally {
    server.kill();
    await sleep(500);
  }

  // --- the mortality experiment: prove data is NOT persisted ----------
  server = startServer();
  await sleep(1000);
  try {
    await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'This should vanish' }),
    });
    const r = await fetch(`${BASE}/tasks`);
    const body = await r.json();
    check('Task exists before restart', body.some((t) => t.title === 'This should vanish'));
  } finally {
    server.kill();
    await sleep(500);
  }

  server = startServer();
  await sleep(1000);
  try {
    const r = await fetch(`${BASE}/tasks`);
    const body = await r.json();
    check(
      'In-memory data is gone after restart (the mortality experiment)',
      !body.some((t) => t.title === 'This should vanish') && body.length === 3
    );
  } finally {
    server.kill();
  }

  console.log(failed ? '\nSome checkpoints FAILED.' : '\nAll checkpoints passed.');
  process.exit(failed ? 1 : 0);
}

main();
