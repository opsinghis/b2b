import { Injectable, Logger } from '@nestjs/common';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
  InvoiceStatus,
  ExternalPaymentStatus,
} from '../../interfaces';

/**
 * Payment Status Sync Step - Syncs payment status back to B2B platform
 */
@Injectable()
export class O2CPaymentStatusSyncStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.PAYMENT_STATUS_SYNC;
  private readonly logger = new Logger(O2CPaymentStatusSyncStep.name);

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Syncing payment status for order ${flow.orderNumber}`);

    try {
      if (!flow.paymentData) {
        return {
          success: false,
          error: 'No payment data available for status sync',
          errorCode: 'NO_PAYMENT_DATA',
          retryable: false,
        };
      }

      // Update invoice status based on payment
      if (flow.invoiceData) {
        this.updateInvoiceFromPayment(flow);
      }

      // If connector configured, sync status to external systems
      if (context.connectorContext) {
        await this.syncToExternalSystems(flow, context);
      }

      return {
        success: true,
        output: {
          paymentStatus: flow.paymentData.status,
          invoiceStatus: flow.invoiceData?.status,
          amountPaid: flow.invoiceData?.amountPaid,
          amountDue: flow.invoiceData?.amountDue,
          syncedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Payment status sync failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'PAYMENT_STATUS_SYNC_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return !!flow.paymentData;
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('NO_PAYMENT_DATA')) {
      return false;
    }
    return attempt < 3;
  }

  private updateInvoiceFromPayment(flow: O2CFlowInstance): void {
    if (!flow.invoiceData || !flow.paymentData) return;

    switch (flow.paymentData.status) {
      case ExternalPaymentStatus.CAPTURED:
      case ExternalPaymentStatus.PAID:
        flow.invoiceData.amountPaid = flow.paymentData.amount;
        flow.invoiceData.amountDue = 0;
        flow.invoiceData.status = InvoiceStatus.PAID;
        break;

      case ExternalPaymentStatus.PARTIAL_PAYMENT:
        flow.invoiceData.amountPaid += flow.paymentData.amount;
        flow.invoiceData.amountDue = flow.invoiceData.total - flow.invoiceData.amountPaid;
        flow.invoiceData.status = InvoiceStatus.PARTIAL_PAID;
        break;

      case ExternalPaymentStatus.REFUNDED:
        flow.invoiceData.status = InvoiceStatus.REFUNDED;
        break;

      case ExternalPaymentStatus.FAILED:
      case ExternalPaymentStatus.CANCELLED:
        // Leave invoice as pending
        break;
    }
  }

  private async syncToExternalSystems(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<void> {
    // This would sync payment status to external systems (ERP, accounting, etc.)
    this.logger.log(`Syncing payment status to external systems for order ${flow.orderNumber}`);

    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
