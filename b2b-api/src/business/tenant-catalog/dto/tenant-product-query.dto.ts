import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterProductStatus, ProductAvailability } from '@prisma/client';

export class TenantProductQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for name, SKU, or description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category (text field)',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID (hierarchical category)',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by subcategory',
  })
  @IsString()
  @IsOptional()
  subcategory?: string;

  @ApiPropertyOptional({
    description: 'Filter by brand',
  })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: MasterProductStatus,
  })
  @IsEnum(MasterProductStatus)
  @IsOptional()
  status?: MasterProductStatus;

  @ApiPropertyOptional({
    description: 'Filter by availability',
    enum: ProductAvailability,
  })
  @IsEnum(ProductAvailability)
  @IsOptional()
  availability?: ProductAvailability;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 10.0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 1000.0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Only show products the tenant has access to',
    default: true,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  accessOnly?: boolean = true;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 20;
}

export class SearchSuggestionsQueryDto {
  @ApiPropertyOptional({
    description: 'Search query for autocomplete',
    minLength: 2,
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: 'Maximum suggestions to return', default: 10 })
  @IsInt()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 10;
}

export class SearchSuggestionDto {
  @ApiProperty({ description: 'Suggestion type', example: 'product' })
  type!: 'product' | 'category' | 'brand';

  @ApiProperty({ description: 'Suggestion text', example: 'Apple iPhone' })
  text!: string;

  @ApiPropertyOptional({ description: 'Associated ID', example: 'clh123' })
  id?: string;

  @ApiPropertyOptional({ description: 'Result count for this suggestion', example: 25 })
  count?: number;
}

export class SearchSuggestionsResponseDto {
  @ApiProperty({
    description: 'Search suggestions',
    type: [SearchSuggestionDto],
  })
  suggestions!: SearchSuggestionDto[];
}
