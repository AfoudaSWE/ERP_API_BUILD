import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { CamerasController } from './cameras.controller';
import { CamerasService } from './cameras.service';

@Module({ imports: [RealtimeModule], controllers: [CamerasController], providers: [CamerasService] })
export class CamerasModule {}
