import { Injectable, Logger } from '@nestjs/common';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleSalesOrder,
  OracleSalesOrderLine,
  OracleApiPaths,
  OracleCreateSalesOrderInput,
  OracleConnectorResult,
  OracleApiResponse,
  OracleSalesOrderStatus,
} from '../interfaces';
import { OracleRestClientService } from './oracle-rest-client.service';
import { OracleErrorHandlerService } from './oracle-error-handler.service';

/**
 * List sales orders options
 */
export interface ListSalesOrdersOptions {
  /** Filter by customer account ID */
  customerId?: string;

  /** Filter by buying party ID */
  buyingPartyId?: number;

  /** Filter by status */
  status?: string;

  /** Filter by business unit ID */
  businessUnitId?: number;

  /** Created after date */
  createdAfter?: string;

  /** Created before date */
  createdBefore?: string;

  /** Modified after date */
  modifiedAfter?: string;

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
 * Get sales order options
 */
export interface GetSalesOrderOptions {
  /** Include line items */
  includeLines?: boolean;

  /** Additional fields to select */
  fields?: string[];

  /** Expand related resources */
  expand?: string[];
}

/**
 * Update sales order data
 */
export interface UpdateSalesOrderData {
  requestedShipDate?: string;
  requestedFulfillmentDate?: string;
  customerPONumber?: string;
  comments?: string;
}

/**
 * Oracle ERP Cloud Sales Order Service
 * Handles Sales Order operations
 */
@Injectable()
export class OracleSalesOrderService {
  private readonly logger = new Logger(OracleSalesOrderService.name);

  constructor(
    private readonly restClient: OracleRestClientService,
    private readonly errorHandler: OracleErrorHandlerService,
  ) {}

  /**
   * Create sales order
   */
  async create(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    input: OracleCreateSalesOrderInput,
  ): Promise<OracleConnectorResult<OracleSalesOrder>> {
    this.logger.debug(`Creating sales order for customer ${input.customerId}`);

    // Build Oracle API payload
    const payload = this.buildCreatePayload(input, config);

    const result = await this.restClient.post<OracleSalesOrder>(
      config,
      credentials,
      OracleApiPaths.SALES_ORDERS,
      payload,
    );

    if (result.success && result.data) {
      this.logger.debug(`Created sales order: ${result.data.OrderNumber || result.data.OrderId}`);
    }

    return result;
  }

  /**
   * Get sales order by ID
   */
  async getById(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
    options?: GetSalesOrderOptions,
  ): Promise<OracleConnectorResult<OracleSalesOrder>> {
    const params: Record<string, string | boolean | undefined> = {};

    if (options?.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }

    if (options?.expand && options.expand.length > 0) {
      params.expand = options.expand.join(',');
    } else if (options?.includeLines) {
      params.expand = 'lines';
    }

    const result = await this.restClient.getById<OracleSalesOrder>(
      config,
      credentials,
      OracleApiPaths.SALES_ORDERS,
      orderId,
      { params },
    );

    // If lines should be included but weren't expanded, fetch them separately
    if (result.success && result.data && options?.includeLines && !result.data.lines) {
      const linesResult = await this.getOrderLines(config, credentials, orderId);

      if (linesResult.success && linesResult.data?.items) {
        result.data.lines = linesResult.data.items;
      }
    }

    return result;
  }

  /**
   * Get sales order by order number
   */
  async getByOrderNumber(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderNumber: string,
    options?: GetSalesOrderOptions,
  ): Promise<OracleConnectorResult<OracleSalesOrder | null>> {
    const result = await this.list(config, credentials, {
      limit: 1,
      includeLines: options?.includeLines,
    });

    // Use finder to search by order number
    const finderResult = await this.restClient.finder<OracleSalesOrder>(
      config,
      credentials,
      OracleApiPaths.SALES_ORDERS,
      {
        finder: 'OrderNumberFinder',
        finderParams: {
          pOrderNumber: orderNumber,
        },
      },
      { totalResults: true },
    );

    if (!finderResult.success) {
      return {
        success: false,
        error: finderResult.error,
        metadata: finderResult.metadata,
      };
    }

    const order = finderResult.data?.items?.[0] || null;

    return {
      success: true,
      data: order,
      metadata: finderResult.metadata,
    };
  }

