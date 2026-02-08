import { Injectable, Logger } from '@nestjs/common';
import {
  IP2PStepHandler,
  P2PStepType,
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
} from '../../interfaces';

/**
 * PO Validation Step - Validates purchase order data
 */
@Injectable()
export class P2PPOValidationStep implements IP2PStepHandler {
  readonly stepType = P2PStepType.PO_VALIDATION;
  private readonly logger = new Logger(P2PPOValidationStep.name);

  async execute(
    flow: P2PFlowInstance,
    _config: P2PStepConfig,
    _context: P2PStepContext,
  ): Promise<P2PStepResult> {
    this.logger.log(`Validating PO ${flow.poNumber}`);

    try {
      const validationResults = this.validatePO(flow);

      if (!validationResults.valid) {
        return {
          success: false,
          error: `PO validation failed: ${validationResults.errors.join(', ')}`,
          errorCode: 'PO_VALIDATION_FAILED',
          retryable: false,
        };
      }

      return {
        success: true,
        output: {
          poNumber: flow.poNumber,
          validatedAt: new Date().toISOString(),
          validationResults,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PO validation failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'PO_VALIDATION_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: P2PFlowInstance, _config: P2PStepConfig): Promise<boolean> {
    return !!flow.poData;
  }

  canRetry(error: string, attempt: number): boolean {
    if (error.includes('PO_VALIDATION_FAILED')) {
      return false;
    }
    return attempt < 3;
  }

  private validatePO(flow: P2PFlowInstance): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const po = flow.poData;

    // Required fields validation
    if (!po.poNumber) {
      errors.push('PO number is required');
    }

    if (!po.vendorId) {
      errors.push('Vendor ID is required');
    }

    if (!po.items || po.items.length === 0) {
      errors.push('PO must have at least one line item');
    }

    // Amount validation
    if (po.total <= 0) {
      errors.push('PO total must be greater than zero');
    }

    // Line item validation
    for (const item of po.items) {
      if (item.quantity <= 0) {
        errors.push(`Line ${item.lineNumber}: quantity must be greater than zero`);
      }

      if (item.unitPrice < 0) {
        errors.push(`Line ${item.lineNumber}: unit price cannot be negative`);
      }

      if (!item.sku && !item.description) {
        warnings.push(`Line ${item.lineNumber}: missing SKU and description`);
      }
    }

    // Calculate total validation
    const calculatedSubtotal = po.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const tolerance = 0.01;
    if (Math.abs(calculatedSubtotal - po.subtotal) > tolerance) {
      warnings.push(`Subtotal mismatch: calculated ${calculatedSubtotal}, received ${po.subtotal}`);
    }

    // Date validation
    if (po.expectedDeliveryDate && po.expectedDeliveryDate < new Date()) {
      warnings.push('Expected delivery date is in the past');
    }

    if (po.paymentDueDate && po.paymentDueDate < new Date()) {
      warnings.push('Payment due date is in the past');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
