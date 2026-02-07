import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '@infrastructure/database';
import { AuditService } from '@core/audit';
import { Contract, ContractStatus, ContractVersion, Prisma } from '@prisma/client';

describe('ContractsService', () => {
  let service: ContractsService;
  let prismaService: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  const tenantId = 'tenant-id-123';
  const userId = 'user-id-123';

  const mockContract: Contract = {
    id: 'contract-id-123',
    contractNumber: 'CNT-2024-0001',
    title: 'Test Contract',
    description: 'Test description',
    status: ContractStatus.DRAFT,
    version: 1,
    effectiveDate: new Date('2024-01-01'),
    expirationDate: new Date('2024-12-31'),
    totalValue: new Prisma.Decimal(100000),
    currency: 'USD',
    terms: { paymentTerms: 'Net 30' },
    metadata: { priority: 'high' },
    tenantId,
    organizationId: 'org-id-123',
    createdById: userId,
    approvedById: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockContractVersion: ContractVersion = {
    id: 'version-id-123',
    contractId: mockContract.id,
    version: 1,
    changes: {},
    snapshot: {
      title: 'Test Contract',
      description: 'Test description',
      status: ContractStatus.DRAFT,
    },
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: {
            contract: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            contractVersion: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new contract with auto-generated contract number', async () => {
      const contractWithVersions = { ...mockContract, versions: [mockContractVersion] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // For contract number generation
        .mockResolvedValueOnce(contractWithVersions); // For findOne after create
      (prismaService.contract.create as jest.Mock).mockResolvedValue(mockContract);
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue(mockContractVersion);

      const result = await service.create(
        {
          title: 'Test Contract',
          description: 'Test description',
          effectiveDate: '2024-01-01',
          expirationDate: '2024-12-31',
          totalValue: 100000,
          terms: { paymentTerms: 'Net 30' },
        },
        tenantId,
        userId,
      );

      expect(result).toBeDefined();
      expect(prismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Contract',
            tenantId,
            createdById: userId,
          }),
        }),
      );
      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should increment contract number when existing contracts exist', async () => {
      const existingContract = { ...mockContract, contractNumber: 'CNT-2024-0005' };
      const contractWithVersions = { ...mockContract, versions: [mockContractVersion] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingContract) // For contract number generation
        .mockResolvedValueOnce(contractWithVersions); // For findOne after create
      (prismaService.contract.create as jest.Mock).mockResolvedValue({
        ...mockContract,
        contractNumber: 'CNT-2024-0006',
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue(mockContractVersion);

      await service.create(
        { title: 'New Contract' },
        tenantId,
        userId,
      );

      expect(prismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractNumber: expect.stringMatching(/^CNT-\d{4}-\d{4}$/),
          }),
        }),
      );
    });

    it('should use default values for optional fields', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(contractWithVersions);
      (prismaService.contract.create as jest.Mock).mockResolvedValue(mockContract);
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue(mockContractVersion);

      await service.create({ title: 'Minimal Contract' }, tenantId, userId);

      expect(prismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'USD',
            terms: {},
            metadata: {},
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated contracts', async () => {
      const contracts = [{ ...mockContract, versions: [] }];
      (prismaService.contract.findMany as jest.Mock).mockResolvedValue(contracts);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 }, tenantId);

      expect(result).toEqual({
        data: contracts,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      (prismaService.contract.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ search: 'test' }, tenantId);

      expect(prismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
              { contractNumber: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      (prismaService.contract.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ status: ContractStatus.ACTIVE }, tenantId);

      expect(prismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: ContractStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by organization', async () => {
      (prismaService.contract.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ organizationId: 'org-123' }, tenantId);

      expect(prismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            organizationId: 'org-123',
          }),
        }),
      );
    });

    it('should exclude soft-deleted contracts by default', async () => {
      (prismaService.contract.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({}, tenantId);

      expect(prismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });

    it('should include soft-deleted contracts when requested', async () => {
      (prismaService.contract.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ includeDeleted: true }, tenantId);

      expect(prismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a contract by id', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(contractWithVersions);

      const result = await service.findOne(mockContract.id, tenantId);

      expect(result).toEqual(contractWithVersions);
      expect(prismaService.contract.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockContract.id,
          tenantId,
          deletedAt: null,
        },
        include: {
          versions: {
            orderBy: { version: 'desc' },
          },
        },
      });
    });

    it('should throw NotFoundException if contract not found', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not return contracts from other tenants', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(mockContract.id, 'other-tenant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a contract and create version history', async () => {
      const contractWithVersions = { ...mockContract, versions: [mockContractVersion] };
      const updatedContract = {
        ...mockContract,
        title: 'Updated Contract',
        version: 2,
        versions: [mockContractVersion],
      };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions) // First findOne
        .mockResolvedValueOnce(updatedContract); // findOne after update
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        title: 'Updated Contract',
        version: 2,
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
        changes: { title: { from: 'Test Contract', to: 'Updated Contract' } },
      });

      const result = await service.update(
        mockContract.id,
        { title: 'Updated Contract' },
        tenantId,
        userId,
      );

      expect(result.title).toBe('Updated Contract');
      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if contract not found', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { title: 'Updated' }, tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if contract is not in DRAFT status', async () => {
      const activeContract = {
        ...mockContract,
        status: ContractStatus.ACTIVE,
        versions: [],
      };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(activeContract);

      await expect(
        service.update(mockContract.id, { title: 'Updated' }, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not create version when there are no changes', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(contractWithVersions);
      (prismaService.contract.update as jest.Mock).mockResolvedValue(mockContract);

      // Update with same values
      await service.update(
        mockContract.id,
        { title: mockContract.title },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).not.toHaveBeenCalled();
    });

    it('should detect changes in terms', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, terms: { paymentTerms: 'Net 60' }, versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        terms: { paymentTerms: 'Net 60' },
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { terms: { paymentTerms: 'Net 60' } },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: expect.objectContaining({
              terms: expect.anything(),
            }),
          }),
        }),
      );
    });

    it('should detect changes in totalValue', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, totalValue: new Prisma.Decimal(200000), versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        totalValue: new Prisma.Decimal(200000),
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { totalValue: 200000 },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should detect changes in description', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, description: 'New description', versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        description: 'New description',
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { description: 'New description' },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should detect changes in effectiveDate', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, effectiveDate: new Date('2024-02-01'), versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        effectiveDate: new Date('2024-02-01'),
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { effectiveDate: '2024-02-01' },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should detect changes in expirationDate', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, expirationDate: new Date('2025-12-31'), versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        expirationDate: new Date('2025-12-31'),
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { expirationDate: '2025-12-31' },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should detect changes in currency', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, currency: 'EUR', versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        currency: 'EUR',
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { currency: 'EUR' },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should detect changes in organizationId', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, organizationId: 'new-org-id', versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        organizationId: 'new-org-id',
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { organizationId: 'new-org-id' },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should detect changes in metadata', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      const updatedContract = { ...mockContract, version: 2, metadata: { priority: 'low' }, versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithVersions)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        version: 2,
        metadata: { priority: 'low' },
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { metadata: { priority: 'low' } },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should handle contract with null dates', async () => {
      const contractWithNullDates = {
        ...mockContract,
        effectiveDate: null,
        expirationDate: null,
        versions: [],
      };
      const updatedContract = { ...contractWithNullDates, version: 2, effectiveDate: new Date('2024-03-01'), versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithNullDates)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...contractWithNullDates,
        version: 2,
        effectiveDate: new Date('2024-03-01'),
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { effectiveDate: '2024-03-01' },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });

    it('should handle contract with null totalValue', async () => {
      const contractWithNullValue = {
        ...mockContract,
        totalValue: null,
        versions: [],
      };
      const updatedContract = { ...contractWithNullValue, version: 2, totalValue: new Prisma.Decimal(50000), versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(contractWithNullValue)
        .mockResolvedValueOnce(updatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...contractWithNullValue,
        version: 2,
        totalValue: new Prisma.Decimal(50000),
      });
      (prismaService.contractVersion.create as jest.Mock).mockResolvedValue({
        ...mockContractVersion,
        version: 2,
      });

      await service.update(
        mockContract.id,
        { totalValue: 50000 },
        tenantId,
        userId,
      );

      expect(prismaService.contractVersion.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a DRAFT contract', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(contractWithVersions);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...mockContract,
        deletedAt: new Date(),
      });

      await service.remove(mockContract.id, tenantId, userId);

      expect(prismaService.contract.update).toHaveBeenCalledWith({
        where: { id: mockContract.id },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should soft delete a CANCELLED contract', async () => {
      const cancelledContract = {
        ...mockContract,
        status: ContractStatus.CANCELLED,
        versions: [],
      };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(cancelledContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue({
        ...cancelledContract,
        deletedAt: new Date(),
      });

      await service.remove(mockContract.id, tenantId, userId);

      expect(prismaService.contract.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if contract not found', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('non-existent-id', tenantId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if contract is not in deletable status', async () => {
      const activeContract = {
        ...mockContract,
        status: ContractStatus.ACTIVE,
        versions: [],
      };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(activeContract);

      await expect(service.remove(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not allow deleting PENDING_APPROVAL contracts', async () => {
      const pendingContract = {
        ...mockContract,
        status: ContractStatus.PENDING_APPROVAL,
        versions: [],
      };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(pendingContract);

      await expect(service.remove(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted contract', async () => {
      const deletedContract = { ...mockContract, deletedAt: new Date() };
      const restoredContract = { ...mockContract, deletedAt: null, versions: [] };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(deletedContract) // First check
        .mockResolvedValueOnce(restoredContract); // findOne after restore
      (prismaService.contract.update as jest.Mock).mockResolvedValue(restoredContract);

      const result = await service.restore(mockContract.id, tenantId, userId);

      expect(result.deletedAt).toBeNull();
      expect(prismaService.contract.update).toHaveBeenCalledWith({
        where: { id: mockContract.id },
        data: { deletedAt: null },
      });
    });

    it('should throw NotFoundException if contract not found', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.restore('non-existent-id', tenantId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if contract is not deleted', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(mockContract);

      await expect(service.restore(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVersionHistory', () => {
    it('should return version history for a contract', async () => {
      const versions = [
        { ...mockContractVersion, version: 2 },
        mockContractVersion,
      ];
      const contractWithVersions = { ...mockContract, versions: [] };

      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(contractWithVersions);
      (prismaService.contractVersion.findMany as jest.Mock).mockResolvedValue(versions);

      const result = await service.getVersionHistory(mockContract.id, tenantId);

      expect(result).toEqual(versions);
      expect(prismaService.contractVersion.findMany).toHaveBeenCalledWith({
        where: { contractId: mockContract.id },
        orderBy: { version: 'desc' },
      });
    });

    it('should throw NotFoundException if contract not found', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getVersionHistory('non-existent-id', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getVersion', () => {
    it('should return a specific version', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };

      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(contractWithVersions);
      (prismaService.contractVersion.findUnique as jest.Mock).mockResolvedValue(mockContractVersion);

      const result = await service.getVersion(mockContract.id, 1, tenantId);

      expect(result).toEqual(mockContractVersion);
      expect(prismaService.contractVersion.findUnique).toHaveBeenCalledWith({
        where: {
          contractId_version: {
            contractId: mockContract.id,
            version: 1,
          },
        },
      });
    });

    it('should throw NotFoundException if contract not found', async () => {
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getVersion('non-existent-id', 1, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if version not found', async () => {
      const contractWithVersions = { ...mockContract, versions: [] };

      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(contractWithVersions);
      (prismaService.contractVersion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getVersion(mockContract.id, 999, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================
  // Workflow Tests
  // ==========================================

  describe('submit', () => {
    it('should submit a DRAFT contract for approval', async () => {
      const draftContract = { ...mockContract, status: ContractStatus.DRAFT, versions: [] };
      const submittedContract = { ...draftContract, status: ContractStatus.PENDING_APPROVAL };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(draftContract) // First findOne
        .mockResolvedValueOnce(submittedContract); // findOne after update
      (prismaService.contract.update as jest.Mock).mockResolvedValue(submittedContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.submit(mockContract.id, tenantId, userId, 'Ready for review');

      expect(result.status).toBe(ContractStatus.PENDING_APPROVAL);
      expect(prismaService.contract.update).toHaveBeenCalledWith({
        where: { id: mockContract.id },
        data: { status: ContractStatus.PENDING_APPROVAL },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        tenantId,
        userId,
        expect.objectContaining({
          action: 'CONTRACT_SUBMIT',
          entityType: 'Contract',
          entityId: mockContract.id,
        }),
      );
    });

    it('should throw BadRequestException if contract is not in DRAFT status', async () => {
      const activeContract = { ...mockContract, status: ContractStatus.ACTIVE, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(activeContract);

      await expect(service.submit(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    it('should approve a PENDING_APPROVAL contract', async () => {
      const pendingContract = { ...mockContract, status: ContractStatus.PENDING_APPROVAL, versions: [] };
      const approvedContract = { ...pendingContract, status: ContractStatus.APPROVED, approvedById: userId };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(pendingContract) // First findOne
        .mockResolvedValueOnce(approvedContract) // findOne after status update
        .mockResolvedValueOnce(approvedContract); // findOne after approvedById update
      (prismaService.contract.update as jest.Mock).mockResolvedValue(approvedContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.approve(mockContract.id, tenantId, userId, 'Looks good');

      expect(result.status).toBe(ContractStatus.APPROVED);
      expect(auditService.log).toHaveBeenCalledWith(
        tenantId,
        userId,
        expect.objectContaining({
          action: 'CONTRACT_APPROVE',
        }),
      );
    });

    it('should throw BadRequestException if contract is not in PENDING_APPROVAL status', async () => {
      const draftContract = { ...mockContract, status: ContractStatus.DRAFT, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(draftContract);

      await expect(service.approve(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should reject a PENDING_APPROVAL contract back to DRAFT', async () => {
      const pendingContract = { ...mockContract, status: ContractStatus.PENDING_APPROVAL, versions: [] };
      const rejectedContract = { ...pendingContract, status: ContractStatus.DRAFT };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(pendingContract) // First findOne
        .mockResolvedValueOnce(rejectedContract); // findOne after update
      (prismaService.contract.update as jest.Mock).mockResolvedValue(rejectedContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.reject(mockContract.id, tenantId, userId, 'Needs changes');

      expect(result.status).toBe(ContractStatus.DRAFT);
      expect(auditService.log).toHaveBeenCalledWith(
        tenantId,
        userId,
        expect.objectContaining({
          action: 'CONTRACT_REJECT',
        }),
      );
    });

    it('should reject an APPROVED contract back to DRAFT', async () => {
      const approvedContract = { ...mockContract, status: ContractStatus.APPROVED, versions: [] };
      const rejectedContract = { ...approvedContract, status: ContractStatus.DRAFT };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(approvedContract)
        .mockResolvedValueOnce(rejectedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue(rejectedContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.reject(mockContract.id, tenantId, userId);

      expect(result.status).toBe(ContractStatus.DRAFT);
    });

    it('should throw BadRequestException if contract is ACTIVE', async () => {
      const activeContract = { ...mockContract, status: ContractStatus.ACTIVE, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(activeContract);

      await expect(service.reject(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('activate', () => {
    it('should activate an APPROVED contract', async () => {
      const approvedContract = {
        ...mockContract,
        status: ContractStatus.APPROVED,
        effectiveDate: new Date('2024-01-01'),
        versions: []
      };
      const activeContract = { ...approvedContract, status: ContractStatus.ACTIVE };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(approvedContract) // First findOne (for date check)
        .mockResolvedValueOnce(approvedContract) // Second findOne (for transition)
        .mockResolvedValueOnce(activeContract); // findOne after update
      (prismaService.contract.update as jest.Mock).mockResolvedValue(activeContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.activate(mockContract.id, tenantId, userId);

      expect(result.status).toBe(ContractStatus.ACTIVE);
      expect(auditService.log).toHaveBeenCalledWith(
        tenantId,
        userId,
        expect.objectContaining({
          action: 'CONTRACT_ACTIVATE',
        }),
      );
    });

    it('should throw BadRequestException if contract has no effective date', async () => {
      const approvedContract = {
        ...mockContract,
        status: ContractStatus.APPROVED,
        effectiveDate: null,
        versions: []
      };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(approvedContract);

      await expect(service.activate(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if contract is not APPROVED', async () => {
      const draftContract = { ...mockContract, status: ContractStatus.DRAFT, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(draftContract);

      await expect(service.activate(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('terminate', () => {
    it('should terminate an ACTIVE contract', async () => {
      const activeContract = { ...mockContract, status: ContractStatus.ACTIVE, versions: [] };
      const terminatedContract = { ...activeContract, status: ContractStatus.TERMINATED };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(activeContract)
        .mockResolvedValueOnce(terminatedContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue(terminatedContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.terminate(mockContract.id, tenantId, userId, 'Early termination');

      expect(result.status).toBe(ContractStatus.TERMINATED);
      expect(auditService.log).toHaveBeenCalledWith(
        tenantId,
        userId,
        expect.objectContaining({
          action: 'CONTRACT_TERMINATE',
        }),
      );
    });

    it('should throw BadRequestException if contract is not ACTIVE', async () => {
      const draftContract = { ...mockContract, status: ContractStatus.DRAFT, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(draftContract);

      await expect(service.terminate(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a DRAFT contract', async () => {
      const draftContract = { ...mockContract, status: ContractStatus.DRAFT, versions: [] };
      const cancelledContract = { ...draftContract, status: ContractStatus.CANCELLED };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(draftContract)
        .mockResolvedValueOnce(cancelledContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue(cancelledContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.cancel(mockContract.id, tenantId, userId, 'No longer needed');

      expect(result.status).toBe(ContractStatus.CANCELLED);
      expect(auditService.log).toHaveBeenCalledWith(
        tenantId,
        userId,
        expect.objectContaining({
          action: 'CONTRACT_CANCEL',
        }),
      );
    });

    it('should cancel a PENDING_APPROVAL contract', async () => {
      const pendingContract = { ...mockContract, status: ContractStatus.PENDING_APPROVAL, versions: [] };
      const cancelledContract = { ...pendingContract, status: ContractStatus.CANCELLED };

      (prismaService.contract.findFirst as jest.Mock)
        .mockResolvedValueOnce(pendingContract)
        .mockResolvedValueOnce(cancelledContract);
      (prismaService.contract.update as jest.Mock).mockResolvedValue(cancelledContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.cancel(mockContract.id, tenantId, userId);

      expect(result.status).toBe(ContractStatus.CANCELLED);
    });

    it('should throw BadRequestException if contract is ACTIVE', async () => {
      const activeContract = { ...mockContract, status: ContractStatus.ACTIVE, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(activeContract);

      await expect(service.cancel(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if contract is already CANCELLED', async () => {
      const cancelledContract = { ...mockContract, status: ContractStatus.CANCELLED, versions: [] };
      (prismaService.contract.findFirst as jest.Mock).mockResolvedValue(cancelledContract);

      await expect(service.cancel(mockContract.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid DRAFT -> PENDING_APPROVAL transition', () => {
      expect(service.isValidTransition(ContractStatus.DRAFT, ContractStatus.PENDING_APPROVAL)).toBe(true);
    });

    it('should return true for valid PENDING_APPROVAL -> APPROVED transition', () => {
      expect(service.isValidTransition(ContractStatus.PENDING_APPROVAL, ContractStatus.APPROVED)).toBe(true);
    });

    it('should return true for valid APPROVED -> ACTIVE transition', () => {
      expect(service.isValidTransition(ContractStatus.APPROVED, ContractStatus.ACTIVE)).toBe(true);
    });

    it('should return false for invalid DRAFT -> ACTIVE transition', () => {
      expect(service.isValidTransition(ContractStatus.DRAFT, ContractStatus.ACTIVE)).toBe(false);
    });

    it('should return false for invalid ACTIVE -> DRAFT transition', () => {
      expect(service.isValidTransition(ContractStatus.ACTIVE, ContractStatus.DRAFT)).toBe(false);
    });

    it('should return false for any transition from TERMINATED', () => {
      expect(service.isValidTransition(ContractStatus.TERMINATED, ContractStatus.DRAFT)).toBe(false);
      expect(service.isValidTransition(ContractStatus.TERMINATED, ContractStatus.ACTIVE)).toBe(false);
    });

    it('should return false for any transition from CANCELLED', () => {
      expect(service.isValidTransition(ContractStatus.CANCELLED, ContractStatus.DRAFT)).toBe(false);
    });
  });
});
