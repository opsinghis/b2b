import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { OrderStatus } from '@prisma/client';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
  InvoiceStatus,
} from '../../interfaces';

/**
 * Order Completion Step - Final step to complete the O2C flow
 */
@Injectable()
export class O2COrderCompletionStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.ORDER_COMPLETION;
  private readonly logger = new Logger(O2COrderCompletionStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Completing O2C flow for order ${flow.orderNumber}`);

    try {
      // Determine final order status
      const finalStatus = this.determineFinalStatus(flow);

      // Update order with final status and all metadata
      const order = await this.prisma.order.update({
        where: { id: flow.orderId },
        data: {
          status: finalStatus,
          deliveredAt: finalStatus === OrderStatus.DELIVERED ? new Date() : undefined,
          metadata: {
            ...((await this.getOrderMetadata(flow.orderId)) || {}),
            o2cFlowId: flow.id,
            o2cFlowCompletedAt: new Date().toISOString(),
            externalOrderId: flow.externalOrderId,
            externalInvoiceId: flow.externalInvoiceId,
            externalShipmentId: flow.externalShipmentId,
            externalPaymentId: flow.externalPaymentId,
            invoiceNumber: flow.invoiceData?.invoiceNumber,
            trackingNumber: flow.shipmentData?.trackingNumber,
            paymentStatus: flow.paymentData?.status,
          },
        },
      });

      // Update flow order data
      flow.orderData.status = finalStatus;

      return {
        success: true,
        output: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          finalStatus,
          invoiceStatus: flow.invoiceData?.status,
          paymentStatus: flow.paymentData?.status,
          completedAt: new Date().toISOString(),
          summary: this.generateFlowSummary(flow),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Order completion failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'ORDER_COMPLETION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return true; // Always can attempt completion
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private determineFinalStatus(flow: O2CFlowInstance): OrderStatus {
    // If payment is complete and shipment delivered
    if (
      flow.invoiceData?.status === InvoiceStatus.PAID &&
      flow.shipmentData?.status === 'delivered'
    ) {
      return OrderStatus.DELIVERED;
    }

    // If shipped but payment pending
    if (flow.shipmentData?.status === 'shipped') {
      return OrderStatus.SHIPPED;
    }

    // If processing
    if (flow.orderData.status === 'PROCESSING') {
      return OrderStatus.PROCESSING;
    }

    // Default to confirmed
    return OrderStatus.CONFIRMED;
  }

  private async getOrderMetadata(orderId: string): Promise<Record<string, unknown> | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { metadata: true },
    });
    return order?.metadata as Record<string, unknown> | null;
  }

  private generateFlowSummary(flow: O2CFlowInstance): Record<string, unknown> {
    const completedSteps = flow.steps.filter((s) => s.status === 'completed');
    const failedSteps = flow.steps.filter((s) => s.status === 'failed');
    const totalDuration = flow.steps.reduce((sum, s) => sum + (s.durationMs || 0), 0);

    return {
      totalSteps: flow.steps.length,
      completedSteps: completedSteps.length,
      failedSteps: failedSteps.length,
      totalDurationMs: totalDuration,
      order: {
        orderNumber: flow.orderNumber,
        externalOrderId: flow.externalOrderId,
        total: flow.orderData.total,
        currency: flow.orderData.currency,
        itemCount: flow.orderData.items.length,
      },
      shipment: flow.shipmentData
        ? {
            carrier: flow.shipmentData.carrier,
            trackingNumber: flow.shipmentData.trackingNumber,
            asnNumber: flow.shipmentData.asnNumber,
          }
        : null,
      invoice: flow.invoiceData
        ? {
            invoiceNumber: flow.invoiceData.invoiceNumber,
            total: flow.invoiceData.total,
            status: flow.invoiceData.status,
          }
        : null,
      payment: flow.paymentData
        ? {
            amount: flow.paymentData.amount,
            status: flow.paymentData.status,
            method: flow.paymentData.method,
            transactionId: flow.paymentData.transactionId,
          }
        : null,
    };
  }
}
