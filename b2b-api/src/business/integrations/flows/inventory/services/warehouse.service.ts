import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Prisma, WarehouseType } from '@prisma/client';
import { IWarehouseService, WarehouseDTO, ListWarehouseOptions } from '../interfaces';

@Injectable()
export class WarehouseService implements IWarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: WarehouseDTO): Promise<WarehouseDTO> {
    this.logger.log(`Creating warehouse ${data.code} for tenant ${tenantId}`);

    // Check for duplicate code
    const existing = await this.prisma.warehouse.findUnique({
      where: {
        tenantId_code: { tenantId, code: data.code },
      },
    });

    if (existing) {
      throw new ConflictException(`Warehouse with code ${data.code} already exists`);
    }

    // If this is the first warehouse or marked as default, handle default flag
    if (data.isDefault) {
      await this.clearDefaultWarehouse(tenantId);
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        type: data.type || WarehouseType.STANDARD,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        address: (data.address || {}) as unknown as Prisma.InputJsonValue,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone || 'UTC',
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        safetyStockDays: data.safetyStockDays ?? 3,
        leadTimeDays: data.leadTimeDays ?? 2,
        cutoffTime: data.cutoffTime,
        operatingDays: data.operatingDays ?? [1, 2, 3, 4, 5],
        externalId: data.externalId,
        externalSystem: data.externalSystem,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
        tenantId,
      },
    });

    this.logger.log(`Created warehouse ${warehouse.id}`);

    return this.mapToDTO(warehouse);
  }

  async update(
    tenantId: string,
    warehouseId: string,
    data: Partial<WarehouseDTO>,
  ): Promise<WarehouseDTO> {
    const existing = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Warehouse not found');
    }

    // If changing code, check for conflicts
    if (data.code && data.code !== existing.code) {
      const conflict = await this.prisma.warehouse.findUnique({
        where: {
          tenantId_code: { tenantId, code: data.code },
        },
      });

      if (conflict) {
        throw new ConflictException(`Warehouse with code ${data.code} already exists`);
      }
    }

    // Handle default flag
    if (data.isDefault && !existing.isDefault) {
      await this.clearDefaultWarehouse(tenantId);
    }

    const warehouse = await this.prisma.warehouse.update({
      where: { id: warehouseId },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        type: data.type,
        isActive: data.isActive,
        isDefault: data.isDefault,
        address: data.address as Prisma.InputJsonValue | undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        safetyStockDays: data.safetyStockDays,
        leadTimeDays: data.leadTimeDays,
        cutoffTime: data.cutoffTime,
        operatingDays: data.operatingDays,
        externalId: data.externalId,
        externalSystem: data.externalSystem,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return this.mapToDTO(warehouse);
  }

  async getById(tenantId: string, warehouseId: string): Promise<WarehouseDTO | null> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId, deletedAt: null },
    });

    if (!warehouse) return null;

    return this.mapToDTO(warehouse);
  }

  async getByCode(tenantId: string, code: string): Promise<WarehouseDTO | null> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { code, tenantId, deletedAt: null },
    });

    if (!warehouse) return null;

    return this.mapToDTO(warehouse);
  }

  async list(tenantId: string, options: ListWarehouseOptions = {}): Promise<WarehouseDTO[]> {
    const where: Prisma.WarehouseWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.type) {
      where.type = options.type;
    }

    const { page = 1, limit = 50 } = options;

    const warehouses = await this.prisma.warehouse.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return warehouses.map((w) => this.mapToDTO(w));
  }

  async getDefault(tenantId: string): Promise<WarehouseDTO | null> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true, isActive: true, deletedAt: null },
    });

    if (!warehouse) return null;

    return this.mapToDTO(warehouse);
  }

  async setDefault(tenantId: string, warehouseId: string): Promise<WarehouseDTO> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId, deletedAt: null },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    await this.clearDefaultWarehouse(tenantId);

    const updated = await this.prisma.warehouse.update({
      where: { id: warehouseId },
      data: { isDefault: true },
    });

    this.logger.log(`Set warehouse ${warehouseId} as default for tenant ${tenantId}`);

    return this.mapToDTO(updated);
  }

  async delete(tenantId: string, warehouseId: string): Promise<void> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId, deletedAt: null },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Check if there are inventory levels in this warehouse
    const inventoryCount = await this.prisma.inventoryLevel.count({
      where: { warehouseId },
    });

    if (inventoryCount > 0) {
      throw new ConflictException(
        `Cannot delete warehouse with ${inventoryCount} inventory records. ` +
          'Transfer or delete inventory first.',
      );
    }

    // Soft delete
    await this.prisma.warehouse.update({
      where: { id: warehouseId },
      data: { deletedAt: new Date(), isActive: false },
    });

    this.logger.log(`Deleted warehouse ${warehouseId}`);
  }

  private async clearDefaultWarehouse(tenantId: string): Promise<void> {
    await this.prisma.warehouse.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private mapToDTO(warehouse: any): WarehouseDTO {
    return {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      description: warehouse.description || undefined,
      type: warehouse.type,
      isActive: warehouse.isActive,
      isDefault: warehouse.isDefault,
      address: warehouse.address as any,
      latitude: warehouse.latitude ? Number(warehouse.latitude) : undefined,
      longitude: warehouse.longitude ? Number(warehouse.longitude) : undefined,
      timezone: warehouse.timezone,
      contactName: warehouse.contactName || undefined,
      contactEmail: warehouse.contactEmail || undefined,
      contactPhone: warehouse.contactPhone || undefined,
      safetyStockDays: warehouse.safetyStockDays,
      leadTimeDays: warehouse.leadTimeDays,
      cutoffTime: warehouse.cutoffTime || undefined,
      operatingDays: warehouse.operatingDays,
      externalId: warehouse.externalId || undefined,
      externalSystem: warehouse.externalSystem || undefined,
      metadata: warehouse.metadata as Record<string, unknown>,
    };
  }
}
