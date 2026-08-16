import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { CameraAuthGuard } from './camera-auth.guard';
import { IngestRateLimitGuard } from './ingest-rate-limit.guard';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  imports: [RealtimeModule],
  controllers: [TrackingController],
  providers: [TrackingService, CameraAuthGuard, IngestRateLimitGuard],
})
export class TrackingModule {}
