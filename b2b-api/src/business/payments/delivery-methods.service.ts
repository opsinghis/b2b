import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { DeliveryMethod, Prisma } from '@prisma/client';
import {
  CreateDeliveryMethodDto,
  UpdateDeliveryMethodDto,
  ListDeliveryMethodsQueryDto,
} from './dto';

@Injectable()
export class DeliveryMethodsService {
  private readonly logger = new Logger(DeliveryMethodsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available delivery methods
   */
  async findAvailable(tenantId: string): Promise<DeliveryMethod[]> {
    return this.prisma.deliveryMethod.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get all delivery methods (admin)
   */
  async findAll(tenantId: string, query: ListDeliveryMethodsQueryDto): Promise<DeliveryMethod[]> {
    const where: Prisma.DeliveryMethodWhereInput = { tenantId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.deliveryMethod.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get delivery method by ID
   */
  async findOne(id: string, tenantId: string): Promise<DeliveryMethod> {
    const method = await this.prisma.deliveryMethod.findFirst({
      where: { id, tenantId },
    });

    if (!method) {
      throw new NotFoundException(`Delivery method '${id}' not found`);
    }

    return method;
  }

  /**
   * Create delivery method (admin)
   */
  async create(dto: CreateDeliveryMethodDto, tenantId: string): Promise<DeliveryMethod> {
    // Check for duplicate code
    const existing = await this.prisma.deliveryMethod.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Delivery method with code '${dto.code}' already exists`);
    }

    const method = await this.prisma.deliveryMethod.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        minDays: dto.minDays,
        maxDays: dto.maxDays,
        baseCost: dto.baseCost ?? 0,
        freeThreshold: dto.freeThreshold,
        config: (dto.config || {}) as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Created delivery method ${method.code} for tenant ${tenantId}`);

    return method;
  }

  /**
   * Update delivery method (admin)
   */
  async update(
    id: string,
    dto: UpdateDeliveryMethodDto,
    tenantId: string,
  ): Promise<DeliveryMethod> {
    await this.findOne(id, tenantId);

    const method = await this.prisma.deliveryMethod.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
        minDays: dto.minDays,
        maxDays: dto.maxDays,
        baseCost: dto.baseCost,
        freeThreshold: dto.freeThreshold,
        config: dto.config as Prisma.InputJsonValue | undefined,
      },
    });

    this.logger.log(`Updated delivery method ${id}`);

    return method;
  }

  /**
   * Delete delivery method (admin)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);

    await this.prisma.deliveryMethod.delete({
      where: { id },
    });

    this.logger.log(`Deleted delivery method ${id}`);
  }

  /**
   * Calculate delivery cost
   */
  calculateCost(method: DeliveryMethod, orderTotal: number): number {
    // Free if order exceeds threshold
    if (method.freeThreshold && orderTotal >= method.freeThreshold.toNumber()) {
      return 0;
    }

    return method.baseCost.toNumber();
  }
}
