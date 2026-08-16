import { StoresService } from './stores.service';

describe('StoresService historical queries', () => {
  it('applies store isolation, filters, and pagination', async () => {
    const prisma = {
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'store-uuid', code: 'store-01', cameras: [], occupancy: null }) },
      crossingEvent: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    } as any;
    const service = new StoresService(prisma);
    const result = await service.events('store-01', {
      page: 2, pageSize: 10, cameraId: 'cam-1', direction: 'ENTER',
      from: '2026-07-21T00:00:00Z', to: '2026-07-22T00:00:00Z',
    } as any);
    expect(prisma.crossingEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ storeId: 'store-uuid', direction: 'ENTER' }), skip: 10, take: 10,
    }));
    expect(result).toEqual({ items: [], page: 2, pageSize: 10, total: 0 });
  });
});
