import { Injectable, Logger } from '@nestjs/common';
import {
  SapConnectionConfig,
  SapCredentials,
  SapODataQueryOptions,
  SapODataServicePaths,
  SapSalesOrder,
  SapSalesOrderItem,
  SapCreateSalesOrderInput,
  SapConnectorResult,
  SapODataResponse,
} from '../interfaces';
import { SapODataClientService } from './sap-odata-client.service';

/**
 * Sales Order status codes in SAP
 */
export enum SapSalesOrderStatus {
  NOT_PROCESSED = 'A',
  PARTIALLY_PROCESSED = 'B',
  COMPLETELY_PROCESSED = 'C',
}

/**
 * Delivery status codes
 */
export enum SapDeliveryStatus {
  NOT_DELIVERED = '',
  PARTIALLY_DELIVERED = 'B',
  FULLY_DELIVERED = 'C',
}

/**
 * Billing status codes
 */
export enum SapBillingStatus {
  NOT_BILLED = '',
  PARTIALLY_BILLED = 'B',
  FULLY_BILLED = 'C',
}

/**
 * SAP Sales Order Service
 * Handles CRUD operations for SAP Sales Orders (A_SalesOrder)
 */
@Injectable()
export class SapSalesOrderService {
  private readonly logger = new Logger(SapSalesOrderService.name);
  private readonly servicePath = SapODataServicePaths.SALES_ORDER;
  private readonly entitySet = 'A_SalesOrder';
  private readonly itemEntitySet = 'A_SalesOrderItem';

  constructor(private readonly odataClient: SapODataClientService) {}

  /**
   * Create a new sales order
   */
  async create(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: SapCreateSalesOrderInput,
  ): Promise<SapConnectorResult<SapSalesOrder>> {
    this.logger.log(`Creating sales order for customer ${input.soldToParty}`);

    const orderData = this.mapCreateInputToSapFormat(input);

    const result = await this.odataClient.post<SapSalesOrder>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      orderData,
    );

    if (result.success && result.data) {
      this.logger.log(`Sales order created: ${result.data.SalesOrder}`);
    }

