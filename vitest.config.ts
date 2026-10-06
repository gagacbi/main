import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  resolve: { alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
  test: { setupFiles: ['tests/integration/setup.ts'], include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'], testTimeout: 30000, hookTimeout: 30000, pool: 'forks', fileParallelism: false },
});
