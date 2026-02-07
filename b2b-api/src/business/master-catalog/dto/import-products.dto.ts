import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterProductStatus } from '@prisma/client';

export class ImportProductDto {
  sku!: string;
  name!: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  manufacturer?: string;
  uom?: string;
  listPrice!: number;
  currency?: string;
  status?: MasterProductStatus;
  attributes?: Record<string, unknown>;
}

export class ImportStatisticsDto {
  @ApiProperty({
    description: 'Total products in import file',
    example: 500,
  })
  total!: number;

  @ApiProperty({
    description: 'Products successfully imported',
    example: 490,
  })
  imported!: number;

  @ApiProperty({
    description: 'Products skipped (duplicates)',
    example: 10,
  })
  skipped!: number;

  @ApiProperty({
    description: 'Products that failed validation',
    example: 0,
  })
  failed!: number;

  @ApiPropertyOptional({
    description: 'List of errors if any',
    example: [{ sku: 'INVALID-001', error: 'Invalid price format' }],
  })
  errors?: Array<{ sku: string; error: string }>;

  @ApiProperty({
    description: 'Import duration in milliseconds',
    example: 1234,
  })
  durationMs!: number;
}

export class ImportResponseDto {
  @ApiProperty({
    description: 'Import success status',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Import statistics',
    type: ImportStatisticsDto,
  })
  statistics!: ImportStatisticsDto;

  @ApiPropertyOptional({
    description: 'Message',
    example: 'Import completed successfully',
  })
  message?: string;
}
