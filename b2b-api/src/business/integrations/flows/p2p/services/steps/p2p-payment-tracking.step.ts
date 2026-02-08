import { Injectable, Logger } from '@nestjs/common';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  PaymentStatus,
  PaymentMethod,
  VendorInvoiceStatus,
} from '../../interfaces';

/**
 * Payment Tracking Step - Tracks payment status for submitted invoices
 */
@Injectable()
export class P2PPaymentTrackingStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.PAYMENT_TRACKING;
  private readonly logger = new Logger(P2PPaymentTrackingStep.name);

  async execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Tracking payment for invoice ${flow.invoiceData?.invoiceNumber}`);

    try {
      if (!flow.invoiceData) {
        return {
          success: false,
          error: 'No invoice data available for payment tracking',
          errorCode: 'NO_INVOICE_DATA',
          retryable: false,
        };
      }

      if (
        flow.invoiceData.status !== VendorInvoiceStatus.SUBMITTED &&
        flow.invoiceData.status !== VendorInvoiceStatus.APPROVED
      ) {
        return {
          success: false,
          error: `Invoice not ready for payment tracking: status is ${flow.invoiceData.status}`,
          errorCode: 'INVALID_INVOICE_STATUS',
          retryable: false,
        };
      }

      // Initialize payment data if not exists
      if (!flow.paymentData) {
        flow.paymentData = {
          paymentId: `PAY-${Date.now()}`,
          invoiceId: flow.invoiceData.invoiceId,
          amount: flow.invoiceData.total,
          currency: flow.invoiceData.currency,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.ACH,
          scheduledDate: this.calculatePaymentDate(flow),
        };
      }

      // Check payment status from external system if connector configured
      if (context.connectorContext) {
        const result = await this.checkPaymentStatus(flow, context);
        if (!result.success) {
          return result;
        }

        // Update payment data from external system
        if (result.output?.paymentStatus && flow.paymentData) {
          flow.paymentData.status = result.output.paymentStatus as PaymentStatus;
          if (result.output.completedAt) {
            flow.paymentData.completedAt = new Date(result.output.completedAt as string);
          }
          if (result.output.externalPaymentId) {
            flow.paymentData.externalPaymentId = result.output.externalPaymentId as string;
          }
        }
      }

      // Check if payment is complete
      const isComplete = flow.paymentData?.status === PaymentStatus.COMPLETED;

      if (isComplete && flow.invoiceData) {
        flow.invoiceData.status = VendorInvoiceStatus.PAID;
      }

      // If payment is still pending, return success and let orchestrator decide
      if (
        flow.paymentData?.status === PaymentStatus.PENDING ||
        flow.paymentData?.status === PaymentStatus.SCHEDULED
      ) {
        return {
          success: true,
          output: {
            paymentId: flow.paymentData.paymentId,
            status: flow.paymentData.status,
            scheduledDate: flow.paymentData.scheduledDate?.toISOString(),
            message: 'Waiting for payment to be processed',
          },
        };
      }

      return {
        success: isComplete,
        output: {
          paymentId: flow.paymentData?.paymentId,
          externalPaymentId: flow.paymentData?.externalPaymentId,
          status: flow.paymentData?.status,
          amount: flow.paymentData?.amount,
          currency: flow.paymentData?.currency,
          completedAt: flow.paymentData?.completedAt?.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Payment tracking failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'PAYMENT_TRACKING_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return (
      !!flow.invoiceData &&
      (flow.invoiceData.status === VendorInvoiceStatus.SUBMITTED ||
        flow.invoiceData.status === VendorInvoiceStatus.APPROVED)
    );
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('NO_INVOICE_DATA') || error.includes('INVALID_INVOICE_STATUS')) {
      return false;
    }
    return attempt < 5; // More retries for payment tracking
  }

  private calculatePaymentDate(flow: P2PFlowInstance): Date {
    // Calculate based on payment terms (default Net 30)
    const invoiceDate = flow.invoiceData!.invoiceDate;
    const paymentTermsDays = 30;

    const paymentDate = new Date(invoiceDate);
    paymentDate.setDate(paymentDate.getDate() + paymentTermsDays);

    return paymentDate;
  }

  private async checkPaymentStatus(
    flow: P2PFlowInstance,
    _context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Checking payment status for invoice ${flow.invoiceData!.invoiceNumber}`);

    // This would call ERP/AP connector to check payment status
    // For now, return current status
    return {
      success: true,
      output: {
        paymentStatus: flow.paymentData?.status || PaymentStatus.PENDING,
      },
    };
  }
}
