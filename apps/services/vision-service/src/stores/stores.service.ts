import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { dateRange, HistoryQueryDto } from '../common/query.dto';
import { isUuid } from '../common/identifiers';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.store.findMany({
      where: { isActive: true }, include: { occupancy: true, _count: { select: { cameras: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async resolve(identifier: string) {
    const store = await this.prisma.store.findFirst({
      where: isUuid(identifier) ? { id: identifier } : { code: identifier },
      include: { cameras: true, occupancy: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async occupancy(identifier: string) {
    const store = await this.resolve(identifier);
    return {
      storeId: store.code,
      currentOccupancy: store.occupancy?.currentOccupancy ?? 0,
      totalEnteredToday: store.occupancy?.totalEnteredToday ?? 0,
      totalExitedToday: store.occupancy?.totalExitedToday ?? 0,
      peakOccupancyToday: store.occupancy?.peakOccupancyToday ?? 0,
      lastUpdatedAt: store.occupancy?.lastUpdatedAt ?? null,
    };
  }

  async events(identifier: string, query: HistoryQueryDto) {
    const store = await this.resolve(identifier);
    const where: Prisma.CrossingEventWhereInput = {
      storeId: store.id,
      occurredAt: dateRange(query),
      direction: query.direction,
      camera: query.cameraId ? { cameraId: query.cameraId } : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crossingEvent.findMany({
        where, include: { camera: { select: { cameraId: true } } },
        orderBy: { occurredAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
      this.prisma.crossingEvent.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async hourlyFootfall(identifier: string, query: HistoryQueryDto) {
    const store = await this.resolve(identifier);
    const events = await this.prisma.crossingEvent.findMany({
      where: {
        storeId: store.id, occurredAt: dateRange(query), direction: query.direction,
        camera: query.cameraId ? { cameraId: query.cameraId } : undefined,
      },
      select: { direction: true, occurredAt: true }, orderBy: { occurredAt: 'asc' },
    });
    const buckets = new Map<string, { hour: string; entered: number; exited: number }>();
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: store.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    });
    for (const event of events) {
      const hour = `${formatter.format(event.occurredAt).replace(' ', 'T')}:00`;
      const bucket = buckets.get(hour) ?? { hour, entered: 0, exited: 0 };
      if (event.direction === 'ENTER') bucket.entered += 1;
      else bucket.exited += 1;
      buckets.set(hour, bucket);
    }
    return [...buckets.values()];
  }
}
