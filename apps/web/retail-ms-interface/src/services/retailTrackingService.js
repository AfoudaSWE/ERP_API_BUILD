export const RETAIL_TRACKING_WS_URL =
  import.meta.env.VITE_RETAIL_TRACKING_WS_URL ?? 'ws://localhost:3335/ws/retail-tracking';

const STORE_ID_MAP = {
  cfc: 'store-01',
  cs: 'store-02',
  moe: 'store-03',
  acc: 'store-04',
  man: 'store-05',
};

export function getRetailTrackingStoreId(storeId) {
  return import.meta.env.VITE_RETAIL_TRACKING_STORE_ID ?? STORE_ID_MAP[storeId] ?? storeId;
}

/**
 * @typedef {Object} TrackPosition
 * @property {number} trackId
 * @property {number} x
 * @property {number} y
 * @property {number} confidence
 */

/**
 * @typedef (
 *   { type: 'connected', timestamp: string } |
 *   { type: 'subscribed', storeId: string } |
 *   { type: 'unsubscribed', storeId: string } |
 *   { type: 'occupancy.updated', storeId: string, cameraId: string, entered: number, exited: number, currentOccupancy: number, timestamp: string } |
 *   { type: 'tracks.updated', storeId: string, cameraId: string, tracks: TrackPosition[], timestamp: string } |
 *   { type: 'crossing.detected', eventId: string, storeId: string, cameraId: string, trackId: number, direction: 'ENTER' | 'EXIT', timestamp: string } |
 *   { type: 'camera.status', storeId: string, cameraId: string, status: 'online' | 'offline', timestamp: string } |
 *   { type: 'error', message: string }
 * ) RetailTrackingMessage
 */

const MESSAGE_TYPES = new Set([
  'connected',
  'subscribed',
  'unsubscribed',
  'occupancy.updated',
  'tracks.updated',
  'crossing.detected',
  'camera.status',
  'error',
]);

/**
 * Opens a reconnecting retail-tracking WebSocket and subscribes to one store.
 *
 * @param {{
 *   storeId: string,
 *   storeIds?: string[],
 *   onMessage: (message: RetailTrackingMessage) => void,
 *   onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void,
 *   onError?: (message: string) => void,
 *   url?: string,
 * }} options
 */
export function createRetailTrackingClient({
  storeId,
  storeIds = [storeId],
  onMessage,
  onStatus = () => {},
  onError = () => {},
  url = RETAIL_TRACKING_WS_URL,
}) {
  const subscriptions = [...new Set(storeIds.filter(Boolean))];
  let socket;
  let connectTimer;
  let reconnectTimer;
  let reconnectAttempt = 0;
  let stopped = false;

  const sendSubscription = type => {
    if (socket?.readyState === WebSocket.OPEN) {
      subscriptions.forEach(subscriptionStoreId => {
        socket.send(JSON.stringify({ type, storeId: subscriptionStoreId }));
      });
    }
  };

  const connect = () => {
    if (stopped) return;
    onStatus('connecting');

    try {
      socket = new WebSocket(url);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to create the tracking connection');
      scheduleReconnect();
      return;
    }

    socket.addEventListener('open', () => {
      if (stopped) {
        socket.close();
        return;
      }
      reconnectAttempt = 0;
      onStatus('connected');
      sendSubscription('subscribe');
    });

    socket.addEventListener('message', event => {
      if (stopped) return;
      try {
        const message = JSON.parse(event.data);
        if (!message || typeof message !== 'object' || !MESSAGE_TYPES.has(message.type)) {
          onError('Received an unsupported tracking message');
          return;
        }
        onMessage(message);
      } catch {
        onError('Received an invalid tracking message');
      }
    });

    socket.addEventListener('error', () => {
      onError('Retail tracking WebSocket connection failed');
    });

    socket.addEventListener('close', () => {
      if (stopped) return;
      onStatus('disconnected');
      scheduleReconnect();
    });
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempt, 10_000);
    reconnectAttempt += 1;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  };

  // React Strict Mode immediately mounts, cleans up, and mounts effects again in
  // development. Deferring the first connection prevents that probe cleanup from
  // closing a WebSocket while its handshake is still in progress.
  connectTimer = window.setTimeout(connect, 0);

  return () => {
    stopped = true;
    window.clearTimeout(connectTimer);
    window.clearTimeout(reconnectTimer);
    sendSubscription('unsubscribe');
    if (socket?.readyState === WebSocket.OPEN) socket.close();
  };
}
