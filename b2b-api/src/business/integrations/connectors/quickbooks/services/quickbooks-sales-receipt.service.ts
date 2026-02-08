import { Injectable, Logger } from '@nestjs/common';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksSalesReceipt,
  QuickBooksConnectorResult,
  QuickBooksApiResponse,
  QuickBooksCreateSalesReceiptInput,
  QuickBooksQueryOptions,
  QuickBooksLine,
  QuickBooksApiPaths,
} from '../interfaces';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';

/**
 * List sales receipts options
 */
export interface ListSalesReceiptsOptions extends QuickBooksQueryOptions {
  /** Filter by customer ID */
  customerId?: string;

  /** Filter by date range start */
  fromDate?: string;

  /** Filter by date range end */
  toDate?: string;
}

/**
 * Get sales receipt options
 */
export interface GetSalesReceiptOptions {
  /** Include sparse fields only */
  sparse?: boolean;
}

/**
 * QuickBooks Sales Receipt Service
 * Handles sales receipt (cash sales) operations
 */
@Injectable()
export class QuickBooksSalesReceiptService {
  private readonly logger = new Logger(QuickBooksSalesReceiptService.name);

  constructor(
    private readonly restClient: QuickBooksRestClientService,
    private readonly errorHandler: QuickBooksErrorHandlerService,
  ) {}

  /**
   * Create a new sales receipt
   */
  async create(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateSalesReceiptInput,
  ): Promise<QuickBooksConnectorResult<QuickBooksSalesReceipt>> {
    this.logger.debug(`Creating sales receipt for customer: ${input.customerId || 'walk-in'}`);

    try {
      const salesReceiptPayload = this.buildCreatePayload(input);

      const result = await this.restClient.post<{ SalesReceipt: QuickBooksSalesReceipt }>(
        config,
        credentials,
        QuickBooksApiPaths.SALES_RECEIPT.replace('{realmId}', config.realmId),
        salesReceiptPayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksSalesReceipt>;
      }

      const responseData = result.data as { SalesReceipt: QuickBooksSalesReceipt };

      return {
        success: true,
        data: responseData.SalesReceipt,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'create-sales-receipt', 0);
    }
  }

