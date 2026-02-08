import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  P2PMatchData,
  P2PMatchItem,
  P2PMatchDiscrepancy,
  ThreeWayMatchResult,
} from '../../interfaces';

/**
 * Three-Way Match Step - Performs PO, Receipt, Invoice matching
 */
@Injectable()
export class P2PThreeWayMatchStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.THREE_WAY_MATCH;
  private readonly logger = new Logger(P2PThreeWayMatchStep.name);

  async execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Performing 3-way match for PO ${flow.poNumber}`);

    try {
      if (!flow.invoiceData) {
        return {
          success: false,
          error: 'No invoice data available for matching',
          errorCode: 'NO_INVOICE_DATA',
          retryable: false,
        };
      }

      // Perform 3-way match
      const matchData = this.performMatch(flow, context.matchTolerances);
      flow.matchData = matchData;

      // If discrepancies require approval, pause flow
      if (matchData.requiresApproval && matchData.discrepancies.length > 0) {
        return {
          success: true,
          requiresApproval: true,
          output: {
            matchId: matchData.matchId,
            status: matchData.status,
            discrepancyCount: matchData.discrepancies.length,
            discrepancies: matchData.discrepancies,
            requiresApproval: true,
          },
        };
      }

      return {
        success:
          matchData.status === ThreeWayMatchResult.MATCHED ||
          matchData.status === ThreeWayMatchResult.PARTIAL_MATCH,
        output: {
          matchId: matchData.matchId,
          status: matchData.status,
          discrepancyCount: matchData.discrepancies.length,
          matchedAt: matchData.matchedAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`3-way match failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'THREE_WAY_MATCH_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return !!flow.poData && !!flow.goodsReceiptData && !!flow.invoiceData;
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('NO_INVOICE_DATA')) {
      return false;
    }
    return attempt < 3;
  }

  private performMatch(
    flow: P2PFlowInstance,
    tolerances?: {
      quantityTolerancePercent: number;
      priceTolerancePercent: number;
      amountToleranceAbsolute: number;
    },
  ): P2PMatchData {
    const matchId = uuidv4();
    const items: P2PMatchItem[] = [];
    const discrepancies: P2PMatchDiscrepancy[] = [];

    const qtyTolerance = tolerances?.quantityTolerancePercent || 5;
    const priceTolerance = tolerances?.priceTolerancePercent || 2;

    // Match each invoice line against PO and receipt
    for (const invoiceItem of flow.invoiceData!.items) {
      const poItem = flow.poData.items.find((i) => i.lineNumber === invoiceItem.poLineNumber);
      const receiptItem = flow.goodsReceiptData?.items.find(
        (i) => i.poLineNumber === invoiceItem.poLineNumber,
      );

      if (!poItem) {
        discrepancies.push({
          lineNumber: invoiceItem.lineNumber,
          sku: invoiceItem.sku || '',
          type: 'missing_receipt',
          severity: 'error',
          expected: 0,
          actual: invoiceItem.quantity,
          difference: invoiceItem.quantity,
          differencePercent: 100,
          message: `Invoice line ${invoiceItem.lineNumber} has no matching PO line`,
        });
        continue;
      }

      const poQuantity = poItem.quantity;
      const receivedQuantity = receiptItem?.quantityReceived || 0;
      const invoicedQuantity = invoiceItem.quantity;
      const poUnitPrice = poItem.unitPrice;
      const invoiceUnitPrice = invoiceItem.unitPrice;

      // Check quantity match
      const qtyDiffPercent =
        (Math.abs(invoicedQuantity - receivedQuantity) / receivedQuantity) * 100;
      const quantityMatched = qtyDiffPercent <= qtyTolerance;

      // Check price match
      const priceDiffPercent = (Math.abs(invoiceUnitPrice - poUnitPrice) / poUnitPrice) * 100;
      const priceMatched = priceDiffPercent <= priceTolerance;

      const withinTolerance = quantityMatched && priceMatched;

      items.push({
        lineNumber: invoiceItem.lineNumber,
        sku: invoiceItem.sku || poItem.sku,
        poQuantity,
        receivedQuantity,
        invoicedQuantity,
        poUnitPrice,
        invoiceUnitPrice,
        quantityMatched,
        priceMatched,
        withinTolerance,
      });

      // Record discrepancies
      if (!quantityMatched) {
        discrepancies.push({
          lineNumber: invoiceItem.lineNumber,
          sku: invoiceItem.sku || poItem.sku,
          type: 'quantity',
          severity: qtyDiffPercent > qtyTolerance * 2 ? 'error' : 'warning',
          expected: receivedQuantity,
          actual: invoicedQuantity,
          difference: invoicedQuantity - receivedQuantity,
          differencePercent: qtyDiffPercent,
          message: `Quantity mismatch: received ${receivedQuantity}, invoiced ${invoicedQuantity}`,
        });
      }

      if (!priceMatched) {
        discrepancies.push({
          lineNumber: invoiceItem.lineNumber,
          sku: invoiceItem.sku || poItem.sku,
          type: 'price',
          severity: priceDiffPercent > priceTolerance * 2 ? 'error' : 'warning',
          expected: poUnitPrice,
          actual: invoiceUnitPrice,
          difference: invoiceUnitPrice - poUnitPrice,
          differencePercent: priceDiffPercent,
          message: `Price mismatch: PO price ${poUnitPrice}, invoice price ${invoiceUnitPrice}`,
        });
      }
    }

    // Determine overall match status
    let status: ThreeWayMatchResult;
    const hasErrors = discrepancies.some((d) => d.severity === 'error');
    const hasWarnings = discrepancies.some((d) => d.severity === 'warning');
    const allMatched = items.every((i) => i.withinTolerance);

    if (allMatched && discrepancies.length === 0) {
      status = ThreeWayMatchResult.MATCHED;
    } else if (hasErrors) {
      status = ThreeWayMatchResult.NOT_MATCHED;
    } else if (hasWarnings) {
      status = ThreeWayMatchResult.PARTIAL_MATCH;
    } else {
      status = ThreeWayMatchResult.MATCHED;
    }

    return {
      matchId,
      poId: flow.poData.poId,
      receiptId: flow.goodsReceiptData?.receiptId,
      invoiceId: flow.invoiceData!.invoiceId,
      status,
      matchedAt: new Date(),
      items,
      discrepancies,
      requiresApproval: hasErrors || (hasWarnings && discrepancies.length > 0),
    };
  }
}
