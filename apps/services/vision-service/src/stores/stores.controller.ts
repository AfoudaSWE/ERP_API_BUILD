import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryQueryDto } from '../common/query.dto';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly service: StoresService) {}
  @Get() list() { return this.service.list(); }
  @Get(':storeId') get(@Param('storeId') id: string) { return this.service.resolve(id); }
  @Get(':storeId/occupancy') occupancy(@Param('storeId') id: string) { return this.service.occupancy(id); }
  @Get(':storeId/events') events(@Param('storeId') id: string, @Query() query: HistoryQueryDto) {
    return this.service.events(id, query);
  }
  @Get(':storeId/hourly-footfall') hourly(@Param('storeId') id: string, @Query() query: HistoryQueryDto) {
    return this.service.hourlyFootfall(id, query);
  }
}