  /**
   * Get sales receipt by ID
   */
  async getById(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    salesReceiptId: string,
    _options?: GetSalesReceiptOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksSalesReceipt>> {
    this.logger.debug(`Getting sales receipt: ${salesReceiptId}`);

    try {
      const path = `${QuickBooksApiPaths.SALES_RECEIPT.replace('{realmId}', config.realmId)}/${salesReceiptId}`;

      const result = await this.restClient.get<{ SalesReceipt: QuickBooksSalesReceipt }>(
        config,
        credentials,
        path,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksSalesReceipt>;
      }

      const responseData = result.data as { SalesReceipt: QuickBooksSalesReceipt };

      return {
        success: true,
        data: responseData.SalesReceipt,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-sales-receipt', 0);
    }
  }

  /**
   * Get sales receipt by document number
   */
  async getByDocNumber(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    docNumber: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksSalesReceipt | null>> {
    this.logger.debug(`Getting sales receipt by doc number: ${docNumber}`);

    try {
      const query = `SELECT * FROM SalesReceipt WHERE DocNumber = '${this.escapeQueryString(docNumber)}'`;

      const result = await this.restClient.query<QuickBooksSalesReceipt>(
        config,
        credentials,
        query,
        { maxResults: 1 },
      );

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksSalesReceipt | null>;
      }

      const salesReceipts = result.data.QueryResponse?.SalesReceipt || [];

      return {
        success: true,
        data: salesReceipts.length > 0 ? salesReceipts[0] : null,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-sales-receipt-by-doc', 0);
    }
  }

  /**
   * List sales receipts with filtering and pagination
   */
  async list(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListSalesReceiptsOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksApiResponse<QuickBooksSalesReceipt>>> {
    this.logger.debug('Listing sales receipts');

    try {
      const query = this.buildListQuery(options);

      const result = await this.restClient.query<QuickBooksSalesReceipt>(
        config,
        credentials,
        query,
        {
          startPosition: options?.startPosition,
          maxResults: options?.maxResults,
          orderBy: options?.orderBy,
        },
      );

      return result;
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'list-sales-receipts', 0);
    }
  }

  /**
   * Update sales receipt
   */
  async update(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    salesReceiptId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateSalesReceiptInput>,
  ): Promise<QuickBooksConnectorResult<QuickBooksSalesReceipt>> {
    this.logger.debug(`Updating sales receipt: ${salesReceiptId}`);

    try {
      const updatePayload = this.buildUpdatePayload(salesReceiptId, syncToken, input);

      const result = await this.restClient.post<{ SalesReceipt: QuickBooksSalesReceipt }>(
        config,
        credentials,
        QuickBooksApiPaths.SALES_RECEIPT.replace('{realmId}', config.realmId),
        updatePayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksSalesReceipt>;
      }

      const responseData = result.data as { SalesReceipt: QuickBooksSalesReceipt };

      return {
        success: true,
        data: responseData.SalesReceipt,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'update-sales-receipt', 0);
    }
  }

  /**
   * Void sales receipt
   */
  async void(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    salesReceiptId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksSalesReceipt>> {
    this.logger.debug(`Voiding sales receipt: ${salesReceiptId}`);

    try {
      const path = QuickBooksApiPaths.SALES_RECEIPT.replace('{realmId}', config.realmId);

      const result = await this.restClient.post<{ SalesReceipt: QuickBooksSalesReceipt }>(
        config,
        credentials,
        path,
        {
          Id: salesReceiptId,
          SyncToken: syncToken,
        },
        { operation: 'void' },
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksSalesReceipt>;
      }

      const responseData = result.data as { SalesReceipt: QuickBooksSalesReceipt };

      return {
        success: true,
        data: responseData.SalesReceipt,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'void-sales-receipt', 0);
    }
  }

  /**
   * Send sales receipt via email
   */
  async send(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    salesReceiptId: string,
    email?: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksSalesReceipt>> {
    this.logger.debug(`Sending sales receipt: ${salesReceiptId} to ${email || 'customer email'}`);

    try {
      const path = `${QuickBooksApiPaths.SALES_RECEIPT.replace('{realmId}', config.realmId)}/${salesReceiptId}`;

      const result = await this.restClient.send<{ SalesReceipt: QuickBooksSalesReceipt }>(
        config,
        credentials,
        path,
        email,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksSalesReceipt>;
      }

      const responseData = result.data as { SalesReceipt: QuickBooksSalesReceipt };

      return {
        success: true,
        data: responseData.SalesReceipt,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'send-sales-receipt', 0);
    }
  }

  /**
   * Build create sales receipt payload
   */
  private buildCreatePayload(input: QuickBooksCreateSalesReceiptInput): QuickBooksSalesReceipt {
    const salesReceipt: QuickBooksSalesReceipt = {
      Line: this.buildLineItems(input.lines),
    };

    if (input.customerId) {
      salesReceipt.CustomerRef = { value: input.customerId };
    }

    if (input.txnDate) {
      salesReceipt.TxnDate = input.txnDate;
    }

    if (input.docNumber) {
      salesReceipt.DocNumber = input.docNumber;
    }

    if (input.privateNote) {
      salesReceipt.PrivateNote = input.privateNote;
    }

    if (input.customerMemo) {
      salesReceipt.CustomerMemo = { value: input.customerMemo };
    }

    if (input.billingAddress) {
      salesReceipt.BillAddr = {
        Line1: input.billingAddress.line1,
        Line2: input.billingAddress.line2,
        Line3: input.billingAddress.line3,
        City: input.billingAddress.city,
        CountrySubDivisionCode: input.billingAddress.state,
        PostalCode: input.billingAddress.postalCode,
        Country: input.billingAddress.country,
      };
    }

    if (input.shippingAddress) {
      salesReceipt.ShipAddr = {
        Line1: input.shippingAddress.line1,
        Line2: input.shippingAddress.line2,
        Line3: input.shippingAddress.line3,
        City: input.shippingAddress.city,
        CountrySubDivisionCode: input.shippingAddress.state,
        PostalCode: input.shippingAddress.postalCode,
        Country: input.shippingAddress.country,
      };
    }

    if (input.paymentMethodId) {
      salesReceipt.PaymentMethodRef = { value: input.paymentMethodId };
    }

    if (input.paymentRefNum) {
      salesReceipt.PaymentRefNum = input.paymentRefNum;
    }

    if (input.depositToAccountId) {
      salesReceipt.DepositToAccountRef = { value: input.depositToAccountId };
    }

    return salesReceipt;
  }

  /**
   * Build line items for sales receipt
   */
  private buildLineItems(lines: QuickBooksCreateSalesReceiptInput['lines']): QuickBooksLine[] {
    return lines.map((line, index) => {
      const qbLine: QuickBooksLine = {
        LineNum: index + 1,
        DetailType: 'SalesItemLineDetail',
        Amount:
          line.amount ?? (line.quantity && line.unitPrice ? line.quantity * line.unitPrice : 0),
        SalesItemLineDetail: {},
      };

      if (line.description) {
        qbLine.Description = line.description;
      }

      if (line.itemId) {
        qbLine.SalesItemLineDetail!.ItemRef = { value: line.itemId };
      }

      if (line.quantity !== undefined) {
        qbLine.SalesItemLineDetail!.Qty = line.quantity;
      }

      if (line.unitPrice !== undefined) {
        qbLine.SalesItemLineDetail!.UnitPrice = line.unitPrice;
      }

      if (line.serviceDate) {
        qbLine.SalesItemLineDetail!.ServiceDate = line.serviceDate;
      }

      if (line.taxCodeId) {
        qbLine.SalesItemLineDetail!.TaxCodeRef = { value: line.taxCodeId };
      }

      return qbLine;
    });
  }

  /**
   * Build update sales receipt payload
   */
  private buildUpdatePayload(
    salesReceiptId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateSalesReceiptInput>,
  ): QuickBooksSalesReceipt {
    const salesReceipt: QuickBooksSalesReceipt & { sparse?: boolean } = {
      Id: salesReceiptId,
      SyncToken: syncToken,
      sparse: true,
    };

    if (input.txnDate) {
      salesReceipt.TxnDate = input.txnDate;
    }

    if (input.privateNote) {
      salesReceipt.PrivateNote = input.privateNote;
    }

    if (input.customerMemo) {
      salesReceipt.CustomerMemo = { value: input.customerMemo };
    }

    if (input.lines) {
      salesReceipt.Line = this.buildLineItems(input.lines);
    }

    if (input.billingAddress) {
      salesReceipt.BillAddr = {
        Line1: input.billingAddress.line1,
        Line2: input.billingAddress.line2,
        Line3: input.billingAddress.line3,
        City: input.billingAddress.city,
        CountrySubDivisionCode: input.billingAddress.state,
        PostalCode: input.billingAddress.postalCode,
        Country: input.billingAddress.country,
      };
    }

    if (input.paymentMethodId) {
      salesReceipt.PaymentMethodRef = { value: input.paymentMethodId };
    }

    if (input.paymentRefNum) {
      salesReceipt.PaymentRefNum = input.paymentRefNum;
    }

    return salesReceipt;
  }

  /**
   * Build list query
   */
  private buildListQuery(options?: ListSalesReceiptsOptions): string {
    let query = 'SELECT * FROM SalesReceipt';
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

  /**
   * Escape query string for QuickBooks query language
   */
  private escapeQueryString(value: string): string {
    return value.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}
