-- WTC Platte Band — Supabase schema
-- Voer dit uit in de Supabase SQL Editor (Dashboard → SQL Editor → New query → plak alles → Run)

-- ===== Tabellen =====

CREATE TABLE IF NOT EXISTS rides (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  title       TEXT NOT NULL,
  km          REAL NOT NULL,
  time        TEXT NOT NULL,
  cafe        REAL NOT NULL,
  riders      JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes       TEXT DEFAULT '',
  photo       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsors (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  tier        TEXT NOT NULL DEFAULT 'silver',
  description TEXT DEFAULT '',
  url         TEXT DEFAULT '',
  logo        TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT DEFAULT '',
  category    TEXT DEFAULT '',
  bio         TEXT DEFAULT '',
  photo       TEXT,
  is_board    BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  time        TEXT DEFAULT '',
  title       TEXT NOT NULL,
  location    TEXT DEFAULT '',
  distance    TEXT DEFAULT '',
  pace        TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_special  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ===== RLS uitschakelen =====
-- We gebruiken de service_role key vanuit de server (die bypasst RLS sowieso),
-- maar voor de zekerheid zetten we RLS expliciet uit op deze tabellen.
ALTER TABLE rides    DISABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors DISABLE ROW LEVEL SECURITY;
ALTER TABLE members  DISABLE ROW LEVEL SECURITY;
ALTER TABLE events   DISABLE ROW LEVEL SECURITY;

-- ===== Storage bucket =====
-- Maak een PUBLIC bucket "wtc-photos" aan in: Dashboard → Storage → New bucket
-- Naam:   wtc-photos
-- Public: ja (zodat foto's direct via URL te bekijken zijn)
