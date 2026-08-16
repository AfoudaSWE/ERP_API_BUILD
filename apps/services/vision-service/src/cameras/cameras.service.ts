import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { hashCameraApiKey } from '../tracking/camera-auth.guard';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';
import { isUuid } from '../common/identifiers';

@Injectable()
export class CamerasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
  ) {}

  list() {
    return this.prisma.camera.findMany({
      select: this.publicSelect(), orderBy: { cameraId: 'asc' },
    });
  }

  async get(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({ where: { cameraId }, select: this.publicSelect() });
    if (!camera) throw new NotFoundException('Camera not found');
    return camera;
  }

  async latest(cameraId: string) {
    const camera = await this.get(cameraId);
    const snapshot = await this.prisma.cameraSnapshot.findFirst({
      where: { cameraId: camera.id }, orderBy: { capturedAt: 'desc' },
    });
    return { camera, snapshot, activeTracks: this.realtime.getTracks(cameraId) };
  }

  async create(dto: CreateCameraDto) {
    const store = await this.prisma.store.findFirst({
      where: isUuid(dto.storeId) ? { id: dto.storeId } : { code: dto.storeId },
    });
    if (!store) throw new NotFoundException('Store not found');
    if (await this.prisma.camera.findUnique({ where: { cameraId: dto.cameraId } })) {
      throw new ConflictException('Camera ID already exists');
    }
    return this.prisma.camera.create({
      data: {
        cameraId: dto.cameraId, storeId: store.id, name: dto.name, location: dto.location,
        directionMode: dto.directionMode,
        apiKeyHash: hashCameraApiKey(dto.apiKey, this.config.getOrThrow('cameraApiKeyPepper')),
      },
      select: this.publicSelect(),
    });
  }

  async update(cameraId: string, dto: UpdateCameraDto) {
    await this.get(cameraId);
    const { apiKey, ...data } = dto;
    return this.prisma.camera.update({
      where: { cameraId },
      data: {
        ...data,
        apiKeyHash: apiKey ? hashCameraApiKey(apiKey, this.config.getOrThrow('cameraApiKeyPepper')) : undefined,
      },
      select: this.publicSelect(),
    });
  }

  private publicSelect() {
    return {
      id: true, cameraId: true, storeId: true, name: true, location: true, directionMode: true,
      isActive: true, lastSeenAt: true, createdAt: true, updatedAt: true,
      store: { select: { code: true, name: true } },
    } as const;
  }
}
