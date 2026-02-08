import { Logger } from '@nestjs/common';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import {
  NetSuiteInventoryStatus,
  NetSuiteApiResponse,
  NetSuiteInventoryCheckRequest,
  NetSuitePaginationOptions,
} from '../interfaces';

/**
 * NetSuite Inventory Service
 * Handles inventory operations through NetSuite REST API
 */
export class NetSuiteInventoryService {
  private readonly logger = new Logger(NetSuiteInventoryService.name);

  constructor(private readonly restClient: NetSuiteRestClientService) {}

  /**
   * Check inventory availability for a single item
   */
  async checkAvailability(
    request: NetSuiteInventoryCheckRequest,
  ): Promise<NetSuiteInventoryStatus> {
    this.logger.debug('Checking inventory availability', {
      itemId: request.itemId,
      locationId: request.locationId,
    });

    let query = `
      SELECT
        item.id AS itemid,
        item.itemid AS sku,
        item.displayname AS displayname,
        location.id AS locationid,
        location.name AS locationname,
        SUM(balance.quantityonhand) AS quantityonhand,
        SUM(balance.quantityavailable) AS quantityavailable,
        SUM(balance.quantityonorder) AS quantityonorder,
        SUM(balance.quantitycommitted) AS quantitycommitted,
        SUM(balance.quantitybackordered) AS quantitybackordered,
        AVG(item.averagecost) AS averagecost
      FROM inventoryBalance AS balance
      INNER JOIN item ON item.id = balance.item
      INNER JOIN location ON location.id = balance.location
      WHERE item.id = ${request.itemId}
    `;

    if (request.locationId) {
      query += ` AND location.id = ${request.locationId}`;
    }

    if (request.subsidiaryId) {
      query += ` AND location.subsidiary = ${request.subsidiaryId}`;
    }

    query += ' GROUP BY item.id, item.itemid, item.displayname, location.id, location.name';

    const response = await this.restClient.executeSuiteQL<{
      itemid: string;
      locationid: string;
      quantityonhand: number;
      quantityavailable: number;
      quantityonorder: number;
      quantitycommitted: number;
      quantitybackordered: number;
      averagecost: number;
    }>(query, { limit: 1 });

    if (response.items && response.items.length > 0) {
      const result = response.items[0];
      return {
        item: { id: result.itemid },
        location: request.locationId ? { id: result.locationid } : undefined,
        quantityOnHand: result.quantityonhand || 0,
        quantityAvailable: result.quantityavailable || 0,
        quantityOnOrder: result.quantityonorder || 0,
        quantityCommitted: result.quantitycommitted || 0,
        quantityBackOrdered: result.quantitybackordered || 0,
        averageCost: result.averagecost,
      };
    }

    // Return zero inventory if not found
    return {
      item: { id: request.itemId },
      location: request.locationId ? { id: request.locationId } : undefined,
      quantityOnHand: 0,
      quantityAvailable: 0,
      quantityOnOrder: 0,
      quantityCommitted: 0,
      quantityBackOrdered: 0,
    };
  }

  /**
   * Check inventory for multiple items
   */
  async checkMultipleAvailability(
    itemIds: string[],
    locationId?: string,
  ): Promise<Map<string, NetSuiteInventoryStatus>> {
    this.logger.debug('Checking inventory for multiple items', {
      itemCount: itemIds.length,
      locationId,
    });

    const itemIdList = itemIds.join(',');

    let query = `
      SELECT
        item.id AS itemid,
        item.itemid AS sku,
        SUM(balance.quantityonhand) AS quantityonhand,
        SUM(balance.quantityavailable) AS quantityavailable,
        SUM(balance.quantityonorder) AS quantityonorder,
        SUM(balance.quantitycommitted) AS quantitycommitted,
        SUM(balance.quantitybackordered) AS quantitybackordered
      FROM inventoryBalance AS balance
      INNER JOIN item ON item.id = balance.item
      WHERE item.id IN (${itemIdList})
    `;

    if (locationId) {
      query += ` AND balance.location = ${locationId}`;
    }

    query += ' GROUP BY item.id, item.itemid';

    const response = await this.restClient.executeSuiteQL<{
      itemid: string;
      quantityonhand: number;
      quantityavailable: number;
      quantityonorder: number;
      quantitycommitted: number;
      quantitybackordered: number;
    }>(query);

    const result = new Map<string, NetSuiteInventoryStatus>();

    // Initialize all items with zero inventory
    itemIds.forEach((itemId) => {
      result.set(itemId, {
        item: { id: itemId },
        location: locationId ? { id: locationId } : undefined,
        quantityOnHand: 0,
        quantityAvailable: 0,
        quantityOnOrder: 0,
        quantityCommitted: 0,
        quantityBackOrdered: 0,
      });
    });

    // Update with actual values
    if (response.items) {
      response.items.forEach((item) => {
        result.set(item.itemid, {
          item: { id: item.itemid },
          location: locationId ? { id: locationId } : undefined,
          quantityOnHand: item.quantityonhand || 0,
          quantityAvailable: item.quantityavailable || 0,
          quantityOnOrder: item.quantityonorder || 0,
          quantityCommitted: item.quantitycommitted || 0,
          quantityBackOrdered: item.quantitybackordered || 0,
        });
      });
    }

    return result;
  }

