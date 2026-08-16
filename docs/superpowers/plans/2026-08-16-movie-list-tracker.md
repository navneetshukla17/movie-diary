# Movie List Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal movie/TV/web-series tracker web app (v1) with Alone/US lists, metadata from TMDB+OMDb, text/PDF/image import, themed PDF export, cross-list search, and accounts backed by Postgres.

**Architecture:** npm-workspaces monorepo. `server/` is a Node.js + Express + TypeScript REST API (Prisma + PostgreSQL, JWT auth, server-side import parsing/OCR and PDF generation). `web/` is a React + Vite + TypeScript frontend with a retro video-game theme. The REST API is the contract a future Android app will reuse.

**Tech Stack:** Node 20, Express 4, Prisma, PostgreSQL 17 (Homebrew), bcryptjs, jsonwebtoken, multer, tesseract.js, pdf-parse, pdfkit, vitest, supertest, React 18, Vite 5, react-router-dom 6, @tanstack/react-query, @testing-library/react.

**Environment facts (this machine):**
- Node v20.19.5, npm 10.8.2, Homebrew PostgreSQL 17 running as a service
- Postgres binaries at `/opt/homebrew/opt/postgresql@17/bin` (keg-only — add to PATH)
- Databases already created: `movie_list` (dev) and `movie_list_test` (tests)
- Connection: `postgresql://tusharshukla@localhost:5432/movie_list` (trust auth, OS user)

---

### Task 1: Root monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `server/.env.example`
- Create: `server/.gitkeep`

- [ ] **Step 1: Write the root `package.json`**

```json
{
  "name": "movie-list-tracker",
  "private": true,
  "workspaces": ["server", "web"],
  "scripts": {
    "dev": "npm run dev --workspace server & npm run dev --workspace web",
    "dev:server": "npm run dev --workspace server",
    "dev:web": "npm run dev --workspace web",
    "build": "npm run build --workspace server && npm run build --workspace web",
    "test": "npm run test --workspace server && npm run test --workspace web",
    "typecheck": "npm run typecheck --workspace server && npm run typecheck --workspace web",
    "db:create": "createdb movie_list 2>/dev/null || true; createdb movie_list_test 2>/dev/null || true",
    "db:migrate": "npm run db:migrate --workspace server"
  }
}
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
dist/
.env
*.log
.DS_Store
server/prisma/*.db
```

- [ ] **Step 3: Write `server/.env.example`**

```
DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list
JWT_SECRET=change-me-to-a-long-random-string
TMDB_API_KEY=
OMDB_API_KEY=
```

- [ ] **Step 4: Copy the example env and verify**

Run:
```bash
cp server/.env.example server/.env
node --version
npm --version
```
Expected: Node v20.x, npm 10.x printed.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore server/.env.example server/.gitkeep server/.env
git commit -m "chore: scaffold monorepo root"
```

---

### Task 2: Server package scaffold + Prisma schema

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/tsconfig.build.json`
- Create: `server/vitest.config.ts`
- Create: `server/prisma/schema.prisma`
- Create: `server/src/db.ts`

- [ ] **Step 1: Write `server/package.json`**

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/index.js",
    "postinstall": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "test": "DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.18.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "pdfkit": "^0.15.0",
    "tesseract.js": "^5.1.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.14.0",
    "@types/pdfkit": "^0.13.4",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.18.0",
    "supertest": "^7.0.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.3",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Write `server/tsconfig.json`** (typecheck config, includes tests)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"]
}
```

- [ ] **Step 3: Write `server/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "rootDir": "src"
  },
  "exclude": ["src/test", "src/**/*.test.ts"]
}
```

- [ ] **Step 4: Write `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      TMDB_API_KEY: 'test-key',
      OMDB_API_KEY: 'test-key',
      JWT_SECRET: 'test-secret',
    },
    globalSetup: './src/test/globalSetup.ts',
    setupFiles: ['./src/test/setup.ts'],
    hookTimeout: 60000,
    testTimeout: 20000,
  },
});
```

- [ ] **Step 5: Write `server/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Mode {
  ALONE
  US
}

enum WatchStatus {
  PLANNED
  WATCHING
  FINISHED
}

enum MetadataProvider {
  TMDB
  OMDB
  IMPORT
  MANUAL
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  defaultMode  Mode     @default(ALONE)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lists        List[]
}

model List {
  id        String   @id @default(uuid())
  userId    String
  mode      Mode
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  movies    Movie[]

  @@unique([userId, mode])
}

model Movie {
  id               String           @id @default(uuid())
  listId           String
  title            String
  watchedDate      DateTime?
  personalRating   Int?
  watchStatus      WatchStatus      @default(PLANNED)
  posterUrl        String?
  releaseDate      String?
  providerRatings  Json?
  metadataProvider MetadataProvider?
  imported         Boolean          @default(false)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  list             List             @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@unique([listId, title])
}
```

- [ ] **Step 6: Write `server/src/db.ts`**

```ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 7: Write the test harness files**

Create `server/src/test/globalSetup.ts`:

```ts
import { execSync } from 'node:child_process';

export default function globalSetup() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: process.env,
    stdio: 'inherit',
  });
}
```

Create `server/src/test/setup.ts`:

```ts
import { beforeEach } from 'vitest';
import { prisma } from '../db.js';

beforeEach(async () => {
  await prisma.movie.deleteMany();
  await prisma.list.deleteMany();
  await prisma.user.deleteMany();
});
```

Create `server/src/test/helpers.ts`:

```ts
import request from 'supertest';
import { createApp } from '../app.js';

export const app = createApp();

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function signupUser(email = `user${Date.now()}@test.com`) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email, password: 'password123', defaultMode: 'ALONE' });
  return { token: res.body.token as string, user: res.body.user, email };
}
```

- [ ] **Step 8: Install dependencies and generate the Prisma client**

Run:
```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
npm install
```
Expected: `prisma generate` runs during postinstall; output shows `Generated Prisma Client`.

- [ ] **Step 9: Commit**

```bash
git add server
git commit -m "chore: scaffold server package with prisma schema"
```

---

### Task 3: Server app bootstrap (health check) with failing-then-passing test

**Files:**
- Create: `server/src/utils/http.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Create: `server/src/app.test.ts`

- [ ] **Step 1: Write the failing test `server/src/app.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './test/helpers.js';

