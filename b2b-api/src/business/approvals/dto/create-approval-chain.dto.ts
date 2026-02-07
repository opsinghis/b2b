import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalEntity, ApproverType } from '@prisma/client';

export class CreateApprovalChainLevelDto {
  @ApiProperty({
    description: 'Level number (1-based, lower = earlier in chain)',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  level!: number;

  @ApiProperty({
    description: 'Level name',
    example: 'Manager Approval',
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Type of approver for this level',
    enum: ApproverType,
  })
  @IsEnum(ApproverType)
  approverType!: ApproverType;

  @ApiPropertyOptional({
    description: 'User ID if approverType is USER',
  })
  @IsOptional()
  @IsString()
  approverUserId?: string;

  @ApiPropertyOptional({
    description: 'Role (as string) if approverType is ROLE',
  })
  @IsOptional()
  @IsString()
  approverRoleId?: string;

  @ApiPropertyOptional({
    description: 'Minimum number of approvers required at this level',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minApprovers?: number;

  @ApiPropertyOptional({
    description: 'Allow delegation at this level',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDelegation?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum threshold value for this level to apply',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum threshold value for this level to apply',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdMax?: number;

  @ApiPropertyOptional({
    description: 'Timeout in hours before escalation',
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeoutHours?: number;

  @ApiPropertyOptional({
    description: 'Level to escalate to on timeout',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  escalationLevel?: number;
}

export class CreateApprovalChainDto {
  @ApiProperty({
    description: 'Name of the approval chain',
    example: 'Contract Approval Chain',
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the approval chain',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Entity type this chain applies to',
    enum: ApprovalEntity,
  })
  @IsEnum(ApprovalEntity)
  entityType!: ApprovalEntity;

  @ApiPropertyOptional({
    description: 'Whether this is the default chain for the entity type',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Conditions for when this chain applies (JSON)',
    example: { minValue: 10000, currency: 'USD' },
  })
  @IsOptional()
  conditions?: Record<string, unknown>;

  @ApiProperty({
    description: 'Approval levels in the chain',
    type: [CreateApprovalChainLevelDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalChainLevelDto)
  levels!: CreateApprovalChainLevelDto[];
}
