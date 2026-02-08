import { Injectable, Logger } from '@nestjs/common';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsSalesOrder,
  DynamicsSalesOrderDetail,
  DynamicsODataResponse,
  DynamicsConnectorResult,
  DynamicsApiPaths,
  DynamicsCreateSalesOrderInput,
  DynamicsSalesOrderState,
  DynamicsQueryOptions,
} from '../interfaces';

export interface ListSalesOrdersOptions {
  customerId?: string;
  customerType?: 'account' | 'contact';
  fromDate?: string;
  toDate?: string;
  stateCode?: DynamicsSalesOrderState;
  includeItems?: boolean;
  top?: number;
  skip?: number;
  orderby?: string;
}

export interface GetSalesOrderOptions {
  includeItems?: boolean;
}

/**
 * Dynamics 365 Sales Order Service
 * Handles sales order CRUD operations
 */
@Injectable()
export class DynamicsSalesOrderService {
  private readonly logger = new Logger(DynamicsSalesOrderService.name);

  constructor(private readonly webApiClient: DynamicsWebApiClientService) {}

  /**
   * Create a new sales order
   */
  async create(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    input: DynamicsCreateSalesOrderInput,
  ): Promise<DynamicsConnectorResult<DynamicsSalesOrder>> {
    this.logger.debug(`Creating sales order for customer ${input.customerId}`);

    // Build order payload
    const orderData = this.buildSalesOrderPayload(input, config);

    const result = await this.webApiClient.post<DynamicsSalesOrder>(
      config,
      credentials,
      DynamicsApiPaths.SALES_ORDERS,
      orderData,
    );

    if (!result.success || !result.data) {
      return result;
    }

    // If items are provided, create them
    if (input.items && input.items.length > 0 && result.data.salesorderid) {
      const itemResults = await this.createOrderItems(
        config,
        credentials,
        result.data.salesorderid,
        input,
      );

      // Check if any item creation failed
      const failedItems = itemResults.filter((r) => !r.success);
      if (failedItems.length > 0) {
        this.logger.warn(
          `${failedItems.length} order items failed to create for order ${result.data.salesorderid}`,
        );
      }

      // Reload order with items
      const reloadedOrder = await this.getById(config, credentials, result.data.salesorderid, {
        includeItems: true,
      });

      if (reloadedOrder.success && reloadedOrder.data) {
        return {
          ...result,
          data: reloadedOrder.data,
        };
      }
    }

    return result;
  }

