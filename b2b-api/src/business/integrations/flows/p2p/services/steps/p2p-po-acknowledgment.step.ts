import { Injectable, Logger } from '@nestjs/common';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  POStatus,
} from '../../interfaces';

/**
 * PO Acknowledgment Step - Generates and sends PO acknowledgment
 */
@Injectable()
export class P2PPOAcknowledgmentStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.PO_ACKNOWLEDGMENT;
  private readonly logger = new Logger(P2PPOAcknowledgmentStep.name);

  async execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Generating acknowledgment for PO ${flow.poNumber}`);

    try {
      // Generate PO acknowledgment
      const acknowledgment = this.generateAcknowledgment(flow);

      // If connector configured, send to vendor/ERP
      if (context.connectorContext) {
        await this.sendAcknowledgment(flow, acknowledgment, context);
      }

      // Update PO status
      flow.poData.status = POStatus.ACKNOWLEDGED;

      return {
        success: true,
        output: {
          acknowledgmentNumber: acknowledgment.acknowledgmentNumber,
          poNumber: flow.poNumber,
          vendorId: flow.poData.vendorId,
          acknowledgedAt: acknowledgment.acknowledgedAt,
          expectedDeliveryDate: flow.poData.expectedDeliveryDate?.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PO acknowledgment failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'PO_ACKNOWLEDGMENT_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return flow.poData?.status === POStatus.RECEIVED;
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private generateAcknowledgment(flow: P2PFlowInstance): {
    acknowledgmentNumber: string;
    acknowledgedAt: string;
    documentType: string;
    lines: Array<{ lineNumber: number; sku: string; quantity: number; status: string }>;
  } {
    const acknowledgmentNumber = `ACK-${Date.now().toString().slice(-8)}`;

    return {
      acknowledgmentNumber,
      acknowledgedAt: new Date().toISOString(),
      documentType: 'PO_ACKNOWLEDGMENT',
      lines: flow.poData.items.map((item) => ({
        lineNumber: item.lineNumber,
        sku: item.sku,
        quantity: item.quantity,
        status: 'accepted',
      })),
    };
  }

  private async sendAcknowledgment(
    flow: P2PFlowInstance,
    _acknowledgment: unknown,
    _context: P2PStepContext,
  ): Promise<void> {
    this.logger.log(`Sending PO acknowledgment to vendor ${flow.poData.vendorId}`);

    // This would send acknowledgment via EDI or API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
