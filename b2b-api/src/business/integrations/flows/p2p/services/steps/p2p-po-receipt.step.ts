import { Injectable, Logger } from '@nestjs/common';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  P2PPurchaseOrderData,
  POStatus,
} from '../../interfaces';

/**
 * PO Receipt Step - Receives and processes purchase order from ERP
 */
@Injectable()
export class P2PPOReceiptStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.PO_RECEIPT;
  private readonly logger = new Logger(P2PPOReceiptStep.name);

  async execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Processing PO receipt for PO ${flow.purchaseOrderId}`);

    try {
      // If PO data is not yet populated, fetch it
      if (!flow.poData || !flow.poData.poNumber) {
        const poData = await this.fetchPurchaseOrder(flow, context);
        flow.poData = poData;
        flow.poNumber = poData.poNumber;
      }

      // Update PO status to received
      flow.poData.status = POStatus.RECEIVED;

      return {
        success: true,
        output: {
          poId: flow.poData.poId,
          poNumber: flow.poData.poNumber,
          externalPONumber: flow.poData.externalPONumber,
          vendorId: flow.poData.vendorId,
          total: flow.poData.total,
          currency: flow.poData.currency,
          itemCount: flow.poData.items.length,
          receivedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PO receipt failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'PO_RECEIPT_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return !!flow.purchaseOrderId;
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private async fetchPurchaseOrder(
    flow: P2PFlowInstance,
    context: P2PStepContext,
  ): Promise<P2PPurchaseOrderData> {
    // If connector configured, fetch from ERP
    if (context.connectorContext) {
      return this.fetchFromERP(flow, context);
    }

    // Return mock PO data for testing
    return this.createMockPOData(flow);
  }

  private async fetchFromERP(
    flow: P2PFlowInstance,
    _context: P2PStepContext,
  ): Promise<P2PPurchaseOrderData> {
    this.logger.log(`Fetching PO ${flow.purchaseOrderId} from ERP`);

    // This would call ERP connector to fetch PO
    return this.createMockPOData(flow);
  }

  private createMockPOData(flow: P2PFlowInstance): P2PPurchaseOrderData {
    const poNumber = `PO-${Date.now().toString().slice(-8)}`;

    return {
      poId: flow.purchaseOrderId,
      poNumber,
      externalPONumber: flow.externalPOId,
      status: POStatus.RECEIVED,
      vendorId: 'vendor-001',
      vendorName: 'Acme Supplies Inc.',
      buyerId: flow.tenantId,
      buyerName: 'B2B Platform',
      subtotal: 5000,
      tax: 425,
      shipping: 50,
      total: 5475,
      currency: 'USD',
      shipToAddress: {
        name: 'Warehouse A',
        company: 'B2B Platform',
        street1: '100 Industrial Way',
        city: 'Commerce City',
        state: 'CA',
        postalCode: '90210',
        country: 'US',
      },
      billToAddress: {
        name: 'Accounts Payable',
        company: 'B2B Platform',
        street1: '200 Business Park',
        city: 'Commerce City',
        state: 'CA',
        postalCode: '90210',
        country: 'US',
      },
      items: [
        {
          lineNumber: 1,
          sku: 'WIDGET-001',
          description: 'Industrial Widget Type A',
          quantity: 100,
          quantityReceived: 0,
          unitPrice: 25,
          tax: 212.5,
          total: 2712.5,
          uom: 'EA',
        },
        {
          lineNumber: 2,
          sku: 'GADGET-002',
          description: 'Commercial Gadget Type B',
          quantity: 50,
          quantityReceived: 0,
          unitPrice: 50,
          tax: 212.5,
          total: 2712.5,
          uom: 'EA',
        },
      ],
      poDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: 'Net 30',
    };
  }
}
