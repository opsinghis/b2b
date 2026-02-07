import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MasterProductStatus } from '@prisma/client';

export class UpdateMasterProductDto {
  @ApiPropertyOptional({
    description: 'Unique product SKU',
    example: 'PROD-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Enterprise Software License',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Annual enterprise software license with premium support',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'Software',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Product subcategory',
    example: 'Licenses',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'Acme Corp',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({
    description: 'Manufacturer name',
    example: 'Acme Industries',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    example: 'EA',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  uom?: string;

  @ApiPropertyOptional({
    description: 'List price',
    example: 999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  listPrice?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Product status',
    enum: MasterProductStatus,
  })
  @IsEnum(MasterProductStatus)
  @IsOptional()
  status?: MasterProductStatus;

  @ApiPropertyOptional({
    description: 'Additional product attributes as JSON',
    example: { weight: '2.5kg', dimensions: '10x20x30cm' },
  })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;
}
