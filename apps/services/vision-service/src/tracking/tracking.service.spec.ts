import { BadRequestException } from '@nestjs/common';
import { CrossingDirection, DirectionMode } from '@prisma/client';
import { TrackingService } from './tracking.service';

const store = {
  id: '00000000-0000-0000-0000-000000000001', code: 'store-01', name: 'Store',
  timezone: 'Africa/Cairo', isActive: true, createdAt: new Date(), updatedAt: new Date(),
};
const camera = {
  id: '00000000-0000-0000-0000-000000000002', cameraId: 'store-01-entry', storeId: store.id,
  name: 'Entry', location: null, directionMode: DirectionMode.TOP_TO_BOTTOM_ENTRY,
  isActive: true, apiKeyHash: 'hash', lastSeenAt: null, createdAt: new Date(), updatedAt: new Date(), store,
};
const dto = {
  cameraId: camera.cameraId, storeId: store.code, entered: 1, exited: 0, currentOccupancy: 1,
  activeTracks: [{ trackId: 1, x: 0.5, y: 0.5, confidence: 0.9 }],
  events: [{ eventId: 'event-1', trackId: 1, direction: CrossingDirection.ENTER, confidence: 0.9,
    occurredAt: new Date().toISOString() }], timestamp: new Date().toISOString(),
};

function setup(eventExists = false) {
  const tx = {
    camera: { update: jest.fn() },
    cameraSnapshot: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    crossingEvent: {
      findUnique: jest.fn().mockResolvedValue(eventExists ? { id: 'existing' } : null), create: jest.fn(),
    },
    storeOccupancy: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
  };
  const prisma = { $transaction: jest.fn((callback: any) => callback(tx)) } as any;
  const realtime = { updateTracks: jest.fn(), broadcast: jest.fn() } as any;
  const config = { get: (_key: string, fallback: unknown) => fallback } as any;
  return { service: new TrackingService(prisma, realtime, config), tx, realtime };
}

describe('TrackingService', () => {
  it('persists a valid update, updates occupancy, and broadcasts', async () => {
    const { service, tx, realtime } = setup();
    await expect(service.ingest(dto, { authenticatedCamera: camera } as any)).resolves.toMatchObject({ accepted: true });
    expect(tx.cameraSnapshot.create).toHaveBeenCalled();
    expect(tx.crossingEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.storeOccupancy.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ currentOccupancy: 1, totalEnteredToday: 1 }),
    }));
    expect(realtime.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: 'occupancy.updated' }));
  });

  it('does not persist or recount a duplicate crossing event', async () => {
    const { service, tx } = setup(true);
    await service.ingest(dto, { authenticatedCamera: camera } as any);
    expect(tx.crossingEvent.create).not.toHaveBeenCalled();
    expect(tx.storeOccupancy.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ totalEnteredToday: 0 }),
    }));
  });

  it('rejects a camera/store mismatch', async () => {
    const { service } = setup();
    await expect(service.ingest({ ...dto, storeId: 'other-store' }, { authenticatedCamera: camera } as any))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a timestamp too far in the future', async () => {
    const { service } = setup();
    await expect(service.ingest({ ...dto, timestamp: new Date(Date.now() + 120_000).toISOString() },
      { authenticatedCamera: camera } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
