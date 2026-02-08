import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PrismaService } from '@infrastructure/database';
import { PartnerCommissionStatus } from '@prisma/client';

describe('PartnersService', () => {
  let service: PartnersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockPartnerId = 'partner-123';
  const mockTeamMemberUserId = 'team-user-123';
  const mockOrderId = 'order-123';
  const mockCommissionId = 'commission-123';
  const mockResourceId = 'resource-123';

  const mockPartner = {
    id: mockPartnerId,
    tenantId: mockTenantId,
    code: 'PARTNER001',
    name: 'Test Partner',
    description: 'Test description',
    commissionRate: 10,
    isActive: true,
    userId: mockUserId,
    organizationId: null,
    onboardedAt: new Date(),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeamMember = {
    id: 'member-123',
    tenantId: mockTenantId,
    partnerId: mockPartnerId,
    userId: mockTeamMemberUserId,
    role: 'Sales Rep',
    isActive: true,
    joinedAt: new Date(),
    leftAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    },
  };

  const mockCommission = {
    id: mockCommissionId,
    tenantId: mockTenantId,
    partnerId: mockPartnerId,
    orderId: mockOrderId,
    teamMemberId: mockTeamMemberUserId,
    amount: 100,
    rate: 10,
    orderTotal: 1000,
    status: PartnerCommissionStatus.PENDING,
    paidAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResource = {
    id: mockResourceId,
    tenantId: mockTenantId,
    partnerId: mockPartnerId,
    title: 'Test Resource',
    description: 'Test description',
    type: 'document',
    url: 'https://example.com/doc.pdf',
    fileKey: null,
    isPublic: false,
    sortOrder: 0,
    uploadedById: mockUserId,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: mockTeamMemberUserId,
    tenantId: mockTenantId,
    email: 'john@test.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        {
          provide: PrismaService,
          useValue: {
            partner: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            partnerTeamMember: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            partnerCommission: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            partnerResource: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
            organization: {
              findFirst: jest.fn(),
            },
            masterProduct: {
              findMany: jest.fn(),
            },
            order: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
    prismaService = module.get(PrismaService);
  });

  describe('getMyProfile', () => {
    it('should return partner profile', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.getMyProfile(mockTenantId, mockUserId);

      expect(result).not.toBeNull();
      expect(result!.code).toBe('PARTNER001');
    });

    it('should return null if partner not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.getMyProfile(mockTenantId, mockUserId);

      expect(result).toBeNull();
    });

    it('should return null if wrong tenant', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue({
        ...mockPartner,
        tenantId: 'other-tenant',
      });

      const result = await service.getMyProfile(mockTenantId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getCommissionSummary', () => {
    it('should return commission summary', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerCommission.aggregate = jest
        .fn()
        .mockResolvedValueOnce({ _sum: { amount: 500 } })
        .mockResolvedValueOnce({ _sum: { amount: 200 } })
        .mockResolvedValueOnce({ _sum: { amount: 300 } })
        .mockResolvedValueOnce({ _sum: { amount: 100 } });
      prismaService.partnerCommission.count = jest.fn().mockResolvedValue(5);

      const result = await service.getCommissionSummary(mockTenantId, mockUserId);

      expect(result.totalEarned).toBe(500);
      expect(result.totalPending).toBe(200);
      expect(result.totalPaid).toBe(300);
      expect(result.currentMonthCommission).toBe(100);
      expect(result.commissionRate).toBe(10);
      expect(result.teamOrderCount).toBe(5);
    });

    it('should throw NotFoundException if partner not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getCommissionSummary(mockTenantId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyCommissions', () => {
    it('should return commissions list', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerCommission.findMany = jest.fn().mockResolvedValue([mockCommission]);
      prismaService.partnerCommission.count = jest.fn().mockResolvedValue(1);

      const result = await service.getMyCommissions(mockTenantId, mockUserId, {});

      expect(result.commissions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerCommission.findMany = jest.fn().mockResolvedValue([]);
      prismaService.partnerCommission.count = jest.fn().mockResolvedValue(0);

      await service.getMyCommissions(mockTenantId, mockUserId, {
        status: PartnerCommissionStatus.PAID,
      });

      expect(prismaService.partnerCommission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PartnerCommissionStatus.PAID }),
        }),
      );
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerTeamMember.findMany = jest.fn().mockResolvedValue([mockTeamMember]);
      prismaService.partnerTeamMember.count = jest.fn().mockResolvedValue(1);

      const result = await service.getTeamMembers(mockTenantId, mockUserId);

      expect(result.members).toHaveLength(1);
      expect(result.members[0].userName).toBe('John Doe');
    });

    it('should throw NotFoundException if partner not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getTeamMembers(mockTenantId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTeamMember', () => {
    it('should add team member', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.partnerTeamMember.create = jest.fn().mockResolvedValue(mockTeamMember);

      const result = await service.addTeamMember(mockTenantId, mockUserId, {
        userId: mockTeamMemberUserId,
        role: 'Sales Rep',
      });

      expect(result.userId).toBe(mockTeamMemberUserId);
      expect(result.role).toBe('Sales Rep');
    });

    it('should reactivate existing inactive member', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue({
        ...mockTeamMember,
        isActive: false,
      });
      prismaService.partnerTeamMember.update = jest.fn().mockResolvedValue(mockTeamMember);

      const result = await service.addTeamMember(mockTenantId, mockUserId, {
        userId: mockTeamMemberUserId,
      });

      expect(prismaService.partnerTeamMember.update).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it('should throw ConflictException if already active member', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue(mockTeamMember);

      await expect(
        service.addTeamMember(mockTenantId, mockUserId, { userId: mockTeamMemberUserId }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.addTeamMember(mockTenantId, mockUserId, { userId: 'not-found' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove team member', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue(mockTeamMember);
      prismaService.partnerTeamMember.update = jest.fn().mockResolvedValue(mockTeamMember);

      await service.removeTeamMember(mockTenantId, mockUserId, mockTeamMemberUserId);

      expect(prismaService.partnerTeamMember.update).toHaveBeenCalledWith({
        where: { id: mockTeamMember.id },
        data: expect.objectContaining({ isActive: false }),
      });
    });

    it('should throw NotFoundException if team member not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.removeTeamMember(mockTenantId, mockUserId, 'not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResources', () => {
    it('should return resources', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerResource.findMany = jest.fn().mockResolvedValue([mockResource]);
      prismaService.partnerResource.count = jest.fn().mockResolvedValue(1);

      const result = await service.getResources(mockTenantId, mockUserId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].title).toBe('Test Resource');
    });
  });

  describe('createOrderOnBehalf', () => {
    const mockProduct = {
      id: 'product-123',
      name: 'Test Product',
      sku: 'SKU001',
      listPrice: 100,
    };

    it('should create order and commission', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue(mockTeamMember);
      prismaService.masterProduct.findMany = jest.fn().mockResolvedValue([mockProduct]);
      prismaService.$transaction = jest.fn().mockResolvedValue({ id: mockOrderId });

      const result = await service.createOrderOnBehalf(mockTenantId, mockUserId, {
        teamMemberUserId: mockTeamMemberUserId,
        items: [{ masterProductId: 'product-123', quantity: 2 }],
      });

      expect(result.orderId).toBe(mockOrderId);
      expect(result.commissionAmount).toBe(20); // 10% of 200
    });

    it('should throw ForbiddenException if partner is inactive', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue({
        ...mockPartner,
        isActive: false,
      });

      await expect(
        service.createOrderOnBehalf(mockTenantId, mockUserId, {
          teamMemberUserId: mockTeamMemberUserId,
          items: [{ masterProductId: 'product-123', quantity: 1 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if not team member', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.createOrderOnBehalf(mockTenantId, mockUserId, {
          teamMemberUserId: 'not-member',
          items: [{ masterProductId: 'product-123', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerTeamMember.findUnique = jest.fn().mockResolvedValue(mockTeamMember);
      prismaService.masterProduct.findMany = jest.fn().mockResolvedValue([]);

      await expect(
        service.createOrderOnBehalf(mockTenantId, mockUserId, {
          teamMemberUserId: mockTeamMemberUserId,
          items: [{ masterProductId: 'not-found', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all partners', async () => {
      prismaService.partner.findMany = jest.fn().mockResolvedValue([mockPartner]);
      prismaService.partner.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {});

      expect(result.partners).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by isActive', async () => {
      prismaService.partner.findMany = jest.fn().mockResolvedValue([]);
      prismaService.partner.count = jest.fn().mockResolvedValue(0);

      await service.findAll(mockTenantId, { isActive: true });

      expect(prismaService.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, isActive: true },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return partner', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.findOne(mockTenantId, mockPartnerId);

      expect(result.name).toBe('Test Partner');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findOne(mockTenantId, 'not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create partner', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.partner.create = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.create(mockTenantId, {
        code: 'PARTNER001',
        name: 'Test Partner',
        userId: mockUserId,
      });

      expect(result.name).toBe('Test Partner');
    });

    it('should throw ConflictException if code exists', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValueOnce(mockPartner);

      await expect(
        service.create(mockTenantId, {
          code: 'PARTNER001',
          name: 'Test Partner',
          userId: mockUserId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if user already has partner', async () => {
      prismaService.partner.findUnique = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPartner);

      await expect(
        service.create(mockTenantId, {
          code: 'NEW001',
          name: 'New Partner',
          userId: mockUserId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(mockTenantId, {
          code: 'PARTNER001',
          name: 'Test Partner',
          userId: 'not-found',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update partner', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partner.update = jest.fn().mockResolvedValue({
        ...mockPartner,
        name: 'Updated Partner',
      });

      const result = await service.update(mockTenantId, mockPartnerId, { name: 'Updated Partner' });

      expect(result.name).toBe('Updated Partner');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.update(mockTenantId, 'not-found', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete partner with no relations', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue({
        ...mockPartner,
        _count: { commissions: 0, teamMembers: 0 },
      });
      prismaService.partner.delete = jest.fn().mockResolvedValue(mockPartner);

      await service.delete(mockTenantId, mockPartnerId);

      expect(prismaService.partner.delete).toHaveBeenCalledWith({
        where: { id: mockPartnerId },
      });
    });

    it('should soft delete partner with relations', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue({
        ...mockPartner,
        _count: { commissions: 5, teamMembers: 3 },
      });
      prismaService.partner.update = jest.fn().mockResolvedValue(mockPartner);

      await service.delete(mockTenantId, mockPartnerId);

      expect(prismaService.partner.update).toHaveBeenCalledWith({
        where: { id: mockPartnerId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.delete(mockTenantId, 'not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createResource', () => {
    it('should create resource', async () => {
      prismaService.partnerResource.create = jest.fn().mockResolvedValue(mockResource);

      const result = await service.createResource(
        mockTenantId,
        {
          title: 'Test Resource',
          type: 'document',
          url: 'https://example.com/doc.pdf',
        },
        mockUserId,
        mockPartnerId,
      );

      expect(result.title).toBe('Test Resource');
    });
  });

  describe('deleteResource', () => {
    it('should delete resource', async () => {
      prismaService.partnerResource.findUnique = jest.fn().mockResolvedValue(mockResource);
      prismaService.partnerResource.delete = jest.fn().mockResolvedValue(mockResource);

      await service.deleteResource(mockTenantId, mockResourceId);

      expect(prismaService.partnerResource.delete).toHaveBeenCalledWith({
        where: { id: mockResourceId },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.partnerResource.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.deleteResource(mockTenantId, 'not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateCommission', () => {
    it('should calculate and create commission', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerCommission.create = jest.fn().mockResolvedValue(mockCommission);

      const result = await service.calculateCommission(
        mockTenantId,
        mockPartnerId,
        mockOrderId,
        1000,
        mockTeamMemberUserId,
      );

      expect(result.amount).toBe(100);
      expect(prismaService.partnerCommission.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if partner not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.calculateCommission(
          mockTenantId,
          'not-found',
          mockOrderId,
          1000,
          mockTeamMemberUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPartnerCommissions', () => {
    it('should return partner commissions', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerCommission.findMany = jest.fn().mockResolvedValue([mockCommission]);
      prismaService.partnerCommission.count = jest.fn().mockResolvedValue(1);

      const result = await service.getPartnerCommissions(mockTenantId, mockPartnerId, {});

      expect(result.commissions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException if partner not found', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getPartnerCommissions(mockTenantId, 'not-found', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by date range', async () => {
      prismaService.partner.findUnique = jest.fn().mockResolvedValue(mockPartner);
      prismaService.partnerCommission.findMany = jest.fn().mockResolvedValue([]);
      prismaService.partnerCommission.count = jest.fn().mockResolvedValue(0);

      await service.getPartnerCommissions(mockTenantId, mockPartnerId, {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(prismaService.partnerCommission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('updateCommissionStatus', () => {
    it('should update commission status', async () => {
      prismaService.partnerCommission.findUnique = jest.fn().mockResolvedValue(mockCommission);
      prismaService.partnerCommission.update = jest.fn().mockResolvedValue({
        ...mockCommission,
        status: PartnerCommissionStatus.PAID,
        paidAt: new Date(),
      });

      const result = await service.updateCommissionStatus(
        mockTenantId,
        mockCommissionId,
        PartnerCommissionStatus.PAID,
      );

      expect(result.status).toBe(PartnerCommissionStatus.PAID);
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.partnerCommission.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateCommissionStatus(mockTenantId, 'not-found', PartnerCommissionStatus.PAID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