describe('app', () => {
  it('returns ok from /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/app.test.ts`
Expected: FAIL — `Cannot find module '../app.js'`.

- [ ] **Step 3: Write `server/src/utils/http.ts`**

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
```

- [ ] **Step 4: Write `server/src/middleware/errorHandler.ts`**

```ts
import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/http.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
    res.status(409).json({ error: { message: 'That item already exists' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong' } });
};
```

- [ ] **Step 5: Write `server/src/config.ts`**

```ts
import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  tmdbApiKey: process.env.TMDB_API_KEY ?? '',
  omdbApiKey: process.env.OMDB_API_KEY ?? '',
};
```

- [ ] **Step 6: Write `server/src/app.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import listRoutes from './routes/list.routes.js';
import metadataRoutes from './routes/metadata.routes.js';
import importRoutes from './routes/import.routes.js';
import exportRoutes from './routes/export.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api', listRoutes);
  app.use('/api', metadataRoutes);
  app.use('/api', importRoutes);
  app.use('/api', exportRoutes);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  const dist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 7: Write `server/src/index.ts`**

```ts
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
```

- [ ] **Step 8: Write the four route files as stubs (empty routers so imports resolve)**

Each file: `server/src/routes/auth.routes.ts`, `list.routes.ts`, `metadata.routes.ts`, `import.routes.ts`, `export.routes.ts`:

```ts
import { Router } from 'express';

const router = Router();

export default router;
```

- [ ] **Step 9: Run test to verify it passes**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/app.test.ts`
Expected: PASS.

- [ ] **Step 10: Verify typecheck**

Run: `npm run typecheck --workspace server`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add server/src
git commit -m "feat: bootstrap express app with health check and error handling"
```

---

### Task 4: Auth endpoints (signup, login, me, update default mode)

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/routes/auth.routes.ts` (replace stub)
- Create: `server/src/test/auth.test.ts`

- [ ] **Step 1: Write the failing test `server/src/test/auth.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

describe('auth', () => {
  it('signs up a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'newuser@test.com', password: 'password123', defaultMode: 'US' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('newuser@test.com');
    expect(res.body.user.defaultMode).toBe('US');
  });

  it('rejects a duplicate email', async () => {
    const { email } = await signupUser();
    const res = await request(app).post('/api/auth/signup').send({ email, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    const { email } = await signupUser();
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects a wrong password', async () => {
    const { email } = await signupUser();
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns the current user via /me', async () => {
    const { token } = await signupUser();
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeTruthy();
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('updates the default mode', async () => {
    const { token } = await signupUser();
    const res = await request(app).patch('/api/auth/me').set(auth(token)).send({ defaultMode: 'US' });
    expect(res.status).toBe(200);
    expect(res.body.user.defaultMode).toBe('US');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/auth.test.ts`
Expected: FAIL — signup returns 404 (route not implemented).

- [ ] **Step 3: Write `server/src/middleware/auth.ts`**

```ts
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';
import { prisma } from '../db.js';

export interface AuthUser {
  id: string;
  email: string;
  defaultMode: 'ALONE' | 'US';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Not authenticated');
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new HttpError(401, 'Not authenticated');
    req.user = { id: user.id, email: user.email, defaultMode: user.defaultMode };
    next();
  } catch (err) {
    if (err instanceof HttpError) next(err);
    else next(new HttpError(401, 'Invalid or expired token'));
  }
};
```

- [ ] **Step 4: Write `server/src/routes/auth.routes.ts`** (replace stub)

```ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const MODES = ['ALONE', 'US'] as const;

function toUserJson(user: { id: string; email: string; defaultMode: string }) {
  return { id: user.id, email: user.email, defaultMode: user.defaultMode };
}

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, defaultMode } = req.body ?? {};
    if (typeof email !== 'string' || !email.includes('@')) throw new HttpError(400, 'A valid email is required');
    if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    const mode = MODES.includes(defaultMode) ? defaultMode : 'ALONE';
    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) throw new HttpError(409, 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email: cleanEmail, passwordHash, defaultMode: mode } });
    await prisma.list.create({ data: { userId: user.id, mode: 'ALONE' } });
    await prisma.list.create({ data: { userId: user.id, mode: 'US' } });
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.status(201).json({ token, user: toUserJson(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') throw new HttpError(400, 'Email and password are required');
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.status(200).json({ token, user: toUserJson(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toUserJson(req.user!) });
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { defaultMode } = req.body ?? {};
    if (!MODES.includes(defaultMode)) throw new HttpError(400, 'defaultMode must be ALONE or US');
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: { defaultMode } });
    res.json({ user: toUserJson(user) });
  }),
);

export default router;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/auth.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/auth.ts server/src/routes/auth.routes.ts server/src/test/auth.test.ts
git commit -m "feat: add jwt auth with signup, login, and profile"
```

---

### Task 5: Lists & movies CRUD with duplicate blocking

**Files:**
- Create: `server/src/services/lists.service.ts`
- Create: `server/src/utils/serializers.ts`
- Create: `server/src/routes/list.routes.ts` (replace stub)
- Create: `server/src/test/movies.test.ts`

- [ ] **Step 1: Write the failing test `server/src/test/movies.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

describe('lists & movies', () => {
  it('adds a movie with metadata and lists it', async () => {
    const { token } = await signupUser();
    const add = await request(app)
      .post('/api/lists/ALONE/movies')
      .set(auth(token))
      .send({
        title: 'Inception',
        watchedDate: '2026-01-01',
        personalRating: 9,
        watchStatus: 'FINISHED',
        metadata: {
          posterUrl: 'http://x/p.jpg',
          releaseDate: '2010-07-16',
          providerRatings: { tmdb: 8.4 },
          provider: 'TMDB',
        },
      });
    expect(add.status).toBe(201);
    expect(add.body.movie.title).toBe('Inception');
    expect(add.body.movie.posterUrl).toBe('http://x/p.jpg');

    const list = await request(app).get('/api/lists/ALONE/movies').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.movies).toHaveLength(1);
  });

  it('blocks duplicate titles in the same list', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const dup = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    expect(dup.status).toBe(409);
  });

  it('allows the same movie in both lists', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const us = await request(app).post('/api/lists/US/movies').set(auth(token)).send({ title: 'Inception' });
    expect(us.status).toBe(201);
  });

  it('rejects an out-of-range rating', async () => {
    const { token } = await signupUser();
    const res = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'X', personalRating: 11 });
    expect(res.status).toBe(400);
  });

  it('rejects a missing title', async () => {
    const { token } = await signupUser();
    const res = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('edits and deletes a movie', async () => {
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const id = add.body.movie.id;
    const patch = await request(app)
      .patch(`/api/lists/ALONE/movies/${id}`)
      .set(auth(token))
      .send({ personalRating: 8, watchStatus: 'WATCHING', title: 'Inception 2' });
    expect(patch.status).toBe(200);
    expect(patch.body.movie.personalRating).toBe(8);
    expect(patch.body.movie.title).toBe('Inception 2');
    const del = await request(app).delete(`/api/lists/ALONE/movies/${id}`).set(auth(token));
    expect(del.status).toBe(200);
  });

  it('returns 404 for a movie in the wrong list', async () => {
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const res = await request(app).patch(`/api/lists/US/movies/${add.body.movie.id}`).set(auth(token)).send({ personalRating: 5 });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/movies.test.ts`
Expected: FAIL — 404s.

- [ ] **Step 3: Write `server/src/services/lists.service.ts`**

```ts
import { prisma } from '../db.js';
import { HttpError } from '../utils/http.js';

export const MODES = ['ALONE', 'US'] as const;
export type Mode = (typeof MODES)[number];

export function parseMode(mode: string): Mode {
  if (!MODES.includes(mode as Mode)) throw new HttpError(400, 'mode must be ALONE or US');
  return mode as Mode;
}

export async function getUserList(userId: string, mode: Mode) {
  const list = await prisma.list.findUnique({ where: { userId_mode: { userId, mode } } });
  if (!list) throw new HttpError(404, 'List not found');
  return list;
}
```

- [ ] **Step 4: Write `server/src/utils/serializers.ts`**

```ts
import type { Movie } from '@prisma/client';

export function toMovieJson(m: Movie) {
  return {
    id: m.id,
    title: m.title,
    watchedDate: m.watchedDate,
    personalRating: m.personalRating,
    watchStatus: m.watchStatus,
    posterUrl: m.posterUrl,
    releaseDate: m.releaseDate,
    providerRatings: m.providerRatings,
    metadataProvider: m.metadataProvider,
    imported: m.imported,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
```

- [ ] **Step 5: Write `server/src/routes/list.routes.ts`** (replace stub)

```ts
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { getUserList, parseMode } from '../services/lists.service.js';

const router = Router();
const STATUSES = ['PLANNED', 'WATCHING', 'FINISHED'] as const;

router.get(
  '/lists/:mode/movies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const movies = await prisma.movie.findMany({ where: { listId: list.id }, orderBy: { createdAt: 'desc' } });
    res.json({ movies: movies.map(toMovieJson) });
  }),
);

router.post(
  '/lists/:mode/movies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const { title, watchedDate, personalRating, watchStatus, metadata } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'Title is required');
    const cleanTitle = title.trim();
    const existing = await prisma.movie.findUnique({
      where: { listId_title: { listId: list.id, title: cleanTitle } },
    });
    if (existing) throw new HttpError(409, `"${cleanTitle}" is already in your ${mode === 'ALONE' ? 'Alone' : 'US'} list`);
    if (personalRating != null && (typeof personalRating !== 'number' || personalRating < 1 || personalRating > 10)) {
      throw new HttpError(400, 'personalRating must be between 1 and 10');
    }
    if (watchedDate != null && typeof watchedDate !== 'string') throw new HttpError(400, 'watchedDate must be a date string');
    const status = STATUSES.includes(watchStatus) ? watchStatus : 'PLANNED';
    const movie = await prisma.movie.create({
      data: {
        listId: list.id,
        title: cleanTitle,
        watchedDate: watchedDate ? new Date(watchedDate) : null,
        personalRating: personalRating ?? null,
        watchStatus: status,
        posterUrl: metadata?.posterUrl ?? null,
        releaseDate: metadata?.releaseDate ?? null,
        providerRatings: metadata?.providerRatings ?? undefined,
        metadataProvider: metadata?.provider ?? null,
        imported: false,
      },
    });
    res.status(201).json({ movie: toMovieJson(movie) });
  }),
);

router.patch(
  '/lists/:mode/movies/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const movie = await prisma.movie.findFirst({ where: { id: req.params.id, listId: list.id } });
    if (!movie) throw new HttpError(404, 'Movie not found');
    const { title, watchedDate, personalRating, watchStatus } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) {
      const cleanTitle = title.trim();
      if (cleanTitle !== movie.title) {
        const dup = await prisma.movie.findUnique({
          where: { listId_title: { listId: list.id, title: cleanTitle } },
        });
        if (dup) throw new HttpError(409, `"${cleanTitle}" is already in this list`);
      }
      data.title = cleanTitle;
    }
    if (watchedDate !== undefined) data.watchedDate = watchedDate === null ? null : new Date(watchedDate);
    if (personalRating !== undefined) {
      if (personalRating !== null && (typeof personalRating !== 'number' || personalRating < 1 || personalRating > 10)) {
        throw new HttpError(400, 'personalRating must be between 1 and 10 or null');
      }
      data.personalRating = personalRating;
    }
    if (watchStatus !== undefined) {
      if (!STATUSES.includes(watchStatus)) throw new HttpError(400, 'Invalid watch status');
      data.watchStatus = watchStatus;
    }
    const updated = await prisma.movie.update({ where: { id: movie.id }, data });
    res.json({ movie: toMovieJson(updated) });
  }),
);

