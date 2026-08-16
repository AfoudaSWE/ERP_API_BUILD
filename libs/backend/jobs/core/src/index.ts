import IORedis, { type RedisOptions } from 'ioredis';
import { Queue, type JobsOptions } from 'bullmq';
import { z } from 'zod';
import type { JobName, JobPayloads, QueueName } from '@erp/jobs-contracts';

const booleanValue = z.preprocess((value) => value === true || value === 'true' || value === '1', z.boolean());
export const redisEnvironmentSchema = z.object({
  REDIS_HOST: z.string().min(1).default('127.0.0.1'), REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_USERNAME: z.string().optional(), REDIS_PASSWORD: z.string().optional(), REDIS_TLS: booleanValue.default(false),
  REDIS_DB: z.coerce.number().int().min(0).default(0), REDIS_PREFIX: z.string().min(1).default('erp'),
});
export type RedisEnvironment = z.infer<typeof redisEnvironmentSchema>;
export function readRedisEnvironment(source: NodeJS.ProcessEnv = process.env) { return redisEnvironmentSchema.parse(source); }

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 4, backoff: { type: 'exponential', delay: 1_000 }, removeOnComplete: { age: 86_400, count: 1_000 }, removeOnFail: { age: 604_800, count: 5_000 },
};

export function createRedisConnection(config: RedisEnvironment, blocking = false) {
  const options: RedisOptions = { host: config.REDIS_HOST, port: config.REDIS_PORT, username: config.REDIS_USERNAME, password: config.REDIS_PASSWORD, db: config.REDIS_DB, maxRetriesPerRequest: blocking ? null : 1, enableReadyCheck: true };
  if (config.REDIS_TLS) options.tls = {};
  return new IORedis(options);
}

export class QueueRegistry {
  private readonly queues = new Map<QueueName, Queue>();
  private readonly connections: IORedis[] = [];
  constructor(private readonly config: RedisEnvironment) {}
  get(name: QueueName) {
    const current = this.queues.get(name); if (current) return current;
    const connection = createRedisConnection(this.config); this.connections.push(connection);
    const queue = new Queue(name, { connection, prefix: this.config.REDIS_PREFIX, defaultJobOptions: DEFAULT_JOB_OPTIONS }); this.queues.set(name, queue); return queue;
  }
  async publish<Name extends JobName>(queue: QueueName, name: Name, payload: JobPayloads[Name], options: JobsOptions = {}) {
    return this.get(queue).add(name, payload, { ...options });
  }
  async close() { await Promise.all([...this.queues.values()].map((queue) => queue.close())); await Promise.all(this.connections.map((connection) => connection.quit())); }
}
