import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrossingDirection, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { TrackingUpdateDto } from './dto/tracking-update.dto';
import type { AuthenticatedCameraRequest } from './tracking.types';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService,
  ) {}

  async ingest(dto: TrackingUpdateDto, request: AuthenticatedCameraRequest) {
    const camera = request.authenticatedCamera;
    if (camera.cameraId !== dto.cameraId || camera.store.code !== dto.storeId) {
      throw new BadRequestException('Camera does not belong to the supplied store');
    }
    if (dto.activeTracks.length > this.config.get<number>('maxTracksPerUpdate', 100) ||
        dto.events.length > this.config.get<number>('maxEventsPerUpdate', 50)) {
      throw new BadRequestException('Payload collection limit exceeded');
    }
    const capturedAt = new Date(dto.timestamp);
    const maxFuture = this.config.get<number>('maxFutureTimestampSeconds', 60) * 1000;
    if (capturedAt.getTime() > Date.now() + maxFuture) {
      throw new BadRequestException('Timestamp is too far in the future');
    }
    if (dto.events.some((event) => new Date(event.occurredAt).getTime() > Date.now() + maxFuture)) {
      throw new BadRequestException('Event timestamp is too far in the future');
    }
    const receivedAt = new Date();

    const insertedEvents = await this.prisma.$transaction(async (tx) => {
      await tx.camera.update({ where: { id: camera.id }, data: { lastSeenAt: receivedAt } });
      const previous = await tx.cameraSnapshot.findFirst({
        where: { cameraId: camera.id }, orderBy: { capturedAt: 'desc' },
      });
      await tx.cameraSnapshot.create({
        data: {
          cameraId: camera.id, entered: dto.entered, exited: dto.exited,
          currentOccupancy: dto.currentOccupancy, activeTrackCount: dto.activeTracks.length,
          capturedAt, receivedAt,
        },
      });

      const accepted = [] as TrackingUpdateDto['events'];
      for (const event of dto.events) {
        const exists = await tx.crossingEvent.findUnique({ where: { eventId: event.eventId }, select: { id: true } });
        if (exists) continue;
        await tx.crossingEvent.create({
          data: {
            eventId: event.eventId, cameraId: camera.id, storeId: camera.storeId,
            trackId: event.trackId, direction: event.direction, confidence: event.confidence,
            occurredAt: new Date(event.occurredAt), receivedAt,
          },
        });
        accepted.push(event);
      }

      const enteredDelta = dto.events.length
        ? accepted.filter((event) => event.direction === CrossingDirection.ENTER).length
        : Math.max(0, dto.entered - (previous?.entered ?? 0));
      const exitedDelta = dto.events.length
        ? accepted.filter((event) => event.direction === CrossingDirection.EXIT).length
        : Math.max(0, dto.exited - (previous?.exited ?? 0));
      await this.upsertOccupancy(tx, camera.storeId, camera.store.timezone, dto.currentOccupancy, enteredDelta, exitedDelta, receivedAt);
      return accepted;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

    this.realtime.updateTracks(dto.cameraId, dto.activeTracks);
    this.realtime.broadcast({
      type: 'occupancy.updated', storeId: dto.storeId, cameraId: dto.cameraId,
      entered: dto.entered, exited: dto.exited, currentOccupancy: dto.currentOccupancy,
      timestamp: dto.timestamp,
    });
    this.realtime.broadcast({
      type: 'tracks.updated', storeId: dto.storeId, cameraId: dto.cameraId,
      tracks: dto.activeTracks, timestamp: dto.timestamp,
    });
    for (const event of insertedEvents) {
      this.realtime.broadcast({
        type: 'crossing.detected', eventId: event.eventId, storeId: dto.storeId,
        cameraId: dto.cameraId, trackId: event.trackId, direction: event.direction,
        timestamp: event.occurredAt,
      });
    }
    return { accepted: true, cameraId: dto.cameraId, receivedAt: receivedAt.toISOString() };
  }

  private localDate(now: Date, timezone: string): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`);
  }

  private async upsertOccupancy(
    tx: Prisma.TransactionClient, storeId: string, timezone: string, current: number,
    enteredDelta: number, exitedDelta: number, now: Date,
  ): Promise<void> {
    const totalsDate = this.localDate(now, timezone);
    const existing = await tx.storeOccupancy.findUnique({ where: { storeId } });
    const sameDate = existing?.totalsDate.getTime() === totalsDate.getTime();
    await tx.storeOccupancy.upsert({
      where: { storeId },
      create: {
        storeId, currentOccupancy: current, totalEnteredToday: enteredDelta,
        totalExitedToday: exitedDelta, peakOccupancyToday: current, totalsDate, lastUpdatedAt: now,
      },
      update: {
        currentOccupancy: current,
        totalEnteredToday: sameDate ? { increment: enteredDelta } : enteredDelta,
        totalExitedToday: sameDate ? { increment: exitedDelta } : exitedDelta,
        peakOccupancyToday: sameDate ? Math.max(existing?.peakOccupancyToday ?? 0, current) : current,
        totalsDate, lastUpdatedAt: now,
      },
    });
  }
}
