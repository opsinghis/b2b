import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { PaymentMethod, UserRole, Prisma } from '@prisma/client';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, ListPaymentMethodsQueryDto } from './dto';

export type PaymentMethodWithAccess = PaymentMethod & {
  userTypeAccess: { userRole: UserRole }[];
};

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available payment methods for a user
   */
  async findAvailable(
    tenantId: string,
    userRole: UserRole,
    orderAmount?: number,
  ): Promise<PaymentMethodWithAccess[]> {
    const methods = await this.prisma.paymentMethod.findMany({
      where: {
        tenantId,
        isActive: true,
        userTypeAccess: {
          some: {
            userRole,
          },
        },
      },
      include: {
        userTypeAccess: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Filter by amount if provided
    if (orderAmount !== undefined) {
      return methods.filter((method) => {
        const minOk = !method.minAmount || orderAmount >= method.minAmount.toNumber();
        const maxOk = !method.maxAmount || orderAmount <= method.maxAmount.toNumber();
        return minOk && maxOk;
      });
    }

    return methods;
  }

  /**
   * Get all payment methods (admin)
   */
  async findAll(
    tenantId: string,
    query: ListPaymentMethodsQueryDto,
  ): Promise<PaymentMethodWithAccess[]> {
    const where: Prisma.PaymentMethodWhereInput = { tenantId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.type) {
      where.type = query.type;
    }

    return this.prisma.paymentMethod.findMany({
      where,
      include: {
        userTypeAccess: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get payment method by ID
   */
  async findOne(id: string, tenantId: string): Promise<PaymentMethodWithAccess> {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, tenantId },
      include: {
        userTypeAccess: true,
      },
    });

    if (!method) {
      throw new NotFoundException(`Payment method '${id}' not found`);
    }

    return method;
  }

  /**
   * Create payment method (admin)
   */
  async create(dto: CreatePaymentMethodDto, tenantId: string): Promise<PaymentMethodWithAccess> {
    // Check for duplicate code
    const existing = await this.prisma.paymentMethod.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Payment method with code '${dto.code}' already exists`);
    }

    const method = await this.prisma.paymentMethod.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount,
        processingFee: dto.processingFee ?? 0,
        processingFeePercent: dto.processingFeePercent ?? 0,
        config: (dto.config || {}) as Prisma.InputJsonValue,
        userTypeAccess: dto.allowedUserRoles?.length
          ? {
              create: dto.allowedUserRoles.map((role) => ({ userRole: role })),
            }
          : undefined,
      },
      include: {
        userTypeAccess: true,
      },
    });

    this.logger.log(`Created payment method ${method.code} for tenant ${tenantId}`);

    return method;
  }

  /**
   * Update payment method (admin)
   */
  async update(
    id: string,
    dto: UpdatePaymentMethodDto,
    tenantId: string,
  ): Promise<PaymentMethodWithAccess> {
    await this.findOne(id, tenantId);

    // Update user role access if provided
    if (dto.allowedUserRoles !== undefined) {
      await this.prisma.paymentMethodUserType.deleteMany({
        where: { paymentMethodId: id },
      });
    }

    const method = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount,
        processingFee: dto.processingFee,
        processingFeePercent: dto.processingFeePercent,
        config: dto.config as Prisma.InputJsonValue | undefined,
        userTypeAccess:
          dto.allowedUserRoles !== undefined
            ? {
                create: dto.allowedUserRoles.map((role) => ({ userRole: role })),
              }
            : undefined,
      },
      include: {
        userTypeAccess: true,
      },
    });

    this.logger.log(`Updated payment method ${id}`);

    return method;
  }

  /**
   * Delete payment method (admin)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);

    // Check if method has been used in payments
    const paymentCount = await this.prisma.payment.count({
      where: { paymentMethodId: id },
    });

    if (paymentCount > 0) {
      throw new ConflictException(
        'Cannot delete payment method that has been used for payments. Deactivate it instead.',
      );
    }

    await this.prisma.paymentMethod.delete({
      where: { id },
    });

    this.logger.log(`Deleted payment method ${id}`);
  }
}
