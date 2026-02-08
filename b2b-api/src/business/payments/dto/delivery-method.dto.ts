import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryMethod } from '@prisma/client';

export class CreateDeliveryMethodDto {
  @ApiProperty({ description: 'Unique code for the delivery method' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Minimum delivery days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDays?: number;

  @ApiPropertyOptional({ description: 'Maximum delivery days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDays?: number;

  @ApiPropertyOptional({ description: 'Base delivery cost', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseCost?: number;

  @ApiPropertyOptional({ description: 'Free delivery threshold (order amount)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeThreshold?: number;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateDeliveryMethodDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Minimum delivery days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDays?: number;

  @ApiPropertyOptional({ description: 'Maximum delivery days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDays?: number;

  @ApiPropertyOptional({ description: 'Base delivery cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseCost?: number;

  @ApiPropertyOptional({ description: 'Free delivery threshold (order amount)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeThreshold?: number;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class DeliveryMethodResponseDto {
  @ApiProperty({ description: 'Delivery method ID' })
  id!: string;

  @ApiProperty({ description: 'Unique code' })
  code!: string;

  @ApiProperty({ description: 'Display name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: 'Minimum delivery days' })
  minDays?: number | null;

  @ApiPropertyOptional({ description: 'Maximum delivery days' })
  maxDays?: number | null;

  @ApiProperty({ description: 'Base delivery cost' })
  baseCost!: string;

  @ApiPropertyOptional({ description: 'Free delivery threshold' })
  freeThreshold?: string | null;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  config?: Record<string, unknown>;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(method: DeliveryMethod): DeliveryMethodResponseDto {
    const dto = new DeliveryMethodResponseDto();
    dto.id = method.id;
    dto.code = method.code;
    dto.name = method.name;
    dto.description = method.description;
    dto.isActive = method.isActive;
    dto.sortOrder = method.sortOrder;
    dto.minDays = method.minDays;
    dto.maxDays = method.maxDays;
    dto.baseCost = method.baseCost.toString();
    dto.freeThreshold = method.freeThreshold?.toString() || null;
    dto.config = method.config as Record<string, unknown>;
    dto.createdAt = method.createdAt;
    dto.updatedAt = method.updatedAt;
    return dto;
  }
}

export class ListDeliveryMethodsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
