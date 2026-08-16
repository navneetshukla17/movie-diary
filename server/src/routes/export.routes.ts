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