  /**
   * Get sales order by ID
   */
  async getById(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
    options?: GetSalesOrderOptions,
  ): Promise<DynamicsConnectorResult<DynamicsSalesOrder>> {
    this.logger.debug(`Getting sales order ${orderId}`);

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'salesorderid',
        'name',
        'ordernumber',
        'totalamount',
        'totallineitemamount',
        'totaltax',
        'totaldiscountamount',
        'freightamount',
        'requestdeliveryby',
        'datedelivered',
        'datefulfilled',
        'statecode',
        'statuscode',
        'description',
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
        'salesorder_details($select=salesorderdetailid,quantity,priceperunit,baseamount,extendedamount,manualdiscountamount,tax,productdescription,lineitemnumber)',
      ];
    }

    return this.webApiClient.getByKey<DynamicsSalesOrder>(
      config,
      credentials,
      DynamicsApiPaths.SALES_ORDERS,
      orderId,
      queryOptions,
    );
  }

  /**
   * Get sales order status
   */
  async getStatus(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
  ): Promise<
    DynamicsConnectorResult<{
      stateCode: number;
      statusCode: number;
      stateName: string;
    }>
  > {
    const result = await this.webApiClient.getByKey<DynamicsSalesOrder>(
      config,
      credentials,
      DynamicsApiPaths.SALES_ORDERS,
      orderId,
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
   * List sales orders
   */
  async list(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListSalesOrdersOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsSalesOrder[]>>> {
    this.logger.debug('Listing sales orders');

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'salesorderid',
        'name',
        'ordernumber',
        'totalamount',
        'requestdeliveryby',
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
      if (options.customerType === 'contact') {
        filters.push(`_customerid_value eq ${options.customerId}`);
      } else {
        filters.push(`_customerid_value eq ${options.customerId}`);
      }
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
        'salesorder_details($select=salesorderdetailid,quantity,priceperunit,extendedamount,lineitemnumber)',
      ];
    }

    return this.webApiClient.get<DynamicsSalesOrder>(
      config,
      credentials,
      DynamicsApiPaths.SALES_ORDERS,
      queryOptions,
    );
  }

  /**
   * Update sales order
   */
  async update(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
    data: Partial<{
      name: string;
      description: string;
      requestDeliveryBy: string;
      billToAddress: DynamicsCreateSalesOrderInput['billToAddress'];
      shipToAddress: DynamicsCreateSalesOrderInput['shipToAddress'];
    }>,
    etag?: string,
  ): Promise<DynamicsConnectorResult<DynamicsSalesOrder>> {
    this.logger.debug(`Updating sales order ${orderId}`);

    const updateData: Record<string, unknown> = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.description) {
      updateData.description = data.description;
    }

    if (data.requestDeliveryBy) {
      updateData.requestdeliveryby = data.requestDeliveryBy;
    }

    if (data.billToAddress) {
      updateData.billto_line1 = data.billToAddress.line1;
      updateData.billto_city = data.billToAddress.city;
      updateData.billto_stateorprovince = data.billToAddress.stateOrProvince;
      updateData.billto_postalcode = data.billToAddress.postalCode;
      updateData.billto_country = data.billToAddress.country;
    }

    if (data.shipToAddress) {
      updateData.shipto_line1 = data.shipToAddress.line1;
      updateData.shipto_city = data.shipToAddress.city;
      updateData.shipto_stateorprovince = data.shipToAddress.stateOrProvince;
      updateData.shipto_postalcode = data.shipToAddress.postalCode;
      updateData.shipto_country = data.shipToAddress.country;
    }

    return this.webApiClient.patch<DynamicsSalesOrder>(
      config,
      credentials,
      DynamicsApiPaths.SALES_ORDERS,
      orderId,
      updateData,
      etag,
    );
  }

  /**
   * Submit sales order (change state to Submitted)
   */
  async submit(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
  ): Promise<DynamicsConnectorResult<void>> {
    this.logger.debug(`Submitting sales order ${orderId}`);

    return this.webApiClient.executeAction(
      config,
      credentials,
      'SubmitSalesOrder',
      DynamicsApiPaths.SALES_ORDERS,
      orderId,
    );
  }

  /**
   * Fulfill sales order
   */
  async fulfill(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
  ): Promise<DynamicsConnectorResult<void>> {
    this.logger.debug(`Fulfilling sales order ${orderId}`);

    return this.webApiClient.executeAction(
      config,
      credentials,
      'FulfillSalesOrder',
      DynamicsApiPaths.SALES_ORDERS,
      orderId,
      {
        Status: -1, // System default
      },
    );
  }

  /**
   * Cancel sales order
   */
  async cancel(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
    reason?: string,
  ): Promise<DynamicsConnectorResult<void>> {
    this.logger.debug(`Canceling sales order ${orderId}`);

    return this.webApiClient.executeAction(
      config,
      credentials,
      'CancelSalesOrder',
      DynamicsApiPaths.SALES_ORDERS,
      orderId,
      {
        Status: -1, // Canceled status
      },
    );
  }

  /**
   * Convert sales order to invoice
   */
  async convertToInvoice(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
  ): Promise<DynamicsConnectorResult<{ invoiceId: string }>> {
    this.logger.debug(`Converting sales order ${orderId} to invoice`);

    const result = await this.webApiClient.executeAction<{ invoiceid: string }>(
      config,
      credentials,
      'ConvertSalesOrderToInvoice',
      DynamicsApiPaths.SALES_ORDERS,
      orderId,
      {
        ColumnSet: {
          AllColumns: true,
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
        invoiceId: result.data.invoiceid,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Add item to existing sales order
   */
  async addItem(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
    item: DynamicsCreateSalesOrderInput['items'][0],
  ): Promise<DynamicsConnectorResult<DynamicsSalesOrderDetail>> {
    const itemData: Record<string, unknown> = {
      'salesorderid@odata.bind': `/salesorders(${orderId})`,
      quantity: item.quantity,
    };

    if (item.productId) {
      itemData['productid@odata.bind'] = `/products(${item.productId})`;
    }

    if (item.uomId) {
      itemData['uomid@odata.bind'] = `/uoms(${item.uomId})`;
    }

    if (item.pricePerUnit !== undefined) {
      itemData.priceperunit = item.pricePerUnit;
      itemData.ispriceoverridden = true;
    }

    if (item.manualDiscountAmount !== undefined) {
      itemData.manualdiscountamount = item.manualDiscountAmount;
    }

    if (item.description) {
      itemData.productdescription = item.description;
      itemData.isproductoverridden = true;
    }

    if (item.requestDeliveryBy) {
      itemData.requestdeliveryby = item.requestDeliveryBy;
    }

    return this.webApiClient.post<DynamicsSalesOrderDetail>(
      config,
      credentials,
      DynamicsApiPaths.SALES_ORDER_DETAILS,
      itemData,
    );
  }

  /**
   * Build sales order payload for create
   */
  private buildSalesOrderPayload(
    input: DynamicsCreateSalesOrderInput,
    config: DynamicsConnectionConfig,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: input.name,
    };

    // Set customer binding
    if (input.customerType === 'contact') {
      payload['customerid_contact@odata.bind'] = `/contacts(${input.customerId})`;
    } else {
      payload['customerid_account@odata.bind'] = `/accounts(${input.customerId})`;
    }

    // Set price level
    if (input.priceLevelId || config.defaultPriceLevelId) {
      payload['pricelevelid@odata.bind'] =
        `/pricelevels(${input.priceLevelId || config.defaultPriceLevelId})`;
    }

    // Set currency
    if (input.currencyId || config.defaultCurrency) {
      payload['transactioncurrencyid@odata.bind'] =
        `/transactioncurrencies(${input.currencyId || config.defaultCurrency})`;
    }

    if (input.requestDeliveryBy) {
      payload.requestdeliveryby = input.requestDeliveryBy;
    }

    if (input.description) {
      payload.description = input.description;
    }

    // Set bill-to address
    if (input.billToAddress) {
      payload.billto_line1 = input.billToAddress.line1;
      if (input.billToAddress.line2) {
        payload.billto_line2 = input.billToAddress.line2;
      }
      payload.billto_city = input.billToAddress.city;
      payload.billto_stateorprovince = input.billToAddress.stateOrProvince;
      payload.billto_postalcode = input.billToAddress.postalCode;
      payload.billto_country = input.billToAddress.country;
    }

    // Set ship-to address
    if (input.shipToAddress) {
      payload.shipto_line1 = input.shipToAddress.line1;
      if (input.shipToAddress.line2) {
        payload.shipto_line2 = input.shipToAddress.line2;
      }
      payload.shipto_city = input.shipToAddress.city;
      payload.shipto_stateorprovince = input.shipToAddress.stateOrProvince;
      payload.shipto_postalcode = input.shipToAddress.postalCode;
      payload.shipto_country = input.shipToAddress.country;
    }

    return payload;
  }

  /**
   * Create order items
   */
  private async createOrderItems(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
    input: DynamicsCreateSalesOrderInput,
  ): Promise<DynamicsConnectorResult<DynamicsSalesOrderDetail>[]> {
    const results: DynamicsConnectorResult<DynamicsSalesOrderDetail>[] = [];

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];

      const itemData: Record<string, unknown> = {
        'salesorderid@odata.bind': `/salesorders(${orderId})`,
        quantity: item.quantity,
        lineitemnumber: i + 1,
      };

      if (item.productId) {
        itemData['productid@odata.bind'] = `/products(${item.productId})`;
      }

      if (item.uomId) {
        itemData['uomid@odata.bind'] = `/uoms(${item.uomId})`;
      }

      if (item.pricePerUnit !== undefined) {
        itemData.priceperunit = item.pricePerUnit;
        itemData.ispriceoverridden = true;
      }

      if (item.manualDiscountAmount !== undefined) {
        itemData.manualdiscountamount = item.manualDiscountAmount;
      }

      if (item.description) {
        itemData.productdescription = item.description;
        itemData.isproductoverridden = true;
      }

      if (item.requestDeliveryBy) {
        itemData.requestdeliveryby = item.requestDeliveryBy;
      }

      const result = await this.webApiClient.post<DynamicsSalesOrderDetail>(
        config,
        credentials,
        DynamicsApiPaths.SALES_ORDER_DETAILS,
        itemData,
      );

      results.push(result);
    }

    return results;
  }

  /**
   * Get human-readable state name
   */
  private getStateName(stateCode: number): string {
    switch (stateCode) {
      case DynamicsSalesOrderState.ACTIVE:
        return 'Active';
      case DynamicsSalesOrderState.SUBMITTED:
        return 'Submitted';
      case DynamicsSalesOrderState.CANCELED:
        return 'Canceled';
      case DynamicsSalesOrderState.FULFILLED:
        return 'Fulfilled';
      case DynamicsSalesOrderState.INVOICED:
        return 'Invoiced';
      default:
        return 'Unknown';
    }
  }
}