  /**
   * Get inventory by location for an item
   */
  async getInventoryByLocation(
    itemId: string,
  ): Promise<Array<NetSuiteInventoryStatus & { locationName?: string }>> {
    this.logger.debug('Getting inventory by location', { itemId });

    const query = `
      SELECT
        item.id AS itemid,
        location.id AS locationid,
        location.name AS locationname,
        balance.quantityonhand,
        balance.quantityavailable,
        balance.quantityonorder,
        balance.quantitycommitted,
        balance.quantitybackordered
      FROM inventoryBalance AS balance
      INNER JOIN item ON item.id = balance.item
      INNER JOIN location ON location.id = balance.location
      WHERE item.id = ${itemId}
      ORDER BY location.name
    `;

    const response = await this.restClient.executeSuiteQL<{
      itemid: string;
      locationid: string;
      locationname: string;
      quantityonhand: number;
      quantityavailable: number;
      quantityonorder: number;
      quantitycommitted: number;
      quantitybackordered: number;
    }>(query);

    return (response.items || []).map((item) => ({
      item: { id: item.itemid },
      location: { id: item.locationid, refName: item.locationname },
      locationName: item.locationname,
      quantityOnHand: item.quantityonhand || 0,
      quantityAvailable: item.quantityavailable || 0,
      quantityOnOrder: item.quantityonorder || 0,
      quantityCommitted: item.quantitycommitted || 0,
      quantityBackOrdered: item.quantitybackordered || 0,
    }));
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(
    locationId?: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteInventoryStatus & { reorderPoint?: number }>> {
    this.logger.debug('Getting low stock items', { locationId });

    let query = `
      SELECT
        item.id AS itemid,
        item.itemid AS sku,
        item.displayname,
        location.id AS locationid,
        location.name AS locationname,
        SUM(balance.quantityavailable) AS quantityavailable,
        item.reorderpoint,
        item.preferredstocklevel
      FROM inventoryBalance AS balance
      INNER JOIN item ON item.id = balance.item
      INNER JOIN location ON location.id = balance.location
      WHERE item.reorderpoint IS NOT NULL
      AND item.isinactive = 'F'
    `;

    if (locationId) {
      query += ` AND location.id = ${locationId}`;
    }

    query += `
      GROUP BY item.id, item.itemid, item.displayname, location.id, location.name,
               item.reorderpoint, item.preferredstocklevel
      HAVING SUM(balance.quantityavailable) <= item.reorderpoint
      ORDER BY (item.reorderpoint - SUM(balance.quantityavailable)) DESC
    `;

    return this.restClient.executeSuiteQL<NetSuiteInventoryStatus & { reorderPoint?: number }>(
      query,
      pagination,
    );
  }

  /**
   * Get out of stock items
   */
  async getOutOfStockItems(
    locationId?: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteInventoryStatus>> {
    this.logger.debug('Getting out of stock items', { locationId });

    let query = `
      SELECT
        item.id AS itemid,
        item.itemid AS sku,
        item.displayname,
        location.id AS locationid,
        location.name AS locationname,
        SUM(balance.quantityavailable) AS quantityavailable,
        SUM(balance.quantityonorder) AS quantityonorder,
        SUM(balance.quantitybackordered) AS quantitybackordered
      FROM inventoryBalance AS balance
      INNER JOIN item ON item.id = balance.item
      INNER JOIN location ON location.id = balance.location
      WHERE item.isinactive = 'F'
      AND item.itemtype IN ('InvtPart', 'Assembly', 'Kit')
    `;

    if (locationId) {
      query += ` AND location.id = ${locationId}`;
    }

    query += `
      GROUP BY item.id, item.itemid, item.displayname, location.id, location.name
      HAVING SUM(balance.quantityavailable) <= 0
      ORDER BY item.displayname
    `;

    return this.restClient.executeSuiteQL<NetSuiteInventoryStatus>(query, pagination);
  }

  /**
   * Get inventory valuation summary
   */
  async getInventoryValuation(
    locationId?: string,
    subsidiaryId?: string,
  ): Promise<{
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
  }> {
    this.logger.debug('Getting inventory valuation', { locationId, subsidiaryId });

    let query = `
      SELECT
        COUNT(DISTINCT item.id) AS totalitems,
        SUM(balance.quantityonhand) AS totalquantity,
        SUM(balance.quantityonhand * COALESCE(item.averagecost, item.cost, 0)) AS totalvalue
      FROM inventoryBalance AS balance
      INNER JOIN item ON item.id = balance.item
      WHERE item.isinactive = 'F'
    `;

    if (locationId) {
      query += ` AND balance.location = ${locationId}`;
    }

    if (subsidiaryId) {
      query += ` AND balance.subsidiary = ${subsidiaryId}`;
    }

    const response = await this.restClient.executeSuiteQL<{
      totalitems: number;
      totalquantity: number;
      totalvalue: number;
    }>(query, { limit: 1 });

    if (response.items && response.items.length > 0) {
      const result = response.items[0];
      return {
        totalItems: result.totalitems || 0,
        totalQuantity: result.totalquantity || 0,
        totalValue: result.totalvalue || 0,
      };
    }

    return {
      totalItems: 0,
      totalQuantity: 0,
      totalValue: 0,
    };
  }

  /**
   * Get inventory transactions for an item
   */
  async getInventoryTransactions(
    itemId: string,
    options?: {
      fromDate?: string;
      toDate?: string;
      locationId?: string;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<
    NetSuiteApiResponse<{
      transactionId: string;
      transactionType: string;
      date: string;
      quantity: number;
      locationId?: string;
    }>
  > {
    this.logger.debug('Getting inventory transactions', { itemId, options });

    let query = `
      SELECT
        transaction.id AS transactionid,
        transaction.type AS transactiontype,
        transaction.trandate AS date,
        line.quantity,
        line.location AS locationid
      FROM transactionLine AS line
      INNER JOIN transaction ON transaction.id = line.transaction
      WHERE line.item = ${itemId}
      AND transaction.type IN ('ItemRcpt', 'ItemShip', 'InvtPart', 'InvAdjst', 'TrnfrOrd')
    `;

    if (options?.fromDate) {
      query += ` AND transaction.trandate >= TO_DATE('${options.fromDate}', 'YYYY-MM-DD')`;
    }

    if (options?.toDate) {
      query += ` AND transaction.trandate <= TO_DATE('${options.toDate}', 'YYYY-MM-DD')`;
    }

    if (options?.locationId) {
      query += ` AND line.location = ${options.locationId}`;
    }

    query += ' ORDER BY transaction.trandate DESC, transaction.id DESC';

    const response = await this.restClient.executeSuiteQL<{
      transactionid: string;
      transactiontype: string;
      date: string;
      quantity: number;
      locationid: string;
    }>(query, pagination);

    // Map lowercase SuiteQL column names to camelCase
    return {
      totalResults: response.totalResults,
      count: response.count,
      hasMore: response.hasMore,
      offset: response.offset,
      links: response.links,
      items: response.items?.map((item) => ({
        transactionId: item.transactionid,
        transactionType: item.transactiontype,
        date: item.date,
        quantity: item.quantity,
        locationId: item.locationid,
      })),
    };
  }
}
