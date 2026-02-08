import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @ApiPropertyOptional({ description: 'Street address line 1' })
  @IsOptional()
  @IsString()
  street1?: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal/ZIP code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'Optional notes for the order',
    example: 'Please deliver before noon',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Shipping address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @ApiPropertyOptional({
    description: 'Billing address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
