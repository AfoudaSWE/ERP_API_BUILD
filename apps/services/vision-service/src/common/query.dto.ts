import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CrossingDirection } from '@prisma/client';

export class HistoryQueryDto {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() cameraId?: string;
  @IsOptional() @IsEnum(CrossingDirection) direction?: CrossingDirection;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export function dateRange(query: HistoryQueryDto): { gte: Date; lte: Date } {
  return {
    gte: query.from ? new Date(query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000),
    lte: query.to ? new Date(query.to) : new Date(),
  };
}
