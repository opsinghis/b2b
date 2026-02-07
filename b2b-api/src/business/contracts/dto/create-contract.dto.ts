import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsDateString,
  IsNumber,
  IsPositive,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ example: 'Annual Service Agreement', description: 'Contract title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'Comprehensive service agreement for 2024',
    description: 'Contract description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Contract effective date' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Contract expiration date' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ example: 100000, description: 'Total contract value' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalValue?: number;

  @ApiPropertyOptional({ example: 'USD', description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'org-id-123', description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    example: { paymentTerms: 'Net 30', autoRenewal: true },
    description: 'Contract terms',
  })
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { priority: 'high', department: 'sales' },
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
