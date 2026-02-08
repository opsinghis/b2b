import { Logger } from '@nestjs/common';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import {
  NetSuiteSalesOrder,
  NetSuiteApiResponse,
  NetSuiteCreateSalesOrderInput,
  NetSuitePaginationOptions,
} from '../interfaces';

/**
 * NetSuite Sales Order Status Codes
 */
export enum NetSuiteSalesOrderStatusId {
  PENDING_APPROVAL = 'pendingApproval',
  PENDING_FULFILLMENT = 'pendingFulfillment',
  PARTIALLY_FULFILLED = 'partiallyFulfilled',
  PENDING_BILLING = 'pendingBilling',
  PENDING_BILLING_PARTIALLY_FULFILLED = 'pendingBillingPartFulfilled',
  BILLED = 'billed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

/**
 * NetSuite Sales Order Service
 * Handles sales order operations through NetSuite REST API
 */
export class NetSuiteSalesOrderService {
  private readonly logger = new Logger(NetSuiteSalesOrderService.name);
  private readonly recordType = 'salesOrder';

  constructor(private readonly restClient: NetSuiteRestClientService) {}

  /**
   * Create a new sales order
   */
  async create(input: NetSuiteCreateSalesOrderInput): Promise<NetSuiteSalesOrder> {
    this.logger.debug('Creating NetSuite sales order', {
      customerId: input.customerId,
      itemCount: input.items.length,
    });

    const orderData = this.mapInputToNetSuiteFormat(input);

    const response = await this.restClient.post<NetSuiteSalesOrder>(this.recordType, orderData);

    // For POST, NetSuite returns the created record ID in the header
    // or the full record depending on config
    const createdOrder = response.data || (response as unknown as NetSuiteSalesOrder);

    this.logger.debug('Sales order created', { orderId: createdOrder.id });

    return createdOrder;
  }

  /**
   * Get sales order by ID
   */
  async getById(id: string): Promise<NetSuiteSalesOrder> {
    this.logger.debug('Getting NetSuite sales order', { id });

    const response = await this.restClient.get<NetSuiteSalesOrder>(`${this.recordType}/${id}`, {
      expandSubResources: 'true',
    });

    return response.data || (response as unknown as NetSuiteSalesOrder);
  }

