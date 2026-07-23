// lib/supabaseClient.js — Stage 0
// Initializes a single shared Supabase client from environment variables.
// SUPABASE_URL and SUPABASE_KEY must be set (see .env.example). This uses
// the public "anon" key only — never the service_role key, which bypasses
// all security and must stay server-side-secret in a real production setup.

import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_KEY. Copy .env.example to .env and fill in your ' +
      'Supabase project URL and anon key (Project Settings -> API in the Supabase dashboard).'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
