import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CamerasModule } from './cameras/cameras.module';
import { configuration, validateEnvironment } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { StoresModule } from './stores/stores.module';
import { TrackingModule } from './tracking/tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnvironment }),
    DatabaseModule,
    RealtimeModule,
    HealthModule,
    StoresModule,
    CamerasModule,
    TrackingModule,
    ReportsModule,
  ],
})
export class AppModule {}
