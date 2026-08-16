import { describe, expect, it, vi } from 'vitest';
import { createInventoryProcessor, type IdempotencyStore, type InventoryJobService } from './index.js';

const job = { id: 'job-1', name: 'check-low-stock', queueName: 'inventory', data: { companyId: 'company-1', requestedBy: 'user-1' } };
describe('inventory processor', () => {
  it('returns the service result on success', async () => {
    const service = { checkLowStock: vi.fn().mockResolvedValue({ checked: 3, lowStockProductIds: ['p1'] }) };
    const store: IdempotencyStore = { runOnce: async <T>(_key: string, _context: object, work: () => Promise<T>) => ({ executed: true, value: await work() }) };
    await expect(createInventoryProcessor(service, store)(job)).resolves.toEqual({ checked: 3, lowStockProductIds: ['p1'], duplicate: false });
  });
  it('does not repeat an already completed operation', async () => {
    const service = { checkLowStock: vi.fn() } as unknown as InventoryJobService; const store = { runOnce: vi.fn().mockResolvedValue({ executed: false }) } as unknown as IdempotencyStore;
    await expect(createInventoryProcessor(service, store)(job)).resolves.toMatchObject({ duplicate: true }); expect(service.checkLowStock).not.toHaveBeenCalled();
  });
  it('surfaces failures so BullMQ can retry them', async () => {
    const failure = new Error('database unavailable'); const service = { checkLowStock: vi.fn().mockRejectedValue(failure) };
    const store: IdempotencyStore = { runOnce: async <T>(_key: string, _context: object, work: () => Promise<T>) => ({ executed: true, value: await work() }) };
    await expect(createInventoryProcessor(service, store)(job)).rejects.toThrow('database unavailable');
  });
});
