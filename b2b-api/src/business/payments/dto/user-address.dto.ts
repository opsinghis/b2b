import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { UserAddress } from '@prisma/client';

export class CreateUserAddressDto {
  @ApiPropertyOptional({ description: 'Address label (e.g., "Home", "Office")' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiProperty({ description: 'Street address line 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  street1!: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  street2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ description: 'Postal/ZIP code' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode!: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)', default: 'US' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Set as default address', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Can be used for shipping', default: true })
  @IsOptional()
  @IsBoolean()
  isShipping?: boolean;

  @ApiPropertyOptional({ description: 'Can be used for billing', default: true })
  @IsOptional()
  @IsBoolean()
  isBilling?: boolean;
}

export class UpdateUserAddressDto {
  @ApiPropertyOptional({ description: 'Address label' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({ description: 'Street address line 1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  street1?: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  street2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Postal/ZIP code' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Set as default address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Can be used for shipping' })
  @IsOptional()
  @IsBoolean()
  isShipping?: boolean;

  @ApiPropertyOptional({ description: 'Can be used for billing' })
  @IsOptional()
  @IsBoolean()
  isBilling?: boolean;
}

export class UserAddressResponseDto {
  @ApiProperty({ description: 'Address ID' })
  id!: string;

  @ApiPropertyOptional({ description: 'Address label' })
  label?: string | null;

  @ApiProperty({ description: 'First name' })
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  lastName!: string;

  @ApiPropertyOptional({ description: 'Company name' })
  company?: string | null;

  @ApiProperty({ description: 'Street address line 1' })
  street1!: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  street2?: string | null;

  @ApiProperty({ description: 'City' })
  city!: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  state?: string | null;

  @ApiProperty({ description: 'Postal/ZIP code' })
  postalCode!: string;

  @ApiProperty({ description: 'Country code' })
  country!: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string | null;

  @ApiProperty({ description: 'Is default address' })
  isDefault!: boolean;

  @ApiProperty({ description: 'Can be used for shipping' })
  isShipping!: boolean;

  @ApiProperty({ description: 'Can be used for billing' })
  isBilling!: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(address: UserAddress): UserAddressResponseDto {
    const dto = new UserAddressResponseDto();
    dto.id = address.id;
    dto.label = address.label;
    dto.firstName = address.firstName;
    dto.lastName = address.lastName;
    dto.company = address.company;
    dto.street1 = address.street1;
    dto.street2 = address.street2;
    dto.city = address.city;
    dto.state = address.state;
    dto.postalCode = address.postalCode;
    dto.country = address.country;
    dto.phone = address.phone;
    dto.isDefault = address.isDefault;
    dto.isShipping = address.isShipping;
    dto.isBilling = address.isBilling;
    dto.createdAt = address.createdAt;
    dto.updatedAt = address.updatedAt;
    return dto;
  }
}
