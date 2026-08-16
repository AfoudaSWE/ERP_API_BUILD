import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';

@Controller('cameras')
export class CamerasController {
  constructor(private readonly service: CamerasService) {}
  @Get() list() { return this.service.list(); }
  @Get(':cameraId') get(@Param('cameraId') id: string) { return this.service.get(id); }
  @Get(':cameraId/latest') latest(@Param('cameraId') id: string) { return this.service.latest(id); }
  @Post() create(@Body() dto: CreateCameraDto) { return this.service.create(dto); }
  @Patch(':cameraId') update(@Param('cameraId') id: string, @Body() dto: UpdateCameraDto) {
    return this.service.update(id, dto);
  }
}
