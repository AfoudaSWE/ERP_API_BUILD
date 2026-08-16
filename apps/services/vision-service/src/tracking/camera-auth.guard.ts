import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedCameraRequest } from './tracking.types';

export function hashCameraApiKey(apiKey: string, pepper: string): string {
  return createHmac('sha256', pepper).update(apiKey).digest('hex');
}

@Injectable()
export class CameraAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedCameraRequest>();
    const apiKey = request.header('X-Camera-Api-Key');
    const cameraId = typeof request.body?.cameraId === 'string' ? request.body.cameraId : '';
    if (!apiKey || !cameraId) throw new UnauthorizedException('Invalid camera credentials');

    const camera = await this.prisma.camera.findUnique({ where: { cameraId }, include: { store: true } });
    if (!camera || !camera.isActive || !camera.store.isActive) {
      throw new UnauthorizedException('Invalid camera credentials');
    }
    const provided = Buffer.from(hashCameraApiKey(apiKey, this.config.getOrThrow('cameraApiKeyPepper')), 'hex');
    const expected = Buffer.from(camera.apiKeyHash, 'hex');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid camera credentials');
    }
    request.authenticatedCamera = camera;
    return true;
  }
}
