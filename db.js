const { createClient } = require('@supabase/supabase-js');

let _supabase = null;
let _sanitizedUrl = null;

function getSupabase() {
  if (_supabase) return _supabase;

  let url = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  // Strip trailing slashes en /rest/v1 paden
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  _sanitizedUrl = url;

  if (!url || !serviceKey) {
    const err = new Error('Supabase niet geconfigureerd: SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY ontbreken in env.');
    err.code = 'NO_SUPABASE_CONFIG';
    throw err;
  }

  _supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init = {}) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(7000) })
    }
  });
  return _supabase;
}

function getSanitizedUrl() {
  if (_sanitizedUrl !== null) return _sanitizedUrl;
  return (process.env.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

function withTimeout(promise, ms = 9000, label = 'supabase') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout na ${ms}ms`)), ms)
    )
  ]);
}

module.exports = { getSupabase, getSanitizedUrl, withTimeout };
