import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  P2PVendorInvoiceData,
  P2PVendorInvoiceItem,
  VendorInvoiceStatus,
} from '../../interfaces';

/**
 * Invoice Creation Step - Creates vendor invoice from PO and goods receipt
 */
@Injectable()
export class P2PInvoiceCreationStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.INVOICE_CREATION;
  private readonly logger = new Logger(P2PInvoiceCreationStep.name);

  async execute(
    flow: P2PFlowInstance,
    _config: P2PStepConfig,
    _context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Creating invoice for PO ${flow.poNumber}`);

    try {
      // Create invoice from PO data
      const invoiceData = this.createInvoice(flow);
      flow.invoiceData = invoiceData;

      return {
        success: true,
        output: {
          invoiceId: invoiceData.invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          poNumber: flow.poNumber,
          vendorId: invoiceData.vendorId,
          total: invoiceData.total,
          currency: invoiceData.currency,
          dueDate: invoiceData.dueDate.toISOString(),
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invoice creation failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'INVOICE_CREATION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return !!flow.goodsReceiptData;
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private createInvoice(flow: P2PFlowInstance): P2PVendorInvoiceData {
    const invoiceId = uuidv4();
    const invoiceNumber = this.generateInvoiceNumber();
    const now = new Date();

    // Calculate days for payment term
    const paymentTermsDays = this.extractPaymentDays(flow.poData.paymentTerms);
    const dueDate = new Date(now.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

    // Create invoice items from received goods
    const items: P2PVendorInvoiceItem[] = flow.goodsReceiptData!.items.map((receiptItem) => {
      const poItem = flow.poData.items.find((i) => i.lineNumber === receiptItem.poLineNumber);
      const quantity = receiptItem.quantityReceived;
      const unitPrice = poItem?.unitPrice || 0;
      const tax = quantity * unitPrice * 0.085; // 8.5% tax
      const total = quantity * unitPrice + tax;

      return {
        lineNumber: receiptItem.lineNumber,
        poLineNumber: receiptItem.poLineNumber,
        sku: receiptItem.sku,
        description: receiptItem.description || poItem?.description || '',
        quantity,
        unitPrice,
        tax,
        total,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const tax = items.reduce((sum, i) => sum + i.tax, 0);
    const total = subtotal + tax;

    return {
      invoiceId,
      invoiceNumber,
      status: VendorInvoiceStatus.PENDING,
      vendorId: flow.poData.vendorId,
      vendorName: flow.poData.vendorName,
      poId: flow.poData.poId,
      poNumber: flow.poNumber,
      receiptId: flow.goodsReceiptData?.receiptId,
      invoiceDate: now,
      dueDate,
      subtotal,
      tax,
      shipping: flow.poData.shipping,
      total: total + flow.poData.shipping,
      currency: flow.poData.currency,
      amountPaid: 0,
      amountDue: total + flow.poData.shipping,
      paymentTerms: flow.poData.paymentTerms,
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
    return `VINV-${year}${month}-${seq}`;
  }

  private extractPaymentDays(paymentTerms?: string): number {
    if (!paymentTerms) return 30;

    const match = paymentTerms.match(/Net\s*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    return 30;
  }
}
