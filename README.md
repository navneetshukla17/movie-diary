# 🍿 Movie Diary

> **Movie Diary** is a platform where you can store, rate, review and categorise movies, web-series and tv shows that you've watched (enjoyed) and forget long time ago - It's like your diary but, for "movies". It helps you to keep track of all the movies you have enjoy with your loved-ones or alone - give it a try !

It features two independent lists — **Alone** (watched solo) and **US** (watched with a partner) — metadata from TMDB + OMDb, import from text/PDF/image, and a themed PDF export.

---

## 🛠️ Tech Stack

- **Backend (`server/`)**: Node.js + Express + TypeScript, Prisma + PostgreSQL, JWT Auth
- **Frontend (`web/`)**: React + Vite + TypeScript, featuring a cool retro video-game theme! 👾
- *Note: The REST API is designed as a contract that a future Android app will reuse.*

## 📋 Prerequisites

- **Node.js**: v20 or higher
- **PostgreSQL**: v17 (via Homebrew)
  ```bash
  brew install postgresql@17 && brew services start postgresql@17
  ```

## 🚀 Setup & Installation

```bash
# Add Postgres to your PATH
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# Install dependencies for both web and server
npm install

# Setup environment variables
cp server/.env.example server/.env
# Don't forget to fill in TMDB_API_KEY & OMDB_API_KEY in server/.env!

# Initialize the database
npm run db:create
npm run db:migrate

# Start the development servers
npm run dev
```

- **Web App**: [http://localhost:5173](http://localhost:5173)
- **API**: [http://localhost:4000](http://localhost:4000)

## 📜 Available Scripts

```bash
npm run dev          # Run server + web in watch mode
npm test             # Run all tests (server + web)
npm run typecheck    # Typecheck both packages
npm run build        # Production build
```

## 🧪 Testing

Server tests use a dedicated Postgres database `movie_list_test`. The test script pushes the Prisma schema to it automatically. Just run `npm test` and you're good to go!

## 🔑 Metadata API Keys

To fetch rich movie metadata (posters, descriptions, ratings), you can set up API keys:
- **TMDB Key**: Get one at [TMDB Settings](https://www.themoviedb.org/settings/api)
- **OMDb Key**: Get one at [OMDb API](https://www.omdbapi.com/apikey.aspx)

Set them in `server/.env`. 
*Note: Metadata providers are completely optional — the app works perfectly fine without them using manual/title-only entries.*
