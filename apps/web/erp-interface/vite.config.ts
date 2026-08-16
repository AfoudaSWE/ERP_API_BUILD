import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/apps/web/erp-interface',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@erp/contracts': path.resolve(__dirname, '../../../libs/shared/contracts/src/index.ts'),
      '@erp/commerce-catalog-contracts': path.resolve(__dirname, '../../../libs/domains/commerce/catalog/contracts/src/index.ts'),
      '@erp/shared-frontend-auth': path.resolve(__dirname, '../../../libs/frontend/auth/src/index.tsx'),
      '@erp/shared-frontend-data-access': path.resolve(__dirname, '../../../libs/frontend/data-access/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
  build: {
    outDir: '../../../dist/apps/web/erp-interface',
    emptyOutDir: true,
  },
});
