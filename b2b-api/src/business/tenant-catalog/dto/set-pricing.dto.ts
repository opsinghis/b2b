import { IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SetPricingDto {
  @ApiPropertyOptional({
    description: 'Agreed fixed price (overrides list price)',
    example: 899.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  agreedPrice?: number | null;

  @ApiPropertyOptional({
    description: 'Discount percentage off list price (0-100)',
    example: 10.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number | null;

  @ApiPropertyOptional({
    description: 'Minimum quantity per order',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minQuantity?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum quantity per order',
    example: 100,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxQuantity?: number | null;

  @ApiPropertyOptional({
    description: 'Pricing validity start date',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  validFrom?: string | null;

  @ApiPropertyOptional({
    description: 'Pricing validity end date',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string | null;
}
