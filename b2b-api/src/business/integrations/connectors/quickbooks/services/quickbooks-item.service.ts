import { Injectable, Logger } from '@nestjs/common';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksItem,
  QuickBooksConnectorResult,
  QuickBooksApiResponse,
  QuickBooksCreateItemInput,
  QuickBooksQueryOptions,
  QuickBooksItemType,
  QuickBooksApiPaths,
} from '../interfaces';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';

/**
 * List items options
 */
export interface ListItemsOptions extends QuickBooksQueryOptions {
  /** Filter by active status */
  active?: boolean;

  /** Filter by item type */
  type?: QuickBooksItemType;

  /** Search name (contains) */
  searchName?: string;

  /** Filter by SKU */
  sku?: string;
}

/**
 * Get item options
 */
export interface GetItemOptions {
  /** Include sparse fields only */
  sparse?: boolean;
}

/**
 * QuickBooks Item Service
 * Handles item/product CRUD operations
 */
@Injectable()
export class QuickBooksItemService {
  private readonly logger = new Logger(QuickBooksItemService.name);

  constructor(
    private readonly restClient: QuickBooksRestClientService,
    private readonly errorHandler: QuickBooksErrorHandlerService,
  ) {}

  /**
   * Create a new item
   */
  async create(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateItemInput,
  ): Promise<QuickBooksConnectorResult<QuickBooksItem>> {
    this.logger.debug(`Creating item: ${input.name}`);

    try {
      const itemPayload = this.buildCreatePayload(input);

      const result = await this.restClient.post<{ Item: QuickBooksItem }>(
        config,
        credentials,
        QuickBooksApiPaths.ITEM.replace('{realmId}', config.realmId),
        itemPayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksItem>;
      }

      const responseData = result.data as { Item: QuickBooksItem };

      return {
        success: true,
        data: responseData.Item,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'create-item', 0);
    }
  }

