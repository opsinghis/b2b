import { Injectable, Logger } from '@nestjs/common';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleItem,
  OracleApiPaths,
  OracleConnectorResult,
  OracleApiResponse,
} from '../interfaces';
import { OracleRestClientService } from './oracle-rest-client.service';
import { OracleErrorHandlerService } from './oracle-error-handler.service';

/**
 * List items options
 */
export interface ListItemsOptions {
  /** Filter by organization ID */
  organizationId?: number;

  /** Filter by organization code */
  organizationCode?: string;

  /** Filter by item status */
  status?: string;

  /** Filter by item type */
  itemType?: string;

  /** Filter by catalog group ID */
  catalogGroupId?: number;

  /** Filter shippable items only */
  shippableOnly?: boolean;

  /** Filter orderable items only */
  orderableOnly?: boolean;

  /** Filter stock enabled items only */
  stockEnabledOnly?: boolean;

  /** Search term (item number or description) */
  searchTerm?: string;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Order by field */
  orderBy?: string;
}

/**
 * Get item options
 */
export interface GetItemOptions {
  /** Organization ID */
  organizationId?: number;

  /** Additional fields to select */
  fields?: string[];

  /** Expand related resources */
  expand?: string[];
}

/**
 * Inventory balance result
 */
export interface InventoryBalance {
  itemId: number;
  itemNumber: string;
  organizationId: number;
  organizationCode: string;
  subinventory?: string;
  locator?: string;
  onHandQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  uomCode: string;
}

/**
 * Oracle ERP Cloud Item Service
 * Handles Item/Product operations (Product Information Management)
 */
@Injectable()
export class OracleItemService {
  private readonly logger = new Logger(OracleItemService.name);

  constructor(
    private readonly restClient: OracleRestClientService,
    private readonly errorHandler: OracleErrorHandlerService,
  ) {}

  /**
   * Get item by ID
   */
  async getById(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    itemId: string | number,
    options?: GetItemOptions,
  ): Promise<OracleConnectorResult<OracleItem>> {
    const params: Record<string, string | number | boolean | undefined> = {};

    if (options?.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }

    if (options?.expand && options.expand.length > 0) {
      params.expand = options.expand.join(',');
    }

    if (options?.organizationId) {
      params.organizationId = options.organizationId;
    }

    return this.restClient.getById<OracleItem>(config, credentials, OracleApiPaths.ITEMS, itemId, {
      params,
    });
  }

