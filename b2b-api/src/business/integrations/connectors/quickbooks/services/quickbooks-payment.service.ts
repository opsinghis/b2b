import { Injectable, Logger } from '@nestjs/common';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksPayment,
  QuickBooksConnectorResult,
  QuickBooksApiResponse,
  QuickBooksCreatePaymentInput,
  QuickBooksQueryOptions,
  QuickBooksApiPaths,
  QuickBooksLinkedTxn,
} from '../interfaces';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';

/**
 * List payments options
 */
export interface ListPaymentsOptions extends QuickBooksQueryOptions {
  /** Filter by customer ID */
  customerId?: string;

  /** Filter by date range start */
  fromDate?: string;

  /** Filter by date range end */
  toDate?: string;
}

/**
 * Get payment options
 */
export interface GetPaymentOptions {
  /** Include sparse fields only */
  sparse?: boolean;
}

/**
 * QuickBooks Payment Service
 * Handles payment CRUD operations
 */
@Injectable()
export class QuickBooksPaymentService {
  private readonly logger = new Logger(QuickBooksPaymentService.name);

  constructor(
    private readonly restClient: QuickBooksRestClientService,
    private readonly errorHandler: QuickBooksErrorHandlerService,
  ) {}

  /**
   * Create a new payment
   */
  async create(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreatePaymentInput,
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment>> {
    this.logger.debug(
      `Creating payment for customer: ${input.customerId}, amount: ${input.totalAmt}`,
    );

    try {
      const paymentPayload = this.buildCreatePayload(input);

      const result = await this.restClient.post<{ Payment: QuickBooksPayment }>(
        config,
        credentials,
        QuickBooksApiPaths.PAYMENT.replace('{realmId}', config.realmId),
        paymentPayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksPayment>;
      }

      const responseData = result.data as { Payment: QuickBooksPayment };

      return {
        success: true,
        data: responseData.Payment,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'create-payment', 0);
    }
  }

  /**
   * Get payment by ID
   */
  async getById(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    paymentId: string,
    _options?: GetPaymentOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment>> {
    this.logger.debug(`Getting payment: ${paymentId}`);

    try {
      const path = `${QuickBooksApiPaths.PAYMENT.replace('{realmId}', config.realmId)}/${paymentId}`;

      const result = await this.restClient.get<{ Payment: QuickBooksPayment }>(
        config,
        credentials,
        path,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksPayment>;
      }

      const responseData = result.data as { Payment: QuickBooksPayment };

      return {
        success: true,
        data: responseData.Payment,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-payment', 0);
    }
  }

  /**
   * List payments with filtering and pagination
   */
  async list(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListPaymentsOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksApiResponse<QuickBooksPayment>>> {
    this.logger.debug('Listing payments');

    try {
      const query = this.buildListQuery(options);

      const result = await this.restClient.query<QuickBooksPayment>(config, credentials, query, {
        startPosition: options?.startPosition,
        maxResults: options?.maxResults,
        orderBy: options?.orderBy,
      });

      return result;
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'list-payments', 0);
    }
  }

  /**
   * Update payment (partial update)
   */
  async update(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    paymentId: string,
    syncToken: string,
    input: Partial<QuickBooksCreatePaymentInput>,
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment>> {
    this.logger.debug(`Updating payment: ${paymentId}`);

    try {
      const updatePayload = this.buildUpdatePayload(paymentId, syncToken, input);

      const result = await this.restClient.post<{ Payment: QuickBooksPayment }>(
        config,
        credentials,
        QuickBooksApiPaths.PAYMENT.replace('{realmId}', config.realmId),
        updatePayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksPayment>;
      }

      const responseData = result.data as { Payment: QuickBooksPayment };

      return {
        success: true,
        data: responseData.Payment,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'update-payment', 0);
    }
  }

  /**
   * Void payment
   */
  async void(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    paymentId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment>> {
    this.logger.debug(`Voiding payment: ${paymentId}`);

    try {
      const path = QuickBooksApiPaths.PAYMENT.replace('{realmId}', config.realmId);

      const result = await this.restClient.post<{ Payment: QuickBooksPayment }>(
        config,
        credentials,
        path,
        {
          Id: paymentId,
          SyncToken: syncToken,
        },
        { operation: 'void' },
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksPayment>;
      }

      const responseData = result.data as { Payment: QuickBooksPayment };

      return {
        success: true,
        data: responseData.Payment,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'void-payment', 0);
    }
  }

  /**
   * Get payments for a specific invoice
   */
  async getForInvoice(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment[]>> {
    this.logger.debug(`Getting payments for invoice: ${invoiceId}`);

    try {
      // QuickBooks doesn't have direct query for payments by invoice
      // We need to query payments and filter by linked transactions
      const query = 'SELECT * FROM Payment';

      const result = await this.restClient.query<QuickBooksPayment>(config, credentials, query, {
        maxResults: 1000,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksPayment[]>;
      }

      const allPayments = result.data.QueryResponse?.Payment || [];

      // Filter payments that have the invoice in their Line.LinkedTxn
      const filteredPayments = allPayments.filter((payment) =>
        payment.Line?.some((line) =>
          line.LinkedTxn?.some((txn) => txn.TxnType === 'Invoice' && txn.TxnId === invoiceId),
        ),
      );

      return {
        success: true,
        data: filteredPayments,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-payments-for-invoice', 0);
    }
  }

  /**
   * Get payments for a customer
   */
  async getForCustomer(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId: string,
    options?: { fromDate?: string; toDate?: string; limit?: number },
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment[]>> {
    this.logger.debug(`Getting payments for customer: ${customerId}`);

    try {
      let query = `SELECT * FROM Payment WHERE CustomerRef = '${customerId}'`;

      if (options?.fromDate) {
        query += ` AND TxnDate >= '${options.fromDate}'`;
      }

      if (options?.toDate) {
        query += ` AND TxnDate <= '${options.toDate}'`;
      }

      const result = await this.restClient.query<QuickBooksPayment>(config, credentials, query, {
        maxResults: options?.limit || 100,
        orderBy: 'TxnDate DESC',
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksPayment[]>;
      }

      const payments = result.data.QueryResponse?.Payment || [];

      return {
        success: true,
        data: payments,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-payments-for-customer', 0);
    }
  }

  /**
   * Get unapplied payments for a customer
   */
  async getUnapplied(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId?: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment[]>> {
    this.logger.debug('Getting unapplied payments');

    try {
      let query = 'SELECT * FROM Payment WHERE UnappliedAmt > 0';

      if (customerId) {
        query += ` AND CustomerRef = '${customerId}'`;
      }

      const result = await this.restClient.query<QuickBooksPayment>(config, credentials, query, {
        maxResults: 100,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksPayment[]>;
      }

      const payments = result.data.QueryResponse?.Payment || [];

      return {
        success: true,
        data: payments,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-unapplied-payments', 0);
    }
  }

  /**
   * Build create payment payload
   */
  private buildCreatePayload(input: QuickBooksCreatePaymentInput): QuickBooksPayment {
    const payment: QuickBooksPayment = {
      CustomerRef: { value: input.customerId },
      TotalAmt: input.totalAmt,
    };

    if (input.txnDate) {
      payment.TxnDate = input.txnDate;
    }

    if (input.paymentMethodId) {
      payment.PaymentMethodRef = { value: input.paymentMethodId };
    }

    if (input.paymentRefNum) {
      payment.PaymentRefNum = input.paymentRefNum;
    }

    if (input.privateNote) {
      payment.PrivateNote = input.privateNote;
    }

    if (input.depositToAccountId) {
      payment.DepositToAccountRef = { value: input.depositToAccountId };
    }

    if (input.processPayment !== undefined) {
      payment.ProcessPayment = input.processPayment;
    }

    // Build line items for invoice application
    if (input.invoices && input.invoices.length > 0) {
      payment.Line = input.invoices.map((inv) => ({
        Amount: inv.amount ?? input.totalAmt / input.invoices!.length,
        LinkedTxn: [
          {
            TxnId: inv.invoiceId,
            TxnType: 'Invoice',
          } as QuickBooksLinkedTxn,
        ],
      }));
    }

    return payment;
  }

  /**
   * Build update payment payload
   */
  private buildUpdatePayload(
    paymentId: string,
    syncToken: string,
    input: Partial<QuickBooksCreatePaymentInput>,
  ): QuickBooksPayment {
    const payment: QuickBooksPayment & { sparse?: boolean } = {
      Id: paymentId,
      SyncToken: syncToken,
      sparse: true,
    };

    if (input.totalAmt !== undefined) {
      payment.TotalAmt = input.totalAmt;
    }

    if (input.txnDate) {
      payment.TxnDate = input.txnDate;
    }

    if (input.paymentMethodId) {
      payment.PaymentMethodRef = { value: input.paymentMethodId };
    }

    if (input.paymentRefNum) {
      payment.PaymentRefNum = input.paymentRefNum;
    }

    if (input.privateNote) {
      payment.PrivateNote = input.privateNote;
    }

    return payment;
  }

  /**
   * Build list query
   */
  private buildListQuery(options?: ListPaymentsOptions): string {
    let query = 'SELECT * FROM Payment';
    const conditions: string[] = [];

    if (options?.customerId) {
      conditions.push(`CustomerRef = '${options.customerId}'`);
    }

    if (options?.fromDate) {
      conditions.push(`TxnDate >= '${options.fromDate}'`);
    }

    if (options?.toDate) {
      conditions.push(`TxnDate <= '${options.toDate}'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    return query;
  }
}
