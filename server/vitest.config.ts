import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      TMDB_API_KEY: 'test-key',
      OMDB_API_KEY: 'test-key',
      JWT_SECRET: 'test-secret',
    },
    globalSetup: './src/test/globalSetup.ts',
    setupFiles: ['./src/test/setup.ts'],
    hookTimeout: 60000,
    testTimeout: 20000,
  },
});
