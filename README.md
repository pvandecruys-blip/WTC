# WTC Platte Band — Wielertoeristenclub

Volledige website met database voor ritten, sponsors, leden en kalender. Iedereen kan content toevoegen of verwijderen — geen login.

## Stack

- **Frontend**: vanilla HTML / CSS / JS (in `public/`)
- **Backend**: Express ([app.js](app.js)), met serverless wrapper voor Vercel ([api/index.js](api/index.js))
- **Database + foto-storage**: [Supabase](https://supabase.com) (gratis tier — Postgres + Storage in één)
- **Charts**: Chart.js (CDN)

## Eenmalige setup — Supabase (5 min)

1. Maak gratis account op [supabase.com](https://supabase.com).
2. **New Project** → kies een naam (bv. `wtc-platteband`) en region (West EU).
3. Wacht tot het project klaar is (~1 min).
4. Open **SQL Editor** → New query → kopieer de inhoud van [supabase-schema.sql](supabase-schema.sql) → **Run**.
   Dit maakt de 4 tabellen en zet RLS uit.
5. Open **Storage** → **New bucket** → naam `wtc-photos`, **Public** aanvinken → **Create**.
6. Open **Settings → API** en kopieer:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **service_role key** (onder "Project API keys" — let op: dit is het *service_role* secret, niet de anon key. Houd hem geheim — server-side enkel.)

## Lokaal draaien

```sh
npm install
cp .env.example .env
# vul SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env
npm start
```

→ http://localhost:3000

## Content beheren

Op elke pagina staat bovenaan een formulier:

- **/ritten.html** — gele **+**-knop rechtsonder (op elke pagina)
- **/sponsors.html** — sponsor toevoegen (met logo)
- **/leden.html** — lid toevoegen (met foto, bestuur ja/nee, categorie A/B/C)
- **/kalender.html** — evenement of geplande rit toevoegen

Verwijderen via de "Verwijderen"-knop op elk item.

## Deploy naar Vercel

1. `npm i -g vercel` (eenmalig)
2. `vercel` in de projectmap
3. In **Vercel dashboard → Settings → Environment Variables** zet je:

   | Var | Waarde |
   |---|---|
   | `SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | de service_role key uit Supabase |

4. `vercel --prod`

Klaar — site is live, foto's en data staan in Supabase.

## Project structuur

```
.
├── app.js              # Express app (alle API routes)
├── server.js           # Lokaal entrypoint (poort 3000)
├── api/
│   └── index.js        # Vercel serverless entrypoint (wrapt app.js)
├── db.js               # Supabase client
├── storage.js          # Foto-upload via Supabase Storage
├── supabase-schema.sql # Run dit eenmaal in Supabase SQL Editor
├── public/             # Frontend (Vercel serveert dit direct)
│   ├── index.html
│   ├── ritten.html, ritten.js
│   ├── dashboard.html, dashboard.js
│   ├── kalender.html, leden.html, sponsors.html, contact.html
│   ├── styles.css
│   └── script.js       # Shared (FAB, mobile nav)
├── vercel.json
├── package.json
└── .env.example
```

## API endpoints

Alle endpoints zijn open — geen authenticatie.

| Method | Path |
|---|---|
| GET, POST | `/api/rides` |
| DELETE | `/api/rides/:id` |
| GET, POST | `/api/sponsors` |
| DELETE | `/api/sponsors/:id` |
| GET, POST | `/api/members` |
| DELETE | `/api/members/:id` |
| GET, POST | `/api/events` |
| DELETE | `/api/events/:id` |
| GET | `/api/stats` (dashboard berekeningen) |

## Backup

Via Supabase dashboard: **Database → Backups** (gratis tier: dagelijkse automatische backups, 7 dagen retentie).
Of: SQL dump via **Database → Connection string** + `pg_dump`.
