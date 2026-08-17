import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { createWorker } from 'tesseract.js';
import { convert as convertPdf } from 'pdf-img-convert';
import { HttpError } from '../utils/http.js';
import zlib from 'zlib';
import { promisify } from 'util';

const inflate = promisify(zlib.inflate);
const inflateRaw = promisify(zlib.inflateRaw);

export interface ParsedTitles {
  titles: string[];
  skippedLines: string[];
}

export const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'bmp'];
export const TEXT_EXTS = ['txt', 'text', 'md', 'csv'];

export function parseTitlesFromText(text: string): ParsedTitles {
  const titles: string[] = [];
  const skippedLines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/^\s*(?:[-*]\s*|\d+[.)]\s*)+/, '')
      .trim();
    if (!line) continue;
    if (line.length >= 2 && !/^[-*\d.()\s]+$/.test(line)) titles.push(line);
    else skippedLines.push(raw);
  }
  return { titles, skippedLines };
}

export async function parseTextFile(buffer: Buffer): Promise<ParsedTitles> {
  return parseTitlesFromText(buffer.toString('utf-8'));
}

/**
 * Extracts JPEG images embedded in a PDF as FlateDecode+DCTDecode streams.
 * This is a cross-platform fallback that avoids pdfjs-dist canvas rendering.
 * Works on macOS, Linux, and any server environment — no OS tools needed.
 */
async function extractJpegsFromPdf(buffer: Buffer): Promise<Buffer[]> {
  const str = buffer.toString('binary');
  const jpegs: Buffer[] = [];

  let idx = 0;
  while (true) {
    const filterIdx = str.indexOf('/Filter [/FlateDecode /DCTDecode]', idx);
    if (filterIdx === -1) break;

    // Find the start of the stream data
    const streamMarker = str.indexOf('stream\n', filterIdx);
    if (streamMarker === -1) { idx = filterIdx + 1; continue; }
    const dataStart = streamMarker + 7;

    // Find the end of the stream data
    const endIdx = str.indexOf('endstream', dataStart);
    if (endIdx === -1) { idx = filterIdx + 1; continue; }

    const compressedData = buffer.slice(dataStart, endIdx);

    try {
      // First pass: FlateDecode (zlib inflate)
      const inflated = await inflate(compressedData).catch(() => inflateRaw(compressedData));

      // Second pass should be DCTDecode (JPEG) — verify JPEG signature FF D8
      if (inflated[0] === 0xFF && inflated[1] === 0xD8) {
        jpegs.push(inflated);
      }
    } catch {
      // Skip streams that can't be decompressed
    }

    idx = filterIdx + 1;
  }

  return jpegs;
}

export async function parsePdfFile(buffer: Buffer): Promise<ParsedTitles> {
  // --- Tier 1: Fast text extraction (works for digital/text-based PDFs) ---
  let text = '';
  try {
    const data = await pdfParse(buffer);
    text = data.text ?? '';
  } catch (err) {
    console.log('pdf-parse failed, will try image-based OCR:', err instanceof Error ? err.message : String(err));
  }

  if (text.trim()) {
    return parseTitlesFromText(text);
  }

  // --- Tier 2: pdf-img-convert + Tesseract OCR (for digitally-rendered PDFs) ---
  try {
    const imageArrays = await convertPdf(buffer);
    if (imageArrays && imageArrays.length > 0) {
      const worker = await createWorker('eng');
      try {
        for (const imgArray of imageArrays) {
          const { data: ocr } = await worker.recognize(Buffer.from(imgArray));
          text += '\n' + (ocr.text ?? '');
        }
      } finally {
        await worker.terminate();
      }
    }
    if (text.trim()) return parseTitlesFromText(text);
  } catch (err) {
    console.log('pdf-img-convert failed, trying direct JPEG extraction:', err instanceof Error ? err.message : String(err));
  }

  // --- Tier 3: Direct JPEG extraction + OCR (cross-platform, no OS tools needed) ---
  // For PDFs with embedded FlateDecode+DCTDecode (zlib-wrapped JPEG) image streams.
  // This bypasses pdfjs-dist rendering entirely and works on all platforms.
  try {
    const jpegs = await extractJpegsFromPdf(buffer);

    if (jpegs.length > 0) {
      console.log(`Extracted ${jpegs.length} JPEG(s) directly from PDF, running OCR...`);
      const worker = await createWorker('eng');
      try {
        for (const jpeg of jpegs) {
          const { data: ocr } = await worker.recognize(jpeg);
          text += '\n' + (ocr.text ?? '');
        }
      } finally {
        await worker.terminate();
      }

      if (text.trim()) return parseTitlesFromText(text);
    }
  } catch (err) {
    console.error('Direct JPEG extraction failed:', err);
  }

  throw new HttpError(422, 'Could not read this PDF. Please try uploading a plain text file or image instead.');
}

export async function parseImageFile(buffer: Buffer): Promise<ParsedTitles> {
  try {
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(buffer);
      return parseTitlesFromText(data.text ?? '');
    } finally {
      await worker.terminate();
    }
  } catch {
    throw new HttpError(422, 'Could not read this image');
  }
}