  /**
   * Get sales order status
   */
  async getStatus(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
  ): Promise<
    OracleConnectorResult<{
      statusCode: string;
      fulfillmentStatus: string;
      statusName: string;
    }>
  > {
    const result = await this.restClient.getById<OracleSalesOrder>(
      config,
      credentials,
      OracleApiPaths.SALES_ORDERS,
      orderId,
      {
        params: {
          fields: 'OrderId,StatusCode,FulfillmentStatus',
        },
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
        statusCode: result.data.StatusCode || '',
        fulfillmentStatus: result.data.FulfillmentStatus || '',
        statusName: this.mapStatusCodeToName(result.data.StatusCode),
      },
      metadata: result.metadata,
    };
  }

  /**
   * List sales orders
   */
  async list(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListSalesOrdersOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleSalesOrder>>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    const filters: string[] = [];

    // Build filters
    if (options?.customerId) {
      filters.push(`BillToCustomerAccountNumber='${options.customerId}'`);
    }

    if (options?.buyingPartyId) {
      filters.push(`BuyingPartyId=${options.buyingPartyId}`);
    }

    if (options?.status) {
      filters.push(`StatusCode='${options.status}'`);
    }

    if (options?.businessUnitId) {
      filters.push(`SellingBusinessUnitId=${options.businessUnitId}`);
    }

    if (options?.createdAfter) {
      filters.push(`CreationDate>='${options.createdAfter}'`);
    }

    if (options?.createdBefore) {
      filters.push(`CreationDate<='${options.createdBefore}'`);
    }

    if (options?.modifiedAfter) {
      filters.push(`LastUpdateDate>='${options.modifiedAfter}'`);
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
      params.expand = 'lines';
    }

    params.totalResults = true;

    return this.restClient.get<OracleSalesOrder>(config, credentials, OracleApiPaths.SALES_ORDERS, {
      params,
    });
  }

