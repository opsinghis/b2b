import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDate,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  PriceListType,
  PriceListStatus,
  RoundingRule,
  PriceAssignmentType,
  PriceOverrideType,
  PriceOverrideScopeType,
  PriceOverrideStatus,
  ExchangeRateType,
} from '@prisma/client';

// ============================================
// Price List DTOs
// ============================================

export class QuantityBreakDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  minQuantity!: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxQuantity?: number;

  @ApiProperty()
  @IsNumber()
  price!: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discountPercent?: number;
}

export class CreatePriceListDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: PriceListType })
  @IsEnum(PriceListType)
  @IsOptional()
  type?: PriceListType;

  @ApiPropertyOptional({ enum: PriceListStatus })
  @IsEnum(PriceListStatus)
  @IsOptional()
  status?: PriceListStatus;

  @ApiProperty({ default: 'USD' })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  basePriceListId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priceModifier?: number;

  @ApiPropertyOptional({ enum: RoundingRule, default: RoundingRule.NEAREST })
  @IsEnum(RoundingRule)
  @IsOptional()
  roundingRule?: RoundingRule;

  @ApiPropertyOptional({ default: 2 })
  @IsNumber()
  @Min(0)
  @Max(4)
  @IsOptional()
  roundingPrecision?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isCustomerSpecific?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalSystem?: string;
}

export class UpdatePriceListDto extends PartialType(
  OmitType(CreatePriceListDto, ['code'] as const),
) {}

export class CreatePriceListItemDto {
  @ApiProperty()
  @IsString()
  sku!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  masterProductId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  listPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ type: [QuantityBreakDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuantityBreakDto)
  @IsOptional()
  quantityBreaks?: QuantityBreakDto[];

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxDiscountPercent?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isDiscountable?: boolean;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveTo?: Date;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 'EA' })
  @IsString()
  @IsOptional()
  uom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalSystem?: string;
}

export class UpdatePriceListItemDto extends PartialType(
  OmitType(CreatePriceListItemDto, ['sku'] as const),
) {}

export class BulkUpsertPriceListItemsDto {
  @ApiProperty({ type: [CreatePriceListItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePriceListItemDto)
  items!: CreatePriceListItemDto[];
}

// ============================================
// Customer Assignment DTOs
// ============================================

export class CreateCustomerAssignmentDto {
  @ApiProperty()
  @IsString()
  priceListId!: string;

  @ApiProperty({ enum: PriceAssignmentType })
  @IsEnum(PriceAssignmentType)
  assignmentType!: PriceAssignmentType;

  @ApiProperty()
  @IsString()
  assignmentId!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveTo?: Date;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalRef?: string;
}

// ============================================
// Price Override DTOs
// ============================================

export class CreatePriceOverrideDto {
  @ApiProperty()
  @IsString()
  priceListItemId!: string;

  @ApiProperty({ enum: PriceOverrideType })
  @IsEnum(PriceOverrideType)
  overrideType!: PriceOverrideType;

  @ApiProperty()
  @IsNumber()
  overrideValue!: number;

  @ApiProperty({ enum: PriceOverrideScopeType })
  @IsEnum(PriceOverrideScopeType)
  scopeType!: PriceOverrideScopeType;

  @ApiProperty()
  @IsString()
  scopeId!: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @IsOptional()
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxQuantity?: number;

  @ApiPropertyOptional({ enum: PriceOverrideStatus })
  @IsEnum(PriceOverrideStatus)
  @IsOptional()
  status?: PriceOverrideStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalRef?: string;
}

export class UpdatePriceOverrideDto extends PartialType(
  OmitType(CreatePriceOverrideDto, ['priceListItemId', 'scopeType', 'scopeId'] as const),
) {}

// ============================================
// Currency DTOs
// ============================================

export class CreateExchangeRateDto {
  @ApiProperty()
  @IsString()
  sourceCurrency!: string;

  @ApiProperty()
  @IsString()
  targetCurrency!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rateSource?: string;

  @ApiPropertyOptional({ enum: ExchangeRateType, default: ExchangeRateType.SPOT })
  @IsEnum(ExchangeRateType)
  @IsOptional()
  rateType?: ExchangeRateType;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ConvertCurrencyDto {
  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsString()
  sourceCurrency!: string;

  @ApiProperty()
  @IsString()
  targetCurrency!: string;

  @ApiPropertyOptional({ enum: ExchangeRateType })
  @IsEnum(ExchangeRateType)
  @IsOptional()
  rateType?: ExchangeRateType;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;
}

// ============================================
// Price Calculation DTOs
// ============================================

export class CalculatePriceDto {
  @ApiProperty()
  @IsString()
  sku!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  priceDate?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  warehouseId?: string;
}

export class CalculatePricesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  skus!: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  priceDate?: Date;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  includeBreaks?: boolean;
}

// ============================================
// Sync DTOs
// ============================================

export class ImportPriceListDto {
  @ApiProperty()
  priceList!: {
    code: string;
    name: string;
    description?: string;
    type?: string;
    currency: string;
    effectiveFrom: string;
    effectiveTo?: string;
    externalId?: string;
  };

  @ApiProperty({ type: [Object] })
  items!: Array<{
    sku: string;
    basePrice: number;
    listPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    cost?: number;
    currency?: string;
    uom?: string;
    quantityBreaks?: QuantityBreakDto[];
    effectiveFrom?: string;
    effectiveTo?: string;
    externalId?: string;
  }>;
}

export class StartSyncJobDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  connectorId?: string;

  @ApiProperty()
  @IsString()
  priceListCode!: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  fullSync?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deltaToken?: string;
}

// ============================================
// Query DTOs
// ============================================

export class PriceListQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: PriceListType })
  @IsEnum(PriceListType)
  @IsOptional()
  type?: PriceListType;

  @ApiPropertyOptional({ enum: PriceListStatus })
  @IsEnum(PriceListStatus)
  @IsOptional()
  status?: PriceListStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isCustomerSpecific?: boolean;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveAt?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalSystem?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ enum: ['code', 'name', 'priority', 'effectiveFrom', 'createdAt'] })
  @IsString()
  @IsOptional()
  sortBy?: 'code' | 'name' | 'priority' | 'effectiveFrom' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  includeItems?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  includeAssignments?: boolean;
}

export class PriceListItemQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skus?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveAt?: Date;

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ enum: ['sku', 'listPrice', 'effectiveFrom', 'createdAt'] })
  @IsString()
  @IsOptional()
  sortBy?: 'sku' | 'listPrice' | 'effectiveFrom' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  includeOverrides?: boolean;
}

export class PriceOverrideQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priceListItemId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ enum: PriceOverrideScopeType })
  @IsEnum(PriceOverrideScopeType)
  @IsOptional()
  scopeType?: PriceOverrideScopeType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scopeId?: string;

  @ApiPropertyOptional({ enum: PriceOverrideStatus })
  @IsEnum(PriceOverrideStatus)
  @IsOptional()
  status?: PriceOverrideStatus;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveAt?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  pageSize?: number;
}
