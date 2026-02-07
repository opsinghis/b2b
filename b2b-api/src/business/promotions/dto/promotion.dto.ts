import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsObject,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Promotion,
  Coupon,
  PromotionUsage,
  PromotionType,
  DiscountType,
  UserRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

// ============================================
// Request DTOs
// ============================================

export class CreatePromotionDto {
  @ApiProperty({ description: 'Promotion name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Unique promotion code' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Promotion type', enum: PromotionType })
  @IsEnum(PromotionType)
  type!: PromotionType;

  @ApiProperty({ description: 'Discount value (percentage or fixed amount)' })
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @ApiProperty({ description: 'Discount type', enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Total usage limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Per user usage limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Target user roles', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  targetUserRoles?: UserRole[];

  @ApiPropertyOptional({ description: 'Conditions (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Prisma.InputJsonValue;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class UpdatePromotionDto {
  @ApiPropertyOptional({ description: 'Promotion name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Discount value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Discount type', enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Total usage limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Per user usage limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Target user roles', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  targetUserRoles?: UserRole[];

  @ApiPropertyOptional({ description: 'Conditions (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Prisma.InputJsonValue;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class GenerateCouponsDto {
  @ApiProperty({ description: 'Number of coupons to generate' })
  @IsInt()
  @Min(1)
  @Max(1000)
  count!: number;

  @ApiPropertyOptional({ description: 'Prefix for coupon codes' })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({ description: 'Usage limit per coupon', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Coupon expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class QueryPromotionsDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by type', enum: PromotionType })
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

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

export class ApplyCouponDto {
  @ApiProperty({ description: 'Coupon code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Order amount for validation' })
  @IsNumber()
  @Min(0)
  orderAmount!: number;
}

// ============================================
// Response DTOs
// ============================================

export class PromotionResponseDto {
  @ApiProperty({ description: 'Promotion ID' })
  id!: string;

  @ApiProperty({ description: 'Promotion name' })
  name!: string;

  @ApiProperty({ description: 'Promotion code' })
  code!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description!: string | null;

  @ApiProperty({ description: 'Promotion type', enum: PromotionType })
  type!: PromotionType;

  @ApiProperty({ description: 'Discount value' })
  discountValue!: number;

  @ApiProperty({ description: 'Discount type', enum: DiscountType })
  discountType!: DiscountType;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  minOrderAmount!: number | null;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  maxDiscount!: number | null;

  @ApiPropertyOptional({ description: 'Total usage limit' })
  usageLimit!: number | null;

  @ApiProperty({ description: 'Current usage count' })
  usageCount!: number;

  @ApiPropertyOptional({ description: 'Per user usage limit' })
  perUserLimit!: number | null;

  @ApiProperty({ description: 'Start date' })
  startDate!: Date;

  @ApiProperty({ description: 'End date' })
  endDate!: Date;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Target user roles', type: [String] })
  targetUserRoles!: UserRole[];

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(entity: Promotion): PromotionResponseDto {
    const dto = new PromotionResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.description = entity.description;
    dto.type = entity.type;
    dto.discountValue = Number(entity.discountValue);
    dto.discountType = entity.discountType;
    dto.minOrderAmount = entity.minOrderAmount ? Number(entity.minOrderAmount) : null;
    dto.maxDiscount = entity.maxDiscount ? Number(entity.maxDiscount) : null;
    dto.usageLimit = entity.usageLimit;
    dto.usageCount = entity.usageCount;
    dto.perUserLimit = entity.perUserLimit;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.isActive = entity.isActive;
    dto.targetUserRoles = entity.targetUserRoles;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class CouponResponseDto {
  @ApiProperty({ description: 'Coupon ID' })
  id!: string;

  @ApiProperty({ description: 'Coupon code' })
  code!: string;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Usage limit' })
  usageLimit!: number;

  @ApiProperty({ description: 'Current usage count' })
  usageCount!: number;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt!: Date | null;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  assignedToId!: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  static fromEntity(entity: Coupon): CouponResponseDto {
    const dto = new CouponResponseDto();
    dto.id = entity.id;
    dto.code = entity.code;
    dto.isActive = entity.isActive;
    dto.usageLimit = entity.usageLimit;
    dto.usageCount = entity.usageCount;
    dto.expiresAt = entity.expiresAt;
    dto.assignedToId = entity.assignedToId;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class PromotionAnalyticsResponseDto {
  @ApiProperty({ description: 'Promotion ID' })
  promotionId!: string;

  @ApiProperty({ description: 'Total usage count' })
  totalUsages!: number;

  @ApiProperty({ description: 'Total discount given' })
  totalDiscountGiven!: number;

  @ApiProperty({ description: 'Unique users count' })
  uniqueUsers!: number;

  @ApiProperty({ description: 'Active coupons count' })
  activeCoupons!: number;

  @ApiProperty({ description: 'Used coupons count' })
  usedCoupons!: number;

  @ApiProperty({ description: 'Conversion rate (%)' })
  conversionRate!: number;
}

export class ApplyCouponResponseDto {
  @ApiProperty({ description: 'Is coupon valid' })
  valid!: boolean;

  @ApiPropertyOptional({ description: 'Discount amount' })
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Error message' })
  message?: string;

  @ApiPropertyOptional({ description: 'Promotion details' })
  promotion?: PromotionResponseDto;
}

export class PromotionsListResponseDto {
  @ApiProperty({ description: 'Promotions list', type: [PromotionResponseDto] })
  promotions!: PromotionResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}
