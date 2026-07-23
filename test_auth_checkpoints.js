// test_auth_checkpoints.js — auth checks that don't require a real
// Supabase project (validation, missing/malformed/invalid tokens,
// middleware reuse, docs). Run with a placeholder .env in place.
//
// This does NOT replace testing the real signup/login/verify flow --
// that needs your actual SUPABASE_URL/SUPABASE_KEY. See the README's
// curl flow for that part.
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

  const server = startServer();
  await sleep(1200);
  try {
    let r = await fetch(`${BASE}/public/info`);
    let body = await r.json();
    check('GET /public/info -> 200', r.status === 200 && body.message.includes('public'));

    r = await fetch(`${BASE}/protected/profile`);
    body = await r.json();
    check('GET /protected/profile no token -> 401', r.status === 401 && body.error === 'Access token required');

    r = await fetch(`${BASE}/protected/profile`, { headers: { Authorization: 'NotBearer xyz' } });
    check('GET /protected/profile malformed header -> 401', r.status === 401);

    r = await fetch(`${BASE}/protected/profile`, { headers: { Authorization: 'Bearer clearly-fake-token' } });
    body = await r.json();
    check(
      'GET /protected/profile invalid token -> 401 (no crash)',
      r.status === 401 && body.error === 'Invalid or expired token'
    );

    r = await fetch(`${BASE}/protected/dashboard`, { headers: { Authorization: 'Bearer clearly-fake-token' } });
    check('GET /protected/dashboard (same middleware) -> 401 for a bad token too', r.status === 401);

    r = await fetch(`${BASE}/auth/logout`, { method: 'POST' });
    check('POST /auth/logout no token -> 401 (it is a protected route)', r.status === 401);

    r = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    check('POST /auth/signup missing password -> 400', r.status === 400);

    r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    check('POST /auth/login empty body -> 400', r.status === 400);

    r = await fetch(`${BASE}/docs/`);
    check('GET /docs -> 200', r.status === 200);
  } finally {
    server.kill();
  }

  console.log(failed ? '\nSome checkpoints FAILED.' : '\nAll checkpoints passed (auth-only-without-Supabase subset).');
  console.log('Remember: this does NOT test real signup/login/verify -- that needs your real Supabase project.');
  process.exit(failed ? 1 : 0);
}

main();
