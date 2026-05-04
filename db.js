const { createClient } = require('@supabase/supabase-js');

let url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Sanitize: strip trailing slashes en /rest/v1 paden — supabase-js verwacht
// alleen de base URL.
url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

if (!url || !serviceKey) {
  throw new Error(
    'Supabase niet geconfigureerd: zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env (lokaal) of in de Vercel environment variables.'
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init = {}) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(7000) })
  }
});

// Helper: wrap promise met een hard 9s timeout zodat een hangende Supabase-call
// nooit de Vercel function 300s laat hangen.
function withTimeout(promise, ms = 9000, label = 'supabase') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout na ${ms}ms`)), ms)
    )
  ]);
}

module.exports = { supabase, withTimeout, sanitizedUrl: url };
