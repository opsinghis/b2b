import { Injectable, Logger } from '@nestjs/common';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsInvoice,
  DynamicsInvoiceDetail,
  DynamicsODataResponse,
  DynamicsConnectorResult,
  DynamicsApiPaths,
  DynamicsInvoiceState,
  DynamicsQueryOptions,
} from '../interfaces';

export interface ListInvoicesOptions {
  customerId?: string;
  salesOrderId?: string;
  fromDate?: string;
  toDate?: string;
  stateCode?: DynamicsInvoiceState;
  includeItems?: boolean;
  top?: number;
  skip?: number;
  orderby?: string;
}

export interface GetInvoiceOptions {
  includeItems?: boolean;
}

/**
 * Dynamics 365 Invoice Service
 * Handles Invoice operations
 */
@Injectable()
export class DynamicsInvoiceService {
  private readonly logger = new Logger(DynamicsInvoiceService.name);

  constructor(private readonly webApiClient: DynamicsWebApiClientService) {}

  /**
   * Get invoice by ID
   */
  async getById(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    invoiceId: string,
    options?: GetInvoiceOptions,
  ): Promise<DynamicsConnectorResult<DynamicsInvoice>> {
    this.logger.debug(`Getting invoice ${invoiceId}`);

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'invoiceid',
        'name',
        'invoicenumber',
        'totalamount',
        'totallineitemamount',
        'totaltax',
        'totaldiscountamount',
        'datedelivered',
        'duedate',
        'ispricelocked',
        'statecode',
        'statuscode',
        'billto_line1',
        'billto_city',
        'billto_stateorprovince',
        'billto_postalcode',
        'billto_country',
        'shipto_line1',
        'shipto_city',
        'shipto_stateorprovince',
        'shipto_postalcode',
        'shipto_country',
        'createdon',
        'modifiedon',
      ],
    };

    if (options?.includeItems) {
      queryOptions.$expand = [
        'invoice_details($select=invoicedetailid,quantity,priceperunit,baseamount,extendedamount,manualdiscountamount,tax,productdescription,lineitemnumber)',
      ];
    }

    return this.webApiClient.getByKey<DynamicsInvoice>(
      config,
      credentials,
      DynamicsApiPaths.INVOICES,
      invoiceId,
      queryOptions,
    );
  }

  /**
   * List invoices
   */
  async list(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListInvoicesOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoice[]>>> {
    this.logger.debug('Listing invoices');

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'invoiceid',
        'name',
        'invoicenumber',
        'totalamount',
        'duedate',
        'statecode',
        'statuscode',
        'createdon',
        'modifiedon',
      ],
      $top: options?.top || 100,
      $skip: options?.skip,
      $count: true,
      $orderby: options?.orderby || 'createdon desc',
    };

    // Build filter
    const filters: string[] = [];

    if (options?.customerId) {
      filters.push(`_customerid_value eq ${options.customerId}`);
    }

    if (options?.salesOrderId) {
      filters.push(`_salesorderid_value eq ${options.salesOrderId}`);
    }

    if (options?.stateCode !== undefined) {
      filters.push(`statecode eq ${options.stateCode}`);
    }

    if (options?.fromDate) {
      filters.push(`createdon ge ${options.fromDate}`);
    }

    if (options?.toDate) {
      filters.push(`createdon le ${options.toDate}`);
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    if (options?.includeItems) {
      queryOptions.$expand = [
        'invoice_details($select=invoicedetailid,quantity,priceperunit,extendedamount,lineitemnumber)',
      ];
    }

    return this.webApiClient.get<DynamicsInvoice>(
      config,
      credentials,
      DynamicsApiPaths.INVOICES,
      queryOptions,
    );
  }

  /**
   * Get invoice by invoice number
   */
  async getByInvoiceNumber(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    invoiceNumber: string,
  ): Promise<DynamicsConnectorResult<DynamicsInvoice>> {
    this.logger.debug(`Getting invoice by number: ${invoiceNumber}`);

    const result = await this.webApiClient.get<DynamicsInvoice>(
      config,
      credentials,
      DynamicsApiPaths.INVOICES,
      {
        $filter: `invoicenumber eq '${invoiceNumber}'`,
        $top: 1,
      },
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const invoices = result.data?.value || [];
    if (invoices.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: `Invoice with number '${invoiceNumber}' not found`,
          retryable: false,
        },
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: invoices[0],
      metadata: result.metadata,
    };
  }

  /**
   * Get invoices for a sales order
   */
  async getForSalesOrder(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    salesOrderId: string,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoice[]>>> {
    return this.list(config, credentials, {
      salesOrderId,
      includeItems: true,
    });
  }

  /**
   * Get invoices for a customer
   */
  async getForCustomer(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    customerId: string,
    options?: { fromDate?: string; toDate?: string; top?: number },
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoice[]>>> {
    return this.list(config, credentials, {
      customerId,
      ...options,
    });
  }

  /**
   * Get invoice line items
   */
  async getInvoiceItems(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    invoiceId: string,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoiceDetail[]>>> {
    this.logger.debug(`Getting items for invoice ${invoiceId}`);

    return this.webApiClient.get<DynamicsInvoiceDetail>(
      config,
      credentials,
      DynamicsApiPaths.INVOICE_DETAILS,
      {
        $filter: `_invoiceid_value eq ${invoiceId}`,
        $orderby: 'lineitemnumber asc',
      },
    );
  }

  /**
   * Get invoice status
   */
  async getStatus(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    invoiceId: string,
  ): Promise<
    DynamicsConnectorResult<{
      stateCode: number;
      statusCode: number;
      stateName: string;
    }>
  > {
    const result = await this.webApiClient.getByKey<DynamicsInvoice>(
      config,
      credentials,
      DynamicsApiPaths.INVOICES,
      invoiceId,
      {
        $select: ['statecode', 'statuscode'],
      },
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: {
        stateCode: result.data.statecode || 0,
        statusCode: result.data.statuscode || 0,
        stateName: this.getStateName(result.data.statecode || 0),
      },
      metadata: result.metadata,
    };
  }

  /**
   * Lock invoice pricing
   */
  async lockPricing(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    invoiceId: string,
  ): Promise<DynamicsConnectorResult<void>> {
    this.logger.debug(`Locking pricing for invoice ${invoiceId}`);

    return this.webApiClient.executeAction(
      config,
      credentials,
      'LockInvoicePricing',
      DynamicsApiPaths.INVOICES,
      invoiceId,
    );
  }

  /**
   * Get paid invoices
   */
  async getPaidInvoices(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: { customerId?: string; fromDate?: string; top?: number },
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoice[]>>> {
    return this.list(config, credentials, {
      ...options,
      stateCode: DynamicsInvoiceState.PAID,
    });
  }

  /**
   * Get open/active invoices
   */
  async getOpenInvoices(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: { customerId?: string; top?: number },
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoice[]>>> {
    return this.list(config, credentials, {
      ...options,
      stateCode: DynamicsInvoiceState.ACTIVE,
    });
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: { customerId?: string; top?: number },
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoice[]>>> {
    const today = new Date().toISOString().split('T')[0];

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'invoiceid',
        'name',
        'invoicenumber',
        'totalamount',
        'duedate',
        'statecode',
        'statuscode',
        'createdon',
      ],
      $filter: `statecode eq 0 and duedate lt ${today}`,
      $top: options?.top || 100,
      $orderby: 'duedate asc',
    };

    if (options?.customerId) {
      queryOptions.$filter += ` and _customerid_value eq ${options.customerId}`;
    }

    return this.webApiClient.get<DynamicsInvoice>(
      config,
      credentials,
      DynamicsApiPaths.INVOICES,
      queryOptions,
    );
  }

  /**
   * Calculate invoice totals (returns total amount, tax, discount)
   */
  async getInvoiceTotals(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    invoiceId: string,
  ): Promise<
    DynamicsConnectorResult<{
      totalAmount: number;
      totalLineItemAmount: number;
      totalTax: number;
      totalDiscount: number;
    }>
  > {
    const result = await this.webApiClient.getByKey<DynamicsInvoice>(
      config,
      credentials,
      DynamicsApiPaths.INVOICES,
      invoiceId,
      {
        $select: ['totalamount', 'totallineitemamount', 'totaltax', 'totaldiscountamount'],
      },
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: {
        totalAmount: result.data.totalamount || 0,
        totalLineItemAmount: result.data.totallineitemamount || 0,
        totalTax: result.data.totaltax || 0,
        totalDiscount: result.data.totaldiscountamount || 0,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Get human-readable state name
   */
  private getStateName(stateCode: number): string {
    switch (stateCode) {
      case DynamicsInvoiceState.ACTIVE:
        return 'Active';
      case DynamicsInvoiceState.CLOSED:
        return 'Closed';
      case DynamicsInvoiceState.PAID:
        return 'Paid';
      case DynamicsInvoiceState.CANCELED:
        return 'Canceled';
      default:
        return 'Unknown';
    }
  }
}
