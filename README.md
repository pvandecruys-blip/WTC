# WTC Platte Band — Wielertoeristenclub

Volledige website met database voor ritten, sponsors, leden en kalender. Iedereen kan content toevoegen of verwijderen — geen login.

## Stack

- **Frontend**: vanilla HTML / CSS / JS (in `public/`)
- **Backend**: Express ([app.js](app.js)), met serverless wrapper voor Vercel ([api/index.js](api/index.js))
- **Database**: libSQL — lokaal als SQLite-bestand, op Vercel via [Turso](https://turso.tech) (free tier ruim voldoende)
- **Foto's**: lokaal in `uploads/`, op Vercel via [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **Charts**: Chart.js (CDN)

## Lokaal draaien

```sh
npm install
npm start
```

→ http://localhost:3000

Lokaal slaat de DB op in `wtc.db` en foto's in `uploads/` — beide staan in `.gitignore`.

## Content beheren

Op elke relevante pagina staat bovenaan een formulier om iets toe te voegen:

- **/ritten.html** — ritten toevoegen via de gele **+**-knop rechtsonder (op elke pagina)
- **/sponsors.html** — sponsor toevoegen (met logo)
- **/leden.html** — lid toevoegen (met foto, bestuur ja/nee, categorie A/B/C)
- **/kalender.html** — evenement of geplande rit toevoegen

Verwijderen kan via de "Verwijderen"-knop op elk item.

## Deploy naar Vercel

### 1. Externe diensten aanmaken (eenmalig)

**a) Turso voor de database:**
1. Maak account op [turso.tech](https://turso.tech)
2. CLI installeren: `npm i -g @libsql/cli` (of via website)
3. Database aanmaken:
   ```sh
   turso db create wtc-platteband
   turso db show wtc-platteband --url
   turso db tokens create wtc-platteband
   ```
4. Bewaar de URL (`libsql://...`) en de token.

**b) Vercel Blob voor foto's:**
1. In je Vercel project: Storage → Create → Blob → Connect
2. Vercel zet automatisch `BLOB_READ_WRITE_TOKEN` in de environment.

### 2. Deploy

```sh
npm i -g vercel
vercel
```

Bij eerste deploy: Vercel detecteert het project. In de Vercel-dashboard onder **Settings → Environment Variables** zet je:

| Var | Waarde |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://xxxxx.turso.io` |
| `TURSO_AUTH_TOKEN` | het token van turso |

`BLOB_READ_WRITE_TOKEN` zet Vercel zelf na "Connect Blob".

Daarna: `vercel --prod`.

## Project structuur

```
.
├── app.js              # Express app (routes + middleware)
├── server.js           # Lokaal entrypoint (luistert op poort 3000)
├── api/
│   └── index.js        # Vercel serverless entrypoint (wrapt app.js)
├── db.js               # libSQL client + schema
├── storage.js          # Foto-upload abstractie (lokaal vs Vercel Blob)
├── public/             # Statische frontend (Vercel serveert dit direct)
│   ├── index.html
│   ├── ritten.html, ritten.js
│   ├── dashboard.html, dashboard.js
│   ├── kalender.html
│   ├── leden.html
│   ├── sponsors.html
│   ├── contact.html
│   ├── styles.css
│   └── script.js              # Shared (FAB, mobile nav)
├── vercel.json         # Vercel routing
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

- **Lokaal:** kopie van `wtc.db` + `uploads/`
- **Productie (Turso):** `turso db shell wtc-platteband ".dump" > backup.sql`
- **Vercel Blob:** `vercel blob list`
