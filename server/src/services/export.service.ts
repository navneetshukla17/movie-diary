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

function isSafePosterUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchPoster(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > 5 * 1024 * 1024) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length <= 5 * 1024 * 1024 ? buf : null;
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

  const posterCache = new Map<string, Buffer | null>();
  for (let i = 0; i < movies.length; i += 8) {
    await Promise.all(
      movies.slice(i, i + 8).map(async (movie) => {
        posterCache.set(
          movie.id,
          movie.posterUrl && isSafePosterUrl(movie.posterUrl) ? await fetchPoster(movie.posterUrl) : null,
        );
      }),
    );
  }

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const listTitle = mode === 'US' ? 'US List' : (mode === 'ALONE' ? `${user?.person1Name || 'Me'}'s List` : `${user?.person2Name || 'Partner'}'s List`);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG);
  doc.fillColor(YELLOW).font('Helvetica-Bold').fontSize(26).text(listTitle, { align: 'center' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(11).text(`Movie Diary  ·  generated ${formatDate(new Date())}`, { align: 'center' });
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
    const poster = posterCache.get(movie.id) ?? null;
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
    if (movie.releaseDate) {
      const year = movie.releaseDate.match(/(19|20)\d\d/)?.[0];
      if (year) meta.push(year);
    }
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
