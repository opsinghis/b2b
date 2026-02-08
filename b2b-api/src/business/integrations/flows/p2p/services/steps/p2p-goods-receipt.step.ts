import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  P2PGoodsReceiptData,
  P2PGoodsReceiptItem,
  GoodsReceiptStatus,
  POStatus,
} from '../../interfaces';

/**
 * Goods Receipt Step - Records receipt of goods against PO
 */
@Injectable()
export class P2PGoodsReceiptStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.GOODS_RECEIPT;
  private readonly logger = new Logger(P2PGoodsReceiptStep.name);

  async execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Processing goods receipt for PO ${flow.poNumber}`);

    try {
      // Create or fetch goods receipt data
      let goodsReceiptData: P2PGoodsReceiptData;

      if (flow.goodsReceiptData) {
        // Already have receipt data (from webhook)
        goodsReceiptData = flow.goodsReceiptData;
      } else if (context.connectorContext) {
        // Fetch from external system
        goodsReceiptData = await this.fetchGoodsReceipt(flow, context);
      } else {
        // Create simulated receipt (full receipt)
        goodsReceiptData = this.createFullReceipt(flow);
      }

      flow.goodsReceiptData = goodsReceiptData;

      // Update PO item quantities received
      this.updatePOQuantities(flow);

      // Determine PO status based on receipt
      const poStatus = this.determinePOStatus(flow);
      flow.poData.status = poStatus;

      return {
        success: true,
        output: {
          receiptId: goodsReceiptData.receiptId,
          poNumber: flow.poNumber,
          status: goodsReceiptData.status,
          itemsReceived: goodsReceiptData.items.length,
          totalQuantityReceived: goodsReceiptData.items.reduce(
            (sum, i) => sum + i.quantityReceived,
            0,
          ),
          receivedAt: goodsReceiptData.receivedAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Goods receipt failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'GOODS_RECEIPT_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return flow.poData?.status === POStatus.ACKNOWLEDGED;
  }

  canRetry(error: string, attempt: number): boolean {
    return attempt < 3;
  }

  private async fetchGoodsReceipt(
    flow: P2PFlowInstance,
    _context: P2PStepContext,
  ): Promise<P2PGoodsReceiptData> {
    this.logger.log(`Fetching goods receipt for PO ${flow.poNumber} from external system`);

    // This would call WMS/ERP connector
    return this.createFullReceipt(flow);
  }

  private createFullReceipt(flow: P2PFlowInstance): P2PGoodsReceiptData {
    const receiptId = uuidv4();

    const items: P2PGoodsReceiptItem[] = flow.poData.items.map((poItem) => ({
      lineNumber: poItem.lineNumber,
      poLineNumber: poItem.lineNumber,
      sku: poItem.sku,
      description: poItem.description,
      quantityOrdered: poItem.quantity,
      quantityReceived: poItem.quantity, // Full receipt
      quantityRejected: 0,
    }));

    return {
      receiptId,
      poId: flow.poData.poId,
      poNumber: flow.poNumber,
      status: GoodsReceiptStatus.COMPLETE,
      receivedAt: new Date(),
      receivedBy: 'warehouse-user',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      items,
    };
  }

  private updatePOQuantities(flow: P2PFlowInstance): void {
    if (!flow.goodsReceiptData) return;

    for (const receiptItem of flow.goodsReceiptData.items) {
      const poItem = flow.poData.items.find((i) => i.lineNumber === receiptItem.poLineNumber);
      if (poItem) {
        poItem.quantityReceived = receiptItem.quantityReceived;
      }
    }
  }

  private determinePOStatus(flow: P2PFlowInstance): POStatus {
    const allItemsFullyReceived = flow.poData.items.every(
      (item) => item.quantityReceived >= item.quantity,
    );

    const someItemsReceived = flow.poData.items.some((item) => item.quantityReceived > 0);

    if (allItemsFullyReceived) {
      return POStatus.FULLY_RECEIVED;
    } else if (someItemsReceived) {
      return POStatus.PARTIALLY_RECEIVED;
    }

    return flow.poData.status;
  }
}
