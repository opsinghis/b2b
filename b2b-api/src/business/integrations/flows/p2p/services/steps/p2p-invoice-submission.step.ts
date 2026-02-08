import { Injectable, Logger } from '@nestjs/common';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  VendorInvoiceStatus,
  ThreeWayMatchResult,
  POStatus,
} from '../../interfaces';

/**
 * Invoice Submission Step - Submits invoice to AP/ERP system
 */
@Injectable()
export class P2PInvoiceSubmissionStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.INVOICE_SUBMISSION;
  private readonly logger = new Logger(P2PInvoiceSubmissionStep.name);

  async execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Submitting invoice for PO ${flow.poNumber}`);

    try {
      if (!flow.invoiceData) {
        return {
          success: false,
          error: 'No invoice data available for submission',
          errorCode: 'NO_INVOICE_DATA',
          retryable: false,
        };
      }

      // Check if match was successful
      if (flow.matchData && flow.matchData.status === ThreeWayMatchResult.NOT_MATCHED) {
        if (!flow.matchData.approvedBy) {
          return {
            success: false,
            error: 'Invoice cannot be submitted: 3-way match failed and not approved',
            errorCode: 'MATCH_NOT_APPROVED',
            retryable: false,
            requiresApproval: true,
          };
        }
      }

      // Submit to external system if connector configured
      if (context.connectorContext) {
        const result = await this.submitToERP(flow, context);
        if (!result.success) {
          return result;
        }
        flow.externalInvoiceId = result.output?.externalInvoiceId as string;
        flow.invoiceData.externalInvoiceId = flow.externalInvoiceId;
      }

      // Update invoice status
      flow.invoiceData.status = VendorInvoiceStatus.SUBMITTED;
      flow.invoiceData.submittedAt = new Date();

      // Update PO status
      flow.poData.status = POStatus.INVOICED;

      return {
        success: true,
        output: {
          invoiceId: flow.invoiceData.invoiceId,
          invoiceNumber: flow.invoiceData.invoiceNumber,
          externalInvoiceId: flow.externalInvoiceId,
          status: flow.invoiceData.status,
          submittedAt: flow.invoiceData.submittedAt.toISOString(),
          total: flow.invoiceData.total,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invoice submission failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'INVOICE_SUBMISSION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return !!flow.invoiceData && !!flow.matchData;
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('NO_INVOICE_DATA') || error.includes('MATCH_NOT_APPROVED')) {
      return false;
    }
    return attempt < 3;
  }

  private async submitToERP(
    flow: P2PFlowInstance,
    _context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Submitting invoice ${flow.invoiceData!.invoiceNumber} to ERP/AP system`);

    // This would call ERP/AP connector
    const externalInvoiceId = `EXT-INV-${Date.now()}`;

    return {
      success: true,
      output: {
        externalInvoiceId,
        submittedAt: new Date().toISOString(),
      },
    };
  }
}
