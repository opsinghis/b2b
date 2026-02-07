import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsObject,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SalaryDeduction,
  SalaryDeductionTransaction,
  SalaryDeductionLimitRequest,
  SalaryDeductionTxnType,
  SalaryDeductionTxnStatus,
  SalaryDeductionRequestStatus,
} from '@prisma/client';

// User DTOs

export class UpdateSalaryDeductionPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable/disable salary deduction' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable auto-renewal of monthly limits' })
  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;
}

export class CreateLimitRequestDto {
  @ApiProperty({ description: 'Requested new monthly limit' })
  @IsNumber()
  @Min(0)
  requestedLimit!: number;

  @ApiPropertyOptional({ description: 'Reason for limit increase request' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Admin DTOs

export class AdminUpdateSalaryDeductionDto {
  @ApiPropertyOptional({ description: 'Monthly limit amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyLimit?: number;

  @ApiPropertyOptional({ description: 'Enable/disable salary deduction' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AdminListSalaryDeductionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by enabled status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class AdminListLimitRequestsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: SalaryDeductionRequestStatus,
  })
  @IsOptional()
  @IsEnum(SalaryDeductionRequestStatus)
  status?: SalaryDeductionRequestStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class ApproveRejectLimitRequestDto {
  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

// Response DTOs

export class SalaryDeductionResponseDto {
  @ApiProperty({ description: 'Salary deduction ID' })
  id!: string;

  @ApiProperty({ description: 'Monthly limit amount' })
  monthlyLimit!: string;

  @ApiProperty({ description: 'Amount used this period' })
  usedAmount!: string;

  @ApiProperty({ description: 'Remaining amount for this period' })
  remainingAmount!: string;

  @ApiProperty({ description: 'Is enabled' })
  isEnabled!: boolean;

  @ApiProperty({ description: 'Period start date' })
  periodStart!: Date;

  @ApiProperty({ description: 'Period end date' })
  periodEnd!: Date;

  @ApiProperty({ description: 'Auto-renewal enabled' })
  autoRenewal!: boolean;

  @ApiPropertyOptional({ description: 'User ID' })
  userId?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(entity: SalaryDeduction): SalaryDeductionResponseDto {
    const dto = new SalaryDeductionResponseDto();
    dto.id = entity.id;
    dto.monthlyLimit = entity.monthlyLimit.toString();
    dto.usedAmount = entity.usedAmount.toString();
    dto.remainingAmount = entity.remainingAmount.toString();
    dto.isEnabled = entity.isEnabled;
    dto.periodStart = entity.periodStart;
    dto.periodEnd = entity.periodEnd;
    dto.autoRenewal = entity.autoRenewal;
    dto.userId = entity.userId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class SalaryDeductionTransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id!: string;

  @ApiProperty({ description: 'Amount' })
  amount!: string;

  @ApiProperty({ description: 'Transaction type', enum: SalaryDeductionTxnType })
  type!: SalaryDeductionTxnType;

  @ApiProperty({ description: 'Status', enum: SalaryDeductionTxnStatus })
  status!: SalaryDeductionTxnStatus;

  @ApiPropertyOptional({ description: 'Reference' })
  reference?: string | null;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Processed timestamp' })
  processedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Order ID' })
  orderId?: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  static fromEntity(entity: SalaryDeductionTransaction): SalaryDeductionTransactionResponseDto {
    const dto = new SalaryDeductionTransactionResponseDto();
    dto.id = entity.id;
    dto.amount = entity.amount.toString();
    dto.type = entity.type;
    dto.status = entity.status;
    dto.reference = entity.reference;
    dto.description = entity.description;
    dto.processedAt = entity.processedAt;
    dto.orderId = entity.orderId;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class SalaryDeductionHistoryResponseDto {
  @ApiProperty({ description: 'Transactions', type: [SalaryDeductionTransactionResponseDto] })
  transactions!: SalaryDeductionTransactionResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  static fromEntities(
    transactions: SalaryDeductionTransaction[],
    total: number,
    page: number,
    limit: number,
  ): SalaryDeductionHistoryResponseDto {
    const dto = new SalaryDeductionHistoryResponseDto();
    dto.transactions = transactions.map(SalaryDeductionTransactionResponseDto.fromEntity);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}

export class LimitRequestResponseDto {
  @ApiProperty({ description: 'Request ID' })
  id!: string;

  @ApiProperty({ description: 'Requested limit' })
  requestedLimit!: string;

  @ApiProperty({ description: 'Current limit at time of request' })
  currentLimit!: string;

  @ApiPropertyOptional({ description: 'Request reason' })
  reason?: string | null;

  @ApiProperty({ description: 'Status', enum: SalaryDeductionRequestStatus })
  status!: SalaryDeductionRequestStatus;

  @ApiPropertyOptional({ description: 'Review notes' })
  reviewNotes?: string | null;

  @ApiPropertyOptional({ description: 'Reviewed timestamp' })
  reviewedAt?: Date | null;

  @ApiPropertyOptional({ description: 'User ID' })
  userId?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  static fromEntity(entity: SalaryDeductionLimitRequest): LimitRequestResponseDto {
    const dto = new LimitRequestResponseDto();
    dto.id = entity.id;
    dto.requestedLimit = entity.requestedLimit.toString();
    dto.currentLimit = entity.currentLimit.toString();
    dto.reason = entity.reason;
    dto.status = entity.status;
    dto.reviewNotes = entity.reviewNotes;
    dto.reviewedAt = entity.reviewedAt;
    dto.userId = entity.userId;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class AdminSalaryDeductionListResponseDto {
  @ApiProperty({ description: 'Salary deductions', type: [SalaryDeductionResponseDto] })
  deductions!: SalaryDeductionResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  static fromEntities(
    deductions: SalaryDeduction[],
    total: number,
    page: number,
    limit: number,
  ): AdminSalaryDeductionListResponseDto {
    const dto = new AdminSalaryDeductionListResponseDto();
    dto.deductions = deductions.map(SalaryDeductionResponseDto.fromEntity);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}

export class LimitRequestListResponseDto {
  @ApiProperty({ description: 'Limit requests', type: [LimitRequestResponseDto] })
  requests!: LimitRequestResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  static fromEntities(
    requests: SalaryDeductionLimitRequest[],
    total: number,
    page: number,
    limit: number,
  ): LimitRequestListResponseDto {
    const dto = new LimitRequestListResponseDto();
    dto.requests = requests.map(LimitRequestResponseDto.fromEntity);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}

export class SalaryDeductionReportResponseDto {
  @ApiProperty({ description: 'Report period start' })
  periodStart!: Date;

  @ApiProperty({ description: 'Report period end' })
  periodEnd!: Date;

  @ApiProperty({ description: 'Total enrolled users' })
  totalEnrolled!: number;

  @ApiProperty({ description: 'Total active users' })
  totalActive!: number;

  @ApiProperty({ description: 'Total deducted amount' })
  totalDeducted!: string;

  @ApiProperty({ description: 'Total limit available' })
  totalLimit!: string;

  @ApiProperty({ description: 'Utilization rate percentage' })
  utilizationRate!: number;

  @ApiProperty({ description: 'Pending limit requests' })
  pendingRequests!: number;
}
