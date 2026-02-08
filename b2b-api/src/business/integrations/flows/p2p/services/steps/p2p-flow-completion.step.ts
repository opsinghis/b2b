import { Injectable, Logger } from '@nestjs/common';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  P2PFlowStatus,
  PaymentStatus,
  POStatus,
} from '../../interfaces';

/**
 * Flow Completion Step - Finalizes the P2P flow
 */
@Injectable()
export class P2PFlowCompletionStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.FLOW_COMPLETION;
  private readonly logger = new Logger(P2PFlowCompletionStep.name);

  async execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Completing P2P flow for PO ${flow.poNumber}`);

    try {
      // Validate all required steps are complete
      const validationResult = this.validateFlowCompletion(flow);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          errorCode: 'FLOW_VALIDATION_ERROR',
          retryable: false,
        };
      }

      // Update PO status to PAID
      flow.poData.status = POStatus.PAID;

      // Mark flow as completed
      flow.status = P2PFlowStatus.COMPLETED;
      flow.completedAt = new Date();

      // Calculate flow metrics
      const metrics = this.calculateFlowMetrics(flow);

      // Send completion notification if connector configured
      if (context.connectorContext) {
        await this.sendCompletionNotification(flow, context);
      }

      return {
        success: true,
        output: {
          flowId: flow.id,
          poNumber: flow.poNumber,
          status: flow.status,
          completedAt: flow.completedAt.toISOString(),
          metrics,
          summary: {
            poId: flow.poData.poId,
            poTotal: flow.poData.total,
            invoiceTotal: flow.invoiceData?.total,
            paymentStatus: flow.paymentData?.status,
            paymentAmount: flow.paymentData?.amount,
            matchStatus: flow.matchData?.status,
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Flow completion failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'FLOW_COMPLETION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    // Payment tracking must be complete (unless disabled)
    return flow.paymentData?.status === PaymentStatus.COMPLETED || !flow.paymentData; // No payment data means payment tracking was skipped
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('FLOW_VALIDATION_ERROR')) {
      return false;
    }
    return attempt < 3;
  }

  private validateFlowCompletion(flow: P2PFlowInstance): { valid: boolean; error?: string } {
    // Check required data exists
    if (!flow.poData) {
      return { valid: false, error: 'PO data is missing' };
    }

    if (!flow.goodsReceiptData) {
      return { valid: false, error: 'Goods receipt data is missing' };
    }

    if (!flow.invoiceData) {
      return { valid: false, error: 'Invoice data is missing' };
    }

    // Check 3-way match was performed
    if (!flow.matchData) {
      return { valid: false, error: '3-way match was not performed' };
    }

    // Payment is optional but if exists, should be in terminal state
    if (flow.paymentData) {
      const terminalPaymentStates = [
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ];
      if (!terminalPaymentStates.includes(flow.paymentData.status)) {
        return { valid: false, error: `Payment is still in progress: ${flow.paymentData.status}` };
      }
    }

    return { valid: true };
  }

  private calculateFlowMetrics(flow: P2PFlowInstance): Record<string, unknown> {
    const startTime = flow.startedAt.getTime();
    const endTime = flow.completedAt!.getTime();
    const durationMs = endTime - startTime;

    // Calculate step durations
    const stepDurations: Record<string, number> = {};
    let previousEndTime = startTime;

    for (const step of flow.steps) {
      if (step.completedAt) {
        const stepStart = step.startedAt?.getTime() || previousEndTime;
        const stepEnd = step.completedAt.getTime();
        stepDurations[step.stepType] = stepEnd - stepStart;
        previousEndTime = stepEnd;
      }
    }

    // Calculate financial metrics
    const poTotal = flow.poData.total;
    const invoiceTotal = flow.invoiceData?.total || 0;
    const paidAmount = flow.paymentData?.amount || 0;
    const variance = invoiceTotal - poTotal;
    const variancePercent = poTotal > 0 ? (variance / poTotal) * 100 : 0;

    return {
      totalDurationMs: durationMs,
      totalDurationHours: Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100,
      stepCount: flow.steps.length,
      completedSteps: flow.steps.filter((s) => s.status === 'completed').length,
      retryCount: flow.steps.reduce((sum, s) => sum + s.attempt, 0),
      stepDurations,
      financial: {
        poTotal,
        invoiceTotal,
        paidAmount,
        variance,
        variancePercent: Math.round(variancePercent * 100) / 100,
        currency: flow.poData.currency,
      },
      matching: {
        status: flow.matchData?.status,
        discrepancyCount: flow.matchData?.discrepancies.length || 0,
        itemsMatched: flow.matchData?.items.filter((i) => i.withinTolerance).length || 0,
        totalItems: flow.matchData?.items.length || 0,
      },
    };
  }

  private async sendCompletionNotification(
    flow: P2PFlowInstance,
    _context: P2PStepContext,
  ): Promise<void> {
    this.logger.log(`Sending completion notification for flow ${flow.id}`);
    // This would send notification via connector
  }
}
