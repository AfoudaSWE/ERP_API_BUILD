import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CameraAuthGuard } from './camera-auth.guard';
import { IngestRateLimitGuard } from './ingest-rate-limit.guard';
import { TrackingService } from './tracking.service';
import { TrackingUpdateDto } from './dto/tracking-update.dto';
import type { AuthenticatedCameraRequest } from './tracking.types';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly service: TrackingService) {}

  @Post('updates')
  @UseGuards(IngestRateLimitGuard, CameraAuthGuard)
  ingest(@Body() dto: TrackingUpdateDto, @Req() request: AuthenticatedCameraRequest) {
    return this.service.ingest(dto, request);
  }
}
