import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'electronics' })
  @IsString()
  @MaxLength(100)
  slug!: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Category image URL' })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category ID for hierarchy' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is category active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', example: 'Electronics' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'URL-friendly slug', example: 'electronics' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Category image URL' })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category ID for hierarchy' })
  @IsString()
  @IsOptional()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is category active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID', example: 'clh1234567890' })
  id!: string;

  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'electronics' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Category image URL' })
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  parentId?: string | null;

  @ApiProperty({ description: 'Is category active', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order', example: 0 })
  sortOrder!: number;

  @ApiProperty({ description: 'Number of products in category', example: 25 })
  productCount!: number;

  @ApiPropertyOptional({
    description: 'Child categories',
    type: () => [CategoryResponseDto],
  })
  children?: CategoryResponseDto[];
}

export class CategoryTreeResponseDto {
  @ApiProperty({
    description: 'Category tree with nested children',
    type: [CategoryResponseDto],
  })
  data!: CategoryResponseDto[];

  @ApiProperty({ description: 'Total number of categories', example: 15 })
  total!: number;
}
