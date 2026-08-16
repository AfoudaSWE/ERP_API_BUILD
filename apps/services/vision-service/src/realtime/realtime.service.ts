import { HttpAdapterHost } from '@nestjs/core';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket, WebSocketServer } from 'ws';
import { PrismaService } from '../database/prisma.service';
import type { TrackPosition } from '../tracking/tracking.types';

type RealtimeMessage = Record<string, unknown> & { type: string; storeId: string };

@Injectable()
export class RealtimeService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly subscriptions = new Map<WebSocket, Set<string>>();
  private readonly activeTracks = new Map<string, { tracks: TrackPosition[]; expiresAt: number }>();
  private readonly cameraOnline = new Map<string, boolean>();
  private server?: WebSocketServer;
  private heartbeat?: NodeJS.Timeout;
  private statusTimer?: NodeJS.Timeout;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const httpServer = this.adapterHost.httpAdapter.getHttpServer();
    this.server = new WebSocketServer({ server: httpServer, path: '/ws/retail-tracking' });
    this.server.on('connection', (socket: WebSocket & { isAlive?: boolean }) => {
      socket.isAlive = true;
      this.subscriptions.set(socket, new Set());
      socket.on('pong', () => { socket.isAlive = true; });
      socket.on('message', (data) => this.handleClientMessage(socket, data.toString()));
      socket.on('close', () => this.subscriptions.delete(socket));
      socket.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    });
    this.heartbeat = setInterval(() => this.pingClients(), 15_000);
    this.statusTimer = setInterval(() => void this.refreshCameraStatuses(), 2_000);
    this.heartbeat.unref();
    this.statusTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.server?.close();
  }

  private handleClientMessage(socket: WebSocket, raw: string): void {
    try {
      const message = JSON.parse(raw) as { type?: unknown; storeId?: unknown };
      if (!['subscribe', 'unsubscribe'].includes(String(message.type)) ||
          typeof message.storeId !== 'string' || !message.storeId.trim()) {
        throw new Error('Invalid subscription message');
      }
      const stores = this.subscriptions.get(socket);
      if (!stores) return;
      if (message.type === 'subscribe') stores.add(message.storeId);
      else stores.delete(message.storeId);
      socket.send(JSON.stringify({ type: `${message.type}d`, storeId: message.storeId }));
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid WebSocket message' }));
    }
  }

  private pingClients(): void {
    for (const socket of this.subscriptions.keys()) {
      const trackedSocket = socket as WebSocket & { isAlive?: boolean };
      if (trackedSocket.isAlive === false) {
        socket.terminate();
        this.subscriptions.delete(socket);
        continue;
      }
      trackedSocket.isAlive = false;
      socket.ping();
    }
  }

  private async refreshCameraStatuses(): Promise<void> {
    try {
      const cameras = await this.prisma.camera.findMany({ where: { isActive: true }, include: { store: true } });
      const cutoff = Date.now() - this.config.get<number>('cameraOfflineAfterSeconds', 10) * 1000;
      for (const camera of cameras) {
        const online = camera.lastSeenAt !== null && camera.lastSeenAt.getTime() >= cutoff;
        if (this.cameraOnline.get(camera.cameraId) !== online) {
          this.cameraOnline.set(camera.cameraId, online);
          this.broadcast({
            type: 'camera.status', storeId: camera.store.code, cameraId: camera.cameraId,
            status: online ? 'online' : 'offline', timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      this.logger.warn({ message: 'Unable to refresh camera status', error });
    }
  }

  updateTracks(cameraId: string, tracks: TrackPosition[]): void {
    const ttl = this.config.get<number>('trackStateTtlSeconds', 5) * 1000;
    this.activeTracks.set(cameraId, { tracks, expiresAt: Date.now() + ttl });
  }

  getTracks(cameraId: string): TrackPosition[] {
    const state = this.activeTracks.get(cameraId);
    if (!state || state.expiresAt < Date.now()) {
      this.activeTracks.delete(cameraId);
      return [];
    }
    return state.tracks;
  }

  broadcast(message: RealtimeMessage): void {
    const payload = JSON.stringify(message);
    for (const [socket, stores] of this.subscriptions) {
      if (stores.has(message.storeId) && socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
  }
}
