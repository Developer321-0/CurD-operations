// test_checkpoints.js — proves the assignment's own checkpoints against a
// live server. Run with: npm test  (spawns and kills the server itself).
import { spawn } from 'node:child_process';
import { unlinkSync, existsSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const DB_PATH = new URL('./tasks.db', import.meta.url);

function startServer() {
  return spawn('node', ['server.js'], { stdio: 'ignore' });
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
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

  for (let i = 0; i < 3; i++) {
    const s = startServer();
    await sleep(800);
    s.kill();
    await sleep(300);
  }
  let server = startServer();
  await sleep(1000);
  try {
    let r = await fetch(`${BASE}/tasks`);
    let body = await r.json();
    check('Seed does not duplicate after 3 restarts (3 tasks)', body.length === 3);

    r = await fetch(`${BASE}/tasks/1`);
    check('GET /tasks/1 -> 200', r.status === 200);

    r = await fetch(`${BASE}/tasks/999`);
    body = await r.json();
    check('GET /tasks/999 -> 404 + error JSON', r.status === 404 && body.error === 'Task 999 not found');

    r = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Persisted task' }),
    });
    body = await r.json();
    check('POST /tasks valid -> 201', r.status === 201);

    r = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    check('POST /tasks empty -> 400', r.status === 400);
  } finally {
    server.kill();
    await sleep(500);
  }

  server = startServer();
  await sleep(1000);
  let newId;
  try {
    let r = await fetch(`${BASE}/tasks`);
    let body = await r.json();
    check('Created task survives a restart', body.length === 4 && body.some((t) => t.title === 'Persisted task'));
    newId = body.find((t) => t.title === 'Persisted task').id;

    r = await fetch(`${BASE}/tasks/${newId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
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
    check('GET /docs -> 200', r.status === 200);

    r = await fetch(`${BASE}/tasks?search=' OR '1'='1`);
    check("Search with quote characters doesn't break the query", r.status === 200);

    r = await fetch(`${BASE}/stats`);
    body = await r.json();
    check('GET /stats -> total/done/open', r.status === 200 && typeof body.total === 'number');
  } finally {
    server.kill();
    await sleep(300);
  }

  console.log(failed ? '\nSome checkpoints FAILED.' : '\nAll checkpoints passed.');
  process.exit(failed ? 1 : 0);
}

main();
