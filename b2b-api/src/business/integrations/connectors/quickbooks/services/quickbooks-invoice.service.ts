import { Injectable, Logger } from '@nestjs/common';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksInvoice,
  QuickBooksConnectorResult,
  QuickBooksApiResponse,
  QuickBooksCreateInvoiceInput,
  QuickBooksQueryOptions,
  QuickBooksLine,
  QuickBooksApiPaths,
} from '../interfaces';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';

/**
 * List invoices options
 */
export interface ListInvoicesOptions extends QuickBooksQueryOptions {
  /** Filter by customer ID */
  customerId?: string;

  /** Filter by date range start */
  fromDate?: string;

  /** Filter by date range end */
  toDate?: string;

  /** Filter by unpaid only */
  unpaidOnly?: boolean;

  /** Filter by overdue only */
  overdueOnly?: boolean;
}

/**
 * Get invoice options
 */
export interface GetInvoiceOptions {
  /** Include sparse fields only */
  sparse?: boolean;
}

/**
 * QuickBooks Invoice Service
 * Handles invoice CRUD operations
 */
@Injectable()
export class QuickBooksInvoiceService {
  private readonly logger = new Logger(QuickBooksInvoiceService.name);

  constructor(
    private readonly restClient: QuickBooksRestClientService,
    private readonly errorHandler: QuickBooksErrorHandlerService,
  ) {}

