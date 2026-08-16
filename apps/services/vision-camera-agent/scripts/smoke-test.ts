import 'dotenv/config';
import WebSocket from 'ws';

const baseUrl = process.env.VISION_API_URL ?? 'http://localhost:3335/api/v1';
const apiKey = process.env.CAMERA_API_KEY;
const storeId = process.env.STORE_ID ?? 'store-01';
const cameraId = process.env.CAMERA_ID ?? 'store-01-entry';
if (!apiKey) throw new Error('CAMERA_API_KEY is required');

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function main(): Promise<void> {
  const health = await json<{ status: string; database: string }>('/health');
  const latest = await json<{ snapshot: { entered: number; exited: number } | null }>(
    `/cameras/${cameraId}/latest`,
  );
  const entered = (latest.snapshot?.entered ?? 0) + 1;
  const exited = latest.snapshot?.exited ?? 0;
  const eventId = `smoke-${cameraId}-${Date.now()}-enter`;
  const timestamp = new Date().toISOString();
  const payload = {
    cameraId, storeId, entered, exited, currentOccupancy: Math.max(entered - exited, 0),
    activeTracks: [{ trackId: 999, x: 0.42, y: 0.68, confidence: 0.91 }],
    events: [{ eventId, trackId: 999, direction: 'ENTER', confidence: 0.91, occurredAt: timestamp }],
    timestamp,
  };

  const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/ws/retail-tracking');
  const socket = new WebSocket(wsUrl);
  const received = new Set<string>();
  const subscribed = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket subscription timed out')), 5_000);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'subscribe', storeId })));
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as { type: string };
      if (message.type === 'subscribed') {
        clearTimeout(timer);
        resolve();
      } else {
        received.add(message.type);
      }
    });
    socket.on('error', reject);
  });
  await subscribed;

  const request: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Camera-Api-Key': apiKey },
    body: JSON.stringify(payload),
  };
  const acknowledgment = await json<{ accepted: boolean }>('/tracking/updates', request);
  const afterFirst = await json<{ total: number }>(`/stores/${storeId}/events?page=1&pageSize=5`);
  await json('/tracking/updates', request);
  const afterDuplicate = await json<{ total: number }>(`/stores/${storeId}/events?page=1&pageSize=5`);

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline &&
    !['occupancy.updated', 'tracks.updated', 'crossing.detected'].every((type) => received.has(type))) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  socket.close();

  const occupancy = await json<{ currentOccupancy: number }>(`/stores/${storeId}/occupancy`);
  const report = await json<{ entered: number; currentOccupancy: number }>(
    `/reports/footfall?storeId=${storeId}`,
  );
  const invalidAuth = await fetch(`${baseUrl}/tracking/updates`, {
    ...request, headers: { 'Content-Type': 'application/json', 'X-Camera-Api-Key': 'invalid' },
  });
  const expectedEvents = ['occupancy.updated', 'tracks.updated', 'crossing.detected'];
  const result = {
    health: health.status,
    database: health.database,
    ingestionAccepted: acknowledgment.accepted,
    duplicateWasIdempotent: afterFirst.total === afterDuplicate.total,
    eventPersisted: afterFirst.total > 0,
    occupancy: occupancy.currentOccupancy,
    reportEntered: report.entered,
    invalidKeyStatus: invalidAuth.status,
    websocketEvents: expectedEvents.filter((type) => received.has(type)),
  };
  console.log(JSON.stringify(result, null, 2));
  if (health.status !== 'ok' || health.database !== 'up' || !acknowledgment.accepted ||
      !result.duplicateWasIdempotent || invalidAuth.status !== 401 ||
      result.websocketEvents.length !== expectedEvents.length) {
    process.exitCode = 1;
  }
}

void main();
