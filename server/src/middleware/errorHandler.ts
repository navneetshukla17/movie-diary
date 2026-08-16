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
