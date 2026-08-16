import { describe, expect, it } from 'vitest';
import { CAMERA_PRESETS, DEFAULT_LAYERS, QUALITY_LEVELS, STORE_ZONES, resolveQuality } from './storeSceneConfig';
import { getDigitalTwinState } from '../../services/mock/digitalTwinService';

describe('retail 3D scene configuration', () => {
  it('keeps every live scene zone mapped to the replay contract', () => {
    const state = getDigitalTwinState('cfc', 0);
    STORE_ZONES.forEach(zone => {
      expect(zone.id).toBeTruthy();
      expect(state.zoneOccupancy[zone.id]).toBeDefined();
    });
  });

  it('provides all required operator camera views and layers', () => {
    expect(Object.keys(CAMERA_PRESETS)).toEqual(expect.arrayContaining([
      'overview', 'entrance', 'checkout', 'shelves', 'fitting', 'stockroom', 'heatmap',
    ]));
    expect(Object.keys(DEFAULT_LAYERS)).toEqual(expect.arrayContaining([
      'customers', 'staff', 'shelves', 'stock', 'heatmap', 'paths', 'queues', 'cameras', 'sensors', 'alerts',
    ]));
  });

  it('uses bounded graphics settings and stable fixture identifiers', () => {
    expect(resolveQuality('low')).toEqual(QUALITY_LEVELS.low);
    expect(resolveQuality('high').pixelRatio).toBeLessThanOrEqual(2);
    const state = getDigitalTwinState('cfc', 0);
    expect(new Set(state.shelves.map(shelf => shelf.id)).size).toBe(state.shelves.length);
    state.shelves.forEach(shelf => expect(shelf.stockStatus).toBe('unavailable'));
  });
});
