import { Injectable } from '@nestjs/common';
import { dateRange } from '../common/query.dto';
import { PrismaService } from '../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import type { FootfallQueryDto } from './reports.controller';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly stores: StoresService) {}

  async footfall(query: FootfallQueryDto) {
    const store = await this.stores.resolve(query.storeId);
    const occurredAt = dateRange(query);
    const eventWhere = {
      storeId: store.id, occurredAt,
      camera: query.cameraId ? { cameraId: query.cameraId } : undefined,
    };
    const [entered, exited, peak, hourly] = await Promise.all([
      this.prisma.crossingEvent.count({ where: { ...eventWhere, direction: 'ENTER' } }),
      this.prisma.crossingEvent.count({ where: { ...eventWhere, direction: 'EXIT' } }),
      this.prisma.cameraSnapshot.aggregate({
        where: {
          camera: { storeId: store.id, cameraId: query.cameraId }, capturedAt: occurredAt,
        },
        _max: { currentOccupancy: true },
      }),
      this.stores.hourlyFootfall(query.storeId, query),
    ]);
    return {
      storeId: store.code, from: occurredAt.gte, to: occurredAt.lte, entered, exited,
      peakOccupancy: peak._max.currentOccupancy ?? 0,
      currentOccupancy: store.occupancy?.currentOccupancy ?? 0,
      hourlyEntryTotals: hourly.map(({ hour, entered: total }) => ({ hour, total })),
      hourlyExitTotals: hourly.map(({ hour, exited: total }) => ({ hour, total })),
    };
  }
}
