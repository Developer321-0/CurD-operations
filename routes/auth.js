// routes/auth.js — Stage 1: signup and login. Stage 4: logout.
import { Router } from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { requireAuth } from '../middleware/authGuard.js';

export const authRouter = Router();

// --- Stage 1: sign up -----------------------------------------------------
authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    // Supabase's own validation errors (weak password, malformed email,
    // already-registered email, etc.) surface here as 400s.
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ user: data.user });
});

// --- Stage 1: log in -------------------------------------------------------
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: data.user,
  });
});

// --- Stage 4: log out (protected: requires a valid bearer token) ----------
authRouter.post('/logout', requireAuth, async (req, res) => {
  const { error } = await supabase.auth.signOut(req.token);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.status(204).end();
});
