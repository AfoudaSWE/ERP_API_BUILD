import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class IngestRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.ip}:${String(request.body?.cameraId ?? 'unknown')}`;
    const now = Date.now();
    const current = this.windows.get(key);
    if (!current || now - current.startedAt >= 60_000) {
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    if (current.count > this.config.get<number>('ingestRateLimitPerMinute', 180)) {
      throw new HttpException('Camera update rate exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
