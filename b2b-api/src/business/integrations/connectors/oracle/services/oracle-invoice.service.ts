import { Injectable, Logger } from '@nestjs/common';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleInvoice,
  OracleInvoiceLine,
  OracleApiPaths,
  OracleConnectorResult,
  OracleApiResponse,
  OracleInvoiceStatus,
} from '../interfaces';
import { OracleRestClientService } from './oracle-rest-client.service';
import { OracleErrorHandlerService } from './oracle-error-handler.service';

/**
 * List invoices options
 */
export interface ListInvoicesOptions {
  /** Filter by customer account ID */
  customerId?: string;

  /** Filter by customer account number */
  customerAccountNumber?: string;

  /** Filter by status */
  status?: string;

  /** Filter by transaction type */
  transactionType?: string;

  /** Filter by business unit ID */
  businessUnitId?: number;

  /** Filter by sales order ID */
  salesOrderId?: number;

  /** Created after date */
  createdAfter?: string;

  /** Created before date */
  createdBefore?: string;

  /** Due after date */
  dueAfter?: string;

  /** Due before date */
  dueBefore?: string;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Include line items */
  includeLines?: boolean;

  /** Order by field */
  orderBy?: string;
}

/**
 * Get invoice options
 */
export interface GetInvoiceOptions {
  /** Include line items */
  includeLines?: boolean;

  /** Additional fields to select */
  fields?: string[];

  /** Expand related resources */
  expand?: string[];
}

/**
 * Oracle ERP Cloud Invoice Service
 * Handles Receivables Invoice operations
 */
@Injectable()
export class OracleInvoiceService {
  private readonly logger = new Logger(OracleInvoiceService.name);

  constructor(
    private readonly restClient: OracleRestClientService,
    private readonly errorHandler: OracleErrorHandlerService,
  ) {}

  /**
   * Get invoice by ID
   */
  async getById(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    invoiceId: string | number,
    options?: GetInvoiceOptions,
  ): Promise<OracleConnectorResult<OracleInvoice>> {
    const params: Record<string, string | boolean | undefined> = {};

    if (options?.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }

    if (options?.expand && options.expand.length > 0) {
      params.expand = options.expand.join(',');
    } else if (options?.includeLines) {
      params.expand = 'receivablesInvoiceLines';
    }

    const result = await this.restClient.getById<OracleInvoice>(
      config,
      credentials,
      OracleApiPaths.INVOICES,
      invoiceId,
      { params },
    );

    // Fetch lines separately if needed
    if (result.success && result.data && options?.includeLines && !result.data.Lines) {
      const linesResult = await this.getInvoiceLines(config, credentials, invoiceId);

      if (linesResult.success && linesResult.data?.items) {
        result.data.Lines = linesResult.data.items;
      }
    }

    return result;
  }