    return result;
  }

  /**
   * Get sales order by ID
   */
  async getById(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    salesOrderId: string,
    options?: {
      includeItems?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapSalesOrder>> {
    this.logger.log(`Getting sales order: ${salesOrderId}`);

    const queryOptions: Pick<SapODataQueryOptions, '$select' | '$expand'> = {};

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    if (options?.includeItems) {
      queryOptions.$expand = ['to_Item'];
    }

    return await this.odataClient.getByKey<SapSalesOrder>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      salesOrderId,
      queryOptions,
    );
  }

  /**
   * Get sales order status
   */
  async getStatus(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    salesOrderId: string,
  ): Promise<
    SapConnectorResult<{
      salesOrder: string;
      overallStatus: SapSalesOrderStatus;
      deliveryStatus: SapDeliveryStatus;
      billingStatus: SapBillingStatus;
      statusText: string;
    }>
  > {
    this.logger.log(`Getting status for sales order: ${salesOrderId}`);

    const result = await this.odataClient.getByKey<SapSalesOrder>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      salesOrderId,
      {
        $select: [
          'SalesOrder',
          'OverallSDProcessStatus',
          'OverallDeliveryStatus',
          'OverallBillingStatus',
        ],
      },
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const order = result.data;
    const overallStatus = (order.OverallSDProcessStatus || 'A') as SapSalesOrderStatus;
    const deliveryStatus = (order.OverallDeliveryStatus || '') as SapDeliveryStatus;
    const billingStatus = (order.OverallBillingStatus || '') as SapBillingStatus;

    return {
      success: true,
      data: {
        salesOrder: order.SalesOrder || salesOrderId,
        overallStatus,
        deliveryStatus,
        billingStatus,
        statusText: this.getStatusText(overallStatus, deliveryStatus, billingStatus),
      },
      metadata: result.metadata,
    };
  }

  /**
   * List sales orders with filters
   */
  async list(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    options?: {
      customer?: string;
      salesOrganization?: string;
      fromDate?: Date;
      toDate?: Date;
      status?: SapSalesOrderStatus;
      top?: number;
      skip?: number;
      orderBy?: string;
      includeItems?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapSalesOrder[]>>> {
    this.logger.log('Listing sales orders');

    const queryOptions: SapODataQueryOptions = {
      $count: true,
    };

    // Build filter
    const filters: string[] = [];

    if (options?.customer) {
      filters.push(`SoldToParty eq '${options.customer}'`);
    }

    if (options?.salesOrganization) {
      filters.push(`SalesOrganization eq '${options.salesOrganization}'`);
    }

    if (options?.fromDate) {
      const dateStr = this.formatDate(options.fromDate);
      filters.push(`CreationDate ge ${dateStr}`);
    }

    if (options?.toDate) {
      const dateStr = this.formatDate(options.toDate);
      filters.push(`CreationDate le ${dateStr}`);
    }

    if (options?.status) {
      filters.push(`OverallSDProcessStatus eq '${options.status}'`);
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
      queryOptions.$orderby = 'CreationDate desc';
    }

    return await this.odataClient.get<SapSalesOrder[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Get sales order items
   */
  async getItems(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    salesOrderId: string,
  ): Promise<SapConnectorResult<SapODataResponse<SapSalesOrderItem[]>>> {
    this.logger.log(`Getting items for sales order: ${salesOrderId}`);

    const queryOptions: SapODataQueryOptions = {
      $filter: `SalesOrder eq '${salesOrderId}'`,
      $orderby: 'SalesOrderItem asc',
    };

    return await this.odataClient.get<SapSalesOrderItem[]>(
      config,
      credentials,
      this.servicePath,
      this.itemEntitySet,
      queryOptions,
    );
  }

  /**
   * Update sales order
   */
  async update(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    salesOrderId: string,
    updates: Partial<{
      purchaseOrderByCustomer: string;
      requestedDeliveryDate: string;
    }>,
    etag?: string,
  ): Promise<SapConnectorResult<SapSalesOrder>> {
    this.logger.log(`Updating sales order: ${salesOrderId}`);

    const updateData: Record<string, unknown> = {};

    if (updates.purchaseOrderByCustomer !== undefined) {
      updateData.PurchaseOrderByCustomer = updates.purchaseOrderByCustomer;
    }

    if (updates.requestedDeliveryDate !== undefined) {
      updateData.RequestedDeliveryDate = updates.requestedDeliveryDate;
    }

    return await this.odataClient.patch<SapSalesOrder>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      salesOrderId,
      updateData,
      etag,
    );
  }

  /**
   * Get sales orders by customer PO reference
   */
  async getByCustomerPO(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    customerPO: string,
    options?: {
      salesOrganization?: string;
      customer?: string;
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapSalesOrder[]>>> {
    this.logger.log(`Getting sales orders by customer PO: ${customerPO}`);

    const filters: string[] = [`PurchaseOrderByCustomer eq '${customerPO}'`];

    if (options?.salesOrganization) {
      filters.push(`SalesOrganization eq '${options.salesOrganization}'`);
    }

    if (options?.customer) {
      filters.push(`SoldToParty eq '${options.customer}'`);
    }

    const queryOptions: SapODataQueryOptions = {
      $filter: filters.join(' and '),
      $orderby: 'CreationDate desc',
    };

    return await this.odataClient.get<SapSalesOrder[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Map create input to SAP format
   */
  private mapCreateInputToSapFormat(input: SapCreateSalesOrderInput): Record<string, unknown> {
    const order: Record<string, unknown> = {
      SalesOrderType: input.salesOrderType,
      SalesOrganization: input.salesOrganization,
      DistributionChannel: input.distributionChannel,
      OrganizationDivision: input.division,
      SoldToParty: input.soldToParty,
    };

    if (input.purchaseOrderByCustomer) {
      order.PurchaseOrderByCustomer = input.purchaseOrderByCustomer;
    }

    if (input.requestedDeliveryDate) {
      order.RequestedDeliveryDate = input.requestedDeliveryDate;
    }

    // Add items
    if (input.items?.length > 0) {
      order.to_Item = input.items.map((item, index) => ({
        SalesOrderItem: String((index + 1) * 10).padStart(6, '0'),
        Material: item.material,
        RequestedQuantity: item.requestedQuantity.toString(),
        RequestedQuantityUnit: item.requestedQuantityUnit,
        ...(item.plant && { Plant: item.plant }),
        ...(item.customerMaterial && { MaterialByCustomer: item.customerMaterial }),
      }));
    }

    return order;
  }

  /**
   * Format date for OData filter
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get human-readable status text
   */
  private getStatusText(
    overallStatus: SapSalesOrderStatus,
    deliveryStatus: SapDeliveryStatus,
    billingStatus: SapBillingStatus,
  ): string {
    const statusParts: string[] = [];

    switch (overallStatus) {
      case SapSalesOrderStatus.NOT_PROCESSED:
        statusParts.push('Not Processed');
        break;
      case SapSalesOrderStatus.PARTIALLY_PROCESSED:
        statusParts.push('Partially Processed');
        break;
      case SapSalesOrderStatus.COMPLETELY_PROCESSED:
        statusParts.push('Completely Processed');
        break;
    }

    switch (deliveryStatus) {
      case SapDeliveryStatus.PARTIALLY_DELIVERED:
        statusParts.push('Partially Delivered');
        break;
      case SapDeliveryStatus.FULLY_DELIVERED:
        statusParts.push('Fully Delivered');
        break;
    }

    switch (billingStatus) {
      case SapBillingStatus.PARTIALLY_BILLED:
        statusParts.push('Partially Billed');
        break;
      case SapBillingStatus.FULLY_BILLED:
        statusParts.push('Fully Billed');
        break;
    }

    return statusParts.join(', ') || 'Unknown';
  }
}
