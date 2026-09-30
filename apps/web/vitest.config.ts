import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['./test/setup.ts'],
    alias: {
      '~': path.resolve(__dirname, './'),
      '@mos-lab/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
