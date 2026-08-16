# my movies

A personal movies / TV shows / web series tracker with two independent lists —
**Alone** (watched solo) and **US** (watched with a partner) — metadata from
TMDB + OMDb, import from text/PDF/image, and a themed PDF export.

## Stack

- `server/` — Node.js + Express + TypeScript, Prisma + PostgreSQL, JWT auth
- `web/` — React + Vite + TypeScript, retro video-game theme
- The REST API is the contract a future Android app will reuse

## Prerequisites

- Node 20+
- PostgreSQL 17 (Homebrew): `brew install postgresql@17 && brew services start postgresql@17`

## Setup

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
npm install
cp server/.env.example server/.env   # fill in TMDB_API_KEY / OMDB_API_KEY
npm run db:create
npm run db:migrate
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000

## Scripts

```bash
npm run dev          # run server + web in watch mode
npm test             # run all tests (server + web)
npm run typecheck    # typecheck both packages
npm run build        # production build
```

## Tests

Server tests use a dedicated Postgres database `movie_list_test`. The test
script pushes the Prisma schema to it automatically.

## Metadata API keys

Get a TMDB key at https://www.themoviedb.org/settings/api and an OMDb key at
https://www.omdbapi.com/apikey.aspx. Set them in `server/.env`. Metadata
providers are optional — the app works without them (manual/title-only entries).
