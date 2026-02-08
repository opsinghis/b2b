import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { InventoryService } from './services/inventory.service';
import {
  ProductAvailability,
  InventoryReservationStatus,
  InventoryReservationType,
  InventoryMovementType,
  AlertStatus,
  InventoryAlertType,
  AlertSeverity,
  SyncJobStatus,
  InventorySyncJobType,
} from '@prisma/client';

describe('InventoryService', () => {
  let service: InventoryService;
  let prismaService: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockWarehouseId = 'warehouse-123';
  const mockSku = 'SKU-001';

  const mockWarehouse = {
    id: mockWarehouseId,
    code: 'WH-001',
    name: 'Main Warehouse',
    tenantId: mockTenantId,
    isDefault: true,
    isActive: true,
    leadTimeDays: 2,
    cutoffTime: '14:00',
    safetyStockDays: 3,
    operatingDays: [1, 2, 3, 4, 5],
    address: {},
    timezone: 'UTC',
    type: 'STANDARD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInventoryLevel = {
    id: 'level-123',
    sku: mockSku,
    tenantId: mockTenantId,
    warehouseId: mockWarehouseId,
    quantityOnHand: 100,
    quantityReserved: 10,
    quantityOnOrder: 50,
    quantityAllocated: 5,
    quantityAvailable: 85,
    atp: 130,
    safetyStock: 20,
    minOrderQty: 1,
    maxOrderQty: null,
    reorderPoint: 30,
    availability: ProductAvailability.IN_STOCK,
    lastSyncAt: new Date(),
    lastSyncSource: 'test',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    warehouse: mockWarehouse,
  };

  const mockReservation = {
    id: 'res-123',
    reservationNumber: 'RES-001',
    sku: mockSku,
    quantity: 10,
    quantityFulfilled: 0,
    status: InventoryReservationStatus.CONFIRMED,
    type: InventoryReservationType.ORDER,
    priority: 0,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    sourceType: 'order',
    sourceId: 'order-123',
    tenantId: mockTenantId,
    warehouseId: mockWarehouseId,
    inventoryLevelId: mockInventoryLevel.id,
    userId: null,
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    warehouse: mockWarehouse,
  };

  const mockPrismaService: any = {
    inventoryLevel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      fields: {
        reorderPoint: 'reorderPoint',
      },
    },
    inventoryReservation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    inventoryAlert: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventorySyncJob: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    masterProduct: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => Promise<any>) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkStock', () => {
    it('should return stock availability for a SKU', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([mockInventoryLevel]);

      const result = await service.checkStock(mockTenantId, {
        sku: mockSku,
        quantity: 10,
      });

      expect(result.sku).toBe(mockSku);
      expect(result.isAvailable).toBe(true);
      expect(result.canFulfill).toBe(true);
      expect(result.totalOnHand).toBe(100);
      expect(result.totalAvailable).toBe(85);
      expect(result.warehouseAvailability).toHaveLength(1);
      expect(result.warehouseAvailability[0].warehouseCode).toBe('WH-001');
    });

    it('should return unavailable when no inventory found', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([]);

      const result = await service.checkStock(mockTenantId, {
        sku: 'NONEXISTENT',
        quantity: 10,
      });

      expect(result.isAvailable).toBe(false);
      expect(result.canFulfill).toBe(false);
      expect(result.totalOnHand).toBe(0);
      expect(result.availability).toBe(ProductAvailability.OUT_OF_STOCK);
    });

    it('should return cannot fulfill when quantity exceeds available', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([
        { ...mockInventoryLevel, atp: 5 },
      ]);

      const result = await service.checkStock(mockTenantId, {
        sku: mockSku,
        quantity: 100,
        checkAtp: true,
      });

      expect(result.canFulfill).toBe(false);
    });

    it('should filter by warehouseId when provided', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([mockInventoryLevel]);

      await service.checkStock(mockTenantId, {
        sku: mockSku,
        quantity: 10,
        warehouseId: mockWarehouseId,
      });

      expect(mockPrismaService.inventoryLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: mockWarehouseId,
          }),
        }),
      );
    });
  });

  describe('batchCheckStock', () => {
    it('should check stock for multiple SKUs', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([mockInventoryLevel]);

      const result = await service.batchCheckStock(mockTenantId, {
        items: [
          { sku: 'SKU-001', quantity: 5 },
          { sku: 'SKU-002', quantity: 10 },
        ],
      });

      expect(result.items).toHaveLength(2);
      expect(mockPrismaService.inventoryLevel.findMany).toHaveBeenCalledTimes(2);
    });

    it('should report unavailable SKUs', async () => {
      mockPrismaService.inventoryLevel.findMany
        .mockResolvedValueOnce([mockInventoryLevel])
        .mockResolvedValueOnce([]);

      const result = await service.batchCheckStock(mockTenantId, {
        items: [
          { sku: 'SKU-001', quantity: 5 },
          { sku: 'SKU-MISSING', quantity: 10 },
        ],
      });

      expect(result.allAvailable).toBe(false);
      expect(result.unavailableSkus).toContain('SKU-MISSING');
    });
  });

  describe('calculateATP', () => {
    it('should calculate ATP for a SKU', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([
        {
          ...mockInventoryLevel,
          reservations: [],
        },
      ]);

      const result = await service.calculateATP(mockTenantId, {
        sku: mockSku,
      });

      expect(result.sku).toBe(mockSku);
      expect(result.quantityOnHand).toBe(100);
      expect(result.quantityReserved).toBe(10);
      expect(result.safetyStock).toBe(20);
      expect(result.atp).toBeGreaterThanOrEqual(0);
      expect(result.projectedAvailability).toBeDefined();
    });

    it('should throw NotFoundException when SKU not found', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([]);

      await expect(
        service.calculateATP(mockTenantId, { sku: 'NONEXISTENT' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);
      mockPrismaService.inventoryReservation.create.mockResolvedValue(mockReservation);
      mockPrismaService.inventoryLevel.update.mockResolvedValue(mockInventoryLevel);

      const result = await service.createReservation(mockTenantId, {
        sku: mockSku,
        quantity: 10,
        sourceType: 'order',
        sourceId: 'order-123',
      });

      expect(result.sku).toBe(mockSku);
      expect(result.quantity).toBe(10);
      expect(result.status).toBe(InventoryReservationStatus.CONFIRMED);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(null);

      await expect(
        service.createReservation(mockTenantId, {
          sku: 'NONEXISTENT',
          quantity: 10,
          sourceType: 'order',
          sourceId: 'order-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue({
        ...mockInventoryLevel,
        quantityAvailable: 5,
      });

      await expect(
        service.createReservation(mockTenantId, {
          sku: mockSku,
          quantity: 100,
          sourceType: 'order',
          sourceId: 'order-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('fulfillReservation', () => {
    it('should fulfill a reservation', async () => {
      const fulfilledReservation = {
        ...mockReservation,
        status: InventoryReservationStatus.FULFILLED,
        quantityFulfilled: 10,
        fulfilledAt: new Date(),
      };

      mockPrismaService.inventoryReservation.findFirst.mockResolvedValue(mockReservation);
      mockPrismaService.inventoryReservation.update.mockResolvedValue(fulfilledReservation);
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);
      mockPrismaService.inventoryMovement.create.mockResolvedValue({
        id: 'mov-123',
        movementNumber: 'MOV-001',
        type: InventoryMovementType.SALE,
        quantity: 10,
        previousQty: 100,
        newQty: 90,
      });

      const result = await service.fulfillReservation(mockTenantId, {
        reservationId: mockReservation.id,
      });

      expect(result.status).toBe(InventoryReservationStatus.FULFILLED);
      expect(result.quantityFulfilled).toBe(10);
    });

    it('should throw NotFoundException when reservation not found', async () => {
      mockPrismaService.inventoryReservation.findFirst.mockResolvedValue(null);

      await expect(
        service.fulfillReservation(mockTenantId, {
          reservationId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already fulfilled', async () => {
      mockPrismaService.inventoryReservation.findFirst.mockResolvedValue({
        ...mockReservation,
        status: InventoryReservationStatus.FULFILLED,
      });

      await expect(
        service.fulfillReservation(mockTenantId, {
          reservationId: mockReservation.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseReservation', () => {
    it('should release a reservation', async () => {
      const releasedReservation = {
        ...mockReservation,
        status: InventoryReservationStatus.RELEASED,
        releasedAt: new Date(),
      };

      mockPrismaService.inventoryReservation.findFirst.mockResolvedValue(mockReservation);
      mockPrismaService.inventoryReservation.update.mockResolvedValue(releasedReservation);
      mockPrismaService.inventoryLevel.update.mockResolvedValue(mockInventoryLevel);
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);

      const result = await service.releaseReservation(mockTenantId, {
        reservationId: mockReservation.id,
        reason: 'Customer cancelled',
      });

      expect(result.status).toBe(InventoryReservationStatus.RELEASED);
    });

    it('should throw BadRequestException when already released', async () => {
      mockPrismaService.inventoryReservation.findFirst.mockResolvedValue({
        ...mockReservation,
        status: InventoryReservationStatus.RELEASED,
      });

      await expect(
        service.releaseReservation(mockTenantId, {
          reservationId: mockReservation.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processExpiredReservations', () => {
    it('should process and expire reservations past their expiry time', async () => {
      const expiredReservation = {
        ...mockReservation,
        expiresAt: new Date(Date.now() - 1000),
      };

      mockPrismaService.inventoryReservation.findMany.mockResolvedValue([expiredReservation]);
      mockPrismaService.inventoryReservation.update.mockResolvedValue({
        ...expiredReservation,
        status: InventoryReservationStatus.EXPIRED,
      });
      mockPrismaService.inventoryLevel.update.mockResolvedValue(mockInventoryLevel);
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);

      const count = await service.processExpiredReservations(mockTenantId);

      expect(count).toBe(1);
    });

    it('should return 0 when no expired reservations', async () => {
      mockPrismaService.inventoryReservation.findMany.mockResolvedValue([]);

      const count = await service.processExpiredReservations(mockTenantId);

      expect(count).toBe(0);
    });
  });

  describe('recordMovement', () => {
    const mockMovement = {
      id: 'mov-123',
      movementNumber: 'MOV-001',
      type: InventoryMovementType.RECEIPT,
      quantity: 50,
      previousQty: 100,
      newQty: 150,
      createdAt: new Date(),
    };

    it('should record a receipt movement', async () => {
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);
      mockPrismaService.inventoryLevel.update.mockResolvedValue({
        ...mockInventoryLevel,
        quantityOnHand: 150,
      });
      mockPrismaService.inventoryMovement.create.mockResolvedValue(mockMovement);

      const result = await service.recordMovement(mockTenantId, {
        sku: mockSku,
        warehouseId: mockWarehouseId,
        type: InventoryMovementType.RECEIPT,
        quantity: 50,
        reason: 'PO Receipt',
      });

      expect(result.type).toBe(InventoryMovementType.RECEIPT);
      expect(result.quantity).toBe(50);
    });

    it('should throw NotFoundException when inventory level not found', async () => {
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(null);

      await expect(
        service.recordMovement(mockTenantId, {
          sku: 'NONEXISTENT',
          warehouseId: mockWarehouseId,
          type: InventoryMovementType.RECEIPT,
          quantity: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustInventory', () => {
    it('should adjust inventory with set type', async () => {
      const updatedLevel = {
        ...mockInventoryLevel,
        quantityOnHand: 200,
      };
      // adjustInventory makes multiple findUnique calls:
      // 1. Get current level (line 794)
      // 2. recordMovementInternal lookup (line 686)
      // 3. updateAvailabilityStatus lookup (line 1330)
      // 4. Final lookup to return updated level (line 843)
      mockPrismaService.inventoryLevel.findUnique
        .mockResolvedValueOnce(mockInventoryLevel)  // adjustInventory initial lookup
        .mockResolvedValueOnce(mockInventoryLevel)  // recordMovementInternal lookup
        .mockResolvedValueOnce(updatedLevel)        // updateAvailabilityStatus lookup
        .mockResolvedValueOnce(updatedLevel);       // final lookup for return
      mockPrismaService.inventoryLevel.update.mockResolvedValue(updatedLevel);
      mockPrismaService.inventoryMovement.create.mockResolvedValue({
        id: 'mov-123',
        movementNumber: 'MOV-001',
        type: InventoryMovementType.ADJUSTMENT_INCREASE,
        quantity: 100,
        previousQty: 100,
        newQty: 200,
        createdAt: new Date(),
      });

      const result = await service.adjustInventory(mockTenantId, {
        sku: mockSku,
        warehouseId: mockWarehouseId,
        adjustmentType: 'set',
        quantity: 200,
        reason: 'Cycle count',
      });

      expect(result.quantityOnHand).toBe(200);
    });
  });

  describe('listAlerts', () => {
    const mockAlert = {
      id: 'alert-123',
      alertType: InventoryAlertType.LOW_STOCK,
      severity: AlertSeverity.WARNING,
      status: AlertStatus.ACTIVE,
      title: 'Low Stock: SKU-001',
      message: 'Stock is low',
      threshold: 30,
      currentValue: 15,
      inventoryLevelId: mockInventoryLevel.id,
      tenantId: mockTenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryLevel: mockInventoryLevel,
    };

    it('should list alerts with filters', async () => {
      mockPrismaService.inventoryAlert.findMany.mockResolvedValue([mockAlert]);

      const result = await service.listAlerts(mockTenantId, {
        status: [AlertStatus.ACTIVE],
      });

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe(InventoryAlertType.LOW_STOCK);
    });
  });

  describe('acknowledgeAlert', () => {
    const mockAlert = {
      id: 'alert-123',
      alertType: InventoryAlertType.LOW_STOCK,
      severity: AlertSeverity.WARNING,
      status: AlertStatus.ACTIVE,
      title: 'Low Stock: SKU-001',
      message: 'Stock is low',
      inventoryLevelId: mockInventoryLevel.id,
      tenantId: mockTenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryLevel: mockInventoryLevel,
    };

    it('should acknowledge an alert', async () => {
      mockPrismaService.inventoryAlert.findFirst.mockResolvedValue(mockAlert);
      mockPrismaService.inventoryAlert.update.mockResolvedValue({
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      });

      const result = await service.acknowledgeAlert(mockTenantId, {
        alertId: mockAlert.id,
      });

      expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
    });

    it('should throw NotFoundException when alert not found', async () => {
      mockPrismaService.inventoryAlert.findFirst.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert(mockTenantId, {
          alertId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('startSyncJob', () => {
    const mockSyncJob = {
      id: 'job-123',
      jobType: InventorySyncJobType.FULL_SYNC,
      status: SyncJobStatus.PENDING,
      tenantId: mockTenantId,
      totalItems: 0,
      processedItems: 0,
      successCount: 0,
      errorCount: 0,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should start a sync job', async () => {
      mockPrismaService.inventorySyncJob.findFirst.mockResolvedValue(null);
      mockPrismaService.inventorySyncJob.create.mockResolvedValue(mockSyncJob);

      const result = await service.startSyncJob(mockTenantId, {
        jobType: InventorySyncJobType.FULL_SYNC,
      });

      expect(result.jobType).toBe(InventorySyncJobType.FULL_SYNC);
      expect(result.status).toBe(SyncJobStatus.PENDING);
    });

    it('should throw BadRequestException when sync already running', async () => {
      mockPrismaService.inventorySyncJob.findFirst.mockResolvedValue({
        ...mockSyncJob,
        status: SyncJobStatus.RUNNING,
      });

      await expect(
        service.startSyncJob(mockTenantId, {
          jobType: InventorySyncJobType.FULL_SYNC,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInventoryLevel', () => {
    it('should return inventory level for SKU and warehouse', async () => {
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);

      const result = await service.getInventoryLevel(
        mockTenantId,
        mockWarehouseId,
        mockSku,
      );

      expect(result).not.toBeNull();
      expect(result!.sku).toBe(mockSku);
      expect(result!.quantityOnHand).toBe(100);
    });

    it('should return null when not found', async () => {
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(null);

      const result = await service.getInventoryLevel(
        mockTenantId,
        mockWarehouseId,
        'NONEXISTENT',
      );

      expect(result).toBeNull();
    });
  });

  describe('listInventoryLevels', () => {
    it('should list inventory levels with pagination', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([mockInventoryLevel]);

      const result = await service.listInventoryLevels(mockTenantId, {
        page: 1,
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.inventoryLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by availability', async () => {
      mockPrismaService.inventoryLevel.findMany.mockResolvedValue([]);

      await service.listInventoryLevels(mockTenantId, {
        availability: [ProductAvailability.LOW_STOCK],
      });

      expect(mockPrismaService.inventoryLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            availability: { in: [ProductAvailability.LOW_STOCK] },
          }),
        }),
      );
    });
  });

  describe('bulkCreateReservations', () => {
    it('should create multiple reservations', async () => {
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);
      mockPrismaService.inventoryReservation.create.mockResolvedValue(mockReservation);
      mockPrismaService.inventoryLevel.update.mockResolvedValue(mockInventoryLevel);

      const result = await service.bulkCreateReservations(mockTenantId, {
        items: [
          { sku: 'SKU-001', quantity: 5, sourceType: 'order', sourceId: 'order-123' },
          { sku: 'SKU-002', quantity: 10, sourceType: 'order', sourceId: 'order-123' },
        ],
        sourceType: 'order',
        sourceId: 'order-123',
      });

      expect(result.reservations).toHaveLength(2);
      expect(result.success).toBe(true);
    });

    it('should report partial failures when failOnPartial is false', async () => {
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      // First item: lookup succeeds, then updateAvailabilityStatus also looks up
      // Second item: lookup returns null (not found)
      mockPrismaService.inventoryLevel.findUnique
        .mockResolvedValueOnce(mockInventoryLevel) // First item lookup
        .mockResolvedValueOnce(mockInventoryLevel) // updateAvailabilityStatus lookup
        .mockResolvedValueOnce(null); // Second item lookup (not found)
      mockPrismaService.inventoryReservation.create.mockResolvedValue(mockReservation);
      mockPrismaService.inventoryLevel.update.mockResolvedValue(mockInventoryLevel);

      const result = await service.bulkCreateReservations(mockTenantId, {
        items: [
          { sku: 'SKU-001', quantity: 5, sourceType: 'order', sourceId: 'order-123' },
          { sku: 'SKU-MISSING', quantity: 10, sourceType: 'order', sourceId: 'order-123' },
        ],
        sourceType: 'order',
        sourceId: 'order-123',
        failOnPartial: false,
      });

      expect(result.partialSuccess).toBe(true);
      expect(result.failures).toHaveLength(1);
      expect(result.reservations).toHaveLength(1);
    });
  });

  describe('processExternalInventoryData', () => {
    it('should update existing inventory levels', async () => {
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(mockInventoryLevel);
      mockPrismaService.inventoryLevel.update.mockResolvedValue(mockInventoryLevel);

      const summary = await service.processExternalInventoryData(
        mockTenantId,
        mockWarehouseId,
        [
          {
            sku: mockSku,
            quantityOnHand: 150,
          },
        ],
      );

      expect(summary.updated).toBe(1);
      expect(summary.created).toBe(0);
    });

    it('should create new inventory levels', async () => {
      mockPrismaService.inventoryLevel.findUnique.mockResolvedValue(null);
      mockPrismaService.masterProduct.findFirst.mockResolvedValue(null);
      mockPrismaService.inventoryLevel.create.mockResolvedValue(mockInventoryLevel);

      const summary = await service.processExternalInventoryData(
        mockTenantId,
        mockWarehouseId,
        [
          {
            sku: 'NEW-SKU',
            quantityOnHand: 100,
          },
        ],
      );

      expect(summary.created).toBe(1);
      expect(summary.updated).toBe(0);
    });
  });
});
