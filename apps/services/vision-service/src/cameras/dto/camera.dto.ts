import { DirectionMode } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCameraDto {
  @IsString() cameraId!: string;
  @IsString() storeId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() location?: string;
  @IsEnum(DirectionMode) directionMode!: DirectionMode;
  @IsString() @MinLength(16) apiKey!: string;
}

export class UpdateCameraDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(DirectionMode) directionMode?: DirectionMode;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(16) apiKey?: string;
}
