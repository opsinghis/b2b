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
 * Fulfillment Step - Triggers order fulfillment/picking
 */
@Injectable()
export class O2CFulfillmentStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.FULFILLMENT;
  private readonly logger = new Logger(O2CFulfillmentStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Executing fulfillment for order ${flow.orderNumber}`);

    try {
      // Update order status to PROCESSING
      const order = await this.prisma.order.update({
        where: { id: flow.orderId },
        data: {
          status: OrderStatus.PROCESSING,
          processingAt: new Date(),
        },
      });

      // Update flow order data
      flow.orderData.status = OrderStatus.PROCESSING;

      // If connector configured, trigger external fulfillment
      if (context.connectorContext) {
        const fulfillmentResult = await this.triggerExternalFulfillment(flow, context);
        if (!fulfillmentResult.success) {
          return fulfillmentResult;
        }
      }

      return {
        success: true,
        output: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          processingAt: order.processingAt?.toISOString(),
          fulfillmentTriggered: true,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Fulfillment trigger failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'FULFILLMENT_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return flow.orderData?.status === 'CONFIRMED';
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private async triggerExternalFulfillment(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    // This would call external fulfillment/WMS system via connector
    this.logger.log(`Triggering external fulfillment for order ${flow.orderNumber}`);

    // Simulate successful fulfillment trigger
    return {
      success: true,
      output: {
        externalFulfillmentId: `FUL-${Date.now()}`,
        triggeredAt: new Date().toISOString(),
      },
    };
  }
}
