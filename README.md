# Fitness Log

A single-user fitness and nutrition tracker: an installable web app (iPhone and desktop) on Cloudflare's free plan.
It replaces a chat-based logging workflow and keeps its data in the same JSON shape that workflow used, so data
moves in and out without loss.

**Status: Phase 1.** Import an export file and browse it on a read-only dashboard (Day, Trends, Plan & goals),
online or offline. Logging, gym mode, photo logging and the shopping check come in later phases.

## How it fits together

```
iPhone PWA / desktop browser / scripts
            │  HTTPS
            ▼
Cloudflare Worker ──► static app (./dist, built by Vite)
   /api/*  ──► D1 (SQLite): days, settings, recipes as JSON documents
```

| Path | What it is |
|---|---|
| `src/core/` | Pure, unit-tested nutrition maths: totals, weekly budget, dates. No DOM, no network. |
| `src/worker/` | The API: sign-in, `GET /api/export`, `PUT /api/doc/:kind/:id`. |
| `web/` | The app. Views are pure functions from state to HTML; `main.ts` wires events. `public/sw.js` handles offline. |
| `scripts/` | `import`, `verify`, `export`, `genkey`. |
| `migrations/` | D1 schema. |
| `fixtures/` | A synthetic sample export for development and CI. |
| `docs/decisions/` | Short records of why things are the way they are. |

**No real data lives in this repository.** `data/`, `backups/` and `.dev.vars` are gitignored.

## Set up (Windows, PowerShell)

You need [Node.js 22 LTS](https://nodejs.org) and a free Cloudflare account (no card needed).

### 1. Install and test locally

```powershell
npm install
npm test
Copy-Item .dev.vars.example .dev.vars
npm run db:local
npm run dev            # http://localhost:8787
```

In a second PowerShell window, load the sample data and sign in with the key `local-dev-key`:

```powershell
$env:FITNESS_URL = "http://localhost:8787"
$env:FITNESS_KEY = "local-dev-key"
npm run import -- fixtures/sample-export.json
```

### 2. Create the database

```powershell
npx wrangler login
npx wrangler d1 create fitness
```

Copy the `database_id` it prints into `wrangler.toml` (replace the row of zeros). If wrangler offers to add the
binding to your config for you, say no; it is already there. Then create the tables:

```powershell
npm run db:remote
```

### 3. Deploy

```powershell
npm run deploy
```

The first deploy asks you to choose a `workers.dev` subdomain. It prints the app's address, like
`https://fitness-tracker.<your-subdomain>.workers.dev`.

### 4. Generate the two secrets

```powershell
npm run genkey
```

Save `ACCESS_KEY` in a password manager: it is the only thing protecting the data.

### 5. Store them in Cloudflare

Each command prompts for the value; paste the matching line from step 4.

```powershell
npx wrangler secret put ACCESS_KEY
npx wrangler secret put SESSION_SECRET
```

### 6. Import and verify

Put the export file at `data\export.json` (the folder is gitignored), then:

```powershell
$env:FITNESS_URL = "https://fitness-tracker.<your-subdomain>.workers.dev"
$env:FITNESS_KEY = "<ACCESS_KEY from step 4>"
npm run import
npm run verify
```

`verify` compares every document field by field and prints per-day kcal and protein from the file next to the
app's own totals. It ends with `PASSED` or lists what differs. Importing again is safe; it replaces documents by id.

### 7. Install on the iPhone

1. Open the app's address in **Safari**.
2. Share → **Add to Home Screen**.
3. Open it from the Home Screen and paste the access key. (The installed app keeps its own sign-in, separate
   from Safari, so sign in there rather than in the browser tab.)

After that first open it also works with no signal, showing the last data it synced.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Build and serve locally with a local database |
| `npm test` / `npm run typecheck` | Unit tests / TypeScript checks |
| `npm run deploy` | Build and publish |
| `npm run import [-- file]` | Load an export file (default `data/export.json`) |
| `npm run verify [-- file]` | Check the app against an export file |
| `npm run export [-- file]` | Save everything as JSON in the original export format |

To sign out every device at once, set a new `SESSION_SECRET` (step 5).

## Free-plan notes

- Workers free plan: 100,000 requests a day and 10 ms CPU per request. Opening the app costs one API request.
- D1 does not pause when idle, so no keep-alive job is needed.
- The access key is a random 256-bit value compared by HMAC; a slow password hash would not fit in 10 ms of CPU.
