import { IsBoolean, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantAccessDto {
  @ApiProperty({
    description: 'Whether to grant or revoke access',
    example: true,
  })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Agreed fixed price (overrides list price)',
    example: 899.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  agreedPrice?: number;

  @ApiPropertyOptional({
    description: 'Discount percentage off list price',
    example: 10.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Minimum quantity per order',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minQuantity?: number;

  @ApiPropertyOptional({
    description: 'Maximum quantity per order',
    example: 100,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxQuantity?: number;

  @ApiPropertyOptional({
    description: 'Pricing validity start date',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Pricing validity end date',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;
}