router.delete(
  '/lists/:mode/movies/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const movie = await prisma.movie.findFirst({ where: { id: req.params.id, listId: list.id } });
    if (!movie) throw new HttpError(404, 'Movie not found');
    await prisma.movie.delete({ where: { id: movie.id } });
    res.json({ success: true });
  }),
);

export default router;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/movies.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 7: Commit**

```bash
git add server/src/services/lists.service.ts server/src/utils/serializers.ts server/src/routes/list.routes.ts server/src/test/movies.test.ts
git commit -m "feat: add lists and movies CRUD with duplicate blocking"
```

---

### Task 6: Metadata search (TMDB + OMDb) with mocked providers

**Files:**
- Create: `server/src/services/metadata.service.ts`
- Create: `server/src/routes/metadata.routes.ts` (replace stub)
- Create: `server/src/test/metadata.test.ts`

- [ ] **Step 1: Write the failing test `server/src/test/metadata.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function mockProviders() {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('themoviedb.org')) {
      const q = new URL(url).searchParams.get('query') ?? 'Inception';
      return {
        ok: true,
        json: async () => ({
          results: [
            { id: 1, title: q, media_type: 'movie', release_date: '2010-07-16', poster_path: '/x.jpg', vote_average: 8.4 },
          ],
        }),
      };
    }
    if (url.includes('omdbapi.com') && url.includes('i=')) {
      return {
        ok: true,
        json: async () => ({ imdbRating: '8.8', Poster: 'https://i/img.jpg', Released: '16 Jul 2010' }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        Response: 'True',
        Search: [{ imdbID: 'tt1375666', Title: 'Inception', Year: '2010', Poster: 'https://i/img.jpg', Type: 'movie' }],
      }),
    };
  });
}

describe('metadata search', () => {
  beforeEach(() => fetchMock.mockReset());
  afterEach(() => vi.unstubAllGlobals());

  it('returns merged results from TMDB and OMDb', async () => {
    mockProviders();
    const { token } = await signupUser();
    const res = await request(app).get('/api/metadata/search?query=Inception').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    const inception = res.body.results.find((r: { title: string }) => r.title === 'Inception');
    expect(inception).toBeTruthy();
    expect(inception.posterUrl).toBeTruthy();
  });

  it('returns empty results for a blank query', async () => {
    const { token } = await signupUser();
    const res = await request(app).get('/api/metadata/search?query=').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/metadata/search?query=Inception');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/metadata.test.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Write `server/src/services/metadata.service.ts`**

```ts
import { config } from '../config.js';

export interface MetadataResult {
  id: string;
  title: string;
  year: string | null;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  releaseDate: string | null;
  providerRatings: Record<string, number> | null;
  provider: 'TMDB' | 'OMDB';
}

const cache = new Map<string, MetadataResult[]>();
const TTL_MS = 5 * 60 * 1000;

async function searchTmdb(query: string): Promise<MetadataResult[]> {
  if (!config.tmdbApiKey) return [];
  const url = new URL('https://api.themoviedb.org/3/search/multi');
  url.searchParams.set('api_key', config.tmdbApiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('include_adult', 'false');
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name?: string;
      title?: string;
      release_date?: string;
      first_air_date?: string;
      media_type?: string;
      poster_path?: string | null;
      vote_average?: number;
    }>;
  };
  return (data.results ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => ({
      id: `tmdb-${r.media_type}-${r.id}`,
      title: r.title ?? r.name ?? '',
      year: (r.release_date ?? r.first_air_date ?? '').slice(0, 4) || null,
      mediaType: r.media_type === 'movie' ? ('movie' as const) : ('tv' as const),
      posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      releaseDate: r.release_date ?? r.first_air_date ?? null,
      providerRatings: r.vote_average ? { tmdb: Number(r.vote_average.toFixed(1)) } : null,
      provider: 'TMDB' as const,
    }));
}

async function searchOmdb(query: string): Promise<MetadataResult[]> {
  if (!config.omdbApiKey) return [];
  const searchUrl = new URL('https://www.omdbapi.com/');
  searchUrl.searchParams.set('apikey', config.omdbApiKey);
  searchUrl.searchParams.set('s', query);
  searchUrl.searchParams.set('type', 'movie');
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];
  const data = (await searchRes.json()) as {
    Response?: string;
    Search?: Array<{ imdbID: string; Title: string; Year: string; Poster: string; Type: string }>;
  };
  if (data.Response !== 'True') return [];
  const results = await Promise.all(
    (data.Search ?? []).slice(0, 5).map(async (r) => {
      const detailUrl = new URL('https://www.omdbapi.com/');
      detailUrl.searchParams.set('apikey', config.omdbApiKey);
      detailUrl.searchParams.set('i', r.imdbID);
      const detail = (await fetch(detailUrl)
        .then((res) => res.json())
        .catch(() => ({}))) as { imdbRating?: string; Poster?: string; Released?: string };
      return {
        id: `omdb-${r.imdbID}`,
        title: r.Title,
        year: r.Year?.slice(0, 4) || null,
        mediaType: r.Type === 'series' ? ('tv' as const) : ('movie' as const),
        posterUrl:
          detail.Poster && detail.Poster !== 'N/A'
            ? detail.Poster
            : r.Poster && r.Poster !== 'N/A'
              ? r.Poster
              : null,
        releaseDate: detail.Released && detail.Released !== 'N/A' ? detail.Released : null,
        providerRatings: detail.imdbRating && detail.imdbRating !== 'N/A' ? { imdb: Number(detail.imdbRating) } : null,
        provider: 'OMDB' as const,
      };
    }),
  );
  return results;
}

