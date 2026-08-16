import 'dotenv/config';
import { z } from 'zod';
import { readRedisEnvironment } from '@erp/jobs-core';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), DATABASE_URL: z.string().min(1).default('postgresql://erp:erp@localhost:5432/erp'),
  DB_SCHEMA: z.string().regex(/^[a-z_][a-z0-9_]*$/).default('erp'), WORKER_EMAIL_CONCURRENCY: z.coerce.number().int().positive().max(100).default(5),
  WORKER_MEDIA_CONCURRENCY: z.coerce.number().int().positive().max(100).default(2), WORKER_ORDER_CONCURRENCY: z.coerce.number().int().positive().max(100).default(5),
  WORKER_INVENTORY_CONCURRENCY: z.coerce.number().int().positive().max(100).default(5), WORKER_REPORT_CONCURRENCY: z.coerce.number().int().positive().max(100).default(1),
});
export function readWorkerEnvironment(source: NodeJS.ProcessEnv = process.env) { return { ...schema.parse(source), redis: readRedisEnvironment(source) }; }
export type WorkerEnvironment = ReturnType<typeof readWorkerEnvironment>;
