import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: {
    '@': path.resolve(__dirname, './src'),
    '@erp/commerce-catalog-contracts': path.resolve(__dirname, '../../../libs/domains/commerce/catalog/contracts/src/index.ts'),
    '@erp/shared-frontend-auth': path.resolve(__dirname, '../../../libs/frontend/auth/src/index.tsx'),
    '@erp/shared-frontend-data-access': path.resolve(__dirname, '../../../libs/frontend/data-access/src/index.ts'),
  } },
  test: { include: ['apps/web/erp-interface/src/**/*.test.{ts,tsx}'], environment: 'node' },
});
