import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
  O2CCreditCheckData,
  CreditCheckResult,
} from '../../interfaces';

/**
 * Credit Check Step - Validates customer credit before processing order
 */
@Injectable()
export class O2CCreditCheckStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.CREDIT_CHECK;
  private readonly logger = new Logger(O2CCreditCheckStep.name);

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Executing credit check for order ${flow.orderNumber}`);

    try {
      const orderTotal = flow.orderData.total;
      const customerId = flow.orderData.customerId;

      // Perform credit check
      const creditCheckResult = await this.performCreditCheck(
        customerId,
        orderTotal,
        flow.orderData.currency,
        context,
      );

      // Store credit check data
      flow.creditCheckData = creditCheckResult;

      if (creditCheckResult.result === CreditCheckResult.APPROVED) {
        return {
          success: true,
          output: {
            result: creditCheckResult.result,
            creditLimit: creditCheckResult.creditLimit,
            availableCredit: creditCheckResult.availableCredit,
            currentBalance: creditCheckResult.currentBalance,
          },
        };
      } else if (creditCheckResult.result === CreditCheckResult.PENDING_REVIEW) {
        return {
          success: true,
          output: {
            result: creditCheckResult.result,
            message: 'Credit check pending manual review',
          },
        };
      } else {
        return {
          success: false,
          error: creditCheckResult.rejectionReason || 'Credit check rejected',
          errorCode: 'CREDIT_REJECTED',
          retryable: false,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Credit check failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'CREDIT_CHECK_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return !!flow.orderData?.customerId && !!flow.orderData?.total;
  }

  canRetry(error: string, attempt: number): boolean {
    // Don't retry if credit rejected
    if (error.includes('CREDIT_REJECTED')) {
      return false;
    }
    return attempt < 3;
  }

  private async performCreditCheck(
    customerId: string,
    orderAmount: number,
    currency: string,
    context: O2CStepContext,
  ): Promise<O2CCreditCheckData> {
    // If connector is configured, call external credit service
    if (context.connectorContext) {
      return this.externalCreditCheck(customerId, orderAmount, currency, context);
    }

    // Default internal credit check logic
    return this.internalCreditCheck(customerId, orderAmount, currency);
  }

  private async internalCreditCheck(
    customerId: string,
    orderAmount: number,
    currency: string,
  ): Promise<O2CCreditCheckData> {
    // Simple internal credit check simulation
    // In production, this would check against customer credit limits in the database

    const creditLimit = 10000; // Default credit limit
    const currentBalance = Math.random() * 5000; // Simulated balance
    const availableCredit = creditLimit - currentBalance;

    const checkId = uuidv4();
    const now = new Date();

    // Approve if order is within available credit
    if (orderAmount <= availableCredit) {
      return {
        checkId,
        result: CreditCheckResult.APPROVED,
        creditLimit,
        availableCredit,
        currentBalance,
        currency,
        checkedAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hour validity
      };
    }

    // Large orders go to manual review
    if (orderAmount > creditLimit * 0.5) {
      return {
        checkId,
        result: CreditCheckResult.PENDING_REVIEW,
        creditLimit,
        availableCredit,
        currentBalance,
        currency,
        checkedAt: now,
        rejectionReason: 'Order exceeds 50% of credit limit, requires manual review',
      };
    }

    // Otherwise reject
    return {
      checkId,
      result: CreditCheckResult.REJECTED,
      creditLimit,
      availableCredit,
      currentBalance,
      currency,
      checkedAt: now,
      rejectionReason: `Insufficient credit. Order: ${orderAmount}, Available: ${availableCredit}`,
    };
  }

  private async externalCreditCheck(
    customerId: string,
    orderAmount: number,
    currency: string,
    context: O2CStepContext,
  ): Promise<O2CCreditCheckData> {
    // This would call external credit check service via connector
    this.logger.log(`Calling external credit check for customer ${customerId}`);

    // Simulate external service response
    const checkId = uuidv4();
    const externalCheckId = `EXT-CC-${Date.now()}`;

    return {
      checkId,
      externalCheckId,
      result: CreditCheckResult.APPROVED,
      creditLimit: 50000,
      availableCredit: 45000,
      currentBalance: 5000,
      currency,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
}
