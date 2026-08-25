import { execSync } from 'node:child_process';

export default function globalSetup() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://tusharshukla@localhost:5432/movie_list_test';
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      DIRECT_URL: process.env.DIRECT_URL || dbUrl,
    },
    stdio: 'inherit',
  });
}
