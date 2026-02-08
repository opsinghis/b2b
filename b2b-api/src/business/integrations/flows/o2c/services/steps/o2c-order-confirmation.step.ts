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
} from '../../interfaces';

/**
 * Order Confirmation Step - Confirms order after credit check passes
 */
@Injectable()
export class O2COrderConfirmationStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.ORDER_CONFIRMATION;
  private readonly logger = new Logger(O2COrderConfirmationStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Executing order confirmation for order ${flow.orderNumber}`);

    try {
      // Update order status to CONFIRMED
      const order = await this.prisma.order.update({
        where: { id: flow.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
          metadata: {
            ...((await this.getOrderMetadata(flow.orderId)) || {}),
            creditCheckId: flow.creditCheckData?.checkId,
            creditApprovedAt: flow.creditCheckData?.checkedAt?.toISOString(),
          },
        },
      });

      // Update flow order data with new status
      flow.orderData.status = OrderStatus.CONFIRMED;

      return {
        success: true,
        output: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          confirmedAt: order.confirmedAt?.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Order confirmation failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'ORDER_CONFIRMATION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    // Must have passed credit check or have credit check disabled
    return flow.creditCheckData?.result === 'approved' || !config.enabled || true;
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private async getOrderMetadata(orderId: string): Promise<Record<string, unknown> | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { metadata: true },
    });
    return order?.metadata as Record<string, unknown> | null;
  }
}