function dedupe(results: MetadataResult[]): MetadataResult[] {
  const seen = new Set<string>();
  const out: MetadataResult[] = [];
  for (const r of results) {
    const key = `${r.title.toLowerCase()}|${r.year ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function searchMetadata(query: string): Promise<MetadataResult[]> {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  const cached = cache.get(key);
  if (cached) return cached;
  const [tmdb, omdb] = await Promise.all([searchTmdb(key), searchOmdb(key)]);
  const merged = dedupe([...tmdb, ...omdb]);
  cache.set(key, merged);
  setTimeout(() => cache.delete(key), TTL_MS);
  return merged;
}

export async function fetchMetadataForTitle(title: string): Promise<MetadataResult | null> {
  const results = await searchMetadata(title);
  const exact = results.find((r) => r.title.toLowerCase() === title.toLowerCase());
  return exact ?? results[0] ?? null;
}
```

- [ ] **Step 4: Write `server/src/routes/metadata.routes.ts`** (replace stub)

```ts
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { fetchMetadataForTitle, searchMetadata } from '../services/metadata.service.js';

const router = Router();

router.get(
  '/metadata/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = typeof req.query.query === 'string' ? req.query.query : '';
    const results = await searchMetadata(query);
    res.json({ results });
  }),
);

router.post(
  '/movies/:id/metadata',
  requireAuth,
  asyncHandler(async (req, res) => {
    const movie = await prisma.movie.findUnique({ where: { id: req.params.id } });
    if (!movie) throw new HttpError(404, 'Movie not found');
    const owned = await prisma.list.findFirst({ where: { id: movie.listId, userId: req.user!.id } });
    if (!owned) throw new HttpError(404, 'Movie not found');
    const meta = await fetchMetadataForTitle(movie.title);
    if (!meta) throw new HttpError(404, `No metadata found for "${movie.title}"`);
    const updated = await prisma.movie.update({
      where: { id: movie.id },
      data: {
        posterUrl: meta.posterUrl,
        releaseDate: meta.releaseDate,
        providerRatings: meta.providerRatings as Prisma.InputJsonValue,
        metadataProvider: meta.provider,
      },
    });
    res.json({ movie: toMovieJson(updated) });
  }),
);

router.post(
  '/import/metadata',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ids } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0) throw new HttpError(400, 'ids must be a non-empty array');
    const owned = await prisma.list.findMany({ where: { userId: req.user!.id }, select: { id: true } });
    const ownedIds = new Set(owned.map((l) => l.id));
    const movies = await prisma.movie.findMany({ where: { id: { in: ids } } });
    const updated = [];
    for (const movie of movies.filter((m) => ownedIds.has(m.listId))) {
      const meta = await fetchMetadataForTitle(movie.title);
      if (!meta) continue;
      updated.push(
        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            posterUrl: meta.posterUrl,
            releaseDate: meta.releaseDate,
            providerRatings: meta.providerRatings as Prisma.InputJsonValue,
            metadataProvider: meta.provider,
          },
        }),
      );
    }
    res.json({ movies: updated.map(toMovieJson) });
  }),
);

export default router;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/metadata.test.ts`
Expected: PASS (all 3 tests).

- [ ] **Step 6: Add per-movie and bulk metadata tests to `server/src/test/metadata.test.ts`** (append)

```ts
describe('metadata fetch for stored movies', () => {
  beforeEach(() => fetchMock.mockReset());
  afterEach(() => vi.unstubAllGlobals());

  it('fetches metadata for a title-only movie', async () => {
    mockProviders();
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const id = add.body.movie.id;
    const res = await request(app).post(`/api/movies/${id}/metadata`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.movie.posterUrl).toBeTruthy();
    expect(res.body.movie.metadataProvider).toBe('TMDB');
  });

  it('bulk-fetches metadata for several movies', async () => {
    mockProviders();
    const { token } = await signupUser();
    const a = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const b = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Interstellar' });
    const res = await request(app).post('/api/import/metadata').set(auth(token)).send({ ids: [a.body.movie.id, b.body.movie.id] });
    expect(res.status).toBe(200);
    expect(res.body.movies.length).toBe(2);
  });

  it('returns 404 when no metadata exists for a title', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Zzz No Such Film' });
    const res = await request(app).post(`/api/movies/${add.body.movie.id}/metadata`).set(auth(token));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 7: Run full metadata tests**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/metadata.test.ts`
Expected: PASS (all 6 tests).

- [ ] **Step 8: Commit**

```bash
git add server/src/services/metadata.service.ts server/src/routes/metadata.routes.ts server/src/test/metadata.test.ts
git commit -m "feat: add tmdb and omdb metadata search and fetch"
```

---

### Task 7: Import service (text / PDF / image) and route

**Files:**
- Create: `server/src/types/pdf-parse.d.ts`
- Create: `server/src/services/import.service.ts`
- Create: `server/src/routes/import.routes.ts` (replace stub)
- Create: `server/src/test/import.test.ts`

- [ ] **Step 1: Write the failing test `server/src/test/import.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

vi.mock('../services/import.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/import.service.js')>();
  return {
    ...actual,
    parsePdfFile: vi.fn(async () => ({ titles: ['From PDF'], skippedLines: [] })),
    parseImageFile: vi.fn(async () => ({ titles: ['From Image'], skippedLines: [] })),
  };
});

describe('import', () => {
  it('imports titles from a text file into the current list', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('1. Inception\n2. Interstellar\n3. The Dark Knight'), 'movies.txt');
    expect(res.status).toBe(201);
    expect(res.body.movies.map((m: { title: string }) => m.title)).toEqual([
      'Inception',
      'Interstellar',
      'The Dark Knight',
    ]);
    expect(res.body.movies.every((m: { imported: boolean }) => m.imported)).toBe(true);
  });

  it('skips duplicates already in the list', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('Inception\nTenet'), 'movies.txt');
    expect(res.body.movies.map((m: { title: string }) => m.title)).toEqual(['Tenet']);
  });

  it('imports PDF titles via the pdf parser', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/US/import')
      .set(auth(token))
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'movies.pdf');
    expect(res.status).toBe(201);
    expect(res.body.movies[0].title).toBe('From PDF');
  });

  it('imports image titles via OCR', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('fake-image-bytes'), 'movies.png');
    expect(res.status).toBe(201);
    expect(res.body.movies[0].title).toBe('From Image');
  });

  it('returns 422 when no titles are found', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('1234'), 'movies.txt');
    expect(res.status).toBe(422);
  });

  it('rejects an unsupported file type', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('x'), 'movies.exe');
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/import.test.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Write `server/src/types/pdf-parse.d.ts`**

```ts
declare module 'pdf-parse/lib/pdf-parse.js' {
  const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}
```

- [ ] **Step 4: Write `server/src/services/import.service.ts`**

```ts
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { createWorker } from 'tesseract.js';
import { HttpError } from '../utils/http.js';

export interface ParsedTitles {
  titles: string[];
  skippedLines: string[];
}

export function parseTitlesFromText(text: string): ParsedTitles {
  const titles: string[] = [];
  const skippedLines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[\s\-*\d.)]+/, '').trim();
    if (!line) continue;
    if (line.length >= 2 && !/^[-*\d.()\s]+$/.test(line)) titles.push(line);
    else skippedLines.push(raw);
  }
  return { titles, skippedLines };
}

export async function parseTextFile(buffer: Buffer): Promise<ParsedTitles> {
  return parseTitlesFromText(buffer.toString('utf-8'));
}

export async function parsePdfFile(buffer: Buffer): Promise<ParsedTitles> {
  const data = await pdfParse(buffer);
  return parseTitlesFromText(data.text ?? '');
}

export async function parseImageFile(buffer: Buffer): Promise<ParsedTitles> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return parseTitlesFromText(data.text ?? '');
  } finally {
    await worker.terminate();
  }
}

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'bmp'];
const TEXT_EXTS = ['txt', 'text', 'md', 'csv'];

export async function parseFile(ext: string, buffer: Buffer): Promise<ParsedTitles> {
  if (ext === 'pdf') return parsePdfFile(buffer);
  if (IMAGE_EXTS.includes(ext)) return parseImageFile(buffer);
  if (TEXT_EXTS.includes(ext)) return parseTextFile(buffer);
  throw new HttpError(400, 'Unsupported file type. Use text, PDF, or an image');
}
```

- [ ] **Step 5: Write `server/src/routes/import.routes.ts`** (replace stub)

```ts
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { getUserList, parseMode } from '../services/lists.service.js';
import { parseFile } from '../services/import.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post(
  '/lists/:mode/import',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    if (!req.file) throw new HttpError(400, 'A file is required');
    const ext = req.file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const parsed = await parseFile(ext, req.file.buffer);
    if (parsed.titles.length === 0) throw new HttpError(422, 'No movie titles could be read from this file');

    const existing = await prisma.movie.findMany({ where: { listId: list.id }, select: { title: true } });
    const existingSet = new Set(existing.map((m) => m.title.toLowerCase()));
    const movies = [];
    for (const title of parsed.titles) {
      if (existingSet.has(title.toLowerCase())) continue;
      existingSet.add(title.toLowerCase());
      movies.push(
        await prisma.movie.create({
          data: { listId: list.id, title, imported: true, metadataProvider: 'IMPORT' },
        }),
      );
    }
    res.status(201).json({ movies: movies.map(toMovieJson), skippedLines: parsed.skippedLines });
  }),
);

export default router;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/import.test.ts`
Expected: PASS (all 6 tests).

- [ ] **Step 7: Commit**

```bash
git add server/src/types/pdf-parse.d.ts server/src/services/import.service.ts server/src/routes/import.routes.ts server/src/test/import.test.ts
git commit -m "feat: add text pdf and image import with title extraction"
```

---

### Task 8: Themed PDF export

**Files:**
- Create: `server/src/services/export.service.ts`
- Create: `server/src/routes/export.routes.ts` (replace stub)
- Create: `server/src/test/export.test.ts`

- [ ] **Step 1: Write the failing test `server/src/test/export.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

