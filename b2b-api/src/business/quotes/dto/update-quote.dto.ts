import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
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
} from 'class-validator';
import { CreateQuoteLineItemDto } from './create-quote.dto';

export class UpdateQuoteLineItemDto {
  @ApiPropertyOptional({ example: 'line-item-id-123', description: 'Line item ID (for updates)' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'Updated Product Name', description: 'Product name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @ApiPropertyOptional({ example: 'SKU-002', description: 'Product SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  productSku?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Line item description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 15, description: 'Quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 1200, description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;

  @ApiPropertyOptional({ example: 50, description: 'Discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class UpdateQuoteDto {
  @ApiPropertyOptional({ example: 'Updated Quote Title', description: 'Quote title' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Quote description' })
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

  @ApiPropertyOptional({ example: '2024-04-30', description: 'Quote validity date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ example: 'EUR', description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'Updated notes', description: 'Additional notes' })
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

  @ApiPropertyOptional({ example: 'contract-id-456', description: 'Associated contract ID' })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({
    example: { priority: 'medium' },
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: [CreateQuoteLineItemDto],
    description: 'Quote line items (replaces all)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems?: CreateQuoteLineItemDto[];
}
