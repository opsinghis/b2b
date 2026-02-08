import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
} from '../../interfaces';

/**
 * ASN Generation Step - Generates Advanced Shipping Notice
 */
@Injectable()
export class O2CAsnGenerationStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.ASN_GENERATION;
  private readonly logger = new Logger(O2CAsnGenerationStep.name);

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Generating ASN for order ${flow.orderNumber}`);

    try {
      if (!flow.shipmentData) {
        return {
          success: false,
          error: 'No shipment data available for ASN generation',
          errorCode: 'NO_SHIPMENT_DATA',
          retryable: false,
        };
      }

      // Generate ASN
      const asnNumber = this.generateAsnNumber();
      const asnData = this.generateAsnDocument(flow, asnNumber);

      // Update shipment data with ASN
      flow.shipmentData.asnNumber = asnNumber;
      flow.shipmentData.asnGeneratedAt = new Date();

      // If connector configured, send ASN to trading partner
      if (context.connectorContext) {
        await this.sendAsnToPartner(flow, asnData, context);
      }

      return {
        success: true,
        output: {
          asnNumber,
          generatedAt: new Date().toISOString(),
          shipmentId: flow.shipmentData.shipmentId,
          trackingNumber: flow.shipmentData.trackingNumber,
          packageCount: flow.shipmentData.packages.length,
          asnData,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`ASN generation failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'ASN_GENERATION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return !!flow.shipmentData;
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('NO_SHIPMENT_DATA')) {
      return false;
    }
    return attempt < 3;
  }

  private generateAsnNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ASN-${dateStr}-${seq}`;
  }

  private generateAsnDocument(flow: O2CFlowInstance, asnNumber: string): Record<string, unknown> {
    const shipment = flow.shipmentData!;

    return {
      asnNumber,
      documentType: 'ASN',
      documentVersion: '1.0',
      createdAt: new Date().toISOString(),
      sender: {
        id: flow.tenantId,
        name: 'B2B Platform',
      },
      receiver: {
        id: flow.orderData.customerId,
        name: flow.orderData.customerName,
      },
      shipment: {
        shipmentId: shipment.shipmentId,
        externalShipmentId: shipment.externalShipmentId,
        carrier: shipment.carrier,
        service: shipment.service,
        trackingNumber: shipment.trackingNumber,
        shippedAt: shipment.shippedAt?.toISOString(),
        estimatedDelivery: shipment.estimatedDelivery?.toISOString(),
      },
      order: {
        orderId: flow.orderId,
        orderNumber: flow.orderNumber,
        externalOrderId: flow.externalOrderId,
        poNumber: flow.orderData.poNumber,
      },
      shipTo: flow.orderData.shippingAddress,
      packages: shipment.packages.map((pkg) => ({
        packageId: pkg.packageId,
        trackingNumber: pkg.trackingNumber,
        weight: pkg.weight,
        weightUnit: pkg.weightUnit,
        dimensions: pkg.dimensions,
        items: pkg.items.map((item) => ({
          lineNumber: item.lineNumber,
          sku: item.sku,
          quantity: item.quantity,
          lotNumber: item.lotNumber,
          serialNumbers: item.serialNumbers,
        })),
      })),
      lineItems: flow.orderData.items.map((item) => ({
        lineNumber: item.lineNumber,
        sku: item.sku,
        description: item.name,
        quantity: item.quantity,
        uom: item.uom,
      })),
    };
  }

  private async sendAsnToPartner(
    flow: O2CFlowInstance,
    asnData: Record<string, unknown>,
    context: O2CStepContext,
  ): Promise<void> {
    // This would send ASN via EDI or API to trading partner
    this.logger.log(`Sending ASN ${asnData.asnNumber} to trading partner`);

    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
