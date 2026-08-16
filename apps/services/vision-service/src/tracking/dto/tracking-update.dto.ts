import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsEnum, IsISO8601, IsInt, IsNumber, IsOptional,
  IsString, Max, Min, ValidateNested,
} from 'class-validator';
import { CrossingDirection } from '@prisma/client';

export class ActiveTrackDto {
  @IsInt() trackId!: number;
  @IsNumber() @Min(0) @Max(1) x!: number;
  @IsNumber() @Min(0) @Max(1) y!: number;
  @IsNumber() @Min(0) @Max(1) confidence!: number;
}

export class CrossingEventDto {
  @IsString() eventId!: string;
  @IsInt() trackId!: number;
  @IsEnum(CrossingDirection) direction!: CrossingDirection;
  @IsOptional() @IsNumber() @Min(0) @Max(1) confidence?: number;
  @IsISO8601({ strict: true }) occurredAt!: string;
}

export class TrackingUpdateDto {
  @IsString() cameraId!: string;
  @IsString() storeId!: string;
  @IsInt() @Min(0) entered!: number;
  @IsInt() @Min(0) exited!: number;
  @IsInt() @Min(0) currentOccupancy!: number;
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ActiveTrackDto)
  activeTracks!: ActiveTrackDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CrossingEventDto)
  events: CrossingEventDto[] = [];
  @IsISO8601({ strict: true }) timestamp!: string;
}
