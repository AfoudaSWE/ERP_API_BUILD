import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  cacheDir: '../../../node_modules/.vite/apps/web/ecom-interface',
  plugins: [react()],
  build: { outDir: '../../../dist/apps/web/ecom-interface', emptyOutDir: true },
  server: {
    host: '127.0.0.1',
    port: 4202,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3333',
    },
  },
  resolve: {
    alias: {
      '@storefront/data-access': path.resolve(root, '../../../libs/domains/commerce/storefront/data-access/src/index.ts'),
      '@shared/data-access': path.resolve(root, '../../../libs/frontend/data-access/src/index.ts'),
      '@shared/auth': path.resolve(root, '../../../libs/frontend/auth/src/index.tsx'),
      '@erp/shared-frontend-data-access': path.resolve(root, '../../../libs/frontend/data-access/src/index.ts'),
    },
  },
});
