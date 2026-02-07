import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Payment, PaymentStatus, OrderStatus, UserRole, Prisma } from '@prisma/client';
import { ProcessPaymentDto } from './dto';
import { PaymentMethodsService } from './payment-methods.service';

export type PaymentWithMethod = Payment & {
  paymentMethod: {
    id: string;
    code: string;
    name: string;
    type: import('@prisma/client').PaymentMethodType;
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  /**
   * Process payment for an order
   */
  async processPayment(
    orderId: string,
    dto: ProcessPaymentDto,
    tenantId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<PaymentWithMethod> {
    // Get order
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    // Validate order status
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot process payment for order in '${order.status}' status`,
      );
    }

    // Check if order already has a completed payment
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        status: PaymentStatus.COMPLETED,
      },
    });

    if (existingPayment) {
      throw new BadRequestException('Order already has a completed payment');
    }

    // Validate payment method
    const paymentMethod = await this.paymentMethodsService.findOne(
      dto.paymentMethodId,
      tenantId,
    );

    // Check if user role can use this payment method
    const allowedRoles = paymentMethod.userTypeAccess.map((a) => a.userRole);
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      throw new ForbiddenException('You are not allowed to use this payment method');
    }

    // Check amount limits
    const orderTotal = order.total.toNumber();
    if (paymentMethod.minAmount && orderTotal < paymentMethod.minAmount.toNumber()) {
      throw new BadRequestException(
        `Order total is below minimum amount for this payment method`,
      );
    }
    if (paymentMethod.maxAmount && orderTotal > paymentMethod.maxAmount.toNumber()) {
      throw new BadRequestException(
        `Order total exceeds maximum amount for this payment method`,
      );
    }

    // Generate payment number
    const paymentNumber = await this.generatePaymentNumber(tenantId);

    // Calculate processing fee
    const processingFee =
      paymentMethod.processingFee.toNumber() +
      (orderTotal * paymentMethod.processingFeePercent.toNumber()) / 100;

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber,
        tenantId,
        orderId,
        userId,
        paymentMethodId: paymentMethod.id,
        amount: orderTotal + processingFee,
        currency: order.currency,
        status: PaymentStatus.PROCESSING,
        externalRef: dto.externalRef,
        metadata: {
          ...(dto.metadata || {}),
          processingFee,
          orderTotal,
        } as Prisma.InputJsonValue,
      },
      include: {
        paymentMethod: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Simulate payment processing
    // In production, this would integrate with actual payment gateways
    const processedPayment = await this.simulatePaymentProcessing(payment);

    // Update order status if payment successful
    if (processedPayment.status === PaymentStatus.COMPLETED) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Processed payment ${paymentNumber} for order ${order.orderNumber}: ${processedPayment.status}`,
    );

    return processedPayment;
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(
    tenantId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ payments: PaymentWithMethod[]; total: number }> {
    const where: Prisma.PaymentWhereInput = {
      tenantId,
      userId,
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          paymentMethod: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  /**
   * Get payment by ID
   */
  async findOne(id: string, tenantId: string, userId?: string): Promise<PaymentWithMethod> {
    const where: Prisma.PaymentWhereInput = { id, tenantId };
    if (userId) {
      where.userId = userId;
    }

    const payment = await this.prisma.payment.findFirst({
      where,
      include: {
        paymentMethod: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment '${id}' not found`);
    }

    return payment;
  }

  /**
   * Get payments for an order
   */
  async findByOrder(orderId: string, tenantId: string): Promise<PaymentWithMethod[]> {
    return this.prisma.payment.findMany({
      where: {
        orderId,
        tenantId,
      },
      include: {
        paymentMethod: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private async generatePaymentNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;

    const lastPayment = await this.prisma.payment.findFirst({
      where: {
        tenantId,
        paymentNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        paymentNumber: 'desc',
      },
      select: {
        paymentNumber: true,
      },
    });

    let sequence = 1;
    if (lastPayment) {
      const lastSequence = parseInt(lastPayment.paymentNumber.replace(prefix, ''), 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }

  private async simulatePaymentProcessing(
    payment: PaymentWithMethod,
  ): Promise<PaymentWithMethod> {
    // Simulate a successful payment
    // In production, this would call actual payment gateway APIs
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        processedAt: new Date(),
      },
      include: {
        paymentMethod: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return updatedPayment;
  }
}
