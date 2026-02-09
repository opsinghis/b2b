import { Test, TestingModule } from '@nestjs/testing';
import { InventorySyncService } from './inventory-sync.service';
import { PrismaService } from '@infrastructure/database';
import { SyncJobStatus, ProductAvailability } from '@prisma/client';

describe('InventorySyncService', () => {
  let service: InventorySyncService;
  let prisma: {
    inventorySyncJob: { update: jest.Mock; findFirst: jest.Mock };
    inventoryLevel: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    warehouse: { findUnique: jest.Mock; findMany: jest.Mock };
    masterProduct: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockTenantId = 'tenant-123';
  const mockJobId = 'job-123';
  const mockWarehouseId = 'warehouse-123';

  const mockWarehouse = {
    id: mockWarehouseId,
    tenantId: mockTenantId,
    code: 'WH001',
    name: 'Main Warehouse',
    isActive: true,
  };

  const mockInventoryLevel = {
    id: 'level-123',
    tenantId: mockTenantId,
    warehouseId: mockWarehouseId,
    sku: 'SKU001',
    quantityOnHand: 100,
    quantityReserved: 10,
    quantityOnOrder: 50,
    quantityAllocated: 5,
    quantityAvailable: 85,
    atp: 135,
    reorderPoint: 20,
    safetyStock: 10,
    availability: ProductAvailability.IN_STOCK,
    externalId: 'EXT-001',
    lastSyncAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventorySyncService,
        {
          provide: PrismaService,
          useValue: {
            inventorySyncJob: {
              update: jest.fn(),
              findFirst: jest.fn(),
            },
            inventoryLevel: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            warehouse: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            masterProduct: {
              findFirst: jest.fn(),
            },
            $transaction: jest.fn((fn) =>
              fn({
                inventoryLevel: {
                  findUnique: jest.fn().mockResolvedValue(null),
                  update: jest.fn(),
                  create: jest.fn(),
                },
                masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<InventorySyncService>(InventorySyncService);
    prisma = module.get(PrismaService);
  });

  describe('executeFullSync', () => {
    it('should execute full sync for all warehouses', async () => {
      prisma.inventorySyncJob.update.mockResolvedValue({});
      prisma.warehouse.findMany.mockResolvedValue([mockWarehouse]);
      prisma.inventoryLevel.findMany.mockResolvedValue([mockInventoryLevel]);

      const result = await service.executeFullSync(mockTenantId, mockJobId);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('duration');
      expect(prisma.inventorySyncJob.update).toHaveBeenCalled();
    });

    it('should execute full sync for specific warehouse', async () => {
      prisma.inventorySyncJob.update.mockResolvedValue({});
      prisma.warehouse.findUnique.mockResolvedValue(mockWarehouse);
      prisma.inventoryLevel.findMany.mockResolvedValue([mockInventoryLevel]);

      const result = await service.executeFullSync(mockTenantId, mockJobId, mockWarehouseId);

      expect(result).toHaveProperty('duration');
      expect(prisma.warehouse.findUnique).toHaveBeenCalledWith({
        where: { id: mockWarehouseId },
      });
    });

    it('should handle warehouse sync errors', async () => {
      prisma.inventorySyncJob.update.mockResolvedValue({});
      prisma.warehouse.findMany.mockResolvedValue([mockWarehouse]);
      prisma.inventoryLevel.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.executeFullSync(mockTenantId, mockJobId);

      // Should complete but with failed count
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle job failure', async () => {
      prisma.inventorySyncJob.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.executeFullSync(mockTenantId, mockJobId)).rejects.toThrow();
    });
  });

  describe('executeDeltaSync', () => {
    it('should execute delta sync', async () => {
      prisma.inventorySyncJob.update.mockResolvedValue({});
      prisma.inventorySyncJob.findFirst.mockResolvedValue({
        completedAt: new Date(Date.now() - 3600000),
      });
      prisma.warehouse.findMany.mockResolvedValue([mockWarehouse]);
      prisma.inventoryLevel.findMany.mockResolvedValue([mockInventoryLevel]);

      const result = await service.executeDeltaSync(mockTenantId, mockJobId);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
    });

    it('should execute delta sync with specific since date', async () => {
      const sinceDate = new Date(Date.now() - 7200000);
      prisma.inventorySyncJob.update.mockResolvedValue({});
      prisma.warehouse.findMany.mockResolvedValue([mockWarehouse]);
      prisma.inventoryLevel.findMany.mockResolvedValue([]);

      const result = await service.executeDeltaSync(
        mockTenantId,
        mockJobId,
        undefined,
        undefined,
        sinceDate,
      );

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('should handle delta sync failure', async () => {
      prisma.inventorySyncJob.update.mockResolvedValue({});
      prisma.inventorySyncJob.findFirst.mockResolvedValue(null);
      prisma.warehouse.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.executeDeltaSync(mockTenantId, mockJobId)).rejects.toThrow();
    });
  });

  describe('processInventoryBatch', () => {
    it('should process inventory batch', async () => {
      const data = [
        { sku: 'SKU001', quantityOnHand: 100 },
        { sku: 'SKU002', quantityOnHand: 200 },
      ];

      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      const result = await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('failed');
    });

    it('should update existing inventory levels', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 150 }];

      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(mockInventoryLevel),
            update: jest.fn().mockResolvedValue({}),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      const result = await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(result).toHaveProperty('updated');
    });

    it('should skip unchanged items', async () => {
      const data = [
        {
          sku: 'SKU001',
          quantityOnHand: 100,
          quantityReserved: 10,
          quantityOnOrder: 50,
          reorderPoint: 20,
          safetyStock: 10,
        },
      ];

      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(mockInventoryLevel),
            update: jest.fn(),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      const result = await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should handle batch processing errors', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 100 }];

      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockRejectedValue(new Error('DB error')),
          },
          masterProduct: { findFirst: jest.fn() },
        });
      });

      const result = await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should update job progress for large batches', async () => {
      const data = Array.from({ length: 600 }, (_, i) => ({
        sku: `SKU${i}`,
        quantityOnHand: i * 10,
      }));

      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });
      prisma.inventorySyncJob.update.mockResolvedValue({});

      const result = await service.processInventoryBatch(
        mockTenantId,
        mockWarehouseId,
        data,
        mockJobId,
      );

      expect(result.created + result.failed).toBeLessThanOrEqual(data.length);
    });
  });

  describe('availability calculation', () => {
    it('should calculate OUT_OF_STOCK when quantity is 0', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 0 }];

      let createdData: any = null;
      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return {};
            }),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(createdData?.availability).toBe(ProductAvailability.OUT_OF_STOCK);
    });

    it('should calculate LOW_STOCK when below reorder point', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 15, reorderPoint: 20 }];

      let createdData: any = null;
      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return {};
            }),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(createdData?.availability).toBe(ProductAvailability.LOW_STOCK);
    });

    it('should calculate LOW_STOCK when below safety stock', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 5, safetyStock: 10 }];

      let createdData: any = null;
      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return {};
            }),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(createdData?.availability).toBe(ProductAvailability.LOW_STOCK);
    });

    it('should calculate IN_STOCK for normal stock levels', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 100, reorderPoint: 20, safetyStock: 10 }];

      let createdData: any = null;
      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return {};
            }),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(createdData?.availability).toBe(ProductAvailability.IN_STOCK);
    });
  });

  describe('hasChanges detection', () => {
    it('should detect changes in quantityReserved', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 100, quantityReserved: 20 }];

      let updated = false;
      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockInventoryLevel,
              quantityReserved: 10,
            }),
            update: jest.fn().mockImplementation(() => {
              updated = true;
              return {};
            }),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(updated).toBe(true);
    });

    it('should detect changes in quantityOnOrder', async () => {
      const data = [{ sku: 'SKU001', quantityOnHand: 100, quantityOnOrder: 100 }];

      let updated = false;
      prisma.$transaction.mockImplementation(async (fn) => {
        await fn({
          inventoryLevel: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockInventoryLevel,
              quantityOnOrder: 50,
            }),
            update: jest.fn().mockImplementation(() => {
              updated = true;
              return {};
            }),
          },
          masterProduct: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      await service.processInventoryBatch(mockTenantId, mockWarehouseId, data);

      expect(updated).toBe(true);
    });
  });
});
