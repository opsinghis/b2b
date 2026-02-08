import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
  O2COrderData,
  O2COrderItem,
  O2CAddress,
} from '../../interfaces';

/**
 * Order Sync Step - Syncs order to external ERP system
 */
@Injectable()
export class O2COrderSyncStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.ORDER_SYNC;
  private readonly logger = new Logger(O2COrderSyncStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Executing order sync for order ${flow.orderId}`);

    try {
      // Load order from database
      const order = await this.prisma.order.findUnique({
        where: { id: flow.orderId },
        include: {
          items: {
            orderBy: { lineNumber: 'asc' },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!order) {
        return {
          success: false,
          error: `Order not found: ${flow.orderId}`,
          errorCode: 'ORDER_NOT_FOUND',
          retryable: false,
        };
      }

      // Populate flow with order data
      const orderData: O2COrderData = this.mapOrderToO2CData(order);
      flow.orderData = orderData;
      flow.orderNumber = order.orderNumber;

      // If connector is configured, sync to external system
      if (context.connectorContext) {
        const syncResult = await this.syncToExternalSystem(flow, context);
        if (!syncResult.success) {
          return syncResult;
        }
        flow.externalOrderId = syncResult.output?.externalOrderId as string;
      } else {
        // No connector configured - just mark as synced locally
        this.logger.log(`No ERP connector configured, order synced locally`);
      }

      return {
        success: true,
        output: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          externalOrderId: flow.externalOrderId,
          total: orderData.total,
          currency: orderData.currency,
          itemCount: orderData.items.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Order sync failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'ORDER_SYNC_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return !!flow.orderId;
  }

  canRetry(error: string, attempt: number): boolean {
    // Don't retry if order not found
    if (error.includes('ORDER_NOT_FOUND')) {
      return false;
    }
    return attempt < 3;
  }

  private mapOrderToO2CData(order: any): O2COrderData {
    const shippingAddr = (order.shippingAddress as any) || {};
    const billingAddr = (order.billingAddress as any) || {};

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerId: order.userId,
      customerEmail: order.user?.email,
      customerName: order.user
        ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim()
        : undefined,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount) + Number(order.couponDiscount),
      tax: Number(order.tax),
      shipping: 0, // Add shipping cost field if available
      total: Number(order.total),
      currency: order.currency,
      shippingAddress: this.mapAddress(shippingAddr),
      billingAddress: this.mapAddress(billingAddr),
      items: order.items.map((item: any) => this.mapOrderItem(item)),
      createdAt: order.createdAt,
      requestedDeliveryDate: order.estimatedDelivery,
      poNumber: (order.metadata as any)?.poNumber,
      contractId: (order.metadata as any)?.contractId,
      metadata: order.metadata as Record<string, unknown>,
    };
  }

  private mapAddress(addr: any): O2CAddress {
    return {
      name: addr.name,
      company: addr.company,
      street1: addr.street1 || addr.address1 || '',
      street2: addr.street2 || addr.address2,
      city: addr.city || '',
      state: addr.state || addr.province,
      postalCode: addr.postalCode || addr.zipCode || addr.zip || '',
      country: addr.country || '',
      phone: addr.phone,
      email: addr.email,
    };
  }

  private mapOrderItem(item: any): O2COrderItem {
    return {
      lineNumber: item.lineNumber,
      productId: item.masterProductId,
      sku: item.productSku || '',
      name: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      tax: 0, // Line-level tax if available
      total: Number(item.total),
      uom: (item.metadata as any)?.uom || 'EA',
      metadata: item.metadata as Record<string, unknown>,
    };
  }

  private async syncToExternalSystem(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    // This would call the connector service to sync to ERP
    // For now, simulate successful sync
    this.logger.log(`Syncing order ${flow.orderNumber} to external ERP`);

    // Simulated external order ID
    const externalOrderId = `ERP-${Date.now()}-${flow.orderId.slice(0, 8)}`;

    return {
      success: true,
      output: {
        externalOrderId,
        syncedAt: new Date().toISOString(),
      },
    };
  }
}
