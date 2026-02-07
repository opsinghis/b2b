import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  IsNumber,
  IsPositive,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateContractDto {
  @ApiPropertyOptional({ example: 'Updated Service Agreement', description: 'Contract title' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated contract description',
    description: 'Contract description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '2024-02-01', description: 'Contract effective date' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ example: '2025-01-31', description: 'Contract expiration date' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ example: 150000, description: 'Total contract value' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalValue?: number;

  @ApiPropertyOptional({ example: 'EUR', description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'org-id-456', description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    example: { paymentTerms: 'Net 45', autoRenewal: false },
    description: 'Contract terms',
  })
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { priority: 'medium' },
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
