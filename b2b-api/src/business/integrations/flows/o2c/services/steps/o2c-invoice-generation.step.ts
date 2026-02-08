import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
  O2CInvoiceData,
  O2CInvoiceItem,
  InvoiceStatus,
} from '../../interfaces';

/**
 * Invoice Generation Step - Generates invoice for the order
 */
@Injectable()
export class O2CInvoiceGenerationStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.INVOICE_GENERATION;
  private readonly logger = new Logger(O2CInvoiceGenerationStep.name);

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Generating invoice for order ${flow.orderNumber}`);

    try {
      // Generate invoice
      const invoiceData = this.generateInvoice(flow);
      flow.invoiceData = invoiceData;
      flow.externalInvoiceId = invoiceData.externalInvoiceId;

      return {
        success: true,
        output: {
          invoiceId: invoiceData.invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          status: invoiceData.status,
          total: invoiceData.total,
          currency: invoiceData.currency,
          dueDate: invoiceData.dueDate.toISOString(),
          issueDate: invoiceData.issueDate.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invoice generation failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'INVOICE_GENERATION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return !!flow.orderData && flow.orderData.total > 0;
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private generateInvoice(flow: O2CFlowInstance): O2CInvoiceData {
    const invoiceId = uuidv4();
    const invoiceNumber = this.generateInvoiceNumber();
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Net 30

    // Map order items to invoice items
    const items: O2CInvoiceItem[] = flow.orderData.items.map((item) => ({
      lineNumber: item.lineNumber,
      description: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      total: item.total,
    }));

    return {
      invoiceId,
      invoiceNumber,
      status: InvoiceStatus.PENDING,
      issueDate: now,
      dueDate,
      subtotal: flow.orderData.subtotal,
      discount: flow.orderData.discount,
      tax: flow.orderData.tax,
      total: flow.orderData.total,
      currency: flow.orderData.currency,
      amountPaid: 0,
      amountDue: flow.orderData.total,
      paymentTerms: 'Net 30',
      items,
    };
  }

  private generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const seq = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `INV-${year}${month}-${seq}`;
  }
}