  /**
   * Get order lines
   */
  async getOrderLines(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleSalesOrderLine>>> {
    const path = OracleApiPaths.ORDER_LINES.replace('{OrderId}', String(orderId));

    return this.restClient.get<OracleSalesOrderLine>(config, credentials, path, {
      params: { totalResults: true },
    });
  }

  /**
   * Update sales order
   */
  async update(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
    data: UpdateSalesOrderData,
  ): Promise<OracleConnectorResult<OracleSalesOrder>> {
    this.logger.debug(`Updating sales order ${orderId}`);

    const payload: Record<string, unknown> = {};

    if (data.requestedShipDate !== undefined) {
      payload.RequestedShipDate = data.requestedShipDate;
    }

    if (data.requestedFulfillmentDate !== undefined) {
      payload.RequestedFulfillmentDate = data.requestedFulfillmentDate;
    }

    if (data.customerPONumber !== undefined) {
      payload.CustomerPONumber = data.customerPONumber;
    }

    return this.restClient.patch<OracleSalesOrder>(
      config,
      credentials,
      OracleApiPaths.SALES_ORDERS,
      orderId,
      payload,
    );
  }

  /**
   * Submit sales order (change status to BOOKED)
   */
  async submit(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
  ): Promise<OracleConnectorResult<OracleSalesOrder>> {
    this.logger.debug(`Submitting sales order ${orderId}`);

    // Submit order by setting the appropriate status
    return this.restClient.patch<OracleSalesOrder>(
      config,
      credentials,
      OracleApiPaths.SALES_ORDERS,
      orderId,
      {
        StatusCode: OracleSalesOrderStatus.BOOKED,
      },
    );
  }

  /**
   * Cancel sales order
   */
  async cancel(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
    reason?: string,
  ): Promise<OracleConnectorResult<OracleSalesOrder>> {
    this.logger.debug(`Cancelling sales order ${orderId}`);

    const payload: Record<string, unknown> = {
      StatusCode: OracleSalesOrderStatus.CANCELLED,
    };

    if (reason) {
      payload.Comments = `Cancellation reason: ${reason}`;
    }

    return this.restClient.patch<OracleSalesOrder>(
      config,
      credentials,
      OracleApiPaths.SALES_ORDERS,
      orderId,
      payload,
    );
  }

  /**
   * Add line to existing order
   */
  async addLine(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
    line: {
      itemNumber: string;
      quantity: number;
      uomCode?: string;
      unitSellingPrice?: number;
    },
  ): Promise<OracleConnectorResult<OracleSalesOrderLine>> {
    this.logger.debug(`Adding line to order ${orderId}`);

    const payload: Record<string, unknown> = {
      ProductNumber: line.itemNumber,
      OrderedQuantity: line.quantity,
    };

    if (line.uomCode) {
      payload.OrderedUOMCode = line.uomCode;
    }

    if (line.unitSellingPrice !== undefined) {
      payload.UnitSellingPrice = line.unitSellingPrice;
    }

    const path = OracleApiPaths.ORDER_LINES.replace('{OrderId}', String(orderId));

    return this.restClient.post<OracleSalesOrderLine>(config, credentials, path, payload);
  }

  // ==================== Private Methods ====================

  /**
   * Build create payload
   */
  private buildCreatePayload(
    input: OracleCreateSalesOrderInput,
    config: OracleConnectionConfig,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      SourceTransactionNumber: input.sourceTransactionNumber,
      SourceTransactionSystem: input.sourceTransactionSystem || 'B2B_PLATFORM',
    };

    // Customer info
    if (input.buyingPartyId) {
      payload.BuyingPartyId = input.buyingPartyId;
    }

    if (input.customerId) {
      // Determine if this is account number or ID
      if (isNaN(Number(input.customerId))) {
        payload.BillToCustomerAccountNumber = input.customerId;
      } else {
        payload.BillToCustomerAccountId = Number(input.customerId);
      }
    }

    // Business unit
    if (input.businessUnitId) {
      payload.SellingBusinessUnitId = input.businessUnitId;
    } else if (config.defaultBusinessUnit) {
      payload.SellingBusinessUnitName = config.defaultBusinessUnit;
    }

    // Dates
    if (input.requestedShipDate) {
      payload.RequestedShipDate = input.requestedShipDate;
    }

    if (input.requestedFulfillmentDate) {
      payload.RequestedFulfillmentDate = input.requestedFulfillmentDate;
    }

    // Currency
    if (input.currencyCode) {
      payload.TransactionalCurrencyCode = input.currencyCode;
    } else if (config.defaultCurrency) {
      payload.TransactionalCurrencyCode = config.defaultCurrency;
    }

    // Customer PO
    if (input.customerPONumber) {
      payload.CustomerPONumber = input.customerPONumber;
    }

    // Ship-to info
    if (input.shipToPartyId) {
      payload.ShipToPartyId = input.shipToPartyId;
    }

    if (input.billToAccountId) {
      payload.BillToCustomerAccountId = input.billToAccountId;
    }

    // Build lines
    if (input.lines && input.lines.length > 0) {
      payload.lines = input.lines.map((line, index) => ({
        ProductNumber: line.itemNumber,
        OrderedQuantity: line.quantity,
        OrderedUOMCode: line.uomCode || 'EA',
        UnitSellingPrice: line.unitSellingPrice,
        RequestedShipDate: line.requestedShipDate || input.requestedShipDate,
        RequestedFulfillmentDate: line.requestedFulfillmentDate || input.requestedFulfillmentDate,
        ShipToPartyId: line.shipToPartyId || input.shipToPartyId,
        SourceLineNumber: String(index + 1),
        ...line.additionalAttributes,
      }));
    }

    // Additional attributes
    if (input.additionalAttributes) {
      Object.assign(payload, input.additionalAttributes);
    }

    return payload;
  }

  /**
   * Map status code to human-readable name
   */
  private mapStatusCodeToName(statusCode?: string): string {
    switch (statusCode) {
      case OracleSalesOrderStatus.DRAFT:
        return 'Draft';
      case OracleSalesOrderStatus.OPEN:
        return 'Open';
      case OracleSalesOrderStatus.BOOKED:
        return 'Booked';
      case OracleSalesOrderStatus.CLOSED:
        return 'Closed';
      case OracleSalesOrderStatus.CANCELLED:
        return 'Cancelled';
      case OracleSalesOrderStatus.AWAITING_BILLING:
        return 'Awaiting Billing';
      case OracleSalesOrderStatus.AWAITING_SHIPPING:
        return 'Awaiting Shipping';
      case OracleSalesOrderStatus.PARTIALLY_SHIPPED:
        return 'Partially Shipped';
      case OracleSalesOrderStatus.SHIPPED:
        return 'Shipped';
      case OracleSalesOrderStatus.PARTIALLY_FULFILLED:
        return 'Partially Fulfilled';
      case OracleSalesOrderStatus.FULFILLED:
        return 'Fulfilled';
      default:
        return statusCode || 'Unknown';
    }
  }
}