  /**
   * Get item by ID
   */
  async getById(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    itemId: string,
    _options?: GetItemOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksItem>> {
    this.logger.debug(`Getting item: ${itemId}`);

    try {
      const path = `${QuickBooksApiPaths.ITEM.replace('{realmId}', config.realmId)}/${itemId}`;

      const result = await this.restClient.get<{ Item: QuickBooksItem }>(config, credentials, path);

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksItem>;
      }

      const responseData = result.data as { Item: QuickBooksItem };

      return {
        success: true,
        data: responseData.Item,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-item', 0);
    }
  }

  /**
   * Get item by SKU
   */
  async getBySku(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    sku: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksItem | null>> {
    this.logger.debug(`Getting item by SKU: ${sku}`);

    try {
      const query = `SELECT * FROM Item WHERE Sku = '${this.escapeQueryString(sku)}'`;

      const result = await this.restClient.query<QuickBooksItem>(config, credentials, query, {
        maxResults: 1,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksItem | null>;
      }

      const items = result.data.QueryResponse?.Item || [];

      return {
        success: true,
        data: items.length > 0 ? items[0] : null,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-item-by-sku', 0);
    }
  }

  /**
   * Get item by name
   */
  async getByName(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    name: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksItem | null>> {
    this.logger.debug(`Getting item by name: ${name}`);

    try {
      const query = `SELECT * FROM Item WHERE Name = '${this.escapeQueryString(name)}'`;

      const result = await this.restClient.query<QuickBooksItem>(config, credentials, query, {
        maxResults: 1,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksItem | null>;
      }

      const items = result.data.QueryResponse?.Item || [];

      return {
        success: true,
        data: items.length > 0 ? items[0] : null,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-item-by-name', 0);
    }
  }

  /**
   * List items with filtering and pagination
   */
  async list(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListItemsOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksApiResponse<QuickBooksItem>>> {
    this.logger.debug('Listing items');

    try {
      const query = this.buildListQuery(options);

      const result = await this.restClient.query<QuickBooksItem>(config, credentials, query, {
        startPosition: options?.startPosition,
        maxResults: options?.maxResults,
        orderBy: options?.orderBy,
      });

      return result;
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'list-items', 0);
    }
  }

  /**
   * Update item
   */
  async update(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    itemId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateItemInput>,
  ): Promise<QuickBooksConnectorResult<QuickBooksItem>> {
    this.logger.debug(`Updating item: ${itemId}`);

    try {
      const updatePayload = this.buildUpdatePayload(itemId, syncToken, input);

      const result = await this.restClient.post<{ Item: QuickBooksItem }>(
        config,
        credentials,
        QuickBooksApiPaths.ITEM.replace('{realmId}', config.realmId),
        updatePayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksItem>;
      }

      const responseData = result.data as { Item: QuickBooksItem };

      return {
        success: true,
        data: responseData.Item,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'update-item', 0);
    }
  }

  /**
   * Search items by name
   */
  async search(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    searchTerm: string,
    options?: {
      type?: QuickBooksItemType;
      activeOnly?: boolean;
      limit?: number;
    },
  ): Promise<QuickBooksConnectorResult<QuickBooksItem[]>> {
    this.logger.debug(`Searching items: ${searchTerm}`);

    try {
      let query = `SELECT * FROM Item WHERE Name LIKE '%${this.escapeQueryString(searchTerm)}%'`;

      if (options?.type) {
        query += ` AND Type = '${options.type}'`;
      }

      if (options?.activeOnly !== false) {
        query += ' AND Active = true';
      }

      const result = await this.restClient.query<QuickBooksItem>(config, credentials, query, {
        maxResults: options?.limit || 25,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksItem[]>;
      }

      const items = result.data.QueryResponse?.Item || [];

      return {
        success: true,
        data: items,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'search-items', 0);
    }
  }

  /**
   * Get inventory items with quantity on hand
   */
  async getInventoryItems(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: { lowStock?: boolean; limit?: number },
  ): Promise<QuickBooksConnectorResult<QuickBooksItem[]>> {
    this.logger.debug('Getting inventory items');

    try {
      let query = "SELECT * FROM Item WHERE Type = 'Inventory' AND Active = true";

      if (options?.lowStock) {
        query += ' AND QtyOnHand < 10'; // Arbitrary low stock threshold
      }

      const result = await this.restClient.query<QuickBooksItem>(config, credentials, query, {
        maxResults: options?.limit || 100,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksItem[]>;
      }

      const items = result.data.QueryResponse?.Item || [];

      return {
        success: true,
        data: items,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-inventory-items', 0);
    }
  }

  /**
   * Deactivate item (QuickBooks doesn't support hard delete)
   */
  async deactivate(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    itemId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksItem>> {
    this.logger.debug(`Deactivating item: ${itemId}`);

    return this.update(config, credentials, itemId, syncToken, {
      active: false,
    });
  }

  /**
   * Build create item payload
   */
  private buildCreatePayload(input: QuickBooksCreateItemInput): QuickBooksItem {
    const item: QuickBooksItem = {
      Name: input.name,
      Type: input.type,
    };

    if (input.description) {
      item.Description = input.description;
    }

    if (input.sku) {
      item.Sku = input.sku;
    }

    if (input.unitPrice !== undefined) {
      item.UnitPrice = input.unitPrice;
    }

    if (input.purchaseCost !== undefined) {
      item.PurchaseCost = input.purchaseCost;
    }

    if (input.purchaseDescription) {
      item.PurchaseDesc = input.purchaseDescription;
    }

    if (input.active !== undefined) {
      item.Active = input.active;
    }

    if (input.taxable !== undefined) {
      item.Taxable = input.taxable;
    }

    if (input.trackQtyOnHand !== undefined) {
      item.TrackQtyOnHand = input.trackQtyOnHand;
    }

    if (input.qtyOnHand !== undefined) {
      item.QtyOnHand = input.qtyOnHand;
    }

    if (input.invStartDate) {
      item.InvStartDate = input.invStartDate;
    }

    if (input.incomeAccountId) {
      item.IncomeAccountRef = { value: input.incomeAccountId };
    }

    if (input.expenseAccountId) {
      item.ExpenseAccountRef = { value: input.expenseAccountId };
    }

    if (input.assetAccountId) {
      item.AssetAccountRef = { value: input.assetAccountId };
    }

    return item;
  }

  /**
   * Build update item payload
   */
  private buildUpdatePayload(
    itemId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateItemInput>,
  ): QuickBooksItem {
    const item: QuickBooksItem & { sparse?: boolean } = {
      Id: itemId,
      SyncToken: syncToken,
      sparse: true,
    };

    if (input.name) {
      item.Name = input.name;
    }

    if (input.description) {
      item.Description = input.description;
    }

    if (input.sku) {
      item.Sku = input.sku;
    }

    if (input.unitPrice !== undefined) {
      item.UnitPrice = input.unitPrice;
    }

    if (input.purchaseCost !== undefined) {
      item.PurchaseCost = input.purchaseCost;
    }

    if (input.purchaseDescription) {
      item.PurchaseDesc = input.purchaseDescription;
    }

    if (input.active !== undefined) {
      item.Active = input.active;
    }

    if (input.taxable !== undefined) {
      item.Taxable = input.taxable;
    }

    if (input.qtyOnHand !== undefined) {
      item.QtyOnHand = input.qtyOnHand;
    }

    return item;
  }

  /**
   * Build list query
   */
  private buildListQuery(options?: ListItemsOptions): string {
    let query = 'SELECT * FROM Item';
    const conditions: string[] = [];

    if (options?.active !== undefined) {
      conditions.push(`Active = ${options.active}`);
    }

    if (options?.type) {
      conditions.push(`Type = '${options.type}'`);
    }

    if (options?.searchName) {
      conditions.push(`Name LIKE '%${this.escapeQueryString(options.searchName)}%'`);
    }

    if (options?.sku) {
      conditions.push(`Sku = '${this.escapeQueryString(options.sku)}'`);
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
