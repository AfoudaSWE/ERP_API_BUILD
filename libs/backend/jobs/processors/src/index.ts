import { JOB_NAMES, type JobPayloads, type JobResults } from '@erp/jobs-contracts';

export interface InventoryJobService { checkLowStock(companyId: string): Promise<{ checked: number; lowStockProductIds: string[] }> }
export interface IdempotencyStore { runOnce<T>(key: string, context: { queue: string; name: string }, work: () => Promise<T>): Promise<{ executed: boolean; value?: T }> }
export interface InventoryJob { id?: string; name: string; data: JobPayloads['check-low-stock']; queueName?: string }

export function createInventoryProcessor(service: InventoryJobService, idempotency: IdempotencyStore) {
  return async (job: InventoryJob): Promise<JobResults['check-low-stock']> => {
    if (job.name !== JOB_NAMES.checkLowStock) throw new Error(`Job is typed but not registered: ${job.name}`);
    const key = job.id ?? `${job.name}:${job.data.companyId}`;
    const result = await idempotency.runOnce(key, { queue: job.queueName ?? 'inventory', name: job.name }, () => service.checkLowStock(job.data.companyId));
    return result.executed && result.value ? { ...result.value, duplicate: false } : { checked: 0, lowStockProductIds: [], duplicate: true };
  };
}