  /**
   * Create a new invoice
   */
  async create(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateInvoiceInput,
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice>> {
    this.logger.debug(`Creating invoice for customer: ${input.customerId}`);

    try {
      const invoicePayload = this.buildCreatePayload(input);

      const result = await this.restClient.post<{ Invoice: QuickBooksInvoice }>(
        config,
        credentials,
        QuickBooksApiPaths.INVOICE.replace('{realmId}', config.realmId),
        invoicePayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice>;
      }

      const responseData = result.data as { Invoice: QuickBooksInvoice };

      return {
        success: true,
        data: responseData.Invoice,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'create-invoice', 0);
    }
  }

  /**
   * Get invoice by ID
   */
  async getById(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    _options?: GetInvoiceOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice>> {
    this.logger.debug(`Getting invoice: ${invoiceId}`);

    try {
      const path = `${QuickBooksApiPaths.INVOICE.replace('{realmId}', config.realmId)}/${invoiceId}`;

      const result = await this.restClient.get<{ Invoice: QuickBooksInvoice }>(
        config,
        credentials,
        path,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice>;
      }

      const responseData = result.data as { Invoice: QuickBooksInvoice };

      return {
        success: true,
        data: responseData.Invoice,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-invoice', 0);
    }
  }

  /**
   * Get invoice by document number
   */
  async getByDocNumber(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    docNumber: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice | null>> {
    this.logger.debug(`Getting invoice by doc number: ${docNumber}`);

    try {
      const query = `SELECT * FROM Invoice WHERE DocNumber = '${this.escapeQueryString(docNumber)}'`;

      const result = await this.restClient.query<QuickBooksInvoice>(config, credentials, query, {
        maxResults: 1,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice | null>;
      }

      const invoices = result.data.QueryResponse?.Invoice || [];

      return {
        success: true,
        data: invoices.length > 0 ? invoices[0] : null,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-invoice-by-doc', 0);
    }
  }

  /**
   * List invoices with filtering and pagination
   */
  async list(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListInvoicesOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksApiResponse<QuickBooksInvoice>>> {
    this.logger.debug('Listing invoices');

    try {
      const query = this.buildListQuery(options);

      const result = await this.restClient.query<QuickBooksInvoice>(config, credentials, query, {
        startPosition: options?.startPosition,
        maxResults: options?.maxResults,
        orderBy: options?.orderBy,
      });

      return result;
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'list-invoices', 0);
    }
  }

  /**
   * Update invoice
   */
  async update(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateInvoiceInput>,
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice>> {
    this.logger.debug(`Updating invoice: ${invoiceId}`);

    try {
      const updatePayload = this.buildUpdatePayload(invoiceId, syncToken, input);

      const result = await this.restClient.post<{ Invoice: QuickBooksInvoice }>(
        config,
        credentials,
        QuickBooksApiPaths.INVOICE.replace('{realmId}', config.realmId),
        updatePayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice>;
      }

      const responseData = result.data as { Invoice: QuickBooksInvoice };

      return {
        success: true,
        data: responseData.Invoice,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'update-invoice', 0);
    }
  }

  /**
   * Void invoice (delete is not supported)
   */
  async void(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice>> {
    this.logger.debug(`Voiding invoice: ${invoiceId}`);

    try {
      const path = QuickBooksApiPaths.INVOICE.replace('{realmId}', config.realmId);

      const result = await this.restClient.post<{ Invoice: QuickBooksInvoice }>(
        config,
        credentials,
        path,
        {
          Id: invoiceId,
          SyncToken: syncToken,
        },
        { operation: 'void' },
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice>;
      }

      const responseData = result.data as { Invoice: QuickBooksInvoice };

      return {
        success: true,
        data: responseData.Invoice,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'void-invoice', 0);
    }
  }

  /**
   * Send invoice via email
   */
  async send(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    email?: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice>> {
    this.logger.debug(`Sending invoice: ${invoiceId} to ${email || 'customer email'}`);

    try {
      const path = `${QuickBooksApiPaths.INVOICE.replace('{realmId}', config.realmId)}/${invoiceId}`;

      const result = await this.restClient.send<{ Invoice: QuickBooksInvoice }>(
        config,
        credentials,
        path,
        email,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice>;
      }

      const responseData = result.data as { Invoice: QuickBooksInvoice };

      return {
        success: true,
        data: responseData.Invoice,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'send-invoice', 0);
    }
  }

  /**
   * Get outstanding (unpaid) invoices
   */
  async getOutstanding(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice[]>> {
    this.logger.debug('Getting outstanding invoices');

    try {
      let query = 'SELECT * FROM Invoice WHERE Balance > 0';

      if (customerId) {
        query += ` AND CustomerRef = '${customerId}'`;
      }

      const result = await this.restClient.query<QuickBooksInvoice>(config, credentials, query, {
        startPosition: options?.offset ? options.offset + 1 : 1,
        maxResults: options?.limit || 100,
        orderBy: 'DueDate',
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice[]>;
      }

      const invoices = result.data.QueryResponse?.Invoice || [];

      return {
        success: true,
        data: invoices,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-outstanding', 0);
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdue(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId?: string,
    options?: { limit?: number },
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice[]>> {
    this.logger.debug('Getting overdue invoices');

    try {
      const today = new Date().toISOString().split('T')[0];
      let query = `SELECT * FROM Invoice WHERE Balance > 0 AND DueDate < '${today}'`;

      if (customerId) {
        query += ` AND CustomerRef = '${customerId}'`;
      }

      const result = await this.restClient.query<QuickBooksInvoice>(config, credentials, query, {
        maxResults: options?.limit || 100,
        orderBy: 'DueDate',
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksInvoice[]>;
      }

      const invoices = result.data.QueryResponse?.Invoice || [];

      return {
        success: true,
        data: invoices,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-overdue', 0);
    }
  }

  /**
   * Build create invoice payload
   */
  private buildCreatePayload(input: QuickBooksCreateInvoiceInput): QuickBooksInvoice {
    const invoice: QuickBooksInvoice = {
      CustomerRef: { value: input.customerId },
      Line: this.buildLineItems(input.lines),
    };

    if (input.txnDate) {
      invoice.TxnDate = input.txnDate;
    }

    if (input.dueDate) {
      invoice.DueDate = input.dueDate;
    }

    if (input.docNumber) {
      invoice.DocNumber = input.docNumber;
    }

    if (input.privateNote) {
      invoice.PrivateNote = input.privateNote;
    }

    if (input.customerMemo) {
      invoice.CustomerMemo = { value: input.customerMemo };
    }

    if (input.billingAddress) {
      invoice.BillAddr = {
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
      invoice.ShipAddr = {
        Line1: input.shippingAddress.line1,
        Line2: input.shippingAddress.line2,
        Line3: input.shippingAddress.line3,
        City: input.shippingAddress.city,
        CountrySubDivisionCode: input.shippingAddress.state,
        PostalCode: input.shippingAddress.postalCode,
        Country: input.shippingAddress.country,
      };
    }

    if (input.shipDate) {
      invoice.ShipDate = input.shipDate;
    }

    if (input.trackingNum) {
      invoice.TrackingNum = input.trackingNum;
    }

    if (input.billEmail) {
      invoice.BillEmail = { Address: input.billEmail };
    }

    if (input.paymentTermsId) {
      invoice.SalesTermRef = { value: input.paymentTermsId };
    }

    if (input.applyTaxAfterDiscount !== undefined) {
      invoice.ApplyTaxAfterDiscount = input.applyTaxAfterDiscount;
    }

    return invoice;
  }

  /**
   * Build line items for invoice
   */
  private buildLineItems(lines: QuickBooksCreateInvoiceInput['lines']): QuickBooksLine[] {
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
   * Build update invoice payload
   */
  private buildUpdatePayload(
    invoiceId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateInvoiceInput>,
  ): QuickBooksInvoice {
    const invoice: QuickBooksInvoice & { sparse?: boolean } = {
      Id: invoiceId,
      SyncToken: syncToken,
      sparse: true,
    };

    if (input.txnDate) {
      invoice.TxnDate = input.txnDate;
    }

    if (input.dueDate) {
      invoice.DueDate = input.dueDate;
    }

    if (input.privateNote) {
      invoice.PrivateNote = input.privateNote;
    }

    if (input.customerMemo) {
      invoice.CustomerMemo = { value: input.customerMemo };
    }

    if (input.lines) {
      invoice.Line = this.buildLineItems(input.lines);
    }

    if (input.billingAddress) {
      invoice.BillAddr = {
        Line1: input.billingAddress.line1,
        Line2: input.billingAddress.line2,
        Line3: input.billingAddress.line3,
        City: input.billingAddress.city,
        CountrySubDivisionCode: input.billingAddress.state,
        PostalCode: input.billingAddress.postalCode,
        Country: input.billingAddress.country,
      };
    }

    if (input.billEmail) {
      invoice.BillEmail = { Address: input.billEmail };
    }

    return invoice;
  }

  /**
   * Build list query
   */
  private buildListQuery(options?: ListInvoicesOptions): string {
    let query = 'SELECT * FROM Invoice';
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

    if (options?.unpaidOnly) {
      conditions.push('Balance > 0');
    }

    if (options?.overdueOnly) {
      const today = new Date().toISOString().split('T')[0];
      conditions.push('Balance > 0');
      conditions.push(`DueDate < '${today}'`);
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
