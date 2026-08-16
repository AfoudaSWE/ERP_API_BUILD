import { JOB_NAMES, QUEUE_NAMES, type JobPayloads } from '@erp/jobs-contracts';
import type { JobsOptions } from 'bullmq';

export interface JobPublisher { publish<Name extends keyof JobPayloads>(queue: string, name: Name, payload: JobPayloads[Name], options?: JobsOptions): Promise<{ id?: string }> }
export class InventoryJobsProducer {
  constructor(private readonly publisher: JobPublisher) {}
  checkLowStock(payload: JobPayloads['check-low-stock']) {
    return this.publisher.publish(QUEUE_NAMES.inventory, JOB_NAMES.checkLowStock, payload, { jobId: `low-stock-${payload.companyId}` });
  }
}

export type ReliableJobPublisher = JobPublisher;
// This interface is the outbox-compatible boundary. The current BullMQ adapter publishes after commit;
// a transactional outbox can replace it without changing application callers.