  /**
   * Get item by item number
   */
  async getByItemNumber(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    itemNumber: string,
    organizationId?: number,
  ): Promise<OracleConnectorResult<OracleItem | null>> {
    const filters: string[] = [`ItemNumber='${itemNumber}'`];

    if (organizationId) {
      filters.push(`OrganizationId=${organizationId}`);
    }

    const result = await this.restClient.get<OracleItem>(
      config,
      credentials,
      OracleApiPaths.ITEMS,
      {
        params: {
          q: filters.join(' and '),
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

    const item = result.data?.items?.[0] || null;

    return {
      success: true,
      data: item,
      metadata: result.metadata,
    };
  }

  /**
   * List items
   */
  async list(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListItemsOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleItem>>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    const filters: string[] = [];

    // Build filters
    if (options?.organizationId) {
      filters.push(`OrganizationId=${options.organizationId}`);
    }

    if (options?.organizationCode) {
      filters.push(`OrganizationCode='${options.organizationCode}'`);
    }

    if (options?.status) {
      filters.push(`ItemStatus='${options.status}'`);
    }

    if (options?.itemType) {
      filters.push(`ItemType='${options.itemType}'`);
    }

    if (options?.catalogGroupId) {
      filters.push(`ItemCatalogGroupId=${options.catalogGroupId}`);
    }

    if (options?.shippableOnly) {
      filters.push(`ShippableFlag='Y'`);
    }

    if (options?.orderableOnly) {
      filters.push(`OrderableFlag='Y'`);
    }

    if (options?.stockEnabledOnly) {
      filters.push(`StockEnabledFlag='Y'`);
    }

    if (options?.searchTerm) {
      // Search in both item number and description
      filters.push(
        `(ItemNumber like '*${options.searchTerm}*' or ItemDescription like '*${options.searchTerm}*')`,
      );
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

    params.totalResults = true;

    return this.restClient.get<OracleItem>(config, credentials, OracleApiPaths.ITEMS, { params });
  }

  /**
   * Search items
   */
  async search(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    searchTerm: string,
    options?: {
      organizationId?: number;
      orderableOnly?: boolean;
      limit?: number;
    },
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleItem>>> {
    return this.list(config, credentials, {
      searchTerm,
      organizationId: options?.organizationId,
      orderableOnly: options?.orderableOnly,
      limit: options?.limit || 25,
      status: 'Active',
    });
  }

  /**
   * Get inventory balance for item
   */
  async getInventoryBalance(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    itemId: number | string,
    organizationId: number,
    subinventory?: string,
  ): Promise<OracleConnectorResult<InventoryBalance[]>> {
    const filters: string[] = [`InventoryItemId=${itemId}`, `OrganizationId=${organizationId}`];

    if (subinventory) {
      filters.push(`Subinventory='${subinventory}'`);
    }

    const result = await this.restClient.get<{
      InventoryItemId: number;
      ItemNumber: string;
      OrganizationId: number;
      OrganizationCode: string;
      Subinventory?: string;
      Locator?: string;
      OnHandQuantity: number;
      AvailableQuantity: number;
      ReservedQuantity: number;
      PrimaryUOMCode: string;
    }>(config, credentials, OracleApiPaths.INVENTORY_BALANCES, {
      params: {
        q: filters.join(' and '),
        totalResults: true,
      },
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const balances: InventoryBalance[] =
      result.data?.items?.map((item) => ({
        itemId: item.InventoryItemId,
        itemNumber: item.ItemNumber,
        organizationId: item.OrganizationId,
        organizationCode: item.OrganizationCode,
        subinventory: item.Subinventory,
        locator: item.Locator,
        onHandQuantity: item.OnHandQuantity || 0,
        availableQuantity: item.AvailableQuantity || 0,
        reservedQuantity: item.ReservedQuantity || 0,
        uomCode: item.PrimaryUOMCode,
      })) || [];

    return {
      success: true,
      data: balances,
      metadata: result.metadata,
    };
  }

  /**
   * Check item availability (ATP)
   */
  async checkAvailability(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    itemNumber: string,
    organizationId: number,
    requestedQuantity: number,
  ): Promise<
    OracleConnectorResult<{
      available: boolean;
      availableQuantity: number;
      onHandQuantity: number;
      reservedQuantity: number;
    }>
  > {
    // First get the item to get the ID
    const itemResult = await this.getByItemNumber(config, credentials, itemNumber, organizationId);

    if (!itemResult.success || !itemResult.data) {
      return {
        success: false,
        error: itemResult.error || {
          code: 'ITEM_NOT_FOUND',
          message: `Item ${itemNumber} not found`,
          retryable: false,
        },
        metadata: itemResult.metadata,
      };
    }

    // Get inventory balance
    const balanceResult = await this.getInventoryBalance(
      config,
      credentials,
      itemResult.data.InventoryItemId!,
      organizationId,
    );

    if (!balanceResult.success) {
      return {
        success: false,
        error: balanceResult.error,
        metadata: balanceResult.metadata,
      };
    }

    // Aggregate balances across subinventories
    const totalBalance = balanceResult.data!.reduce(
      (acc, balance) => ({
        onHandQuantity: acc.onHandQuantity + balance.onHandQuantity,
        availableQuantity: acc.availableQuantity + balance.availableQuantity,
        reservedQuantity: acc.reservedQuantity + balance.reservedQuantity,
      }),
      { onHandQuantity: 0, availableQuantity: 0, reservedQuantity: 0 },
    );

    return {
      success: true,
      data: {
        available: totalBalance.availableQuantity >= requestedQuantity,
        availableQuantity: totalBalance.availableQuantity,
        onHandQuantity: totalBalance.onHandQuantity,
        reservedQuantity: totalBalance.reservedQuantity,
      },
      metadata: balanceResult.metadata,
    };
  }

  /**
   * Get items by catalog group
   */
  async getByCatalogGroup(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    catalogGroupId: number,
    options?: {
      organizationId?: number;
      limit?: number;
      offset?: number;
    },
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleItem>>> {
    return this.list(config, credentials, {
      catalogGroupId,
      organizationId: options?.organizationId,
      limit: options?.limit,
      offset: options?.offset,
      orderableOnly: true,
      status: 'Active',
    });
  }

  /**
   * Get multiple items by item numbers
   */
  async getByItemNumbers(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    itemNumbers: string[],
    organizationId?: number,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleItem>>> {
    if (itemNumbers.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          metadata: { count: 0 },
        },
        metadata: {
          requestId: 'empty',
          durationMs: 0,
        },
      };
    }

    // Build IN clause filter
    const itemNumbersFilter = itemNumbers.map((n) => `'${n}'`).join(',');

    const filters: string[] = [`ItemNumber in (${itemNumbersFilter})`];

    if (organizationId) {
      filters.push(`OrganizationId=${organizationId}`);
    }

    return this.restClient.get<OracleItem>(config, credentials, OracleApiPaths.ITEMS, {
      params: {
        q: filters.join(' and '),
        limit: itemNumbers.length,
        totalResults: true,
      },
    });
  }
}
