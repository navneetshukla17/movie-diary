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
