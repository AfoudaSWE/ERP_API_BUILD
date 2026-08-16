import { describe, expect, it, vi } from 'vitest';
import { InventoryJobsProducer, type JobPublisher } from './index.js';

describe('InventoryJobsProducer', () => {
  it('publishes a typed job with a deterministic company job id', async () => {
    const publish = vi.fn().mockResolvedValue({ id: 'job' }); const producer = new InventoryJobsProducer({ publish } as JobPublisher);
    await producer.checkLowStock({ companyId: 'company-1', requestedBy: 'user-1' });
    expect(publish).toHaveBeenCalledWith('inventory', 'check-low-stock', expect.any(Object), expect.objectContaining({ jobId: 'low-stock-company-1' }));
  });
});
