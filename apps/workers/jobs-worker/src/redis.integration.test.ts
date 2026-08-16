import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QueueEvents } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '@erp/jobs-contracts';
import { createRedisConnection, QueueRegistry } from '@erp/jobs-core';
import { createDatabasePool } from '@erp/shared-backend-database';
import { readWorkerEnvironment } from './config.js';
import { startWorker, type WorkerRuntime } from './runtime.js';

const integration = describe.runIf(process.env.RUN_REDIS_INTEGRATION === 'true');
integration('Redis worker integration', () => {
  const environment = readWorkerEnvironment();
  const pool = createDatabasePool({ connectionString: environment.DATABASE_URL, schema: environment.DB_SCHEMA, max: 2 });
  const registry = new QueueRegistry(environment.redis);
  const eventConnection = createRedisConnection(environment.redis, true);
  const events = new QueueEvents(QUEUE_NAMES.inventory, { connection: eventConnection, prefix: environment.redis.REDIS_PREFIX });
  let runtime: WorkerRuntime;
  beforeAll(async () => { runtime = startWorker(environment); await events.waitUntilReady(); });
  afterAll(async () => { await events.close(); await eventConnection.quit(); await registry.close(); await runtime.close(); await pool.end(); });

  it('processes a real typed low-stock job end to end', async () => {
    const company = (await pool.query<{ id: string }>('SELECT id FROM companies ORDER BY created_at LIMIT 1')).rows[0];
    const jobId = `integration-${randomUUID()}`;
    const job = await registry.publish(QUEUE_NAMES.inventory, JOB_NAMES.checkLowStock, { companyId: company.id, requestedBy: 'integration-test' }, { jobId });
    const result = await job.waitUntilFinished(events, 15_000) as { checked: number; duplicate: boolean };
    expect(result.checked).toBeGreaterThanOrEqual(0); expect(result.duplicate).toBe(false);
    expect((await pool.query<{ status: string }>('SELECT status FROM job_executions WHERE job_id=$1', [jobId])).rows[0]?.status).toBe('completed');
    await job.remove(); await pool.query('DELETE FROM job_executions WHERE job_id=$1', [jobId]);
  }, 20_000);
});
