import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
  O2CShipmentData,
  ShipmentStatus,
  O2CPackage,
} from '../../interfaces';

/**
 * Shipment Sync Step - Creates and syncs shipment information
 */
@Injectable()
export class O2CShipmentSyncStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.SHIPMENT_SYNC;
  private readonly logger = new Logger(O2CShipmentSyncStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Executing shipment sync for order ${flow.orderNumber}`);

    try {
      // Create shipment data
      const shipmentData = await this.createShipment(flow, context);
      flow.shipmentData = shipmentData;
      flow.externalShipmentId = shipmentData.externalShipmentId;

      // Update order with tracking info
      await this.prisma.order.update({
        where: { id: flow.orderId },
        data: {
          status: OrderStatus.SHIPPED,
          shippedAt: shipmentData.shippedAt || new Date(),
          trackingNumber: shipmentData.trackingNumber,
          trackingUrl: shipmentData.trackingUrl,
          carrier: shipmentData.carrier,
          estimatedDelivery: shipmentData.estimatedDelivery,
        },
      });

      // Update flow order data
      flow.orderData.status = OrderStatus.SHIPPED;

      return {
        success: true,
        output: {
          shipmentId: shipmentData.shipmentId,
          externalShipmentId: shipmentData.externalShipmentId,
          trackingNumber: shipmentData.trackingNumber,
          carrier: shipmentData.carrier,
          status: shipmentData.status,
          estimatedDelivery: shipmentData.estimatedDelivery?.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Shipment sync failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'SHIPMENT_SYNC_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return flow.orderData?.status === 'PROCESSING';
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private async createShipment(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<O2CShipmentData> {
    // If connector configured, sync with external shipping system
    if (context.connectorContext) {
      return this.externalShipmentSync(flow, context);
    }

    // Internal shipment creation
    return this.internalShipmentCreation(flow);
  }

  private async internalShipmentCreation(flow: O2CFlowInstance): Promise<O2CShipmentData> {
    const shipmentId = uuidv4();
    const trackingNumber = this.generateTrackingNumber();
    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

    // Create packages from order items
    const packages: O2CPackage[] = [
      {
        packageId: `PKG-${shipmentId.slice(0, 8)}`,
        trackingNumber,
        weight: flow.orderData.items.reduce((sum, item) => sum + item.quantity * 0.5, 0),
        weightUnit: 'kg',
        items: flow.orderData.items.map((item) => ({
          lineNumber: item.lineNumber,
          sku: item.sku,
          quantity: item.quantity,
        })),
      },
    ];

    return {
      shipmentId,
      carrier: 'UPS',
      service: 'Ground',
      trackingNumber,
      trackingUrl: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      status: ShipmentStatus.SHIPPED,
      shippedAt: now,
      estimatedDelivery,
      packages,
    };
  }

  private async externalShipmentSync(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<O2CShipmentData> {
    // This would sync with external shipping/carrier system via connector
    this.logger.log(`Syncing shipment with external system for order ${flow.orderNumber}`);

    const shipmentId = uuidv4();
    const externalShipmentId = `EXT-SHP-${Date.now()}`;
    const trackingNumber = this.generateTrackingNumber();

    return {
      shipmentId,
      externalShipmentId,
      carrier: 'FedEx',
      service: 'Express',
      trackingNumber,
      trackingUrl: `https://www.fedex.com/track?trackingnumber=${trackingNumber}`,
      status: ShipmentStatus.SHIPPED,
      shippedAt: new Date(),
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      packages: [],
    };
  }

  private generateTrackingNumber(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '1Z';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
