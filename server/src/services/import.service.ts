import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { HttpError } from '../utils/http.js';
import { config } from '../config.js';
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
 * Calls the Gemini ListModels API and returns the best available model
 * that supports generateContent (vision). Result is cached in memory.
 */
let resolvedGeminiModel: string | null = null;

// Preferred model order — newest / most capable first
const PREFERRED_MODELS = [
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash',
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

async function resolveGeminiModel(apiKey: string): Promise<string> {
  if (resolvedGeminiModel) return resolvedGeminiModel;

  // If the user has explicitly set a model, use it directly
  if (config.geminiModel && config.geminiModel !== 'gemini-2.5-flash-preview-05-20') {
    resolvedGeminiModel = config.geminiModel;
    return resolvedGeminiModel;
  }

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;
    const res = await fetch(listUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = (await res.json()) as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };
      const available = new Set(
        (data.models ?? [])
          .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m) => m.name.replace('models/', '')),
      );
      console.log('Available Gemini models:', [...available].join(', '));
      // Pick the first preferred model that is available
      for (const candidate of PREFERRED_MODELS) {
        if (available.has(candidate)) {
          console.log(`Resolved Gemini model: ${candidate}`);
          resolvedGeminiModel = candidate;
          return resolvedGeminiModel;
        }
      }
      // Fallback: pick any model that supports generateContent and has "flash" in the name
      const anyFlash = [...available].find((m) => m.includes('flash'));
      if (anyFlash) {
        console.log(`Fallback Gemini model: ${anyFlash}`);
        resolvedGeminiModel = anyFlash;
        return resolvedGeminiModel;
      }
      // Last resort: pick any available generateContent model
      const anyModel = [...available][0];
      if (anyModel) {
        console.log(`Last-resort Gemini model: ${anyModel}`);
        resolvedGeminiModel = anyModel;
        return resolvedGeminiModel;
      }
    }
  } catch (err) {
    console.warn('Gemini ListModels failed, falling back to default:', err);
  }

  // Hard fallback if ListModels itself fails
  resolvedGeminiModel = 'gemini-1.5-flash';
  return resolvedGeminiModel;
}

/**
 * Uses Gemini Vision API to extract movie/TV titles from an image buffer.
 * Sends the image as base64 inline data — no WASM, no binaries, no timeouts.
 */
async function ocrWithGemini(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new HttpError(500, 'Gemini API key is not configured. Set GEMINI_API_KEY in your environment.');
  }

  const model = await resolveGeminiModel(apiKey);
  const base64 = imageBuffer.toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;


  const body = {
    contents: [
      {
        parts: [
          {
            text: 'Extract all movie and TV show titles from this image. Output only the titles, one per line. Do not include numbering, bullet points, or any extra commentary. If you cannot find any titles, output an empty response.',
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`Gemini Vision API error ${res.status}:`, errText);
    throw new HttpError(502, `Gemini Vision API returned ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text;
}

/**
 * Extracts JPEG images embedded in a PDF as FlateDecode+DCTDecode streams.
 * Cross-platform — no OS tools or native binaries needed.
 */
async function extractJpegsFromPdf(buffer: Buffer): Promise<Buffer[]> {
  const str = buffer.toString('binary');
  const jpegs: Buffer[] = [];

  let idx = 0;
  while (true) {
    const filterIdx = str.indexOf('/Filter [/FlateDecode /DCTDecode]', idx);
    if (filterIdx === -1) break;

    const streamMarker = str.indexOf('stream\n', filterIdx);
    if (streamMarker === -1) { idx = filterIdx + 1; continue; }
    const dataStart = streamMarker + 7;

    const endIdx = str.indexOf('endstream', dataStart);
    if (endIdx === -1) { idx = filterIdx + 1; continue; }

    const compressedData = buffer.slice(dataStart, endIdx);

    try {
      const inflated = await inflate(compressedData).catch(() => inflateRaw(compressedData));
      // Verify JPEG signature FF D8
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

  // --- Tier 2: Extract embedded JPEG frames and send to Gemini Vision ---
  // For image-based PDFs (scanned documents, photos rendered as PDF).
  try {
    const jpegs = await extractJpegsFromPdf(buffer);

    if (jpegs.length > 0) {
      console.log(`Extracted ${jpegs.length} JPEG(s) directly from PDF, running Gemini Vision OCR...`);
      for (const jpeg of jpegs) {
        const extracted = await ocrWithGemini(jpeg, 'image/jpeg');
        text += '\n' + extracted;
      }
      if (text.trim()) return parseTitlesFromText(text);
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error('Direct JPEG extraction + Gemini OCR failed:', err);
  }

  throw new HttpError(422, 'Could not read this PDF. Please try uploading a plain text file or image instead.');
}

export async function parseImageFile(buffer: Buffer): Promise<ParsedTitles> {
  try {
    // Detect mime type from buffer magic bytes
    let mimeType = 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = 'image/png';
    else if (buffer[0] === 0x47 && buffer[1] === 0x49) mimeType = 'image/gif';
    else if (buffer[0] === 0x52 && buffer[1] === 0x49) mimeType = 'image/webp';

    const text = await ocrWithGemini(buffer, mimeType);
    return parseTitlesFromText(text);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, 'Could not read this image');
  }
}
