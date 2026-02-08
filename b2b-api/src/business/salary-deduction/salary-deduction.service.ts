import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  SalaryDeduction,
  SalaryDeductionTransaction,
  SalaryDeductionLimitRequest,
  SalaryDeductionTxnType,
  SalaryDeductionTxnStatus,
  SalaryDeductionRequestStatus,
  Prisma,
} from '@prisma/client';
import {
  UpdateSalaryDeductionPreferencesDto,
  CreateLimitRequestDto,
  AdminUpdateSalaryDeductionDto,
  AdminListSalaryDeductionsQueryDto,
  AdminListLimitRequestsQueryDto,
} from './dto';

const DEFAULT_MONTHLY_LIMIT = 1000;

@Injectable()
export class SalaryDeductionService {
  private readonly logger = new Logger(SalaryDeductionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // User Operations
  // ==========================================

  /**
   * Get or create salary deduction record for user
   */
  async getOrCreate(tenantId: string, userId: string): Promise<SalaryDeduction> {
    let deduction = await this.prisma.salaryDeduction.findUnique({
      where: { userId },
    });

    if (!deduction) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      deduction = await this.prisma.salaryDeduction.create({
        data: {
          tenantId,
          userId,
          monthlyLimit: DEFAULT_MONTHLY_LIMIT,
          usedAmount: 0,
          remainingAmount: DEFAULT_MONTHLY_LIMIT,
          periodStart,
          periodEnd,
          isEnabled: true,
          autoRenewal: true,
        },
      });

      this.logger.log(`Created salary deduction record for user ${userId}`);
    }

    // Check if period needs renewal
    if (deduction.autoRenewal && new Date() > deduction.periodEnd) {
      deduction = await this.renewPeriod(deduction.id);
    }

    return deduction;
  }

  /**
   * Get salary deduction status for user
   */
  async getStatus(tenantId: string, userId: string): Promise<SalaryDeduction> {
    return this.getOrCreate(tenantId, userId);
  }

