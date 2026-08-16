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
