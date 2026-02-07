import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { PrismaService } from '@infrastructure/database';
import {
  ApprovalEntity,
  ApprovalRequestStatus,
  ApprovalStatus,
  ApproverType,
  UserRole,
  Prisma,
} from '@prisma/client';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let prismaService: jest.Mocked<PrismaService>;

  const tenantId = 'tenant-id-123';
  const userId = 'user-id-123';

  const mockApprovalChain = {
    id: 'chain-id-123',
    name: 'Contract Approval Chain',
    description: 'Multi-level contract approvals',
    entityType: ApprovalEntity.CONTRACT,
    isActive: true,
    isDefault: true,
    conditions: {},
    tenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
    levels: [
      {
        id: 'level-1',
        chainId: 'chain-id-123',
        level: 1,
        name: 'Manager Approval',
        approverType: ApproverType.ROLE,
        approverUserId: null,
        approverRoleId: 'MANAGER',
        minApprovers: 1,
        allowDelegation: true,
        thresholdMin: null,
        thresholdMax: new Prisma.Decimal(50000),
        timeoutHours: 24,
        escalationLevel: 2,
      },
      {
        id: 'level-2',
        chainId: 'chain-id-123',
        level: 2,
        name: 'Director Approval',
        approverType: ApproverType.ROLE,
        approverUserId: null,
        approverRoleId: 'ADMIN',
        minApprovers: 1,
        allowDelegation: false,
        thresholdMin: new Prisma.Decimal(50000),
        thresholdMax: null,
        timeoutHours: 48,
        escalationLevel: null,
      },
    ],
  };

  const mockApprovalRequest = {
    id: 'request-id-123',
    entityType: ApprovalEntity.CONTRACT,
    entityId: 'contract-id-123',
    status: ApprovalRequestStatus.IN_PROGRESS,
    currentLevel: 1,
    metadata: {},
    chainId: 'chain-id-123',
    tenantId,
    requesterId: userId,
    requestedAt: new Date(),
    completedAt: null,
    expiresAt: null,
    steps: [
      {
        id: 'step-id-123',
        requestId: 'request-id-123',
        level: 1,
        action: 'SUBMIT',
        status: ApprovalStatus.PENDING,
        comments: null,
        delegatedFrom: null,
        approverId: 'approver-id-123',
        requestedAt: new Date(),
        respondedAt: null,
      },
    ],
  };

  const mockPrismaService = {
    approvalChain: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    approvalChainLevel: {
      deleteMany: jest.fn(),
    },
    approvalRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    approvalStep: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // Approval Chain Management Tests
  // ==========================================

  describe('createChain', () => {
    it('should create a new approval chain with levels', async () => {
      mockPrismaService.approvalChain.create.mockResolvedValue(mockApprovalChain);

      const result = await service.createChain(
        {
          name: 'Contract Approval Chain',
          description: 'Multi-level contract approvals',
          entityType: ApprovalEntity.CONTRACT,
          isDefault: true,
          levels: [
            {
              level: 1,
              name: 'Manager Approval',
              approverType: ApproverType.ROLE,
              approverRoleId: 'MANAGER',
              allowDelegation: true,
            },
          ],
        },
        tenantId,
      );

      expect(result.id).toBe(mockApprovalChain.id);
      expect(result.name).toBe('Contract Approval Chain');
      expect(result.levels).toHaveLength(2);
      expect(mockPrismaService.approvalChain.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-sequential levels', async () => {
      await expect(
        service.createChain(
          {
            name: 'Invalid Chain',
            entityType: ApprovalEntity.CONTRACT,
            levels: [
              { level: 1, name: 'Level 1', approverType: ApproverType.ROLE, approverRoleId: 'MANAGER' },
              { level: 3, name: 'Level 3', approverType: ApproverType.ROLE, approverRoleId: 'ADMIN' }, // Missing level 2
            ],
          },
          tenantId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset existing default when creating a new default chain', async () => {
      mockPrismaService.approvalChain.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.approvalChain.create.mockResolvedValue(mockApprovalChain);

      await service.createChain(
        {
          name: 'New Default Chain',
          entityType: ApprovalEntity.CONTRACT,
          isDefault: true,
          levels: [
            { level: 1, name: 'Level 1', approverType: ApproverType.ROLE, approverRoleId: 'MANAGER' },
          ],
        },
        tenantId,
      );

      expect(mockPrismaService.approvalChain.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          entityType: ApprovalEntity.CONTRACT,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    });
  });

  describe('findAllChains', () => {
    it('should return paginated approval chains', async () => {
      mockPrismaService.approvalChain.findMany.mockResolvedValue([mockApprovalChain]);
      mockPrismaService.approvalChain.count.mockResolvedValue(1);

      const result = await service.findAllChains({ page: 1, limit: 20 }, tenantId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by entity type', async () => {
      mockPrismaService.approvalChain.findMany.mockResolvedValue([]);
      mockPrismaService.approvalChain.count.mockResolvedValue(0);

      await service.findAllChains(
        { entityType: ApprovalEntity.QUOTE, page: 1, limit: 20 },
        tenantId,
      );

      expect(mockPrismaService.approvalChain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: ApprovalEntity.QUOTE }),
        }),
      );
    });
  });

  describe('findChainById', () => {
    it('should return chain by ID', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);

      const result = await service.findChainById('chain-id-123', tenantId);

      expect(result.id).toBe('chain-id-123');
    });

    it('should throw NotFoundException if chain not found', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(null);

      await expect(service.findChainById('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateChain', () => {
    it('should update an approval chain', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          approvalChainLevel: { deleteMany: jest.fn() },
          approvalChain: { update: jest.fn().mockResolvedValue({ ...mockApprovalChain, name: 'Updated Chain' }) },
        });
      });

      const result = await service.updateChain(
        'chain-id-123',
        { name: 'Updated Chain' },
        tenantId,
      );

      expect(result.name).toBe('Updated Chain');
    });

    it('should throw NotFoundException if chain not found', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(null);

      await expect(
        service.updateChain('nonexistent', { name: 'Updated' }, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteChain', () => {
    it('should delete an approval chain', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      mockPrismaService.approvalRequest.count.mockResolvedValue(0);
      mockPrismaService.approvalChain.delete.mockResolvedValue(mockApprovalChain);

      await service.deleteChain('chain-id-123', tenantId);

      expect(mockPrismaService.approvalChain.delete).toHaveBeenCalledWith({
        where: { id: 'chain-id-123' },
      });
    });

    it('should throw BadRequestException if chain has active requests', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      mockPrismaService.approvalRequest.count.mockResolvedValue(1);

      await expect(service.deleteChain('chain-id-123', tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if chain not found', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(null);

      await expect(service.deleteChain('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefaultChain', () => {
    it('should set chain as default', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      mockPrismaService.approvalChain.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.approvalChain.update.mockResolvedValue({
        ...mockApprovalChain,
        isDefault: true,
      });

      const result = await service.setDefaultChain('chain-id-123', tenantId);

      expect(result.isDefault).toBe(true);
      expect(mockPrismaService.approvalChain.updateMany).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Approval Request Tests
  // ==========================================

  describe('submitForApproval', () => {
    it('should submit entity for approval', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'approver-id-123' },
        { id: 'approver-id-456' },
      ]);
      mockPrismaService.approvalRequest.create.mockResolvedValue(mockApprovalRequest);

      const result = await service.submitForApproval(
        {
          entityType: ApprovalEntity.CONTRACT,
          entityId: 'contract-id-123',
        },
        tenantId,
        userId,
      );

      expect(result.status).toBe(ApprovalRequestStatus.IN_PROGRESS);
      expect(mockPrismaService.approvalRequest.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no default chain found', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(null);

      await expect(
        service.submitForApproval(
          { entityType: ApprovalEntity.CONTRACT, entityId: 'contract-id-123' },
          tenantId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if approval already pending', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(mockApprovalRequest);

      await expect(
        service.submitForApproval(
          { entityType: ApprovalEntity.CONTRACT, entityId: 'contract-id-123' },
          tenantId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if chain has no levels', async () => {
      mockPrismaService.approvalChain.findFirst.mockResolvedValue({
        ...mockApprovalChain,
        levels: [],
      });
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.submitForApproval(
          { entityType: ApprovalEntity.CONTRACT, entityId: 'contract-id-123' },
          tenantId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve a pending step', async () => {
      const step = {
        id: 'step-id-123',
        level: 1,
        status: ApprovalStatus.PENDING,
        approverId: 'approver-id-123',
        request: {
          ...mockApprovalRequest,
          tenantId,
          chainId: 'chain-id-123',
        },
      };

      mockPrismaService.approvalStep.findFirst.mockResolvedValue(step);
      mockPrismaService.approvalStep.update.mockResolvedValue({
        ...step,
        status: ApprovalStatus.APPROVED,
      });
      mockPrismaService.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'admin-id-123' }]);
      mockPrismaService.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        currentLevel: 2,
        steps: [
          { ...step, status: ApprovalStatus.APPROVED },
          { id: 'step-2', level: 2, status: ApprovalStatus.PENDING, approverId: 'admin-id-123' },
        ],
      });

      const result = await service.approve(
        'request-id-123',
        'step-id-123',
        tenantId,
        'approver-id-123',
        'Looks good',
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.approvalStep.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if step not found', async () => {
      mockPrismaService.approvalStep.findFirst.mockResolvedValue(null);

      await expect(
        service.approve('request-id-123', 'step-id-123', tenantId, 'approver-id-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if tenant mismatch', async () => {
      mockPrismaService.approvalStep.findFirst.mockResolvedValue({
        id: 'step-id-123',
        status: ApprovalStatus.PENDING,
        request: { tenantId: 'different-tenant' },
      });

      await expect(
        service.approve('request-id-123', 'step-id-123', tenantId, 'approver-id-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if step already processed', async () => {
      mockPrismaService.approvalStep.findFirst.mockResolvedValue({
        id: 'step-id-123',
        status: ApprovalStatus.APPROVED,
        request: { tenantId },
      });

      await expect(
        service.approve('request-id-123', 'step-id-123', tenantId, 'approver-id-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject a pending step and entire request', async () => {
      const step = {
        id: 'step-id-123',
        level: 1,
        status: ApprovalStatus.PENDING,
        request: {
          ...mockApprovalRequest,
          tenantId,
        },
      };

      mockPrismaService.approvalStep.findFirst.mockResolvedValue(step);
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        status: ApprovalRequestStatus.REJECTED,
        steps: [{ ...step, status: ApprovalStatus.REJECTED }],
      });

      const result = await service.reject(
        'request-id-123',
        'step-id-123',
        tenantId,
        'approver-id-123',
        'Does not meet requirements',
      );

      expect(result.status).toBe(ApprovalRequestStatus.REJECTED);
    });
  });

  describe('delegate', () => {
    it('should delegate approval to another user', async () => {
      const step = {
        id: 'step-id-123',
        level: 1,
        status: ApprovalStatus.PENDING,
        approverId: 'approver-id-123',
        request: {
          ...mockApprovalRequest,
          tenantId,
          chainId: 'chain-id-123',
        },
      };

      mockPrismaService.approvalStep.findFirst.mockResolvedValue(step);
      mockPrismaService.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'delegate-user-id',
        tenantId,
        isActive: true,
      });
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        steps: [
          { ...step, status: ApprovalStatus.CANCELLED },
          { id: 'new-step', level: 1, status: ApprovalStatus.PENDING, approverId: 'delegate-user-id', delegatedFrom: 'approver-id-123' },
        ],
      });

      const result = await service.delegate(
        'request-id-123',
        'step-id-123',
        tenantId,
        'approver-id-123',
        'delegate-user-id',
        'Out of office',
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if delegation not allowed', async () => {
      const chainNoDelegation = {
        ...mockApprovalChain,
        levels: [
          { ...mockApprovalChain.levels[0], allowDelegation: false },
        ],
      };

      const step = {
        id: 'step-id-123',
        level: 1,
        status: ApprovalStatus.PENDING,
        request: { ...mockApprovalRequest, tenantId, chainId: 'chain-id-123' },
      };

      mockPrismaService.approvalStep.findFirst.mockResolvedValue(step);
      mockPrismaService.approvalChain.findUnique.mockResolvedValue(chainNoDelegation);

      await expect(
        service.delegate('request-id-123', 'step-id-123', tenantId, 'approver-id-123', 'delegate-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if delegate user not found', async () => {
      const step = {
        id: 'step-id-123',
        level: 1,
        status: ApprovalStatus.PENDING,
        request: { ...mockApprovalRequest, tenantId, chainId: 'chain-id-123' },
      };

      mockPrismaService.approvalStep.findFirst.mockResolvedValue(step);
      mockPrismaService.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.delegate('request-id-123', 'step-id-123', tenantId, 'approver-id-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for user', async () => {
      const step = {
        id: 'step-id-123',
        level: 1,
        status: ApprovalStatus.PENDING,
        approverId: userId,
        requestedAt: new Date(),
        delegatedFrom: null,
        request: {
          id: 'request-id-123',
          entityType: ApprovalEntity.CONTRACT,
          entityId: 'contract-id-123',
          chainId: 'chain-id-123',
          expiresAt: null,
          steps: [],
        },
      };

      mockPrismaService.approvalStep.findMany.mockResolvedValue([step]);
      mockPrismaService.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);

      const result = await service.getPendingApprovals(tenantId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].stepId).toBe('step-id-123');
      expect(result[0].levelName).toBe('Manager Approval');
    });
  });

  describe('getRequestById', () => {
    it('should return approval request by ID', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(mockApprovalRequest);

      const result = await service.getRequestById('request-id-123', tenantId);

      expect(result.id).toBe('request-id-123');
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(service.getRequestById('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRequestByEntity', () => {
    it('should return active approval request for entity', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(mockApprovalRequest);

      const result = await service.getRequestByEntity(
        ApprovalEntity.CONTRACT,
        'contract-id-123',
        tenantId,
      );

      expect(result?.id).toBe('request-id-123');
    });

    it('should return null if no active request exists', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(null);

      const result = await service.getRequestByEntity(
        ApprovalEntity.CONTRACT,
        'contract-id-123',
        tenantId,
      );

      expect(result).toBeNull();
    });
  });

  describe('cancelRequest', () => {
    it('should cancel a pending request', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(mockApprovalRequest);
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        status: ApprovalRequestStatus.CANCELLED,
        steps: [{ ...mockApprovalRequest.steps[0], status: ApprovalStatus.CANCELLED }],
      });

      const result = await service.cancelRequest('request-id-123', tenantId, userId);

      expect(result.status).toBe(ApprovalRequestStatus.CANCELLED);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelRequest('nonexistent', tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not the requester', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue({
        ...mockApprovalRequest,
        requesterId: 'different-user',
      });

      await expect(
        service.cancelRequest('request-id-123', tenantId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request is not pending', async () => {
      mockPrismaService.approvalRequest.findFirst.mockResolvedValue({
        ...mockApprovalRequest,
        status: ApprovalRequestStatus.APPROVED,
      });

      await expect(
        service.cancelRequest('request-id-123', tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