  /**
   * Get deduction history for user
   */
  async getHistory(
    tenantId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: SalaryDeductionTransaction[]; total: number }> {
    const deduction = await this.getOrCreate(tenantId, userId);

    const [transactions, total] = await Promise.all([
      this.prisma.salaryDeductionTransaction.findMany({
        where: { salaryDeductionId: deduction.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salaryDeductionTransaction.count({
        where: { salaryDeductionId: deduction.id },
      }),
    ]);

    return { transactions, total };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    tenantId: string,
    userId: string,
    dto: UpdateSalaryDeductionPreferencesDto,
  ): Promise<SalaryDeduction> {
    const deduction = await this.getOrCreate(tenantId, userId);

    const updated = await this.prisma.salaryDeduction.update({
      where: { id: deduction.id },
      data: {
        isEnabled: dto.isEnabled,
        autoRenewal: dto.autoRenewal,
      },
    });

    this.logger.log(`Updated salary deduction preferences for user ${userId}`);

    return updated;
  }

  /**
   * Create limit increase request
   */
  async createLimitRequest(
    tenantId: string,
    userId: string,
    dto: CreateLimitRequestDto,
  ): Promise<SalaryDeductionLimitRequest> {
    const deduction = await this.getOrCreate(tenantId, userId);

    // Check for existing pending request
    const pendingRequest = await this.prisma.salaryDeductionLimitRequest.findFirst({
      where: {
        userId,
        status: SalaryDeductionRequestStatus.PENDING,
      },
    });

    if (pendingRequest) {
      throw new ConflictException('You already have a pending limit request');
    }

    if (dto.requestedLimit <= deduction.monthlyLimit.toNumber()) {
      throw new BadRequestException('Requested limit must be greater than current limit');
    }

    const request = await this.prisma.salaryDeductionLimitRequest.create({
      data: {
        tenantId,
        userId,
        requestedLimit: dto.requestedLimit,
        currentLimit: deduction.monthlyLimit,
        reason: dto.reason,
        status: SalaryDeductionRequestStatus.PENDING,
      },
    });

    this.logger.log(`Created limit request ${request.id} for user ${userId}`);

    return request;
  }

  /**
   * Process salary deduction for an order
   */
  async processDeduction(
    tenantId: string,
    userId: string,
    orderId: string,
    amount: number,
  ): Promise<SalaryDeductionTransaction> {
    const deduction = await this.getOrCreate(tenantId, userId);

    if (!deduction.isEnabled) {
      throw new BadRequestException('Salary deduction is not enabled for this user');
    }

    if (amount > deduction.remainingAmount.toNumber()) {
      throw new BadRequestException(
        `Insufficient salary deduction limit. Available: ${deduction.remainingAmount}`,
      );
    }

    // Create transaction and update balances
    const [transaction] = await this.prisma.$transaction([
      this.prisma.salaryDeductionTransaction.create({
        data: {
          salaryDeductionId: deduction.id,
          orderId,
          amount,
          type: SalaryDeductionTxnType.DEDUCTION,
          status: SalaryDeductionTxnStatus.COMPLETED,
          processedAt: new Date(),
          description: `Order payment: ${orderId}`,
        },
      }),
      this.prisma.salaryDeduction.update({
        where: { id: deduction.id },
        data: {
          usedAmount: { increment: amount },
          remainingAmount: { decrement: amount },
        },
      }),
    ]);

    this.logger.log(`Processed deduction of ${amount} for user ${userId}, order ${orderId}`);

    return transaction;
  }

  /**
   * Process refund for a salary deduction
   */
  async processRefund(
    tenantId: string,
    userId: string,
    orderId: string,
    amount: number,
  ): Promise<SalaryDeductionTransaction> {
    const deduction = await this.getOrCreate(tenantId, userId);

    // Create refund transaction
    const [transaction] = await this.prisma.$transaction([
      this.prisma.salaryDeductionTransaction.create({
        data: {
          salaryDeductionId: deduction.id,
          orderId,
          amount,
          type: SalaryDeductionTxnType.REFUND,
          status: SalaryDeductionTxnStatus.COMPLETED,
          processedAt: new Date(),
          description: `Refund for order: ${orderId}`,
        },
      }),
      this.prisma.salaryDeduction.update({
        where: { id: deduction.id },
        data: {
          usedAmount: { decrement: amount },
          remainingAmount: { increment: amount },
        },
      }),
    ]);

    this.logger.log(`Processed refund of ${amount} for user ${userId}, order ${orderId}`);

    return transaction;
  }

  // ==========================================
  // Admin Operations
  // ==========================================

  /**
   * List all salary deductions (admin)
   */
  async findAllAdmin(
    tenantId: string,
    query: AdminListSalaryDeductionsQueryDto,
  ): Promise<{ deductions: SalaryDeduction[]; total: number }> {
    const where: Prisma.SalaryDeductionWhereInput = { tenantId };

    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [deductions, total] = await Promise.all([
      this.prisma.salaryDeduction.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salaryDeduction.count({ where }),
    ]);

    return { deductions, total };
  }

  /**
   * Update salary deduction for a user (admin)
   */
  async updateAdmin(
    tenantId: string,
    userId: string,
    dto: AdminUpdateSalaryDeductionDto,
  ): Promise<SalaryDeduction> {
    const deduction = await this.getOrCreate(tenantId, userId);

    const updateData: Prisma.SalaryDeductionUpdateInput = {};

    if (dto.monthlyLimit !== undefined) {
      const currentUsed = deduction.usedAmount.toNumber();
      if (dto.monthlyLimit < currentUsed) {
        throw new BadRequestException(`Cannot set limit below used amount (${currentUsed})`);
      }

      updateData.monthlyLimit = dto.monthlyLimit;
      updateData.remainingAmount = dto.monthlyLimit - currentUsed;
    }

    if (dto.isEnabled !== undefined) {
      updateData.isEnabled = dto.isEnabled;
    }

    if (dto.metadata !== undefined) {
      updateData.metadata = dto.metadata as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.salaryDeduction.update({
      where: { id: deduction.id },
      data: updateData,
    });

    this.logger.log(`Admin updated salary deduction for user ${userId}`);

    return updated;
  }

  /**
   * Get report data (admin)
   */
  async getReport(tenantId: string): Promise<{
    periodStart: Date;
    periodEnd: Date;
    totalEnrolled: number;
    totalActive: number;
    totalDeducted: number;
    totalLimit: number;
    utilizationRate: number;
    pendingRequests: number;
  }> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [deductions, pendingRequests] = await Promise.all([
      this.prisma.salaryDeduction.findMany({
        where: { tenantId },
        select: {
          isEnabled: true,
          monthlyLimit: true,
          usedAmount: true,
        },
      }),
      this.prisma.salaryDeductionLimitRequest.count({
        where: { tenantId, status: SalaryDeductionRequestStatus.PENDING },
      }),
    ]);

    const totalEnrolled = deductions.length;
    const totalActive = deductions.filter((d) => d.isEnabled).length;
    const totalLimit = deductions.reduce((sum, d) => sum + d.monthlyLimit.toNumber(), 0);
    const totalDeducted = deductions.reduce((sum, d) => sum + d.usedAmount.toNumber(), 0);
    const utilizationRate = totalLimit > 0 ? (totalDeducted / totalLimit) * 100 : 0;

    return {
      periodStart,
      periodEnd,
      totalEnrolled,
      totalActive,
      totalDeducted,
      totalLimit,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      pendingRequests,
    };
  }

  /**
   * List limit requests (admin)
   */
  async findLimitRequests(
    tenantId: string,
    query: AdminListLimitRequestsQueryDto,
  ): Promise<{ requests: SalaryDeductionLimitRequest[]; total: number }> {
    const where: Prisma.SalaryDeductionLimitRequestWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [requests, total] = await Promise.all([
      this.prisma.salaryDeductionLimitRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salaryDeductionLimitRequest.count({ where }),
    ]);

    return { requests, total };
  }

  /**
   * Approve limit request (admin)
   */
  async approveLimitRequest(
    requestId: string,
    tenantId: string,
    reviewerId: string,
    reviewNotes?: string,
  ): Promise<SalaryDeductionLimitRequest> {
    const request = await this.prisma.salaryDeductionLimitRequest.findFirst({
      where: { id: requestId, tenantId },
    });

    if (!request) {
      throw new NotFoundException(`Limit request '${requestId}' not found`);
    }

    if (request.status !== SalaryDeductionRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    // Update request and deduction in transaction
    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.salaryDeductionLimitRequest.update({
        where: { id: requestId },
        data: {
          status: SalaryDeductionRequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          reviewNotes,
        },
      }),
      this.prisma.salaryDeduction.update({
        where: { userId: request.userId },
        data: {
          monthlyLimit: request.requestedLimit,
          remainingAmount: {
            increment: request.requestedLimit.toNumber() - request.currentLimit.toNumber(),
          },
        },
      }),
    ]);

    this.logger.log(`Approved limit request ${requestId} by admin ${reviewerId}`);

    return updatedRequest;
  }

  /**
   * Reject limit request (admin)
   */
  async rejectLimitRequest(
    requestId: string,
    tenantId: string,
    reviewerId: string,
    reviewNotes?: string,
  ): Promise<SalaryDeductionLimitRequest> {
    const request = await this.prisma.salaryDeductionLimitRequest.findFirst({
      where: { id: requestId, tenantId },
    });

    if (!request) {
      throw new NotFoundException(`Limit request '${requestId}' not found`);
    }

    if (request.status !== SalaryDeductionRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    const updatedRequest = await this.prisma.salaryDeductionLimitRequest.update({
      where: { id: requestId },
      data: {
        status: SalaryDeductionRequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        reviewNotes,
      },
    });

    this.logger.log(`Rejected limit request ${requestId} by admin ${reviewerId}`);

    return updatedRequest;
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private async renewPeriod(deductionId: string): Promise<SalaryDeduction> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const deduction = await this.prisma.salaryDeduction.findUnique({
      where: { id: deductionId },
    });

    if (!deduction) {
      throw new NotFoundException('Salary deduction not found');
    }

    const updated = await this.prisma.salaryDeduction.update({
      where: { id: deductionId },
      data: {
        periodStart,
        periodEnd,
        usedAmount: 0,
        remainingAmount: deduction.monthlyLimit,
      },
    });

    this.logger.log(`Renewed salary deduction period for ${deductionId}`);

    return updated;
  }
}
