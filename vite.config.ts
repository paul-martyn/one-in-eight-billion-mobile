import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Эталон не должен загружаться даже прямым URL dev-сервера.
  server: { fs: { deny: ['**/reference/**', '**/.git/**', '**/.env*'] } },
  build: { target: ['es2022', 'safari16.4', 'chrome109'], sourcemap: false },
});
