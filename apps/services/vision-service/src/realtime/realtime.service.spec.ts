import { WebSocket } from 'ws';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  function setup() {
    const prisma = { camera: { findMany: jest.fn().mockResolvedValue([]) } } as any;
    const config = { get: (_key: string, fallback: unknown) => fallback } as any;
    return { service: new RealtimeService({} as any, prisma, config), prisma };
  }

  it('broadcasts only to clients subscribed to the matching store', () => {
    const { service } = setup();
    const first = { readyState: WebSocket.OPEN, send: jest.fn() } as any;
    const second = { readyState: WebSocket.OPEN, send: jest.fn() } as any;
    (service as any).subscriptions.set(first, new Set(['store-01']));
    (service as any).subscriptions.set(second, new Set(['store-02']));
    service.broadcast({ type: 'occupancy.updated', storeId: 'store-01' });
    expect(first.send).toHaveBeenCalledTimes(1);
    expect(second.send).not.toHaveBeenCalled();
  });

  it('handles subscribe and unsubscribe messages', () => {
    const { service } = setup();
    const socket = { send: jest.fn() } as any;
    (service as any).subscriptions.set(socket, new Set());
    (service as any).handleClientMessage(socket, JSON.stringify({ type: 'subscribe', storeId: 'store-01' }));
    expect((service as any).subscriptions.get(socket).has('store-01')).toBe(true);
    (service as any).handleClientMessage(socket, JSON.stringify({ type: 'unsubscribe', storeId: 'store-01' }));
    expect((service as any).subscriptions.get(socket).has('store-01')).toBe(false);
  });

  it('broadcasts online/offline status only when camera state changes', async () => {
    const { service, prisma } = setup();
    const broadcast = jest.spyOn(service, 'broadcast');
    prisma.camera.findMany.mockResolvedValue([{
      cameraId: 'cam-1', lastSeenAt: new Date(), store: { code: 'store-01' },
    }]);
    await (service as any).refreshCameraStatuses();
    await (service as any).refreshCameraStatuses();
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenCalledWith(expect.objectContaining({ status: 'online' }));
  });
});
