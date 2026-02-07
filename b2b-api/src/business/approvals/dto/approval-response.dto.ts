import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalEntity,
  ApproverType,
  ApprovalRequestStatus,
  ApprovalStatus,
} from '@prisma/client';

export class ApprovalChainLevelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  level!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ApproverType })
  approverType!: ApproverType;

  @ApiPropertyOptional()
  approverUserId?: string | null;

  @ApiPropertyOptional()
  approverRoleId?: string | null;

  @ApiProperty()
  minApprovers!: number;

  @ApiProperty()
  allowDelegation!: boolean;

  @ApiPropertyOptional()
  thresholdMin?: string | null;

  @ApiPropertyOptional()
  thresholdMax?: string | null;

  @ApiPropertyOptional()
  timeoutHours?: number | null;

  @ApiPropertyOptional()
  escalationLevel?: number | null;
}

export class ApprovalChainResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: ApprovalEntity })
  entityType!: ApprovalEntity;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isDefault!: boolean;

  @ApiPropertyOptional()
  conditions?: Record<string, unknown>;

  @ApiProperty({ type: [ApprovalChainLevelResponseDto] })
  levels!: ApprovalChainLevelResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ApprovalChainListResponseDto {
  @ApiProperty({ type: [ApprovalChainResponseDto] })
  data!: ApprovalChainResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ApprovalStepResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  level!: number;

  @ApiProperty({ enum: ApprovalStatus })
  status!: ApprovalStatus;

  @ApiPropertyOptional()
  comments?: string | null;

  @ApiPropertyOptional()
  delegatedFrom?: string | null;

  @ApiProperty()
  approverId!: string;

  @ApiProperty()
  requestedAt!: Date;

  @ApiPropertyOptional()
  respondedAt?: Date | null;
}

export class ApprovalRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ApprovalEntity })
  entityType!: ApprovalEntity;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ enum: ApprovalRequestStatus })
  status!: ApprovalRequestStatus;

  @ApiProperty()
  currentLevel!: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  chainId!: string;

  @ApiProperty()
  requesterId!: string;

  @ApiProperty({ type: [ApprovalStepResponseDto] })
  steps!: ApprovalStepResponseDto[];

  @ApiProperty()
  requestedAt!: Date;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  expiresAt?: Date | null;
}

export class ApprovalRequestListResponseDto {
  @ApiProperty({ type: [ApprovalRequestResponseDto] })
  data!: ApprovalRequestResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PendingApprovalResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  stepId!: string;

  @ApiProperty({ enum: ApprovalEntity })
  entityType!: ApprovalEntity;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  level!: number;

  @ApiProperty()
  levelName!: string;

  @ApiProperty()
  allowDelegation!: boolean;

  @ApiPropertyOptional()
  delegatedFrom?: string | null;

  @ApiProperty()
  requestedAt!: Date;

  @ApiPropertyOptional()
  expiresAt?: Date | null;
}