describe('pdf export', () => {
  it('returns a themed PDF for the current list', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception', personalRating: 9 });
    const res = await request(app).get('/api/lists/ALONE/export/pdf').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.length).toBeGreaterThan(500);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/lists/ALONE/export/pdf');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/export.test.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Write `server/src/services/export.service.ts`**

```ts
import PDFDocument from 'pdfkit';
import { prisma } from '../db.js';
import { getUserList, type Mode } from './lists.service.js';

const BG = '#1b1233';
const CARD = '#2a1b52';
const PINK = '#ff6ac1';
const YELLOW = '#ffd166';
const GREEN = '#4ade80';
const TEXT = '#f5f0ff';
const MUTED = '#b6a8d8';

async function fetchPoster(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function generateListPdf(userId: string, mode: Mode): Promise<Buffer> {
  const list = await getUserList(userId, mode);
  const movies = await prisma.movie.findMany({ where: { listId: list.id }, orderBy: { createdAt: 'desc' } });

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG);
  doc.fillColor(YELLOW).font('Helvetica-Bold').fontSize(26).text(`${mode === 'ALONE' ? 'Alone' : 'US'} List`, { align: 'center' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(11).text(`my movies  ·  generated ${formatDate(new Date())}`, { align: 'center' });
  doc.moveDown(0.5);

  if (movies.length === 0) {
    doc.fillColor(TEXT).font('Helvetica').fontSize(14).text('No movies yet.', { align: 'center' });
    doc.end();
    return done;
  }

  for (const movie of movies) {
    if (doc.y > doc.page.height - 170) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG);
    }
    doc.save();
    doc.rect(48, doc.y, doc.page.width - 96, 150).fill(CARD);
    const poster = movie.posterUrl ? await fetchPoster(movie.posterUrl) : null;
    if (poster) {
      try {
        doc.image(poster, 64, doc.y + 12, { width: 90, height: 126 });
      } catch {
        /* broken poster - skip */
      }
    }
    const x = 170;
    const top = doc.y;
    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(16).text(movie.title, x, top + 18, { width: doc.page.width - x - 64 });
    const meta: string[] = [];
    if (movie.releaseDate) meta.push(movie.releaseDate.slice(0, 4));
    const ratings = movie.providerRatings as Record<string, number> | null;
    if (ratings?.tmdb) meta.push(`TMDB ${ratings.tmdb}`);
    if (ratings?.imdb) meta.push(`IMDb ${ratings.imdb}`);
    doc.fillColor(GREEN).font('Helvetica').fontSize(11).text(meta.join('  ·  ') || '—', x, top + 46, { width: doc.page.width - x - 64 });
    const statusLabel = movie.watchStatus.toLowerCase();
    const dateLabel = movie.watchedDate ? formatDate(movie.watchedDate) : 'not dated';
    doc.fillColor(PINK).fontSize(12).text(`${statusLabel}  ·  ${dateLabel}`, x, top + 72, { width: doc.page.width - x - 64 });
    if (movie.personalRating) doc.fillColor(YELLOW).fontSize(12).text('★'.repeat(movie.personalRating), x, top + 96, { width: doc.page.width - x - 64 });
    doc.restore();
    doc.y = top + 158;
  }

  doc.end();
  return done;
}
```

- [ ] **Step 4: Write `server/src/routes/export.routes.ts`** (replace stub)

```ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { parseMode } from '../services/lists.service.js';
import { generateListPdf } from '../services/export.service.js';

const router = Router();

router.get(
  '/lists/:mode/export/pdf',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const pdf = await generateListPdf(req.user!.id, mode);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${mode.toLowerCase()}-list.pdf"`);
    res.send(pdf);
  }),
);

export default router;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `DATABASE_URL=postgresql://tusharshukla@localhost:5432/movie_list_test npm test --workspace server -- --run src/test/export.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Run all server tests + typecheck**

Run: `npm test --workspace server && npm run typecheck --workspace server`
Expected: all suites PASS, typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/export.service.ts server/src/routes/export.routes.ts server/src/test/export.test.ts
git commit -m "feat: add themed pdf export of the current list"
```

---

### Task 9: Web package scaffold

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/vite-env.d.ts`
- Create: `web/src/theme.css`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/test/setup.ts`

- [ ] **Step 1: Write `web/package.json`**

```json
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.51.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Write `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `web/vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Write `web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>my movies</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `web/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 6: Write `web/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Write `web/src/theme.css`** (retro video-game theme)

```css
:root {
  --bg: #1a1033;
  --bg-2: #241548;
  --card: #2c1c5a;
  --card-border: #ff6ac1;
  --pink: #ff6ac1;
  --yellow: #ffd166;
  --green: #4ade80;
  --cyan: #67e8f9;
  --text: #f5f0ff;
  --muted: #b6a8d8;
  --danger: #ff5d7a;
  --shadow: 0 6px 0 rgba(0, 0, 0, 0.35);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Courier New', ui-monospace, monospace;
  background:
    radial-gradient(circle at 20% 10%, rgba(255, 106, 193, 0.12), transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(103, 232, 249, 0.1), transparent 40%),
    var(--bg);
  color: var(--text);
  min-height: 100vh;
}

button {
  font-family: inherit;
  border: 2px solid var(--text);
  background: var(--bg-2);
  color: var(--text);
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform 0.05s ease, filter 0.1s ease;
}
button:hover { filter: brightness(1.15); }
button:active { transform: translateY(3px); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.primary {
  background: var(--pink);
  border-color: var(--pink);
  color: #1a1033;
  font-weight: bold;
}
button.danger { background: var(--danger); border-color: var(--danger); color: #1a1033; }
button.mini-btn { font-size: 11px; padding: 4px 8px; }

input, select {
  font-family: inherit;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 2px solid var(--muted);
  background: #130b28;
  color: var(--text);
  margin-bottom: 10px;
}
input:focus, select:focus { outline: 2px solid var(--cyan); border-color: var(--cyan); }

label { display: block; margin: 8px 0 4px; font-size: 13px; color: var(--muted); }

.page { max-width: 1100px; margin: 0 auto; padding: 16px; }

.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-bottom: 3px dashed var(--card-border);
  margin-bottom: 16px;
}
.logo { color: var(--yellow); margin: 0; font-size: 26px; text-shadow: 3px 3px 0 var(--pink); }
.topbar-right { display: flex; gap: 10px; margin-left: auto; flex-wrap: wrap; }

.mode-toggle { display: flex; gap: 4px; background: var(--bg-2); padding: 4px; border-radius: 10px; }
.mode-toggle button { box-shadow: none; border: none; }
.mode-toggle button.active { background: var(--green); color: #1a1033; font-weight: bold; }

.search-bar { font-size: 16px; }

.notice-area { min-height: 24px; margin-bottom: 8px; }
.notice { padding: 10px 14px; border-radius: 8px; margin-bottom: 10px; border: 2px solid; }
.notice.success { border-color: var(--green); color: var(--green); }
.notice.error { border-color: var(--danger); color: var(--danger); }
.no-results { color: var(--muted); text-align: center; padding: 24px; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
  margin-top: 16px;
}

.card {
  background: var(--card);
  border: 2px solid var(--bg-2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}
.card-highlight {
  border-color: var(--yellow);
  animation: blink 0.8s steps(2) infinite;
}
@keyframes blink { 50% { border-color: var(--green); } }

.card-poster { position: relative; aspect-ratio: 2 / 3; background: var(--bg-2); }
.card-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.poster-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: var(--muted);
  background:
    repeating-linear-gradient(45deg, var(--bg-2), var(--bg-2) 12px, #331f66 12px, #331f66 24px);
}
.card-poster .mini-btn { position: absolute; bottom: 8px; left: 8px; }

.card-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.card-body h3 { margin: 0; font-size: 17px; color: var(--text); }
.meta { margin: 0; color: var(--muted); font-size: 12px; }
.badge-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; border: 2px solid; text-transform: uppercase; }
.badge-planned { color: var(--cyan); border-color: var(--cyan); }
.badge-watching { color: var(--yellow); border-color: var(--yellow); }
.badge-finished { color: var(--green); border-color: var(--green); }
.rating { color: var(--yellow); font-size: 13px; }
.date { color: var(--muted); font-size: 12px; }
.card-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 8px; flex-wrap: wrap; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 5, 25, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: var(--bg-2);
  border: 3px solid var(--pink);
  border-radius: 14px;
  padding: 20px;
  width: min(480px, 90vw);
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow);
}
.modal h2 { margin: 0 0 10px; color: var(--yellow); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }

.suggestions {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  border: 2px solid var(--cyan);
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
  background: #130b28;
}
.suggestions li {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  cursor: pointer;
}
.suggestions li:hover { background: var(--card); }
.suggestions img, .suggestions .poster-placeholder { width: 40px; height: 56px; object-fit: cover; border-radius: 4px; }
.suggestions .poster-placeholder { font-size: 12px; }
.selected-meta { color: var(--green); font-size: 13px; margin: 0 0 6px; }

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.auth-card {
  background: var(--bg-2);
  border: 3px solid var(--pink);
  border-radius: 14px;
  padding: 28px;
  width: min(360px, 90vw);
  box-shadow: var(--shadow);
  text-align: center;
}
.auth-card h1 { color: var(--yellow); text-shadow: 3px 3px 0 var(--pink); margin: 0 0 4px; }
.auth-card p { color: var(--muted); }
.auth-card .alt { font-size: 13px; }
.auth-card .alt a { color: var(--cyan); }

.loading { text-align: center; padding: 40px; color: var(--muted); }
```

