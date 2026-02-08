import { Logger } from '@nestjs/common';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import { NetSuiteItem, NetSuiteApiResponse, NetSuitePaginationOptions } from '../interfaces';

/**
 * NetSuite Item Types
 */
export enum NetSuiteItemType {
  INVENTORY = 'inventoryItem',
  NON_INVENTORY = 'nonInventoryItem',
  SERVICE = 'serviceItem',
  DISCOUNT = 'discountItem',
  MARKUP = 'markupItem',
  PAYMENT = 'paymentItem',
  SUBTOTAL = 'subtotalItem',
  DESCRIPTION = 'descriptionItem',
  ASSEMBLY = 'assemblyItem',
  KIT = 'kitItem',
  SERIALIZED_INVENTORY = 'serializedInventoryItem',
  LOT_NUMBERED_INVENTORY = 'lotNumberedInventoryItem',
}

/**
 * NetSuite Item Service
 * Handles item/product operations through NetSuite REST API
 */
export class NetSuiteItemService {
  private readonly logger = new Logger(NetSuiteItemService.name);

  constructor(private readonly restClient: NetSuiteRestClientService) {}

  /**
   * Get item by ID
   */
  async getById(id: string, itemType?: NetSuiteItemType): Promise<NetSuiteItem> {
    this.logger.debug('Getting NetSuite item', { id, itemType });

    const recordType = itemType || 'inventoryItem';

    const response = await this.restClient.get<NetSuiteItem>(`${recordType}/${id}`, {
      expandSubResources: 'true',
    });

    return response.data || (response as unknown as NetSuiteItem);
  }

