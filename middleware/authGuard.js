// middleware/authGuard.js — Stage 4
// Reusable guard: extracts the bearer token, verifies it with Supabase,
// and attaches the verified user to req.user. Apply to any route that
// should only run for a logged-in user.

import { supabase } from '../lib/supabaseClient.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  req.token = token;
  next();
}
