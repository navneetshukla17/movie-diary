import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { createWorker } from 'tesseract.js';
import { HttpError } from '../utils/http.js';

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

export async function parsePdfFile(buffer: Buffer): Promise<ParsedTitles> {
  try {
    const data = await pdfParse(buffer);
    return parseTitlesFromText(data.text ?? '');
  } catch {
    throw new HttpError(422, 'Could not read this PDF');
  }
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
