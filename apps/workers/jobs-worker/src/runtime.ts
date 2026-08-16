import { QueueEvents, Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { QUEUE_NAMES, UNREGISTERED_JOBS, type JobPayloads } from '@erp/jobs-contracts';
import { createRedisConnection, QueueRegistry } from '@erp/jobs-core';
import { createInventoryProcessor } from '@erp/jobs-processors';
import { createDatabasePool } from '@erp/shared-backend-database';
import { PgInventoryJobServices } from './inventory-services.js';
import type { WorkerEnvironment } from './config.js';

interface Closable { close(): Promise<unknown> }
interface Quitable { quit(): Promise<unknown> }
export class WorkerRuntime {
  private closing = false;
  constructor(private readonly closables: Closable[], private readonly connections: Quitable[], private readonly closeDatabase: () => Promise<unknown>) {}
  async close() { if (this.closing) return; this.closing = true; await Promise.all(this.closables.map((item) => item.close())); await Promise.all(this.connections.map((item) => item.quit())); await this.closeDatabase(); }
}

type OutboxRow = { id: string; queue_name: string; job_name: keyof JobPayloads; job_id: string; payload: JobPayloads[keyof JobPayloads]; attempts: number };
function startOutboxRelay(pool: ReturnType<typeof createDatabasePool>, registry: QueueRegistry) {
  let stopped = false; let running = false;
  const dispatch = async () => {
    if (stopped || running) return; running = true;
    try {
      const client = await pool.connect(); let row: OutboxRow | undefined;
      try {
        await client.query('BEGIN');
        row = (await client.query<OutboxRow>(
          `SELECT id,queue_name,job_name,job_id,payload,attempts FROM job_outbox
           WHERE ((status IN ('pending','failed') AND available_at<=now()) OR (status='publishing' AND locked_at<now()-interval '5 minutes'))
           ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
        )).rows[0];
        if (row) await client.query("UPDATE job_outbox SET status='publishing',locked_at=now(),attempts=attempts+1 WHERE id=$1", [row.id]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      if (!row) return;
      try {
        await registry.publish(row.queue_name as 'inventory', row.job_name, row.payload, { jobId: row.job_id });
        await pool.query("UPDATE job_outbox SET status='published',published_at=now(),last_error=NULL WHERE id=$1", [row.id]);
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown publish failure';
        await pool.query(
          "UPDATE job_outbox SET status=CASE WHEN attempts>=10 THEN 'failed' ELSE 'pending' END,available_at=now()+(LEAST(attempts,10)*interval '10 seconds'),last_error=$2 WHERE id=$1",
          [row.id, message],
        );
      }
    } finally { running = false; }
  };
  const timer = setInterval(() => void dispatch().catch((error) => console.error('outbox.dispatch.failed', { error: error instanceof Error ? error.message : 'Unknown error' })), 1000);
  timer.unref();
  void dispatch();
  return { close: async () => { stopped = true; clearInterval(timer); while (running) await new Promise((resolve) => setTimeout(resolve, 25)); } };
}

export function startWorker(environment: WorkerEnvironment) {
  const pool = createDatabasePool({ connectionString: environment.DATABASE_URL, schema: environment.DB_SCHEMA, max: environment.WORKER_INVENTORY_CONCURRENCY + 2 });
  const services = new PgInventoryJobServices(pool); const processor = createInventoryProcessor(services, services); const connections: IORedis[] = [];
  const registry = new QueueRegistry(environment.redis);
  const outboxRelay = startOutboxRelay(pool, registry);
  const workerConnection = createRedisConnection(environment.redis, true); connections.push(workerConnection);
  const worker = new Worker(QUEUE_NAMES.inventory, async (job: Job<JobPayloads['check-low-stock']>) => {
    console.info('job.start', { queue: QUEUE_NAMES.inventory, name: job.name, id: job.id, attempt: job.attemptsMade + 1 });
    return processor({ id: job.id, name: job.name, data: job.data, queueName: QUEUE_NAMES.inventory });
  }, { connection: workerConnection, prefix: environment.redis.REDIS_PREFIX, concurrency: environment.WORKER_INVENTORY_CONCURRENCY });
  const eventConnection = createRedisConnection(environment.redis, true); connections.push(eventConnection);
  const events = new QueueEvents(QUEUE_NAMES.inventory, { connection: eventConnection, prefix: environment.redis.REDIS_PREFIX });
  worker.on('completed', (job, result) => console.info('job.completed', { queue: QUEUE_NAMES.inventory, name: job.name, id: job.id, duplicate: result?.duplicate }));
  worker.on('failed', (job, error) => {
    const attempts = job?.opts.attempts ?? 1; const retrying = Boolean(job && job.attemptsMade < attempts);
    console.error(retrying ? 'job.retry' : 'job.failed', { queue: QUEUE_NAMES.inventory, name: job?.name, id: job?.id, attempt: job?.attemptsMade, error: error.message });
  });
  worker.on('error', (error) => console.error('worker.error', { queue: QUEUE_NAMES.inventory, error: error.message }));
  console.info('worker.started', { queues: [QUEUE_NAMES.inventory], unregisteredJobs: UNREGISTERED_JOBS, concurrency: environment.WORKER_INVENTORY_CONCURRENCY });
  return new WorkerRuntime([outboxRelay, worker, events, registry], connections, () => pool.end());
}