- [ ] **Step 8: Write `web/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './theme.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 9: Write `web/src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Protected><HomePage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 10: Verify typecheck passes**

Run: `npm run typecheck --workspace web`
Expected: no errors (some modules not created yet — see Task 10; if typecheck errors about missing modules, run this again after Task 10 and continue).

- [ ] **Step 11: Commit**

```bash
git add web
git commit -m "chore: scaffold web app with retro theme"
```

---

### Task 10: API client + auth context + login/signup pages

**Files:**
- Create: `web/src/api/client.ts`
- Create: `web/src/auth/AuthContext.tsx`
- Create: `web/src/pages/LoginPage.tsx`
- Create: `web/src/pages/SignupPage.tsx`
- Create: `web/src/pages/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing test `web/src/pages/LoginPage.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const loginMock = vi.fn();
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  beforeEach(() => loginMock.mockReset());

  it('submits the email and password', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(loginMock).toHaveBeenCalledWith('a@b.com', 'password123');
  });

  it('shows an error message on failure', async () => {
    loginMock.mockRejectedValueOnce(new Error('Invalid email or password'));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace web -- --run src/pages/LoginPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `web/src/api/client.ts`**

```ts
export interface User {
  id: string;
  email: string;
  defaultMode: 'ALONE' | 'US';
}

export interface Movie {
  id: string;
  title: string;
  watchedDate: string | null;
  personalRating: number | null;
  watchStatus: 'PLANNED' | 'WATCHING' | 'FINISHED';
  posterUrl: string | null;
  releaseDate: string | null;
  providerRatings: Record<string, number> | null;
  metadataProvider: 'TMDB' | 'OMDB' | 'IMPORT' | 'MANUAL' | null;
  imported: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetadataResult {
  id: string;
  title: string;
  year: string | null;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  releaseDate: string | null;
  providerRatings: Record<string, number> | null;
  provider: 'TMDB' | 'OMDB';
}

const TOKEN_KEY = 'movie_list_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    let message = 'Something went wrong';
    try {
      const body = await res.json();
      message = body.error?.message ?? message;
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (email: string, password: string, defaultMode: string) =>
    request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, defaultMode }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/auth/me'),
  updateMe: (defaultMode: string) =>
    request<{ user: User }>('/auth/me', { method: 'PATCH', body: JSON.stringify({ defaultMode }) }),
  listMovies: (mode: string) => request<{ movies: Movie[] }>(`/lists/${mode}/movies`),
  addMovie: (
    mode: string,
    body: {
      title: string;
      watchedDate: string | null;
      personalRating: number | null;
      watchStatus: string;
      metadata?: MetadataResult | null;
    },
  ) =>
    request<{ movie: Movie }>(`/lists/${mode}/movies`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMovie: (
    mode: string,
    id: string,
    body: Partial<{
      title: string;
      watchedDate: string | null;
      personalRating: number | null;
      watchStatus: string;
    }>,
  ) =>
    request<{ movie: Movie }>(`/lists/${mode}/movies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMovie: (mode: string, id: string) =>
    request<{ success: boolean }>(`/lists/${mode}/movies/${id}`, { method: 'DELETE' }),
  searchMetadata: (query: string) =>
    request<{ results: MetadataResult[] }>(`/metadata/search?query=${encodeURIComponent(query)}`),
  fetchMetadata: (id: string) =>
    request<{ movie: Movie }>(`/movies/${id}/metadata`, { method: 'POST' }),
  fetchBulkMetadata: (ids: string[]) =>
    request<{ movies: Movie[] }>('/import/metadata', { method: 'POST', body: JSON.stringify({ ids }) }),
  importFile: (mode: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ movies: Movie[]; skippedLines: string[] }>(`/lists/${mode}/import`, {
      method: 'POST',
      body: form,
    });
  },
  downloadPdf: async (mode: string) => {
    const token = getToken();
    const res = await fetch(`/api/lists/${mode}/export/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode.toLowerCase()}-list.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
```

- [ ] **Step 4: Write `web/src/auth/AuthContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken, type User } from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, defaultMode: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          const { user } = await api.me();
          setUser(user);
        }
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    setToken(token);
    setUser(user);
  }, []);

  const signup = useCallback(async (email: string, password: string, defaultMode: string) => {
    const { token, user } = await api.signup(email, password, defaultMode);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Write `web/src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>my movies</h1>
        <p>Sign in to your tracker</p>
        {error && <div className="notice error">{error}</div>}
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="primary" disabled={busy}>Sign in</button>
        <p className="alt">No account? <Link to="/signup">Sign up</Link></p>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Write `web/src/pages/SignupPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'ALONE' | 'US'>('ALONE');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(email, password, mode);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>my movies</h1>
        <p>Create your tracker</p>
        {error && <div className="notice error">{error}</div>}
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <label htmlFor="signup-password">Password (min 8 characters)</label>
        <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <label htmlFor="signup-mode">What will this list be for?</label>
        <select id="signup-mode" value={mode} onChange={(e) => setMode(e.target.value as 'ALONE' | 'US')}>
          <option value="ALONE">Alone — I watched it solo</option>
          <option value="US">US — we watched it together</option>
        </select>
        <button className="primary" disabled={busy}>Sign up</button>
        <p className="alt">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test --workspace web -- --run src/pages/LoginPage.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 8: Verify typecheck**

Run: `npm run typecheck --workspace web`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add web/src/api web/src/auth web/src/pages
git commit -m "feat: add api client, auth context, and login/signup pages"
```

---

### Task 11: Home page — mode toggle, grid, cross-list search

**Files:**
- Create: `web/src/components/ModeToggle.tsx`
- Create: `web/src/components/SearchBar.tsx`
- Create: `web/src/components/MovieCard.tsx`
- Create: `web/src/pages/HomePage.tsx`

- [ ] **Step 1: Write `web/src/components/ModeToggle.tsx`**

```tsx
interface Props {
  mode: 'ALONE' | 'US';
  onChange: (mode: 'ALONE' | 'US') => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="mode-toggle">
      <button className={mode === 'ALONE' ? 'active' : ''} onClick={() => onChange('ALONE')}>Alone</button>
      <button className={mode === 'US' ? 'active' : ''} onClick={() => onChange('US')}>US</button>
    </div>
  );
}
```

- [ ] **Step 2: Write `web/src/components/SearchBar.tsx`**

```tsx
interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <input
      className="search-bar"
      type="search"
      placeholder="Search all lists…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

- [ ] **Step 3: Write `web/src/components/MovieCard.tsx`**

```tsx
import { useState } from 'react';
import { api, type Movie } from '../api/client';

interface Props {
  movie: Movie;
  mode: string;
  highlighted: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

const STATUSES = ['PLANNED', 'WATCHING', 'FINISHED'] as const;

export function MovieCard({ movie, mode, highlighted, onChanged, onError }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(movie.title);
  const [watchedDate, setWatchedDate] = useState(movie.watchedDate ? movie.watchedDate.slice(0, 10) : '');
  const [personalRating, setPersonalRating] = useState<number | null>(movie.personalRating);
  const [watchStatus, setWatchStatus] = useState(movie.watchStatus);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleOnly = movie.imported && !movie.posterUrl;

  async function fetchMetadata() {
    setBusy(true);
    try {
      await api.fetchMetadata(movie.id);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not fetch metadata');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await api.updateMovie(mode, movie.id, {
        title: title.trim(),
        watchedDate: watchedDate ? new Date(watchedDate).toISOString() : null,
        personalRating,
        watchStatus,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteMovie(mode, movie.id);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete movie');
      setBusy(false);
    }
  }

  const ratings = movie.providerRatings as Record<string, number> | null;

  return (
    <article className={`card ${highlighted ? 'card-highlight' : ''}`}>
      <div className="card-poster">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} />
        ) : (
          <div className="poster-placeholder">{movie.title.slice(0, 2).toUpperCase()}</div>
        )}
        {titleOnly && (
          <button className="mini-btn" disabled={busy} onClick={fetchMetadata}>
            Fetch real data
          </button>
        )}
      </div>
      <div className="card-body">
        {editing ? (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
            <input type="date" value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} aria-label="Watched date" />
            <select value={personalRating ?? ''} onChange={(e) => setPersonalRating(e.target.value === '' ? null : Number(e.target.value))} aria-label="Rating">
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}★</option>
              ))}
            </select>
            <select value={watchStatus} onChange={(e) => setWatchStatus(e.target.value as (typeof STATUSES)[number])} aria-label="Status">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.toLowerCase()}</option>
              ))}
            </select>
            <div className="card-actions">
              <button disabled={busy} onClick={save}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <h3>{movie.title}</h3>
            <p className="meta">
              {movie.releaseDate ? movie.releaseDate.slice(0, 4) : '—'}
              {ratings && (ratings.tmdb != null || ratings.imdb != null) && (
                <>
                  {' · '}
                  {ratings.tmdb != null && `TMDB ${ratings.tmdb}`}
                  {ratings.tmdb != null && ratings.imdb != null && ' · '}
                  {ratings.imdb != null && `IMDb ${ratings.imdb}`}
                </>
              )}
            </p>
            <p className="badge-row">
              <span className={`badge badge-${movie.watchStatus.toLowerCase()}`}>{movie.watchStatus.toLowerCase()}</span>
              {movie.personalRating != null && <span className="rating">{movie.personalRating}★</span>}
              {movie.watchedDate && <span className="date">{movie.watchedDate.slice(0, 10)}</span>}
            </p>
            <div className="card-actions">
              <button onClick={() => setEditing(true)}>Edit</button>
              {confirmDelete ? (
                <>
                  <button className="danger" disabled={busy} onClick={remove}>Confirm</button>
                  <button onClick={() => setConfirmDelete(false)}>No</button>
                </>
              ) : (
                <button className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Write `web/src/pages/HomePage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api, type Movie } from '../api/client';
import { ModeToggle } from '../components/ModeToggle';
import { MovieCard } from '../components/MovieCard';
import { SearchBar } from '../components/SearchBar';
import { AddMovieModal } from '../components/AddMovieModal';
import { ImportModal } from '../components/ImportModal';

type Mode = 'ALONE' | 'US';

interface Entry {
  movie: Movie;
  source: Mode;
}

export function HomePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(user?.defaultMode ?? 'ALONE');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const otherMode: Mode = mode === 'ALONE' ? 'US' : 'ALONE';
  const hasSearch = search.trim().length > 0;

  const query = useQuery({ queryKey: ['movies', mode], queryFn: () => api.listMovies(mode) });
  const otherQuery = useQuery({
    queryKey: ['movies', otherMode],
    queryFn: () => api.listMovies(otherMode),
    enabled: hasSearch,
  });

  const movies = query.data?.movies ?? [];
  const otherMovies = otherQuery.data?.movies ?? [];

  const entries = useMemo<Entry[]>(() => {
    const q = search.trim().toLowerCase();
    const all: Entry[] = [
      ...movies.map((movie) => ({ movie, source: mode })),
      ...(hasSearch ? otherMovies.map((movie) => ({ movie, source: otherMode })) : []),
    ];
    if (!q) return all;
    return all.filter(({ movie }) => movie.title.toLowerCase().includes(q));
  }, [search, movies, otherMovies, mode, otherMode, hasSearch]);

  function flash(message: string) {
    setNotice({ kind: 'success', text: message });
    window.setTimeout(() => setNotice(null), 3000);
  }

  function showError(message: string) {
    setNotice({ kind: 'error', text: message });
  }

  function handleImported(imported: Movie[]) {
    setHighlighted(new Set(imported.map((m) => m.id)));
    window.setTimeout(() => setHighlighted(new Set()), 5000);
  }

  async function downloadPdf() {
    try {
      await api.downloadPdf(mode);
    } catch {
      showError('Could not export the PDF. Try again.');
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="logo">my movies</h1>
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="topbar-right">
          <button className="primary" onClick={() => setShowAdd(true)}>+ Add</button>
          <button onClick={() => setShowImport(true)}>Import</button>
          <button onClick={downloadPdf}>Export PDF</button>
          <button onClick={logout}>Logout ({user?.email})</button>
        </div>
      </header>

      <div className="notice-area">
        {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}
        {!query.isLoading && entries.length === 0 && (
          <div className="no-results">
            {hasSearch ? 'No movies found for that search' : 'No movies yet — add or import some!'}
          </div>
        )}
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <main className="grid">
        {entries.map(({ movie, source }) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            mode={source}
            highlighted={highlighted.has(movie.id)}
            onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ['movies'] });
              flash('Updated');
            }}
            onError={showError}
          />
        ))}
      </main>

      {showAdd && (
        <AddMovieModal mode={mode} onClose={() => setShowAdd(false)} onAdded={() => flash('Added to your list!')} onError={showError} />
      )}
      {showImport && (
        <ImportModal mode={mode} onClose={() => setShowImport(false)} onImported={handleImported} onError={showError} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `npm run typecheck --workspace web`
Expected: errors about missing `AddMovieModal` / `ImportModal` modules — that is expected; Task 12 creates them.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ModeToggle.tsx web/src/components/SearchBar.tsx web/src/components/MovieCard.tsx web/src/pages/HomePage.tsx
git commit -m "feat: add home page with mode toggle, grid, and cross-list search"
```

---

### Task 12: Add-movie modal with metadata typeahead

**Files:**
- Create: `web/src/components/AddMovieModal.tsx`
- Create: `web/src/components/AddMovieModal.test.tsx`

- [ ] **Step 1: Write the failing test `web/src/components/AddMovieModal.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const searchMetadataMock = vi.fn();
const addMovieMock = vi.fn();
vi.mock('../api/client', () => ({
  api: {
    searchMetadata: (...args: unknown[]) => searchMetadataMock(...args),
    addMovie: (...args: unknown[]) => addMovieMock(...args),
  },
}));

import { AddMovieModal } from './AddMovieModal';

const suggestion = {
  id: 'tmdb-movie-1',
  title: 'Inception',
  year: '2010',
  mediaType: 'movie',
  posterUrl: null,
  releaseDate: '2010-07-16',
  providerRatings: { tmdb: 8.4 },
  provider: 'TMDB',
};

describe('AddMovieModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMetadataMock.mockResolvedValue({ results: [suggestion] });
  });

  it('shows suggestions while typing and adds the selected movie', async () => {
    addMovieMock.mockResolvedValue({ movie: {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddMovieModal mode="ALONE" onClose={() => {}} onAdded={() => {}} onError={() => {}} />
      </QueryClientProvider>,
    );
    await userEvent.type(screen.getByLabelText(/title/i), 'Inception');
    const item = await screen.findByText('Inception');
    await userEvent.click(item);
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    await waitFor(() => expect(addMovieMock).toHaveBeenCalled());
    expect(addMovieMock.mock.calls[0][0]).toBe('ALONE');
    expect(addMovieMock.mock.calls[0][1].title).toBe('Inception');
    expect(addMovieMock.mock.calls[0][1].metadata.id).toBe('tmdb-movie-1');
  });

  it('disables the add button until a title is typed', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddMovieModal mode="ALONE" onClose={() => {}} onAdded={() => {}} onError={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace web -- --run src/components/AddMovieModal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `web/src/components/AddMovieModal.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MetadataResult } from '../api/client';

interface Props {
  mode: string;
  onClose: () => void;
  onAdded: () => void;
  onError: (message: string) => void;
}

export function AddMovieModal({ mode, onClose, onAdded, onError }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [suggestions, setSuggestions] = useState<MetadataResult[]>([]);
  const [selected, setSelected] = useState<MetadataResult | null>(null);
  const [watchedDate, setWatchedDate] = useState('');
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<'PLANNED' | 'WATCHING' | 'FINISHED'>('FINISHED');
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (title.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const { results } = await api.searchMetadata(title);
        setSuggestions(results);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }, [title]);

  const mutation = useMutation({
    mutationFn: () =>
      api.addMovie(mode, {
        title: title.trim(),
        watchedDate: watchedDate ? new Date(watchedDate).toISOString() : null,
        personalRating,
        watchStatus,
        metadata: selected,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      onAdded();
      onClose();
    },
    onError: (err) => onError(err instanceof Error ? err.message : 'Could not add movie'),
  });

  function pick(m: MetadataResult) {
    setSelected(m);
    setTitle(m.title);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add to {mode === 'ALONE' ? 'Alone' : 'US'} list</h2>
        <label htmlFor="add-title">Title</label>
        <input
          id="add-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSelected(null);
          }}
          placeholder="e.g. Inception"
          autoFocus
        />
        {open && suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s) => (
              <li key={s.id} onClick={() => pick(s)}>
                {s.posterUrl ? (
                  <img src={s.posterUrl} alt="" />
                ) : (
                  <div className="poster-placeholder">{s.title.slice(0, 2).toUpperCase()}</div>
                )}
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.year ?? ''} · {s.mediaType} · {s.provider}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {selected && <p className="selected-meta">Metadata selected: {selected.title} ({selected.year})</p>}
        <label htmlFor="add-date">Watched date</label>
        <input id="add-date" type="date" value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} />
        <label htmlFor="add-rating">Personal rating</label>
        <select
          id="add-rating"
          value={personalRating ?? ''}
          onChange={(e) => setPersonalRating(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">Not rated</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>{n}★</option>
          ))}
        </select>
        <label htmlFor="add-status">Status</label>
        <select
          id="add-status"
          value={watchStatus}
          onChange={(e) => setWatchStatus(e.target.value as 'PLANNED' | 'WATCHING' | 'FINISHED')}
        >
          <option value="PLANNED">Planned</option>
          <option value="WATCHING">Watching</option>
          <option value="FINISHED">Finished</option>
        </select>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!title.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace web -- --run src/components/AddMovieModal.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/AddMovieModal.tsx web/src/components/AddMovieModal.test.tsx
