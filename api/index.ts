import express from 'express';
import cors from 'cors';
import authRoutes from '../server/src/routes/auth.routes.js';
import listRoutes from '../server/src/routes/list.routes.js';
import metadataRoutes from '../server/src/routes/metadata.routes.js';
import importRoutes from '../server/src/routes/import.routes.js';
import exportRoutes from '../server/src/routes/export.routes.js';
import { errorHandler } from '../server/src/middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Mount all API routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api', listRoutes);
app.use('/', listRoutes);

app.use('/api', metadataRoutes);
app.use('/', metadataRoutes);

app.use('/api', importRoutes);
app.use('/', importRoutes);

app.use('/api', exportRoutes);
app.use('/', exportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

app.use(errorHandler);

export default function handler(req: any, res: any) {
  return app(req, res);
}
