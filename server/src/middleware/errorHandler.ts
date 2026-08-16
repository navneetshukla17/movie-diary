import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { HttpError } from '../utils/http.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  if (err instanceof MulterError) {
    res.status(400).json({ error: { message: err.message } });
    return;
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
    res.status(409).json({ error: { message: 'That item already exists' } });
    return;
  }
  const status = (err as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: { message: err instanceof Error ? err.message : 'Bad request' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong' } });
};
