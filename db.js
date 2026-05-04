const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    'Supabase niet geconfigureerd: zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env (lokaal) of in de Vercel environment variables.\n' +
    'Schema staat in supabase-schema.sql — voer dat uit in de Supabase SQL Editor.'
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

module.exports = { supabase };
