# Movie List Tracker — Design Spec

**Date:** 2026-08-16
**Status:** Approved

## Overview

A personal movies / TV shows / web series list tracker. Users track what they
watched in two independent modes: **Alone** (watched solo) and **US** (watched
with a partner). V1 is a web app; the same REST API will later power an Android
app.

## Goals

- Track movies / TV shows / web series across two independent lists (Alone / US)
- Fetch real metadata (poster, release date, ratings) from TMDB + OMDb
- Import titles from text, PDF, or image files
- Export a themed PDF of the current list with posters
- Cross-list search with clear "not found" messages
- Cloud sync via accounts (email/password + JWT), Postgres-backed

## Non-goals (v1)

- Sharing / social features
- Custom user-defined fields
- Watch-status syncing calendars

## Architecture

Monorepo with two packages and a shared REST contract:

- `server/` — Node.js + Express + TypeScript
  - Auth (email/password, bcrypt, JWT)
  - Lists, movies CRUD, duplicate blocking
  - Metadata proxy to TMDB + OMDb (API keys server-side only)
  - Import: plain-text parsing, PDF text extraction, image OCR (Tesseract)
  - PDF export generation (PDFKit/Puppeteer), themed
  - PostgreSQL via Prisma ORM
- `web/` — React + Vite + TypeScript
  - Retro video-game themed UI, cute and colorful but not overwhelming
  - Typed API client for the REST API

External services: TMDB API, OMDb API. The server proxies all metadata requests
so keys never reach the browser.

## Data model

### User

- `id` (uuid)
- `email` (unique)
- `password_hash`
- `default_mode` (ALONE | US)
- `created_at`, `updated_at`

### List

- `id` (uuid)
- `user_id` (fk)
- `mode` (ALONE | US)
- `created_at`, `updated_at`
- Unique `(user_id, mode)` — one list per user per mode

### Movie (entry in a list)

- `id` (uuid)
- `list_id` (fk)
- `title` (user-entered)
- `watched_date` (nullable)
- `personal_rating` (1–10, nullable)
- `watch_status` (PLANNED | WATCHING | FINISHED)
- `poster_url` (nullable)
- `release_date` (nullable)
- `provider_ratings` (JSON — TMDB score + IMDb rating, etc.)
- `metadata_provider` (TMDB | OMDb | IMPORT | MANUAL, nullable)
- `imported` (boolean)
- `created_at`, `updated_at`
- Unique `(list_id, title)` — duplicate titles blocked within a list; the same
  movie may exist in both lists

## Features & flows

### Onboarding & modes

- Signup asks for the default mode (Alone or US)
- A top-level toggle switches between the two independent lists
- Default mode is changeable in settings

### Add movie

- Type a title → typeahead suggestions from TMDB/OMDb (movies, TV shows, web
  series) with poster and year
- Select a suggestion → metadata auto-fills (poster, release date, ratings)
- Fill user fields: watched date, personal rating (1–10), watch status
- Duplicate title in the same list → blocked with a clear message

### View / search

- Poster-card grid in retro theme
- Search box searches across both lists simultaneously
- No matches → clear "no results" message

### Import (text / PDF / image)

- Server-side parsing: text lines, PDF text extraction, image OCR (Tesseract)
- Extracted titles added to the currently-viewed list as title-only entries
  (`imported = true`, no metadata)
- Newly imported cards get a temporary highlight that fades after some seconds
- After import, a popup asks: "Import movies' real data?" — Yes fetches metadata
  for all imported entries; Ignore leaves them title-only
- Each title-only card has an "import real data" button to fetch metadata for
  that entry on demand

### Export (PDF)

- Exports the current list (Alone or US) with posters, watched date, ratings
- Styled in the app's retro theme
- Generated server-side, downloaded as a file

### Edit / delete

- Edit any field later
- Delete any entry (with confirmation)

## Error handling

- Duplicate add in same list → blocked with clear message
- Search with no results → "no results" message
- Metadata fetch failure → entry stays title-only, inline notice, retry via
  "import real data" button
- Unreadable import file / empty image / zero titles → friendly error, nothing
  added; partial parses add found titles and report skipped lines
- API errors → consistent error format; frontend shows friendly message + retry
- PDF export failure → message with retry
- Auth errors → clear message, re-login prompt
- Provider outages → short-lived server-side metadata cache; graceful degradation
- Cloud sync → all writes go to Postgres (single source of truth)

## Testing

- Backend: unit tests for auth, list/movie CRUD, duplicate blocking, import
  parsing, export generation; integration tests against Postgres schema
- Frontend: component tests for add flow, search, import popup, highlight;
  API-layer tests with a mocked server
- All metadata provider calls mocked in tests — no live API calls

## Delivery / hosting

- Local dev: Docker Compose for Postgres; `npm run dev` for server + web
- Production: PaaS (Render/Railway) + hosted Postgres; static frontend
- TMDB/OMDb keys as environment variables on the server only
- REST API is the contract for the future Android app
