import { Injectable, Logger } from '@nestjs/common';
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
 * Invoice Sync Step - Syncs invoice to B2B platform and external systems
 */
@Injectable()
export class O2CInvoiceSyncStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.INVOICE_SYNC;
  private readonly logger = new Logger(O2CInvoiceSyncStep.name);

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Syncing invoice for order ${flow.orderNumber}`);

    try {
      if (!flow.invoiceData) {
        return {
          success: false,
          error: 'No invoice data available for sync',
          errorCode: 'NO_INVOICE_DATA',
          retryable: false,
        };
      }

      // If connector configured, sync to external system
      if (context.connectorContext) {
        const syncResult = await this.syncToExternalSystem(flow, context);
        if (!syncResult.success) {
          return syncResult;
        }
        flow.externalInvoiceId = syncResult.output?.externalInvoiceId as string;
        flow.invoiceData.externalInvoiceId = flow.externalInvoiceId;
      }

      // Mark invoice as sent
      flow.invoiceData.status = InvoiceStatus.SENT;
      flow.invoiceData.sentAt = new Date();

      return {
        success: true,
        output: {
          invoiceId: flow.invoiceData.invoiceId,
          invoiceNumber: flow.invoiceData.invoiceNumber,
          externalInvoiceId: flow.externalInvoiceId,
          status: flow.invoiceData.status,
          syncedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invoice sync failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'INVOICE_SYNC_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return !!flow.invoiceData;
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('NO_INVOICE_DATA')) {
      return false;
    }
    return attempt < 3;
  }

  private async syncToExternalSystem(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    // This would sync invoice to external system (ERP, accounting, etc.) via connector
    this.logger.log(`Syncing invoice ${flow.invoiceData!.invoiceNumber} to external system`);

    // Simulate external sync
    const externalInvoiceId = `EXT-INV-${Date.now()}`;

    return {
      success: true,
      output: {
        externalInvoiceId,
        syncedAt: new Date().toISOString(),
      },
    };
  }
}
