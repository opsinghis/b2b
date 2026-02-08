import { Injectable, Logger } from '@nestjs/common';
import {
  SapConnectionConfig,
  SapCredentials,
  SapODataQueryOptions,
  SapODataServicePaths,
  SapBillingDocument,
  SapBillingDocumentItem,
  SapConnectorResult,
  SapODataResponse,
} from '../interfaces';
import { SapODataClientService } from './sap-odata-client.service';

/**
 * Billing document types
 */
export enum SapBillingDocumentType {
  INVOICE = 'F2',
  CREDIT_MEMO = 'G2',
  DEBIT_MEMO = 'L2',
  PRO_FORMA_INVOICE = 'F5',
  CANCELLATION = 'S1',
}

/**
 * SAP Billing Document (Invoice) Service
 * Handles read operations for SAP Billing Documents (A_BillingDocument)
 */
@Injectable()
export class SapBillingDocumentService {
  private readonly logger = new Logger(SapBillingDocumentService.name);
  private readonly servicePath = SapODataServicePaths.BILLING_DOCUMENT;
  private readonly entitySet = 'A_BillingDocument';
  private readonly itemEntitySet = 'A_BillingDocumentItem';

  constructor(private readonly odataClient: SapODataClientService) {}

  /**
   * Get billing document by ID
   */
  async getById(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    billingDocumentId: string,
    options?: {
      includeItems?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapBillingDocument>> {
    this.logger.log(`Getting billing document: ${billingDocumentId}`);

    const queryOptions: Pick<SapODataQueryOptions, '$select' | '$expand'> = {};

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    if (options?.includeItems) {
      queryOptions.$expand = ['to_Item'];
    }

    return await this.odataClient.getByKey<SapBillingDocument>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      billingDocumentId,
      queryOptions,
    );
  }

  /**
   * List billing documents with filters
   */
  async list(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    options?: {
      customer?: string;
      billingDocumentType?: SapBillingDocumentType;
      fromDate?: Date;
      toDate?: Date;
      salesOrder?: string;
      top?: number;
      skip?: number;
      orderBy?: string;
      includeItems?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapBillingDocument[]>>> {
    this.logger.log('Listing billing documents');

    const queryOptions: SapODataQueryOptions = {
      $count: true,
    };

    // Build filter
    const filters: string[] = [];

    if (options?.customer) {
      filters.push(`SoldToParty eq '${options.customer}'`);
    }

    if (options?.billingDocumentType) {
      filters.push(`BillingDocumentType eq '${options.billingDocumentType}'`);
    }

    if (options?.fromDate) {
      const dateStr = this.formatDate(options.fromDate);
      filters.push(`BillingDocumentDate ge ${dateStr}`);
    }

    if (options?.toDate) {
      const dateStr = this.formatDate(options.toDate);
      filters.push(`BillingDocumentDate le ${dateStr}`);
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    if (options?.includeItems) {
      queryOptions.$expand = ['to_Item'];
    }

    if (options?.top) {
      queryOptions.$top = options.top;
    }

    if (options?.skip) {
      queryOptions.$skip = options.skip;
    }

    if (options?.orderBy) {
      queryOptions.$orderby = options.orderBy;
    } else {
      queryOptions.$orderby = 'BillingDocumentDate desc';
    }

    return await this.odataClient.get<SapBillingDocument[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Get billing document items
   */
  async getItems(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    billingDocumentId: string,
  ): Promise<SapConnectorResult<SapODataResponse<SapBillingDocumentItem[]>>> {
    this.logger.log(`Getting items for billing document: ${billingDocumentId}`);

    const queryOptions: SapODataQueryOptions = {
      $filter: `BillingDocument eq '${billingDocumentId}'`,
      $orderby: 'BillingDocumentItem asc',
    };

    return await this.odataClient.get<SapBillingDocumentItem[]>(
      config,
      credentials,
      this.servicePath,
      this.itemEntitySet,
      queryOptions,
    );
  }

  /**
   * Get billing documents by sales order
   */
  async getBySalesOrder(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    salesOrderId: string,
  ): Promise<SapConnectorResult<SapODataResponse<SapBillingDocument[]>>> {
    this.logger.log(`Getting billing documents for sales order: ${salesOrderId}`);

    // Billing documents reference sales orders via item-level references
    // We need to search in items first, then get unique billing documents
    const itemQueryOptions: SapODataQueryOptions = {
      $filter: `ReferenceSDDocument eq '${salesOrderId}'`,
      $select: ['BillingDocument'],
    };

    const itemResult = await this.odataClient.get<SapBillingDocumentItem[]>(
      config,
      credentials,
      this.servicePath,
      this.itemEntitySet,
      itemQueryOptions,
    );

    if (!itemResult.success || !itemResult.data) {
      return {
        success: false,
        error: itemResult.error,
        metadata: itemResult.metadata,
      };
    }

    // Get unique billing document IDs
    const billingDocIds = [
      ...new Set(
        (itemResult.data.value as SapBillingDocumentItem[])
          .map((item) => item.BillingDocument)
          .filter((id): id is string => !!id),
      ),
    ];

    if (billingDocIds.length === 0) {
      return {
        success: true,
        data: {
          value: [],
          metadata: {},
        },
        metadata: itemResult.metadata,
      };
    }

    // Fetch the billing documents
    const filter = billingDocIds.map((id) => `BillingDocument eq '${id}'`).join(' or ');
    const queryOptions: SapODataQueryOptions = {
      $filter: filter,
      $expand: ['to_Item'],
      $orderby: 'BillingDocumentDate desc',
    };

    return await this.odataClient.get<SapBillingDocument[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Get invoice summary for a customer
   */
  async getCustomerInvoiceSummary(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    customerId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<
    SapConnectorResult<{
      customer: string;
      totalInvoices: number;
      totalAmount: number;
      currency: string;
      invoices: Array<{
        billingDocument: string;
        date: string;
        amount: number;
        currency: string;
        type: string;
      }>;
    }>
  > {
    this.logger.log(`Getting invoice summary for customer: ${customerId}`);

    const result = await this.list(config, credentials, {
      customer: customerId,
      billingDocumentType: SapBillingDocumentType.INVOICE,
      fromDate: options?.fromDate,
      toDate: options?.toDate,
      select: [
        'BillingDocument',
        'BillingDocumentDate',
        'TotalNetAmount',
        'TransactionCurrency',
        'BillingDocumentType',
      ],
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const billingDocs = result.data.value as SapBillingDocument[];

    // Calculate totals
    let totalAmount = 0;
    let currency = '';
    const invoices = billingDocs.map((doc) => {
      const amount = parseFloat(doc.TotalNetAmount || '0');
      totalAmount += amount;
      if (!currency && doc.TransactionCurrency) {
        currency = doc.TransactionCurrency;
      }
      return {
        billingDocument: doc.BillingDocument || '',
        date: doc.BillingDocumentDate || '',
        amount,
        currency: doc.TransactionCurrency || '',
        type: doc.BillingDocumentType || '',
      };
    });

    return {
      success: true,
      data: {
        customer: customerId,
        totalInvoices: billingDocs.length,
        totalAmount,
        currency,
        invoices,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Get billing documents by external reference
   */
  async getByExternalReference(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    externalReference: string,
  ): Promise<SapConnectorResult<SapODataResponse<SapBillingDocument[]>>> {
    this.logger.log(`Getting billing documents by external reference: ${externalReference}`);

    const queryOptions: SapODataQueryOptions = {
      $filter: `AccountingDocExternalReference eq '${externalReference}'`,
      $expand: ['to_Item'],
    };

    return await this.odataClient.get<SapBillingDocument[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Get invoices with outstanding amounts
   * Note: Actual outstanding amount calculation requires integration with FI module
   */
  async getOpenInvoices(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    customerId: string,
    options?: {
      top?: number;
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapBillingDocument[]>>> {
    this.logger.log(`Getting open invoices for customer: ${customerId}`);

    // Note: In real implementation, you'd need to check payment status
    // from FI/AR module. This is a simplified version.
    const queryOptions: SapODataQueryOptions = {
      $filter: `SoldToParty eq '${customerId}' and BillingDocumentType eq '${SapBillingDocumentType.INVOICE}'`,
      $orderby: 'BillingDocumentDate asc',
      $top: options?.top || 100,
    };

    return await this.odataClient.get<SapBillingDocument[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Format date for OData filter
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
