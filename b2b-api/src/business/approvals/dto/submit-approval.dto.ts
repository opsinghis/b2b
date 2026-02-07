import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalEntity } from '@prisma/client';

export class SubmitApprovalDto {
  @ApiProperty({
    description: 'Entity type being submitted for approval',
    enum: ApprovalEntity,
  })
  @IsEnum(ApprovalEntity)
  entityType!: ApprovalEntity;

  @ApiProperty({
    description: 'ID of the entity being submitted',
    example: 'clh1234567890',
  })
  @IsString()
  entityId!: string;

  @ApiPropertyOptional({
    description: 'Optional chain ID to use (defaults to default chain)',
  })
  @IsOptional()
  @IsString()
  chainId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the approval request',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ApprovalActionDto {
  @ApiPropertyOptional({
    description: 'Comments for the approval action',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class DelegateApprovalDto {
  @ApiProperty({
    description: 'User ID to delegate to',
    example: 'user-id-123',
  })
  @IsString()
  delegateToUserId!: string;

  @ApiPropertyOptional({
    description: 'Reason for delegation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
