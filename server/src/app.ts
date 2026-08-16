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
  app.use('/api', (_req, res) => res.status(404).json({ error: { message: 'Not found' } }));

  const dist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