  /**
   * Get invoice by transaction number
   */
  async getByTransactionNumber(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    transactionNumber: string,
    options?: GetInvoiceOptions,
  ): Promise<OracleConnectorResult<OracleInvoice | null>> {
    const result = await this.restClient.get<OracleInvoice>(
      config,
      credentials,
      OracleApiPaths.INVOICES,
      {
        params: {
          q: `TransactionNumber='${transactionNumber}'`,
          limit: 1,
        },
      },
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const invoice = result.data?.items?.[0] || null;

    // Fetch lines if requested and invoice found
    if (invoice && options?.includeLines) {
      const linesResult = await this.getInvoiceLines(config, credentials, invoice.CustomerTrxId!);

      if (linesResult.success && linesResult.data?.items) {
        invoice.Lines = linesResult.data.items;
      }
    }

    return {
      success: true,
      data: invoice,
      metadata: result.metadata,
    };
  }

  /**
   * List invoices
   */
  async list(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListInvoicesOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleInvoice>>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    const filters: string[] = [];

    // Build filters
    if (options?.customerId) {
      if (isNaN(Number(options.customerId))) {
        filters.push(`CustomerAccountNumber='${options.customerId}'`);
      } else {
        filters.push(`CustomerAccountId=${options.customerId}`);
      }
    }

    if (options?.customerAccountNumber) {
      filters.push(`CustomerAccountNumber='${options.customerAccountNumber}'`);
    }

    if (options?.status) {
      filters.push(`Status='${options.status}'`);
    }

    if (options?.transactionType) {
      filters.push(`TransactionTypeName='${options.transactionType}'`);
    }

    if (options?.businessUnitId) {
      filters.push(`BusinessUnitId=${options.businessUnitId}`);
    }

    if (options?.salesOrderId) {
      filters.push(`SalesOrderId=${options.salesOrderId}`);
    }

    if (options?.createdAfter) {
      filters.push(`CreationDate>='${options.createdAfter}'`);
    }

    if (options?.createdBefore) {
      filters.push(`CreationDate<='${options.createdBefore}'`);
    }

    if (options?.dueAfter) {
      filters.push(`DueDate>='${options.dueAfter}'`);
    }

    if (options?.dueBefore) {
      filters.push(`DueDate<='${options.dueBefore}'`);
    }

    // Apply filters
    if (filters.length > 0) {
      params.q = filters.join(' and ');
    }

    // Pagination
    if (options?.limit) {
      params.limit = options.limit;
    }

    if (options?.offset) {
      params.offset = options.offset;
    }

    // Ordering
    if (options?.orderBy) {
      params.orderBy = options.orderBy;
    }

    // Expand lines if requested
    if (options?.includeLines) {
      params.expand = 'receivablesInvoiceLines';
    }

    params.totalResults = true;

    return this.restClient.get<OracleInvoice>(config, credentials, OracleApiPaths.INVOICES, {
      params,
    });
  }

  /**
   * Get invoice lines
   */
  async getInvoiceLines(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    invoiceId: string | number,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleInvoiceLine>>> {
    const path = OracleApiPaths.INVOICE_LINES.replace('{CustomerTrxId}', String(invoiceId));

    return this.restClient.get<OracleInvoiceLine>(config, credentials, path, {
      params: { totalResults: true },
    });
  }

  /**
   * Get invoices for sales order
   */
  async getForSalesOrder(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    salesOrderId: string | number,
    options?: {
      includeLines?: boolean;
    },
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleInvoice>>> {
    return this.list(config, credentials, {
      salesOrderId: Number(salesOrderId),
      includeLines: options?.includeLines,
    });
  }

  /**
   * Get invoices for customer
   */
  async getForCustomer(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string,
    options?: {
      status?: string;
      limit?: number;
      includeLines?: boolean;
    },
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleInvoice>>> {
    return this.list(config, credentials, {
      customerId,
      status: options?.status,
      limit: options?.limit,
      includeLines: options?.includeLines,
      orderBy: 'CreationDate:desc',
    });
  }

  /**
   * Get outstanding invoices (unpaid)
   */
  async getOutstanding(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId?: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleInvoice>>> {
    // Filter for invoices with balance due
    const filters: string[] = [`BalanceDue > 0`];

    if (customerId) {
      if (isNaN(Number(customerId))) {
        filters.push(`CustomerAccountNumber='${customerId}'`);
      } else {
        filters.push(`CustomerAccountId=${customerId}`);
      }
    }

    return this.restClient.get<OracleInvoice>(config, credentials, OracleApiPaths.INVOICES, {
      params: {
        q: filters.join(' and '),
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'DueDate:asc',
        totalResults: true,
      },
    });
  }

  /**
   * Get overdue invoices
   */
  async getOverdue(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId?: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleInvoice>>> {
    const today = new Date().toISOString().split('T')[0];
    const filters: string[] = [`BalanceDue > 0`, `DueDate < '${today}'`];

    if (customerId) {
      if (isNaN(Number(customerId))) {
        filters.push(`CustomerAccountNumber='${customerId}'`);
      } else {
        filters.push(`CustomerAccountId=${customerId}`);
      }
    }

    return this.restClient.get<OracleInvoice>(config, credentials, OracleApiPaths.INVOICES, {
      params: {
        q: filters.join(' and '),
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'DueDate:asc',
        totalResults: true,
      },
    });
  }

  /**
   * Get invoice status name
   */
  getStatusName(statusCode?: string): string {
    switch (statusCode) {
      case OracleInvoiceStatus.INCOMPLETE:
        return 'Incomplete';
      case OracleInvoiceStatus.COMPLETE:
        return 'Complete';
      case OracleInvoiceStatus.APPROVED:
        return 'Approved';
      case OracleInvoiceStatus.PENDING_APPROVAL:
        return 'Pending Approval';
      case OracleInvoiceStatus.REJECTED:
        return 'Rejected';
      case OracleInvoiceStatus.CLOSED:
        return 'Closed';
      case OracleInvoiceStatus.VOID:
        return 'Void';
      default:
        return statusCode || 'Unknown';
    }
  }

  /**
   * Calculate invoice totals
   */
  calculateTotals(invoice: OracleInvoice): {
    subtotal: number;
    tax: number;
    freight: number;
    total: number;
    amountDue: number;
    amountPaid: number;
  } {
    const subtotal = invoice.InvoicedAmount || 0;
    const tax = invoice.TaxAmount || 0;
    const freight = invoice.FreightAmount || 0;
    const total = subtotal + tax + freight;
    const amountDue = invoice.BalanceDue || 0;
    const amountPaid = invoice.AmountApplied || 0;

    return {
      subtotal,
      tax,
      freight,
      total,
      amountDue,
      amountPaid,
    };
  }
}
