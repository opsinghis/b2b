import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsObject,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountTier, UserDiscountTier } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ============================================
// Request DTOs
// ============================================

export class CreateDiscountTierDto {
  @ApiProperty({ description: 'Tier name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Unique tier code' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tier level (0 = lowest)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @ApiProperty({ description: 'Discount percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent!: number;

  @ApiPropertyOptional({ description: 'Minimum spend to qualify' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSpend?: number;

  @ApiPropertyOptional({ description: 'Minimum orders to qualify' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrders?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display color (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Display icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class UpdateDiscountTierDto {
  @ApiPropertyOptional({ description: 'Tier name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tier level' })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @ApiPropertyOptional({ description: 'Discount percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Minimum spend to qualify' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSpend?: number;

  @ApiPropertyOptional({ description: 'Minimum orders to qualify' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrders?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display color (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Display icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class AssignDiscountTierDto {
  @ApiProperty({ description: 'User ID to assign' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Assignment reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryDiscountTiersDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ============================================
// Response DTOs
// ============================================

export class DiscountTierResponseDto {
  @ApiProperty({ description: 'Tier ID' })
  id!: string;

  @ApiProperty({ description: 'Tier name' })
  name!: string;

  @ApiProperty({ description: 'Tier code' })
  code!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description!: string | null;

  @ApiProperty({ description: 'Tier level' })
  level!: number;

  @ApiProperty({ description: 'Discount percentage' })
  discountPercent!: number;

  @ApiPropertyOptional({ description: 'Minimum spend' })
  minSpend!: number | null;

  @ApiPropertyOptional({ description: 'Minimum orders' })
  minOrders!: number | null;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Display color' })
  color!: string | null;

  @ApiPropertyOptional({ description: 'Display icon' })
  icon!: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(entity: DiscountTier): DiscountTierResponseDto {
    const dto = new DiscountTierResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.description = entity.description;
    dto.level = entity.level;
    dto.discountPercent = Number(entity.discountPercent);
    dto.minSpend = entity.minSpend ? Number(entity.minSpend) : null;
    dto.minOrders = entity.minOrders;
    dto.isActive = entity.isActive;
    dto.color = entity.color;
    dto.icon = entity.icon;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class UserDiscountTierResponseDto {
  @ApiProperty({ description: 'Assignment ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Tier details' })
  tier!: DiscountTierResponseDto;

  @ApiProperty({ description: 'Assigned timestamp' })
  assignedAt!: Date;

  @ApiPropertyOptional({ description: 'Expiration timestamp' })
  expiresAt!: Date | null;

  @ApiPropertyOptional({ description: 'Assignment reason' })
  reason!: string | null;

  @ApiProperty({ description: 'Total spend' })
  totalSpend!: number;

  @ApiProperty({ description: 'Total orders' })
  totalOrders!: number;

  @ApiProperty({ description: 'Total savings' })
  totalSavings!: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(
    entity: UserDiscountTier & { discountTier: DiscountTier },
  ): UserDiscountTierResponseDto {
    const dto = new UserDiscountTierResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.tier = DiscountTierResponseDto.fromEntity(entity.discountTier);
    dto.assignedAt = entity.assignedAt;
    dto.expiresAt = entity.expiresAt;
    dto.reason = entity.reason;
    dto.totalSpend = Number(entity.totalSpend);
    dto.totalOrders = entity.totalOrders;
    dto.totalSavings = Number(entity.totalSavings);
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class UserSavingsResponseDto {
  @ApiPropertyOptional({ description: 'Current tier' })
  currentTier!: DiscountTierResponseDto | null;

  @ApiProperty({ description: 'Total spend' })
  totalSpend!: number;

  @ApiProperty({ description: 'Total orders' })
  totalOrders!: number;

  @ApiProperty({ description: 'Total savings' })
  totalSavings!: number;

  @ApiPropertyOptional({ description: 'Next tier' })
  nextTier!: DiscountTierResponseDto | null;

  @ApiPropertyOptional({ description: 'Amount to spend for next tier' })
  spendToNextTier!: number | null;

  @ApiPropertyOptional({ description: 'Orders needed for next tier' })
  ordersToNextTier!: number | null;
}

export class DiscountTiersListResponseDto {
  @ApiProperty({ description: 'Tiers list', type: [DiscountTierResponseDto] })
  tiers!: DiscountTierResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}
