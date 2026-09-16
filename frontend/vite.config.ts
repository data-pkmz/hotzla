import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: ['shared-types'],
  },

  build: {
    commonjsOptions: {
      include: [/shared-types/, /node_modules/],
    },
  },

  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
