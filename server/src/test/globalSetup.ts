import { execSync } from 'node:child_process';

export default function globalSetup() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: process.env,
    stdio: 'inherit',
  });
}
