import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterProductStatus } from '@prisma/client';

export class MasterProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'clh1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique product SKU',
    example: 'PROD-001',
  })
  sku!: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Enterprise Software License',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Annual enterprise software license with premium support',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'Software',
  })
  category?: string | null;

  @ApiPropertyOptional({
    description: 'Product subcategory',
    example: 'Licenses',
  })
  subcategory?: string | null;

  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'Acme Corp',
  })
  brand?: string | null;

  @ApiPropertyOptional({
    description: 'Manufacturer name',
    example: 'Acme Industries',
  })
  manufacturer?: string | null;

  @ApiProperty({
    description: 'Unit of measure',
    example: 'EA',
  })
  uom!: string;

  @ApiProperty({
    description: 'List price',
    example: '999.99',
  })
  listPrice!: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency!: string;

  @ApiProperty({
    description: 'Product status',
    enum: MasterProductStatus,
    example: MasterProductStatus.ACTIVE,
  })
  status!: MasterProductStatus;

  @ApiPropertyOptional({
    description: 'Additional product attributes',
    example: { weight: '2.5kg', dimensions: '10x20x30cm' },
  })
  attributes?: Record<string, unknown>;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2026-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2026-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;
}

export class MasterProductListResponseDto {
  @ApiProperty({
    description: 'List of products',
    type: [MasterProductResponseDto],
  })
  data!: MasterProductResponseDto[];

  @ApiProperty({
    description: 'Total number of products',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages!: number;
}
