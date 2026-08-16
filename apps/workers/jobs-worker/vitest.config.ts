import path from 'node:path';
import { defineConfig } from 'vitest/config';
export default defineConfig({ resolve: { alias: {
  '@erp/jobs-contracts': path.resolve(__dirname, '../../../libs/backend/jobs/contracts/src/index.ts'), '@erp/jobs-core': path.resolve(__dirname, '../../../libs/backend/jobs/core/src/index.ts'),
  '@erp/jobs-processors': path.resolve(__dirname, '../../../libs/backend/jobs/processors/src/index.ts'), '@erp/shared-backend-database': path.resolve(__dirname, '../../../libs/backend/database/src/index.ts'),
} }, test: { include: ['apps/workers/jobs-worker/src/**/*.test.ts'], environment: 'node' } });
