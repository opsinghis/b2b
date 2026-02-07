import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SalaryDeductionService } from './salary-deduction.service';
import { PrismaService } from '@infrastructure/database';
import {
  SalaryDeductionTxnType,
  SalaryDeductionTxnStatus,
  SalaryDeductionRequestStatus,
} from '@prisma/client';

describe('SalaryDeductionService', () => {
  let service: SalaryDeductionService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockAdminId = 'admin-123';

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const mockDeduction = {
    id: 'sd-123',
    tenantId: mockTenantId,
    userId: mockUserId,
    monthlyLimit: { toNumber: () => 1000 },
    usedAmount: { toNumber: () => 200 },
    remainingAmount: { toNumber: () => 800 },
    isEnabled: true,
    periodStart,
    periodEnd,
    autoRenewal: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'txn-123',
    salaryDeductionId: 'sd-123',
    amount: { toString: () => '100.00' },
    type: SalaryDeductionTxnType.DEDUCTION,
    status: SalaryDeductionTxnStatus.COMPLETED,
    reference: null,
    description: 'Test transaction',
    processedAt: new Date(),
    orderId: 'order-123',
    paymentId: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLimitRequest = {
    id: 'lr-123',
    tenantId: mockTenantId,
    userId: mockUserId,
    requestedLimit: { toString: () => '2000.00', toNumber: () => 2000 },
    currentLimit: { toString: () => '1000.00', toNumber: () => 1000 },
    reason: 'Need higher limit',
    status: SalaryDeductionRequestStatus.PENDING,
    reviewedAt: null,
    reviewedById: null,
    reviewNotes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalaryDeductionService,
        {
          provide: PrismaService,
          useValue: {
            salaryDeduction: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            salaryDeductionTransaction: {
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
            salaryDeductionLimitRequest: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SalaryDeductionService>(SalaryDeductionService);
    prismaService = module.get(PrismaService);
  });

  describe('getOrCreate', () => {
    it('should return existing deduction', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);

      const result = await service.getOrCreate(mockTenantId, mockUserId);

      expect(result.id).toBe('sd-123');
    });

    it('should create new deduction if not exists', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.salaryDeduction.create = jest.fn().mockResolvedValue(mockDeduction);

      const result = await service.getOrCreate(mockTenantId, mockUserId);

      expect(result.id).toBe('sd-123');
      expect(prismaService.salaryDeduction.create).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return salary deduction status', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);

      const result = await service.getStatus(mockTenantId, mockUserId);

      expect(result.isEnabled).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should return transaction history', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.salaryDeductionTransaction.findMany = jest
        .fn()
        .mockResolvedValue([mockTransaction]);
      prismaService.salaryDeductionTransaction.count = jest.fn().mockResolvedValue(1);

      const result = await service.getHistory(mockTenantId, mockUserId);

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.salaryDeduction.update = jest.fn().mockResolvedValue({
        ...mockDeduction,
        isEnabled: false,
      });

      const result = await service.updatePreferences(mockTenantId, mockUserId, {
        isEnabled: false,
      });

      expect(result.isEnabled).toBe(false);
    });
  });

  describe('createLimitRequest', () => {
    it('should create limit request', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.salaryDeductionLimitRequest.findFirst = jest.fn().mockResolvedValue(null);
      prismaService.salaryDeductionLimitRequest.create = jest
        .fn()
        .mockResolvedValue(mockLimitRequest);

      const result = await service.createLimitRequest(mockTenantId, mockUserId, {
        requestedLimit: 2000,
        reason: 'Need higher limit',
      });

      expect(result.status).toBe(SalaryDeductionRequestStatus.PENDING);
    });

    it('should throw ConflictException if pending request exists', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.salaryDeductionLimitRequest.findFirst = jest
        .fn()
        .mockResolvedValue(mockLimitRequest);

      await expect(
        service.createLimitRequest(mockTenantId, mockUserId, {
          requestedLimit: 2000,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if requested limit not greater', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.salaryDeductionLimitRequest.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.createLimitRequest(mockTenantId, mockUserId, {
          requestedLimit: 500, // Less than current 1000
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processDeduction', () => {
    it('should process deduction successfully', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.$transaction = jest.fn().mockResolvedValue([mockTransaction, mockDeduction]);

      const result = await service.processDeduction(mockTenantId, mockUserId, 'order-123', 100);

      expect(result.type).toBe(SalaryDeductionTxnType.DEDUCTION);
    });

    it('should throw BadRequestException if not enabled', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue({
        ...mockDeduction,
        isEnabled: false,
      });

      await expect(
        service.processDeduction(mockTenantId, mockUserId, 'order-123', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient limit', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);

      await expect(
        service.processDeduction(mockTenantId, mockUserId, 'order-123', 1000), // More than remaining 800
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.$transaction = jest.fn().mockResolvedValue([
        { ...mockTransaction, type: SalaryDeductionTxnType.REFUND },
        mockDeduction,
      ]);

      const result = await service.processRefund(mockTenantId, mockUserId, 'order-123', 100);

      expect(result.type).toBe(SalaryDeductionTxnType.REFUND);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all deductions for admin', async () => {
      prismaService.salaryDeduction.findMany = jest.fn().mockResolvedValue([mockDeduction]);
      prismaService.salaryDeduction.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAllAdmin(mockTenantId, {});

      expect(result.deductions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by isEnabled', async () => {
      prismaService.salaryDeduction.findMany = jest.fn().mockResolvedValue([]);
      prismaService.salaryDeduction.count = jest.fn().mockResolvedValue(0);

      await service.findAllAdmin(mockTenantId, { isEnabled: false });

      expect(prismaService.salaryDeduction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, isEnabled: false },
        }),
      );
    });
  });

  describe('updateAdmin', () => {
    it('should update salary deduction as admin', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);
      prismaService.salaryDeduction.update = jest.fn().mockResolvedValue({
        ...mockDeduction,
        monthlyLimit: { toNumber: () => 2000 },
      });

      const result = await service.updateAdmin(mockTenantId, mockUserId, {
        monthlyLimit: 2000,
      });

      expect(prismaService.salaryDeduction.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if limit below used amount', async () => {
      prismaService.salaryDeduction.findUnique = jest.fn().mockResolvedValue(mockDeduction);

      await expect(
        service.updateAdmin(mockTenantId, mockUserId, {
          monthlyLimit: 100, // Less than used amount 200
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReport', () => {
    it('should return report data', async () => {
      prismaService.salaryDeduction.findMany = jest.fn().mockResolvedValue([mockDeduction]);
      prismaService.salaryDeductionLimitRequest.count = jest.fn().mockResolvedValue(2);

      const result = await service.getReport(mockTenantId);

      expect(result.totalEnrolled).toBe(1);
      expect(result.totalActive).toBe(1);
      expect(result.pendingRequests).toBe(2);
    });
  });

  describe('findLimitRequests', () => {
    it('should return limit requests', async () => {
      prismaService.salaryDeductionLimitRequest.findMany = jest
        .fn()
        .mockResolvedValue([mockLimitRequest]);
      prismaService.salaryDeductionLimitRequest.count = jest.fn().mockResolvedValue(1);

      const result = await service.findLimitRequests(mockTenantId, {});

      expect(result.requests).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      prismaService.salaryDeductionLimitRequest.findMany = jest.fn().mockResolvedValue([]);
      prismaService.salaryDeductionLimitRequest.count = jest.fn().mockResolvedValue(0);

      await service.findLimitRequests(mockTenantId, {
        status: SalaryDeductionRequestStatus.APPROVED,
      });

      expect(prismaService.salaryDeductionLimitRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, status: SalaryDeductionRequestStatus.APPROVED },
        }),
      );
    });
  });

  describe('approveLimitRequest', () => {
    it('should approve limit request', async () => {
      prismaService.salaryDeductionLimitRequest.findFirst = jest
        .fn()
        .mockResolvedValue(mockLimitRequest);
      prismaService.$transaction = jest.fn().mockResolvedValue([
        { ...mockLimitRequest, status: SalaryDeductionRequestStatus.APPROVED },
        mockDeduction,
      ]);

      const result = await service.approveLimitRequest('lr-123', mockTenantId, mockAdminId);

      expect(result.status).toBe(SalaryDeductionRequestStatus.APPROVED);
    });

    it('should throw NotFoundException if request not found', async () => {
      prismaService.salaryDeductionLimitRequest.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.approveLimitRequest('not-found', mockTenantId, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already processed', async () => {
      prismaService.salaryDeductionLimitRequest.findFirst = jest.fn().mockResolvedValue({
        ...mockLimitRequest,
        status: SalaryDeductionRequestStatus.APPROVED,
      });

      await expect(
        service.approveLimitRequest('lr-123', mockTenantId, mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectLimitRequest', () => {
    it('should reject limit request', async () => {
      prismaService.salaryDeductionLimitRequest.findFirst = jest
        .fn()
        .mockResolvedValue(mockLimitRequest);
      prismaService.salaryDeductionLimitRequest.update = jest.fn().mockResolvedValue({
        ...mockLimitRequest,
        status: SalaryDeductionRequestStatus.REJECTED,
      });

      const result = await service.rejectLimitRequest(
        'lr-123',
        mockTenantId,
        mockAdminId,
        'Reason for rejection',
      );

      expect(result.status).toBe(SalaryDeductionRequestStatus.REJECTED);
    });

    it('should throw NotFoundException if request not found', async () => {
      prismaService.salaryDeductionLimitRequest.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.rejectLimitRequest('not-found', mockTenantId, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
