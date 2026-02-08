import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsPositive, IsInt, Min, IsObject } from 'class-validator';

export class AddCartItemDto {
  @ApiPropertyOptional({
    description: 'Master product ID from catalog',
    example: 'clxyz123...',
  })
  @IsString()
  @IsOptional()
  masterProductId?: string;

  @ApiPropertyOptional({
    description: 'Product name (required if masterProductId not provided)',
    example: 'Enterprise Software License',
  })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({
    description: 'Product SKU',
    example: 'ESL-2024-001',
  })
  @IsString()
  @IsOptional()
  productSku?: string;

  @ApiProperty({
    description: 'Quantity to add',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit price (required if masterProductId not provided)',
    example: 199.99,
  })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({
    description: 'Line item discount',
    example: 10.0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { notes: 'Priority item' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
