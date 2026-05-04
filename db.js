const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    'Supabase niet geconfigureerd: zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env (lokaal) of in de Vercel environment variables.\n' +
    'Schema staat in supabase-schema.sql — voer dat uit in de Supabase SQL Editor.'
  );
}

// Hard timeout op Supabase calls zodat een hangende fetch niet de function laat
// timeouten (Vercel cap = 300s, dat willen we vermijden — liever fast-fail).
const fetchWithTimeout = (input, init = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchWithTimeout }
});

module.exports = { supabase };