git commit -m "feat: add movie modal with metadata typeahead"
```

---

### Task 13: Import modal — upload, highlight, "import real data?" popup

**Files:**
- Create: `web/src/components/ImportModal.tsx`
- Create: `web/src/components/ImportModal.test.tsx`

- [ ] **Step 1: Write the failing test `web/src/components/ImportModal.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const importFileMock = vi.fn();
const fetchBulkMetadataMock = vi.fn();
vi.mock('../api/client', () => ({
  api: {
    importFile: (...args: unknown[]) => importFileMock(...args),
    fetchBulkMetadata: (...args: unknown[]) => fetchBulkMetadataMock(...args),
  },
}));

import { ImportModal } from './ImportModal';

const importedMovie = { id: 'm1', title: 'Inception' };

describe('ImportModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads a file, shows the real-data prompt, and enriches on yes', async () => {
    importFileMock.mockResolvedValue({ movies: [importedMovie], skippedLines: [] });
    fetchBulkMetadataMock.mockResolvedValue({ movies: [importedMovie] });
    const onImported = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportModal mode="ALONE" onClose={() => {}} onImported={onImported} onError={() => {}} />
      </QueryClientProvider>,
    );
    const file = new File(['Inception'], 'movies.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText(/choose a file/i), file);
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }));
    expect(await screen.findByText(/import movies' real data/i)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledWith([importedMovie]);
    await userEvent.click(screen.getByRole('button', { name: /yes, import real data/i }));
    expect(fetchBulkMetadataMock).toHaveBeenCalledWith(['m1']);
  });

  it('shows an error message when no titles are found', async () => {
    importFileMock.mockRejectedValue(new Error('No movie titles could be read from this file'));
    const onError = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportModal mode="ALONE" onClose={() => {}} onImported={() => {}} onError={onError} />
      </QueryClientProvider>,
    );
    const file = new File(['1234'], 'movies.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText(/choose a file/i), file);
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('No movie titles could be read from this file'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace web -- --run src/components/ImportModal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `web/src/components/ImportModal.tsx`**

```tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Movie } from '../api/client';

interface Props {
  mode: string;
  onClose: () => void;
  onImported: (movies: Movie[]) => void;
  onError: (message: string) => void;
}

export function ImportModal({ mode, onClose, onImported, onError }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a file');
      return api.importFile(mode, file);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      if (data.movies.length > 0) {
        setPendingIds(data.movies.map((m) => m.id));
        onImported(data.movies);
        setPrompt(true);
      }
    },
    onError: (err) => onError(err instanceof Error ? err.message : 'Import failed'),
  });

  const enrich = useMutation({
    mutationFn: () => api.fetchBulkMetadata(pendingIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      onClose();
    },
    onError: (err) => {
      onError(err instanceof Error ? err.message : 'Could not import real data');
      onClose();
    },
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {prompt ? (
          <>
            <h2>Import movies' real data?</h2>
            <p>{pendingIds.length} movie(s) were added. Fetch posters, release dates, and ratings for them now?</p>
            <div className="modal-actions">
              <button onClick={onClose}>Ignore</button>
              <button className="primary" disabled={enrich.isPending} onClick={() => enrich.mutate()}>
                Yes, import real data
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Import movie list</h2>
            <p>
              Upload a text (.txt, .md, .csv), PDF, or image file. Movie titles will be extracted and added to your{' '}
              {mode === 'ALONE' ? 'Alone' : 'US'} list.
            </p>
            <label htmlFor="import-file">Choose a file</label>
            <input
              id="import-file"
              type="file"
              accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="modal-actions">
              <button onClick={onClose}>Cancel</button>
              <button className="primary" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
                Import
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Fix the test — add the missing `waitFor` import**

Edit `web/src/components/ImportModal.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test --workspace web -- --run src/components/ImportModal.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 6: Run the whole web test suite and typecheck**

Run: `npm test --workspace web && npm run typecheck --workspace web`
Expected: all tests PASS, typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/ImportModal.tsx web/src/components/ImportModal.test.tsx
git commit -m "feat: add import modal with highlight and real-data prompt"
```

---

### Task 14: End-to-end verification and delivery docs

**Files:**
- Create: `README.md`
- Modify: nothing else

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Run the full verification suite**

Run:
```bash
npm run typecheck
npm test
```
Expected: both packages typecheck clean and all tests PASS.

- [ ] **Step 3: Smoke-test the API by hand**

Run:
```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
npm run dev:server &
sleep 4
curl -s http://localhost:4000/api/health
```
Expected: `{"status":"ok"}`. Then sign up and add a movie:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123","defaultMode":"ALONE"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")
curl -s -X POST http://localhost:4000/api/lists/ALONE/movies \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Inception","personalRating":9,"watchStatus":"FINISHED"}'
curl -s -o /tmp/list.pdf http://localhost:4000/api/lists/ALONE/export/pdf -H "Authorization: Bearer $TOKEN"
file /tmp/list.pdf
```
Expected: movie created JSON, and `/tmp/list.pdf` is a PDF.

- [ ] **Step 4: Stop the dev server**

Run: `pkill -f "tsx watch" 2>/dev/null || true`

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add setup and usage instructions"
```

- [ ] **Step 6: Final commit check**

Run: `git status --short && git log --oneline`
Expected: working tree clean; commit history shows the full build.

---

## Self-review notes

- **Spec coverage:** auth + cloud sync (Task 4), lists + duplicate blocking (Task 5), metadata TMDB+OMDb (Task 6), import text/PDF/image + real-data prompt (Tasks 7, 13), per-card fetch (Tasks 6, 11), themed PDF export (Task 8), cross-list search + "not found" message (Task 11), mode toggle + onboarding mode (Tasks 10, 11), error handling (errorHandler + onError paths), testing (all tasks), delivery (Task 14).
- **Type consistency:** `toMovieJson` returns the shared `Movie` shape used by every route. `fetchMetadataForTitle` returns `MetadataResult | null`, consumed by both `/movies/:id/metadata` and `/import/metadata`. `MetadataResult` in the web client mirrors the server interface. `api.downloadPdf` matches the export route. All imports use `.js` extensions in the server (NodeNext) and extensionless in the web (bundler).
- **Env consistency:** dev DB `movie_list`, test DB `movie_list_test`; `DATABASE_URL` set inline for the test script and from `server/.env` for dev.
