import path from 'node:path';
import { defineConfig } from 'vitest/config';
export default defineConfig({ resolve: { alias: { '@erp/jobs-contracts': path.resolve(__dirname, '../contracts/src/index.ts') } }, test: { include: ['libs/backend/jobs/producers/src/**/*.test.ts'], environment: 'node' } });
