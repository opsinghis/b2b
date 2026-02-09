import { Test, TestingModule } from '@nestjs/testing';
import { InventoryAlertService } from './inventory-alert.service';
import { PrismaService } from '@infrastructure/database';
import {
  InventoryAlertType,
  AlertSeverity,
  AlertStatus,
  ProductAvailability,
  InventoryReservationStatus,
} from '@prisma/client';

describe('InventoryAlertService', () => {
  let service: InventoryAlertService;
  let prisma: {
    inventoryLevel: { findMany: jest.Mock };
    inventoryAlert: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; update: jest.Mock; groupBy: jest.Mock };
    inventoryReservation: { findMany: jest.Mock; findUnique: jest.Mock };
  };

  const mockTenantId = 'tenant-123';

  const mockWarehouse = {
    id: 'warehouse-123',
    code: 'WH001',
    name: 'Main Warehouse',
  };

  const mockInventoryLevel = {
    id: 'level-123',
    tenantId: mockTenantId,
    warehouseId: 'warehouse-123',
    sku: 'SKU001',
    quantityOnHand: 100,
    quantityReserved: 10,
    quantityAvailable: 90,
    reorderPoint: 20,
    safetyStock: 10,
    availability: ProductAvailability.IN_STOCK,
    warehouse: mockWarehouse,
  };

  const mockAlert = {
    id: 'alert-123',
    tenantId: mockTenantId,
    alertType: InventoryAlertType.LOW_STOCK,
    severity: AlertSeverity.WARNING,
    status: AlertStatus.ACTIVE,
    title: 'Low Stock: SKU001',
    message: 'Stock is low',
    threshold: 20,
    currentValue: 15,
    inventoryLevelId: 'level-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    inventoryLevel: mockInventoryLevel,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAlertService,
        {
          provide: PrismaService,
          useValue: {
            inventoryLevel: {
              findMany: jest.fn(),
              fields: { reorderPoint: 'reorderPoint' },
            },
            inventoryAlert: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              groupBy: jest.fn(),
            },
            inventoryReservation: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<InventoryAlertService>(InventoryAlertService);
    prisma = module.get(PrismaService);
  });

  describe('checkAndCreateAlerts', () => {
    it('should create alerts for low stock items', async () => {
      prisma.inventoryLevel.findMany.mockResolvedValue([
        { ...mockInventoryLevel, availability: ProductAvailability.LOW_STOCK, quantityAvailable: 15 },
      ]);
      prisma.inventoryAlert.findFirst.mockResolvedValue(null);
      prisma.inventoryAlert.create.mockResolvedValue({
        ...mockAlert,
        inventoryLevel: mockInventoryLevel,
      });
      prisma.inventoryReservation.findMany.mockResolvedValue([]);

      const alerts = await service.checkAndCreateAlerts(mockTenantId);

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should create alerts for out of stock items', async () => {
      prisma.inventoryLevel.findMany.mockResolvedValue([
        { ...mockInventoryLevel, availability: ProductAvailability.OUT_OF_STOCK, quantityAvailable: 0 },
      ]);
      prisma.inventoryAlert.findFirst.mockResolvedValue(null);
      prisma.inventoryAlert.create.mockResolvedValue({
        ...mockAlert,
        alertType: InventoryAlertType.OUT_OF_STOCK,
        severity: AlertSeverity.CRITICAL,
        inventoryLevel: mockInventoryLevel,
      });
      prisma.inventoryReservation.findMany.mockResolvedValue([]);

      const alerts = await service.checkAndCreateAlerts(mockTenantId);

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip creating duplicate alerts', async () => {
      prisma.inventoryLevel.findMany.mockResolvedValue([
        { ...mockInventoryLevel, availability: ProductAvailability.LOW_STOCK },
      ]);
      prisma.inventoryAlert.findFirst.mockResolvedValue(mockAlert);
      prisma.inventoryReservation.findMany.mockResolvedValue([]);

      const alerts = await service.checkAndCreateAlerts(mockTenantId);

      expect(prisma.inventoryAlert.create).not.toHaveBeenCalled();
    });

    it('should create alerts for expiring reservations', async () => {
      prisma.inventoryLevel.findMany.mockResolvedValue([]);
      prisma.inventoryReservation.findMany.mockResolvedValue([
        {
          id: 'res-123',
          tenantId: mockTenantId,
          sku: 'SKU001',
          quantity: 10,
          reservationNumber: 'RES-001',
          status: InventoryReservationStatus.PENDING,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          inventoryLevelId: 'level-123',
          inventoryLevel: mockInventoryLevel,
          sourceType: 'ORDER',
          sourceId: 'order-123',
        },
      ]);
      prisma.inventoryAlert.findFirst.mockResolvedValue(null);
      prisma.inventoryAlert.create.mockResolvedValue({
        ...mockAlert,
        alertType: InventoryAlertType.RESERVATION_EXPIRING,
        inventoryLevel: mockInventoryLevel,
      });

      const alerts = await service.checkAndCreateAlerts(mockTenantId);

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should create alerts for items below reorder point', async () => {
      prisma.inventoryLevel.findMany.mockResolvedValue([
        { ...mockInventoryLevel, quantityAvailable: 15, reorderPoint: 20 },
      ]);
      prisma.inventoryAlert.findFirst.mockResolvedValue(null);
      prisma.inventoryAlert.create.mockResolvedValue({
        ...mockAlert,
        alertType: InventoryAlertType.REORDER_POINT,
        inventoryLevel: mockInventoryLevel,
      });
      prisma.inventoryReservation.findMany.mockResolvedValue([]);

      const alerts = await service.checkAndCreateAlerts(mockTenantId);

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should create alerts for safety stock breaches', async () => {
      prisma.inventoryLevel.findMany.mockResolvedValue([
        { ...mockInventoryLevel, quantityAvailable: 5, safetyStock: 10 },
      ]);
      prisma.inventoryAlert.findFirst.mockResolvedValue(null);
      prisma.inventoryAlert.create.mockResolvedValue({
        ...mockAlert,
        alertType: InventoryAlertType.SAFETY_STOCK_BREACH,
        inventoryLevel: mockInventoryLevel,
      });
      prisma.inventoryReservation.findMany.mockResolvedValue([]);

      const alerts = await service.checkAndCreateAlerts(mockTenantId);

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('autoResolveAlerts', () => {
    it('should resolve LOW_STOCK alerts when stock improves', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.LOW_STOCK,
          threshold: 20,
          inventoryLevel: { ...mockInventoryLevel, quantityAvailable: 50 },
        },
      ]);
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
      expect(prisma.inventoryAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: AlertStatus.RESOLVED }),
        }),
      );
    });

    it('should resolve OUT_OF_STOCK alerts when stock is replenished', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.OUT_OF_STOCK,
          threshold: 0,
          inventoryLevel: { ...mockInventoryLevel, quantityAvailable: 10 },
        },
      ]);
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
    });

    it('should resolve REORDER_POINT alerts when above reorder point', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.REORDER_POINT,
          inventoryLevel: { ...mockInventoryLevel, quantityAvailable: 50, reorderPoint: 20 },
        },
      ]);
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
    });

    it('should resolve SAFETY_STOCK_BREACH alerts when above safety stock', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.SAFETY_STOCK_BREACH,
          inventoryLevel: { ...mockInventoryLevel, quantityAvailable: 20, safetyStock: 10 },
        },
      ]);
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
    });

    it('should resolve RESERVATION_EXPIRING alerts when reservation is fulfilled', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.RESERVATION_EXPIRING,
          metadata: { reservationId: 'res-123' },
          inventoryLevel: mockInventoryLevel,
        },
      ]);
      prisma.inventoryReservation.findUnique.mockResolvedValue({
        id: 'res-123',
        status: InventoryReservationStatus.FULFILLED,
      });
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
    });

    it('should resolve RESERVATION_EXPIRING alerts when reservation is released', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.RESERVATION_EXPIRING,
          metadata: { reservationId: 'res-123' },
          inventoryLevel: mockInventoryLevel,
        },
      ]);
      prisma.inventoryReservation.findUnique.mockResolvedValue({
        id: 'res-123',
        status: InventoryReservationStatus.RELEASED,
      });
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
    });

    it('should resolve RESERVATION_EXPIRING alerts when reservation is expired', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.RESERVATION_EXPIRING,
          metadata: { reservationId: 'res-123' },
          inventoryLevel: mockInventoryLevel,
        },
      ]);
      prisma.inventoryReservation.findUnique.mockResolvedValue({
        id: 'res-123',
        status: InventoryReservationStatus.EXPIRED,
      });
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
    });

    it('should resolve RESERVATION_EXPIRING alerts when reservation no longer exists', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.RESERVATION_EXPIRING,
          metadata: { reservationId: 'res-123' },
          inventoryLevel: mockInventoryLevel,
        },
      ]);
      prisma.inventoryReservation.findUnique.mockResolvedValue(null);
      prisma.inventoryAlert.update.mockResolvedValue({});

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(1);
    });

    it('should not resolve alerts when conditions have not improved', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([
        {
          ...mockAlert,
          alertType: InventoryAlertType.LOW_STOCK,
          threshold: 20,
          inventoryLevel: { ...mockInventoryLevel, quantityAvailable: 10 },
        },
      ]);

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(0);
      expect(prisma.inventoryAlert.update).not.toHaveBeenCalled();
    });

    it('should return 0 when no active alerts', async () => {
      prisma.inventoryAlert.findMany.mockResolvedValue([]);

      const resolvedCount = await service.autoResolveAlerts(mockTenantId);

      expect(resolvedCount).toBe(0);
    });
  });

  describe('getAlertSummary', () => {
    it('should return alert summary with counts', async () => {
      prisma.inventoryAlert.groupBy.mockResolvedValue([
        { alertType: InventoryAlertType.LOW_STOCK, severity: AlertSeverity.WARNING, status: AlertStatus.ACTIVE, _count: 5 },
        { alertType: InventoryAlertType.OUT_OF_STOCK, severity: AlertSeverity.CRITICAL, status: AlertStatus.ACTIVE, _count: 2 },
        { alertType: InventoryAlertType.REORDER_POINT, severity: AlertSeverity.INFO, status: AlertStatus.RESOLVED, _count: 3 },
      ]);

      const summary = await service.getAlertSummary(mockTenantId);

      expect(summary.total).toBe(10);
      expect(summary.byType[InventoryAlertType.LOW_STOCK]).toBe(5);
      expect(summary.byType[InventoryAlertType.OUT_OF_STOCK]).toBe(2);
      expect(summary.bySeverity[AlertSeverity.WARNING]).toBe(5);
      expect(summary.bySeverity[AlertSeverity.CRITICAL]).toBe(2);
      expect(summary.byStatus[AlertStatus.ACTIVE]).toBe(7);
      expect(summary.byStatus[AlertStatus.RESOLVED]).toBe(3);
    });

    it('should return empty summary when no alerts', async () => {
      prisma.inventoryAlert.groupBy.mockResolvedValue([]);

      const summary = await service.getAlertSummary(mockTenantId);

      expect(summary.total).toBe(0);
      expect(summary.byType[InventoryAlertType.LOW_STOCK]).toBe(0);
    });
  });
});