  /**
   * Get item by external ID
   */
  async getByExternalId(externalId: string): Promise<NetSuiteItem | null> {
    this.logger.debug('Getting NetSuite item by external ID', { externalId });

    try {
      const query = `
        SELECT id, itemid, displayname, itemtype, baseprice, isinactive
        FROM item
        WHERE custitem_external_id = '${this.escapeSql(externalId)}'
      `;

      const response = await this.restClient.executeSuiteQL<NetSuiteItem>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        const item = response.items[0];
        const itemType = this.mapItemTypeToRecordType(item.itemType || '');
        return this.getById(item.id!, itemType);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find item by external ID', {
        externalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get item by SKU/Item ID
   */
  async getBySku(sku: string): Promise<NetSuiteItem | null> {
    this.logger.debug('Getting NetSuite item by SKU', { sku });

    try {
      const query = `
        SELECT id, itemid, displayname, itemtype, baseprice, isinactive
        FROM item
        WHERE itemid = '${this.escapeSql(sku)}'
      `;

      const response = await this.restClient.executeSuiteQL<NetSuiteItem>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        const item = response.items[0];
        const itemType = this.mapItemTypeToRecordType(item.itemType || '');
        return this.getById(item.id!, itemType);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find item by SKU', {
        sku,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get item by UPC code
   */
  async getByUpc(upc: string): Promise<NetSuiteItem | null> {
    this.logger.debug('Getting NetSuite item by UPC', { upc });

    try {
      const query = `
        SELECT id, itemid, displayname, itemtype, baseprice, isinactive, upccode
        FROM item
        WHERE upccode = '${this.escapeSql(upc)}'
      `;

      const response = await this.restClient.executeSuiteQL<NetSuiteItem>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        const item = response.items[0];
        const itemType = this.mapItemTypeToRecordType(item.itemType || '');
        return this.getById(item.id!, itemType);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find item by UPC', {
        upc,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * List items with optional filters
   */
  async list(
    filters?: {
      itemType?: string;
      subsidiary?: string;
      class?: string;
      department?: string;
      location?: string;
      includeInactive?: boolean;
      searchTerm?: string;
      externalIdPrefix?: string;
      isTaxable?: boolean;
      isOnline?: boolean;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteItem>> {
    this.logger.debug('Listing NetSuite items', { filters, pagination });

    let query = `
      SELECT id, itemid, displayname, salesdescription, itemtype,
             baseprice, cost, isinactive, istaxable, isonline,
             quantityonhand, quantityavailable, custitem_external_id
      FROM item
      WHERE 1=1
    `;

    if (!filters?.includeInactive) {
      query += " AND isinactive = 'F'";
    }

    if (filters?.itemType) {
      query += ` AND itemtype = '${this.escapeSql(filters.itemType)}'`;
    }

    if (filters?.subsidiary) {
      query += ` AND subsidiary = ${filters.subsidiary}`;
    }

    if (filters?.class) {
      query += ` AND class = ${filters.class}`;
    }

    if (filters?.department) {
      query += ` AND department = ${filters.department}`;
    }

    if (filters?.location) {
      query += ` AND location = ${filters.location}`;
    }

    if (filters?.searchTerm) {
      const term = this.escapeSql(filters.searchTerm);
      query += ` AND (
        LOWER(itemid) LIKE LOWER('%${term}%')
        OR LOWER(displayname) LIKE LOWER('%${term}%')
        OR LOWER(salesdescription) LIKE LOWER('%${term}%')
      )`;
    }

    if (filters?.externalIdPrefix) {
      query += ` AND custitem_external_id LIKE '${this.escapeSql(filters.externalIdPrefix)}%'`;
    }

    if (filters?.isTaxable !== undefined) {
      query += ` AND istaxable = '${filters.isTaxable ? 'T' : 'F'}'`;
    }

    if (filters?.isOnline !== undefined) {
      query += ` AND isonline = '${filters.isOnline ? 'T' : 'F'}'`;
    }

    query += ' ORDER BY itemid';

    return this.restClient.executeSuiteQL<NetSuiteItem>(query, pagination);
  }

  /**
   * Get items modified since a specific date
   */
  async getModifiedSince(
    sinceDate: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteItem>> {
    this.logger.debug('Getting items modified since', { sinceDate });

    const query = `
      SELECT id, itemid, displayname, salesdescription, itemtype,
             baseprice, cost, isinactive, istaxable, isonline,
             quantityonhand, quantityavailable, custitem_external_id,
             lastmodifieddate
      FROM item
      WHERE lastmodifieddate >= TO_DATE('${sinceDate}', 'YYYY-MM-DD"T"HH24:MI:SS')
      ORDER BY lastmodifieddate DESC
    `;

    return this.restClient.executeSuiteQL<NetSuiteItem>(query, pagination);
  }

  /**
   * Get item pricing
   */
  async getPricing(itemId: string, priceLevel?: string, currency?: string): Promise<NetSuiteItem> {
    this.logger.debug('Getting item pricing', { itemId, priceLevel, currency });

    const response = await this.restClient.get<NetSuiteItem>(`inventoryItem/${itemId}`, {
      fields: 'id,itemId,basePrice,pricing',
      expandSubResources: 'true',
    });

    return response.data || (response as unknown as NetSuiteItem);
  }

  /**
   * Get item inventory by location
   */
  async getInventoryByLocation(itemId: string): Promise<NetSuiteItem> {
    this.logger.debug('Getting item inventory by location', { itemId });

    const response = await this.restClient.get<NetSuiteItem>(`inventoryItem/${itemId}`, {
      fields:
        'id,itemId,quantityOnHand,quantityAvailable,quantityOnOrder,quantityCommitted,locations',
      expandSubResources: 'true',
    });

    return response.data || (response as unknown as NetSuiteItem);
  }

  /**
   * Search items
   */
  async search(
    searchTerm: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteItem>> {
    return this.list({ searchTerm, includeInactive: false }, pagination);
  }

  /**
   * Get all saleable items (for online catalog)
   */
  async getSaleableItems(
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteItem>> {
    this.logger.debug('Getting saleable items');

    const query = `
      SELECT id, itemid, displayname, salesdescription, itemtype,
             baseprice, cost, quantityavailable, custitem_external_id
      FROM item
      WHERE isinactive = 'F'
      AND isonline = 'T'
      AND itemtype IN ('InvtPart', 'NonInvtPart', 'Service', 'Kit', 'Assembly')
      ORDER BY displayname
    `;

    return this.restClient.executeSuiteQL<NetSuiteItem>(query, pagination);
  }

  /**
   * Map item type string to record type
   */
  private mapItemTypeToRecordType(itemType: string): NetSuiteItemType {
    const typeMap: Record<string, NetSuiteItemType> = {
      InvtPart: NetSuiteItemType.INVENTORY,
      NonInvtPart: NetSuiteItemType.NON_INVENTORY,
      Service: NetSuiteItemType.SERVICE,
      Discount: NetSuiteItemType.DISCOUNT,
      Markup: NetSuiteItemType.MARKUP,
      Payment: NetSuiteItemType.PAYMENT,
      Subtotal: NetSuiteItemType.SUBTOTAL,
      Description: NetSuiteItemType.DESCRIPTION,
      Assembly: NetSuiteItemType.ASSEMBLY,
      Kit: NetSuiteItemType.KIT,
      SerializedInventoryItem: NetSuiteItemType.SERIALIZED_INVENTORY,
      LotNumberedInventoryItem: NetSuiteItemType.LOT_NUMBERED_INVENTORY,
    };

    return typeMap[itemType] || NetSuiteItemType.INVENTORY;
  }

  /**
   * Escape SQL string for SuiteQL
   */
  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }
}