  /**
   * Get sales order by external ID
   */
  async getByExternalId(externalId: string): Promise<NetSuiteSalesOrder | null> {
    this.logger.debug('Getting NetSuite sales order by external ID', { externalId });

    try {
      // Use SuiteQL to find by external ID custom field
      const query = `
        SELECT id, tranid, status, entity, total
        FROM transaction
        WHERE type = 'SalesOrd'
        AND custbody_external_id = '${this.escapeSql(externalId)}'
      `;

      const response = await this.restClient.executeSuiteQL<{ id: string }>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        return this.getById(response.items[0].id);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find sales order by external ID', {
        externalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Update sales order
   */
  async update(
    id: string,
    data: Partial<NetSuiteCreateSalesOrderInput>,
  ): Promise<NetSuiteSalesOrder> {
    this.logger.debug('Updating NetSuite sales order', { id });

    const updateData = this.mapPartialInputToNetSuiteFormat(data);

    const response = await this.restClient.patch<NetSuiteSalesOrder>(
      `${this.recordType}/${id}`,
      updateData,
    );

    return response.data || (response as unknown as NetSuiteSalesOrder);
  }

  /**
   * Get sales order status
   */
  async getStatus(id: string): Promise<{
    id: string;
    status: string;
    statusId: string;
    tranId: string;
  }> {
    this.logger.debug('Getting NetSuite sales order status', { id });

    const response = await this.restClient.get<NetSuiteSalesOrder>(`${this.recordType}/${id}`, {
      fields: 'id,tranId,status',
    });

    const order = response.data || (response as unknown as NetSuiteSalesOrder);

    return {
      id: order.id || id,
      status: order.status?.refName || 'Unknown',
      statusId: order.status?.id || '',
      tranId: order.tranId || '',
    };
  }

  /**
   * List sales orders with optional filters
   */
  async list(
    filters?: {
      status?: NetSuiteSalesOrderStatusId;
      customerId?: string;
      fromDate?: string;
      toDate?: string;
      externalIdPrefix?: string;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteSalesOrder>> {
    this.logger.debug('Listing NetSuite sales orders', { filters, pagination });

    // Build SuiteQL query for better filtering support
    let query = `
      SELECT id, tranid, trandate, status, entity, total,
             custbody_external_id, memo
      FROM transaction
      WHERE type = 'SalesOrd'
    `;

    if (filters?.status) {
      query += ` AND status = '${this.escapeSql(filters.status)}'`;
    }

    if (filters?.customerId) {
      query += ` AND entity = ${filters.customerId}`;
    }

    if (filters?.fromDate) {
      query += ` AND trandate >= TO_DATE('${filters.fromDate}', 'YYYY-MM-DD')`;
    }

    if (filters?.toDate) {
      query += ` AND trandate <= TO_DATE('${filters.toDate}', 'YYYY-MM-DD')`;
    }

    if (filters?.externalIdPrefix) {
      query += ` AND custbody_external_id LIKE '${this.escapeSql(filters.externalIdPrefix)}%'`;
    }

    query += ' ORDER BY trandate DESC, id DESC';

    return this.restClient.executeSuiteQL<NetSuiteSalesOrder>(query, pagination);
  }

  /**
   * Close sales order
   */
  async close(id: string): Promise<NetSuiteSalesOrder> {
    this.logger.debug('Closing NetSuite sales order', { id });

    // NetSuite doesn't have a direct close endpoint, need to close line items
    return this.update(id, {
      customFields: { isclosed: true },
    });
  }

  /**
   * Get orders modified since a specific date
   */
  async getModifiedSince(
    sinceDate: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteSalesOrder>> {
    this.logger.debug('Getting sales orders modified since', { sinceDate });

    const query = `
      SELECT id, tranid, trandate, status, entity, total,
             custbody_external_id, lastmodifieddate
      FROM transaction
      WHERE type = 'SalesOrd'
      AND lastmodifieddate >= TO_DATE('${sinceDate}', 'YYYY-MM-DD"T"HH24:MI:SS')
      ORDER BY lastmodifieddate DESC
    `;

    return this.restClient.executeSuiteQL<NetSuiteSalesOrder>(query, pagination);
  }

  /**
   * Map input to NetSuite sales order format
   */
  private mapInputToNetSuiteFormat(input: NetSuiteCreateSalesOrderInput): Record<string, unknown> {
    const order: Record<string, unknown> = {
      entity: { id: input.customerId },
    };

    if (input.orderDate) {
      order.tranDate = input.orderDate;
    }

    if (input.externalId) {
      order.custbody_external_id = input.externalId;
      order.custbody_b2b_order_id = input.externalId;
    }

    if (input.memo) {
      order.memo = input.memo;
    }

    if (input.terms) {
      order.terms = { id: input.terms };
    }

    if (input.shipMethod) {
      order.shipMethod = { id: input.shipMethod };
    }

    if (input.billingAddress) {
      order.billingAddress = this.mapAddressToNetSuiteFormat(input.billingAddress);
    }

    if (input.shippingAddress) {
      order.shippingAddress = this.mapAddressToNetSuiteFormat(input.shippingAddress);
    }

    // Map line items
    order.item = {
      items: input.items.map((item, index) => ({
        lineNumber: index + 1,
        item: { id: item.itemId },
        quantity: item.quantity,
        ...(item.rate !== undefined && { rate: item.rate }),
        ...(item.description && { description: item.description }),
        ...(item.location && { location: { id: item.location } }),
      })),
    };

    // Add custom fields
    if (input.customFields) {
      Object.entries(input.customFields).forEach(([key, value]) => {
        order[key] = value;
      });
    }

    return order;
  }

  /**
   * Map partial input for updates
   */
  private mapPartialInputToNetSuiteFormat(
    data: Partial<NetSuiteCreateSalesOrderInput>,
  ): Record<string, unknown> {
    const update: Record<string, unknown> = {};

    if (data.memo !== undefined) {
      update.memo = data.memo;
    }

    if (data.shipMethod) {
      update.shipMethod = { id: data.shipMethod };
    }

    if (data.billingAddress) {
      update.billingAddress = this.mapAddressToNetSuiteFormat(data.billingAddress);
    }

    if (data.shippingAddress) {
      update.shippingAddress = this.mapAddressToNetSuiteFormat(data.shippingAddress);
    }

    if (data.customFields) {
      Object.entries(data.customFields).forEach(([key, value]) => {
        update[key] = value;
      });
    }

    return update;
  }

  /**
   * Map address to NetSuite format
   */
  private mapAddressToNetSuiteFormat(address: {
    addr1?: string;
    addr2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }): Record<string, unknown> {
    return {
      addr1: address.addr1,
      addr2: address.addr2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country ? { id: address.country } : undefined,
    };
  }

  /**
   * Escape SQL string for SuiteQL
   */
  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }
}
