import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsEnum,
  Min,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentMethodType, UserRole } from '@prisma/client';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Unique code for the payment method' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Payment method type', enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  type!: PaymentMethodType;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Fixed processing fee', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFee?: number;

  @ApiPropertyOptional({ description: 'Processing fee percentage', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFeePercent?: number;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'User roles that can use this payment method',
    enum: UserRole,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  allowedUserRoles?: UserRole[];
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Fixed processing fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFee?: number;

  @ApiPropertyOptional({ description: 'Processing fee percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFeePercent?: number;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'User roles that can use this payment method',
    enum: UserRole,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  allowedUserRoles?: UserRole[];
}

export class PaymentMethodResponseDto {
  @ApiProperty({ description: 'Payment method ID' })
  id!: string;

  @ApiProperty({ description: 'Unique code' })
  code!: string;

  @ApiProperty({ description: 'Display name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiProperty({ description: 'Payment method type', enum: PaymentMethodType })
  type!: PaymentMethodType;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  minAmount?: string | null;

  @ApiPropertyOptional({ description: 'Maximum order amount' })
  maxAmount?: string | null;

  @ApiProperty({ description: 'Fixed processing fee' })
  processingFee!: string;

  @ApiProperty({ description: 'Processing fee percentage' })
  processingFeePercent!: string;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'User roles that can use this payment method',
    enum: UserRole,
    isArray: true,
  })
  allowedUserRoles?: UserRole[];

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(
    method: PaymentMethod & { userTypeAccess?: { userRole: UserRole }[] },
  ): PaymentMethodResponseDto {
    const dto = new PaymentMethodResponseDto();
    dto.id = method.id;
    dto.code = method.code;
    dto.name = method.name;
    dto.description = method.description;
    dto.type = method.type;
    dto.isActive = method.isActive;
    dto.sortOrder = method.sortOrder;
    dto.minAmount = method.minAmount?.toString() || null;
    dto.maxAmount = method.maxAmount?.toString() || null;
    dto.processingFee = method.processingFee.toString();
    dto.processingFeePercent = method.processingFeePercent.toString();
    dto.config = method.config as Record<string, unknown>;
    dto.allowedUserRoles = method.userTypeAccess?.map((a) => a.userRole);
    dto.createdAt = method.createdAt;
    dto.updatedAt = method.updatedAt;
    return dto;
  }
}

export class ListPaymentMethodsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by type', enum: PaymentMethodType })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  type?: PaymentMethodType;
}
