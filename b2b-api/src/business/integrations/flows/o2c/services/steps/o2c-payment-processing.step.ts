import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
  O2CPaymentData,
  ExternalPaymentStatus,
  PaymentMethod,
} from '../../interfaces';

/**
 * Payment Processing Step - Processes payment for the order
 */
@Injectable()
export class O2CPaymentProcessingStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.PAYMENT_PROCESSING;
  private readonly logger = new Logger(O2CPaymentProcessingStep.name);

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Processing payment for order ${flow.orderNumber}`);

    try {
      if (!flow.invoiceData) {
        return {
          success: false,
          error: 'No invoice data available for payment processing',
          errorCode: 'NO_INVOICE_DATA',
          retryable: false,
        };
      }

      // Process payment
      const paymentData = await this.processPayment(flow, context);
      flow.paymentData = paymentData;
      flow.externalPaymentId = paymentData.externalPaymentId;

      if (paymentData.status === ExternalPaymentStatus.FAILED) {
        return {
          success: false,
          error: paymentData.errorMessage || 'Payment processing failed',
          errorCode: paymentData.errorCode || 'PAYMENT_FAILED',
          retryable: paymentData.errorCode !== 'CARD_DECLINED',
        };
      }

      return {
        success: true,
        output: {
          paymentId: paymentData.paymentId,
          externalPaymentId: paymentData.externalPaymentId,
          status: paymentData.status,
          amount: paymentData.amount,
          currency: paymentData.currency,
          method: paymentData.method,
          transactionId: paymentData.transactionId,
          authorizedAt: paymentData.authorizedAt?.toISOString(),
          capturedAt: paymentData.capturedAt?.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Payment processing failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'PAYMENT_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return !!flow.invoiceData && flow.invoiceData.amountDue > 0;
  }

  canRetry(error: string, attempt: number): boolean {
    // Don't retry certain payment errors
    if (
      error.includes('CARD_DECLINED') ||
      error.includes('INSUFFICIENT_FUNDS') ||
      error.includes('FRAUD')
    ) {
      return false;
    }
    return attempt < 3;
  }

  private async processPayment(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<O2CPaymentData> {
    // If payment connector configured, use it
    if (context.connectorContext) {
      return this.externalPaymentProcessing(flow, context);
    }

    // Internal payment simulation
    return this.internalPaymentProcessing(flow);
  }

  private async internalPaymentProcessing(flow: O2CFlowInstance): Promise<O2CPaymentData> {
    const paymentId = uuidv4();
    const now = new Date();

    // Simulate payment processing
    // In production, this would integrate with payment gateway

    return {
      paymentId,
      status: ExternalPaymentStatus.CAPTURED,
      method: PaymentMethod.NET_TERMS,
      amount: flow.invoiceData!.amountDue,
      currency: flow.invoiceData!.currency,
      authorizedAt: now,
      capturedAt: now,
      transactionId: `TXN-${Date.now()}`,
    };
  }

  private async externalPaymentProcessing(
    flow: O2CFlowInstance,
    context: O2CStepContext,
  ): Promise<O2CPaymentData> {
    // This would call external payment processor via connector
    this.logger.log(`Processing payment via external gateway for order ${flow.orderNumber}`);

    const paymentId = uuidv4();
    const externalPaymentId = `EXT-PAY-${Date.now()}`;
    const now = new Date();

    // Simulate external payment processing
    return {
      paymentId,
      externalPaymentId,
      status: ExternalPaymentStatus.CAPTURED,
      method: PaymentMethod.CREDIT_CARD,
      amount: flow.invoiceData!.amountDue,
      currency: flow.invoiceData!.currency,
      authorizedAt: now,
      capturedAt: now,
      transactionId: `TXN-${Date.now()}`,
      authorizationCode: this.generateAuthCode(),
      lastFour: '4242',
      cardBrand: 'Visa',
    };
  }

  private generateAuthCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
