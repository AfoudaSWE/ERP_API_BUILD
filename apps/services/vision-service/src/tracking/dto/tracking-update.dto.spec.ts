import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TrackingUpdateDto } from './tracking-update.dto';

const validPayload = {
  cameraId: 'store-01-entry', storeId: 'store-01', entered: 1, exited: 0,
  currentOccupancy: 1,
  activeTracks: [{ trackId: 21, x: 0.4, y: 0.6, confidence: 0.9 }],
  events: [], timestamp: '2026-07-22T17:30:00+03:00',
};

describe('TrackingUpdateDto validation', () => {
  it('accepts a valid update', async () => {
    expect(await validate(plainToInstance(TrackingUpdateDto, validPayload))).toHaveLength(0);
  });

  it.each([['x', -0.1], ['y', 1.1], ['confidence', 2]])(
    'rejects invalid %s coordinates', async (field, value) => {
      const payload = structuredClone(validPayload);
      (payload.activeTracks[0] as Record<string, unknown>)[field] = value;
      expect(await validate(plainToInstance(TrackingUpdateDto, payload))).not.toHaveLength(0);
    },
  );

  it('rejects negative counters', async () => {
    expect(await validate(plainToInstance(TrackingUpdateDto, { ...validPayload, entered: -1 }))).not.toHaveLength(0);
  });

  it('rejects an invalid timestamp', async () => {
    expect(await validate(plainToInstance(TrackingUpdateDto, { ...validPayload, timestamp: 'tomorrow' }))).not.toHaveLength(0);
  });
});
