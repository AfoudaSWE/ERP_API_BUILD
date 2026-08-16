import { Controller, Get, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import { HistoryQueryDto } from '../common/query.dto';
import { ReportsService } from './reports.service';

export class FootfallQueryDto extends HistoryQueryDto {
  @IsString() storeId!: string;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('footfall') footfall(@Query() query: FootfallQueryDto) { return this.service.footfall(query); }
}
