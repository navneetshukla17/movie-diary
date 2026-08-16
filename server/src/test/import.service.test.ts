import { describe, expect, it } from 'vitest';
import { parsePdfFile } from '../services/import.service.js';

describe('import.service', () => {
  it('rejects a malformed pdf with a 422', async () => {
    await expect(parsePdfFile(Buffer.from('%PDF-1.4 fake'))).rejects.toMatchObject({ status: 422 });
  });
});
