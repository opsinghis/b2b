import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PricingSyncService } from './pricing-sync.service';
import { PrismaService } from '@infrastructure/database';
import { PricingService } from './pricing.service';
import {
  PriceListSyncJobType,
  SyncJobStatus,
  PriceListType,
  PriceListStatus,
} from '../interfaces';

describe('PricingSyncService', () => {
  let service: PricingSyncService;
  let prisma: {
    priceListSyncJob: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    priceListItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    priceList: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let pricingService: jest.Mocked<PricingService>;

  const mockTenantId = 'tenant-123';
  const mockPriceListId = 'pricelist-123';
  const mockJobId = 'job-123';

  const mockPriceList = {
    id: mockPriceListId,
    tenantId: mockTenantId,
    code: 'STANDARD-2024',
    name: 'Standard Price List 2024',
    type: PriceListType.STANDARD,
    status: PriceListStatus.ACTIVE,
    currency: 'USD',
    priority: 0,
  };

  const mockSyncJob = {
    id: mockJobId,
    tenantId: mockTenantId,
    priceListId: mockPriceListId,
    jobType: PriceListSyncJobType.FULL_SYNC,
    status: SyncJobStatus.RUNNING,
    totalItems: 100,
    processedItems: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    startedAt: new Date(),
    completedAt: null,
    deltaToken: null,
    errors: null,
    summary: null,
    connectorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingSyncService,
        {
          provide: PrismaService,
          useValue: {
            priceListSyncJob: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            priceListItem: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            priceList: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: PricingService,
          useValue: {
            findPriceListByCode: jest.fn(),
            createPriceList: jest.fn(),
            bulkUpsertPriceListItems: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PricingSyncService>(PricingSyncService);
    prisma = module.get(PrismaService);
    pricingService = module.get(PricingService);
  });

  describe('importPriceList', () => {
    const mockERPData = {
      priceList: {
        code: 'STANDARD-2024',
        name: 'Standard Price List 2024',
        description: 'Standard pricing',
        type: 'standard',
        currency: 'USD',
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-12-31',
        externalId: 'ERP-PL-001',
      },
      items: [
        { sku: 'SKU001', basePrice: 100, listPrice: 100, cost: 50 },
        { sku: 'SKU002', basePrice: 200, listPrice: 200, cost: 100 },
      ],
    };

    it('should import price list with existing price list', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);
      prisma.priceListItem.findMany.mockResolvedValue([]);
      pricingService.bulkUpsertPriceListItems.mockResolvedValue({
        created: 2,
        updated: 0,
        errors: [],
      });
      prisma.priceListSyncJob.update.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.COMPLETED,
        completedAt: new Date(),
      } as any);
      prisma.priceList.update.mockResolvedValue(mockPriceList as any);

      const result = await service.importPriceList(mockTenantId, mockERPData);

      expect(result.priceListCode).toBe('STANDARD-2024');
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(pricingService.findPriceListByCode).toHaveBeenCalledWith(mockTenantId, 'STANDARD-2024');
    });

    it('should create new price list if not found', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(null);
      pricingService.createPriceList.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);
      prisma.priceListItem.findMany.mockResolvedValue([]);
      pricingService.bulkUpsertPriceListItems.mockResolvedValue({
        created: 2,
        updated: 0,
        errors: [],
      });
      prisma.priceListSyncJob.update.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.COMPLETED,
        completedAt: new Date(),
      } as any);
      prisma.priceList.update.mockResolvedValue(mockPriceList as any);

      const result = await service.importPriceList(mockTenantId, mockERPData);

      expect(pricingService.createPriceList).toHaveBeenCalled();
      expect(result.successCount).toBe(2);
    });

    it('should handle upsert errors', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);
      prisma.priceListItem.findMany.mockResolvedValue([]);
      pricingService.bulkUpsertPriceListItems.mockResolvedValue({
        created: 1,
        updated: 0,
        errors: [{ sku: 'SKU002', error: 'Invalid price' }],
      });
      prisma.priceListSyncJob.update.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.COMPLETED,
        completedAt: new Date(),
      } as any);
      prisma.priceList.update.mockResolvedValue(mockPriceList as any);

      const result = await service.importPriceList(mockTenantId, mockERPData);

      expect(result.errorCount).toBe(1);
      expect(result.errors).toBeDefined();
    });

    it('should track price changes', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);
      prisma.priceListItem.findMany.mockResolvedValue([
        { sku: 'SKU001', listPrice: { toNumber: () => 90 } },
      ]);
      pricingService.bulkUpsertPriceListItems.mockResolvedValue({
        created: 1,
        updated: 1,
        errors: [],
      });
      prisma.priceListSyncJob.update.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.COMPLETED,
        completedAt: new Date(),
      } as any);
      prisma.priceList.update.mockResolvedValue(mockPriceList as any);

      const result = await service.importPriceList(mockTenantId, mockERPData);

      expect(result.summary).toBeDefined();
      expect(result.summary?.priceChanges.increased).toBeGreaterThanOrEqual(0);
    });

    it('should use delta sync when specified', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue({
        ...mockSyncJob,
        jobType: PriceListSyncJobType.DELTA_SYNC,
      } as any);
      prisma.priceListItem.findMany.mockResolvedValue([]);
      pricingService.bulkUpsertPriceListItems.mockResolvedValue({
        created: 2,
        updated: 0,
        errors: [],
      });
      prisma.priceListSyncJob.update.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.COMPLETED,
        completedAt: new Date(),
      } as any);
      prisma.priceList.update.mockResolvedValue(mockPriceList as any);

      await service.importPriceList(mockTenantId, mockERPData, {
        fullSync: false,
        deltaToken: 'token-123',
      });

      expect(prisma.priceListSyncJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobType: PriceListSyncJobType.DELTA_SYNC,
          }),
        }),
      );
    });

    it('should handle batch processing errors', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);
      prisma.priceListItem.findMany.mockResolvedValue([]);
      pricingService.bulkUpsertPriceListItems.mockRejectedValue(new Error('Batch failed'));
      prisma.priceListSyncJob.update.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.FAILED,
        completedAt: new Date(),
      } as any);
      prisma.priceList.update.mockResolvedValue(mockPriceList as any);

      const result = await service.importPriceList(mockTenantId, mockERPData);

      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.errorCode === 'BATCH_ERROR')).toBe(true);
    });
  });

  describe('startSyncJob', () => {
    it('should start a sync job for existing price list', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);

      const result = await service.startSyncJob({
        tenantId: mockTenantId,
        priceListCode: 'STANDARD-2024',
        fullSync: true,
      });

      expect(result.id).toBe(mockJobId);
      expect(prisma.priceListSyncJob.create).toHaveBeenCalled();
    });

    it('should throw if price list code is missing', async () => {
      await expect(
        service.startSyncJob({
          tenantId: mockTenantId,
          priceListCode: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if price list not found', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(null);

      await expect(
        service.startSyncJob({
          tenantId: mockTenantId,
          priceListCode: 'NONEXISTENT',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include connector ID when provided', async () => {
      pricingService.findPriceListByCode.mockResolvedValue(mockPriceList as any);
      prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);

      await service.startSyncJob({
        tenantId: mockTenantId,
        priceListCode: 'STANDARD-2024',
        connectorId: 'connector-123',
      });

      expect(prisma.priceListSyncJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            connectorId: 'connector-123',
          }),
        }),
      );
    });
  });

  describe('getSyncJobStatus', () => {
    it('should return sync job status', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue(mockSyncJob as any);

      const result = await service.getSyncJobStatus(mockTenantId, mockJobId);

      expect(result.id).toBe(mockJobId);
      expect(prisma.priceListSyncJob.findFirst).toHaveBeenCalledWith({
        where: { id: mockJobId, tenantId: mockTenantId },
      });
    });

    it('should throw if job not found', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue(null);

      await expect(service.getSyncJobStatus(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync history', async () => {
      prisma.priceListSyncJob.findMany.mockResolvedValue([mockSyncJob] as any);

      const result = await service.getSyncHistory(mockTenantId, mockPriceListId);

      expect(result).toHaveLength(1);
      expect(prisma.priceListSyncJob.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, priceListId: mockPriceListId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should respect limit parameter', async () => {
      prisma.priceListSyncJob.findMany.mockResolvedValue([]);

      await service.getSyncHistory(mockTenantId, mockPriceListId, 5);

      expect(prisma.priceListSyncJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('cancelSyncJob', () => {
    it('should cancel pending job', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.PENDING,
      } as any);
      prisma.priceListSyncJob.update.mockResolvedValue({} as any);

      await service.cancelSyncJob(mockTenantId, mockJobId);

      expect(prisma.priceListSyncJob.update).toHaveBeenCalledWith({
        where: { id: mockJobId },
        data: expect.objectContaining({
          status: SyncJobStatus.CANCELLED,
        }),
      });
    });

    it('should cancel running job', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.RUNNING,
      } as any);
      prisma.priceListSyncJob.update.mockResolvedValue({} as any);

      await service.cancelSyncJob(mockTenantId, mockJobId);

      expect(prisma.priceListSyncJob.update).toHaveBeenCalled();
    });

    it('should throw if job is already completed', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.COMPLETED,
      } as any);

      await expect(service.cancelSyncJob(mockTenantId, mockJobId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if job is already failed', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.FAILED,
      } as any);

      await expect(service.cancelSyncJob(mockTenantId, mockJobId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLastDeltaToken', () => {
    it('should return last delta token', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue({
        deltaToken: 'token-123',
      } as any);

      const result = await service.getLastDeltaToken(mockTenantId, mockPriceListId);

      expect(result).toBe('token-123');
    });

    it('should return null if no completed delta sync', async () => {
      prisma.priceListSyncJob.findFirst.mockResolvedValue(null);

      const result = await service.getLastDeltaToken(mockTenantId, mockPriceListId);

      expect(result).toBeNull();
    });
  });

  describe('processDeltaUpdates', () => {
    it('should process create updates', async () => {
      pricingService.bulkUpsertPriceListItems.mockResolvedValue({
        created: 1,
        updated: 0,
        errors: [],
      });

      const result = await service.processDeltaUpdates(
        mockTenantId,
        mockPriceListId,
        [
          {
            action: 'create',
            sku: 'SKU001',
            data: { basePrice: 100, listPrice: 100 },
          },
        ],
        'token-123',
      );

      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.newDeltaToken).toContain('token-123');
    });

    it('should process update action', async () => {
      pricingService.bulkUpsertPriceListItems.mockResolvedValue({
        created: 0,
        updated: 1,
        errors: [],
      });

      const result = await service.processDeltaUpdates(
        mockTenantId,
        mockPriceListId,
        [
          {
            action: 'update',
            sku: 'SKU001',
            data: { basePrice: 150, listPrice: 150 },
          },
        ],
        'token-123',
      );

      expect(result.processed).toBe(1);
    });

    it('should process delete action', async () => {
      prisma.priceListItem.findFirst.mockResolvedValue({
        id: 'item-123',
        sku: 'SKU001',
      } as any);
      prisma.priceListItem.update.mockResolvedValue({} as any);

      const result = await service.processDeltaUpdates(
        mockTenantId,
        mockPriceListId,
        [{ action: 'delete', sku: 'SKU001' }],
        'token-123',
      );

      expect(result.processed).toBe(1);
      expect(prisma.priceListItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should handle delete when item not found', async () => {
      prisma.priceListItem.findFirst.mockResolvedValue(null);

      const result = await service.processDeltaUpdates(
        mockTenantId,
        mockPriceListId,
        [{ action: 'delete', sku: 'NONEXISTENT' }],
        'token-123',
      );

      expect(result.processed).toBe(1);
      expect(prisma.priceListItem.update).not.toHaveBeenCalled();
    });

    it('should handle missing data for create/update', async () => {
      const result = await service.processDeltaUpdates(
        mockTenantId,
        mockPriceListId,
        [{ action: 'create', sku: 'SKU001' }],
        'token-123',
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Data required');
    });

    it('should handle errors during processing', async () => {
      pricingService.bulkUpsertPriceListItems.mockRejectedValue(new Error('DB error'));

      const result = await service.processDeltaUpdates(
        mockTenantId,
        mockPriceListId,
        [
          {
            action: 'update',
            sku: 'SKU001',
            data: { basePrice: 100, listPrice: 100 },
          },
        ],
        'token-123',
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('DB error');
    });
  });

  describe('scheduleBatchSync', () => {
    it('should schedule sync for all active price lists', async () => {
      prisma.priceList.findMany.mockResolvedValue([
        { id: 'pl-1', code: 'PL1' },
        { id: 'pl-2', code: 'PL2' },
      ] as any);
      prisma.priceListSyncJob.create
        .mockResolvedValueOnce({ id: 'job-1' } as any)
        .mockResolvedValueOnce({ id: 'job-2' } as any);

      const result = await service.scheduleBatchSync(mockTenantId);

      expect(result).toHaveLength(2);
      expect(prisma.priceListSyncJob.create).toHaveBeenCalledTimes(2);
    });

    it('should include connector ID when provided', async () => {
      prisma.priceList.findMany.mockResolvedValue([{ id: 'pl-1', code: 'PL1' }] as any);
      prisma.priceListSyncJob.create.mockResolvedValue({ id: 'job-1' } as any);

      await service.scheduleBatchSync(mockTenantId, 'connector-123');

      expect(prisma.priceListSyncJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            connectorId: 'connector-123',
          }),
        }),
      );
    });

    it('should return empty array when no active price lists', async () => {
      prisma.priceList.findMany.mockResolvedValue([]);

      const result = await service.scheduleBatchSync(mockTenantId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getPendingSyncJobs', () => {
    it('should return pending and running jobs', async () => {
      prisma.priceListSyncJob.findMany.mockResolvedValue([
        { ...mockSyncJob, status: SyncJobStatus.PENDING },
        { ...mockSyncJob, id: 'job-2', status: SyncJobStatus.RUNNING },
      ] as any);

      const result = await service.getPendingSyncJobs(mockTenantId);

      expect(result).toHaveLength(2);
      expect(prisma.priceListSyncJob.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: { in: [SyncJobStatus.PENDING, SyncJobStatus.RUNNING] },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
    });

    it('should respect limit parameter', async () => {
      prisma.priceListSyncJob.findMany.mockResolvedValue([]);

      await service.getPendingSyncJobs(mockTenantId, 5);

      expect(prisma.priceListSyncJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('mapERPType (private)', () => {
    it('should handle various ERP types through importPriceList', async () => {
      const types = ['standard', 'contract', 'promotional', 'volume', 'customer', 'channel', 'regional', 'unknown'];

      for (const type of types) {
        pricingService.findPriceListByCode.mockResolvedValue(null);
        pricingService.createPriceList.mockResolvedValue(mockPriceList as any);
        prisma.priceListSyncJob.create.mockResolvedValue(mockSyncJob as any);
        prisma.priceListItem.findMany.mockResolvedValue([]);
        pricingService.bulkUpsertPriceListItems.mockResolvedValue({ created: 0, updated: 0, errors: [] });
        prisma.priceListSyncJob.update.mockResolvedValue({ ...mockSyncJob, status: SyncJobStatus.COMPLETED, completedAt: new Date() } as any);
        prisma.priceList.update.mockResolvedValue(mockPriceList as any);

        await service.importPriceList(mockTenantId, {
          priceList: {
            code: `TEST-${type}`,
            name: 'Test',
            type,
            currency: 'USD',
            effectiveFrom: '2024-01-01',
          },
          items: [],
        });

        expect(pricingService.createPriceList).toHaveBeenCalled();
      }
    });
  });
});
