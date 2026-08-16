import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@erp/contracts': path.resolve(__dirname, '../../../libs/shared/contracts/src/index.ts'),
      '@erp/commerce-catalog-contracts': path.resolve(__dirname, '../../../libs/domains/commerce/catalog/contracts/src/index.ts'),
      '@erp/commerce-catalog-application': path.resolve(__dirname, '../../../libs/domains/commerce/catalog/backend/application/src/index.ts'),
      '@erp/shared-backend-database': path.resolve(__dirname, '../../../libs/backend/database/src/index.ts'),
      '@erp/jobs-contracts': path.resolve(__dirname, '../../../libs/backend/jobs/contracts/src/index.ts'),
      '@erp/jobs-core': path.resolve(__dirname, '../../../libs/backend/jobs/core/src/index.ts'),
      '@erp/jobs-producers': path.resolve(__dirname, '../../../libs/backend/jobs/producers/src/index.ts'),
    },
  },
  test: {
    include: ['apps/api/erp-api/src/**/*.test.ts', 'libs/shared/contracts/src/**/*.test.ts'],
    environment: 'node',
  },
});
