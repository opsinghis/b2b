import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterProductStatus } from '@prisma/client';

export class CreateMasterProductDto {
  @ApiProperty({
    description: 'Unique product SKU',
    example: 'PROD-001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku!: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Enterprise Software License',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

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
    default: 'EA',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  uom?: string;

  @ApiProperty({
    description: 'List price',
    example: 999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  listPrice!: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Product status',
    enum: MasterProductStatus,
    default: MasterProductStatus.ACTIVE,
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
