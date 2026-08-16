import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({ imports: [StoresModule], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
