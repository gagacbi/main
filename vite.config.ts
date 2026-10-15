import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  publicDir: false,
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000 },
  server: { port: 5173, proxy: { '/api': 'http://localhost:2567', '/matchmake': 'http://localhost:2567' } },
  resolve: { alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
});
