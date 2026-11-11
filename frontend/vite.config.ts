import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(process.cwd(), 'frontend'),
  plugins: [react()],
  optimizeDeps: { noDiscovery: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
