import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class CreateQuoteLineItemDto {
  @ApiPropertyOptional({
    example: 'prod-123',
    description: 'Master product ID from catalog. When provided, name/SKU/price are auto-resolved.',
  })
  @IsOptional()
  @IsString()
  masterProductId?: string;

  @ApiPropertyOptional({
    example: 'Enterprise Software License',
    description: 'Product name (required if masterProductId not provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @ApiPropertyOptional({ example: 'SKU-001', description: 'Product SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  productSku?: string;

  @ApiPropertyOptional({
    example: 'Annual license for 100 users',
    description: 'Line item description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 10, description: 'Quantity' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Unit price (auto-resolved from catalog if masterProductId provided)',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;

  @ApiPropertyOptional({ example: 100, description: 'Discount amount', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateQuoteDto {
  @ApiProperty({ example: 'Q4 Enterprise Deal', description: 'Quote title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'Annual software licensing quote',
    description: 'Quote description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Customer name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com', description: 'Customer email' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerEmail?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: 'Quote validity date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ example: 'USD', description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'Terms and conditions apply', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({
    example: 'Internal review notes',
    description: 'Internal notes (not visible to customer)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalNotes?: string;

  @ApiPropertyOptional({ example: 10, description: 'Discount percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'contract-id-123', description: 'Associated contract ID' })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({
    example: { priority: 'high', source: 'web' },
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: [CreateQuoteLineItemDto], description: 'Quote line items' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems!: CreateQuoteLineItemDto[];
}
