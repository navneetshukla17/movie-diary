import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { getUserList, parseMode } from '../services/lists.service.js';
import { IMAGE_EXTS, TEXT_EXTS, parseImageFile, parsePdfFile, parseTextFile } from '../services/import.service.js';

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
    let parsed;
    if (ext === 'pdf') parsed = await parsePdfFile(req.file.buffer);
    else if (IMAGE_EXTS.includes(ext)) parsed = await parseImageFile(req.file.buffer);
    else if (TEXT_EXTS.includes(ext)) parsed = await parseTextFile(req.file.buffer);
    else throw new HttpError(400, 'Unsupported file type. Use text, PDF, or an image');
    if (parsed.titles.length === 0) throw new HttpError(422, 'No movie titles could be read from this file');

    const watchStatus: 'FINISHED' | 'PLANNED' = req.body?.watchStatus === 'FINISHED' ? 'FINISHED' : 'PLANNED';
    const existing = await prisma.movie.findMany({ where: { listId: list.id }, select: { title: true } });
    const existingSet = new Set(existing.map((m) => m.title.toLowerCase()));
    const moviesToCreate = [];
    for (const title of parsed.titles) {
      if (existingSet.has(title.toLowerCase())) continue;
      existingSet.add(title.toLowerCase());
      moviesToCreate.push({
        listId: list.id,
        title,
        imported: true,
        metadataProvider: 'IMPORT' as const,
        watchStatus,
      });
    }
    const created = [];
    for (const m of moviesToCreate) {
      created.push(await prisma.movie.create({ data: m }));
    }
    res.status(201).json({ movies: created.map(toMovieJson), skippedLines: parsed.skippedLines });
  }),
);

export default router;
