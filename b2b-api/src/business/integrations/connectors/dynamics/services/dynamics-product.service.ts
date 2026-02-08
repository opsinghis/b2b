import { Injectable, Logger } from '@nestjs/common';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsProduct,
  DynamicsPriceLevel,
  DynamicsProductPriceLevel,
  DynamicsODataResponse,
  DynamicsConnectorResult,
  DynamicsApiPaths,
  DynamicsQueryOptions,
} from '../interfaces';

export interface ListProductsOptions {
  searchTerm?: string;
  productType?: number;
  productStructure?: number; // 1=Product, 2=Product Family, 3=Product Bundle
  stateCode?: number;
  top?: number;
  skip?: number;
  orderby?: string;
  includeDescriptions?: boolean;
  includeDefaultUom?: boolean;
}

export interface GetProductOptions {
  includePrices?: boolean;
  priceListId?: string;
  includeDefaultUom?: boolean;
}

export interface ListPriceLevelsOptions {
  searchTerm?: string;
  activeOnly?: boolean;
  top?: number;
  skip?: number;
}

export interface GetProductPriceOptions {
  uomId?: string;
}

/**
 * Dynamics 365 Product Service
 * Handles Product and Price Level operations
 */
@Injectable()
export class DynamicsProductService {
  private readonly logger = new Logger(DynamicsProductService.name);

  constructor(private readonly webApiClient: DynamicsWebApiClientService) {}

  /**
   * Get product by ID
   */
  async getById(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productId: string,
    options?: GetProductOptions,
  ): Promise<DynamicsConnectorResult<DynamicsProduct>> {
    this.logger.debug(`Getting product ${productId}`);

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'productid',
        'name',
        'productnumber',
        'description',
        'productstructure',
        'producttypecode',
        'currentcost',
        'standardcost',
        'price',
        'quantityonhand',
        'quantitydecimal',
        'iskit',
        'isstockitem',
        'statecode',
        'statuscode',
        'createdon',
        'modifiedon',
      ],
    };

    const expands: string[] = [];

    if (options?.includeDefaultUom) {
      expands.push('defaultuomid($select=uomid,name)');
    }

    if (expands.length > 0) {
      queryOptions.$expand = expands;
    }

    const result = await this.webApiClient.getByKey<DynamicsProduct>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCTS,
      productId,
      queryOptions,
    );

    // If requested, fetch prices from specific price list
    if (options?.includePrices && result.success && result.data && options.priceListId) {
      const priceResult = await this.getProductPrice(
        config,
        credentials,
        productId,
        options.priceListId,
      );

      if (priceResult.success && priceResult.data) {
        result.data.price = priceResult.data.amount;
      }
    }

    return result;
  }

  /**
   * List products
   */
  async list(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListProductsOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsProduct[]>>> {
    this.logger.debug('Listing products');

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'productid',
        'name',
        'productnumber',
        'description',
        'productstructure',
        'price',
        'quantityonhand',
        'isstockitem',
        'statecode',
        'createdon',
      ],
      $top: options?.top || 100,
      $skip: options?.skip,
      $count: true,
      $orderby: options?.orderby || 'name asc',
    };

    // Build filter
    const filters: string[] = [];

    if (options?.searchTerm) {
      filters.push(
        `(contains(name,'${options.searchTerm}') or contains(productnumber,'${options.searchTerm}'))`,
      );
    }

    if (options?.productType !== undefined) {
      filters.push(`producttypecode eq ${options.productType}`);
    }

    if (options?.productStructure !== undefined) {
      filters.push(`productstructure eq ${options.productStructure}`);
    }

    if (options?.stateCode !== undefined) {
      filters.push(`statecode eq ${options.stateCode}`);
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    if (options?.includeDefaultUom) {
      queryOptions.$expand = ['defaultuomid($select=uomid,name)'];
    }

    return this.webApiClient.get<DynamicsProduct>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCTS,
      queryOptions,
    );
  }

  /**
   * Search products by keyword
   */
  async search(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    searchTerm: string,
    limit: number = 20,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsProduct[]>>> {
    return this.list(config, credentials, {
      searchTerm,
      top: limit,
      stateCode: 0, // Active only
    });
  }

  /**
   * Get product price from a specific price list
   */
  async getProductPrice(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productId: string,
    priceListId: string,
    options?: GetProductPriceOptions,
  ): Promise<DynamicsConnectorResult<DynamicsProductPriceLevel>> {
    this.logger.debug(`Getting price for product ${productId} from price list ${priceListId}`);

    const filters: string[] = [
      `_productid_value eq ${productId}`,
      `_pricelevelid_value eq ${priceListId}`,
    ];

    if (options?.uomId) {
      filters.push(`_uomid_value eq ${options.uomId}`);
    }

    const result = await this.webApiClient.get<DynamicsProductPriceLevel>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCT_PRICE_LEVELS,
      {
        $filter: filters.join(' and '),
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

    const prices = result.data?.value || [];
    if (prices.length === 0) {
      return {
        success: false,
        error: {
          code: 'PRICE_NOT_FOUND',
          message: `No price found for product ${productId} in price list ${priceListId}`,
          retryable: false,
        },
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: prices[0],
      metadata: result.metadata,
    };
  }

  /**
   * Get all prices for a product across price lists
   */
  async getProductPrices(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productId: string,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsProductPriceLevel[]>>> {
    this.logger.debug(`Getting all prices for product ${productId}`);

    return this.webApiClient.get<DynamicsProductPriceLevel>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCT_PRICE_LEVELS,
      {
        $filter: `_productid_value eq ${productId}`,
        $expand: ['pricelevelid($select=pricelevelid,name)', 'uomid($select=uomid,name)'],
      },
    );
  }

  // ==================== Price Level Methods ====================

  /**
   * Get price level (price list) by ID
   */
  async getPriceLevelById(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    priceLevelId: string,
  ): Promise<DynamicsConnectorResult<DynamicsPriceLevel>> {
    this.logger.debug(`Getting price level ${priceLevelId}`);

    return this.webApiClient.getByKey<DynamicsPriceLevel>(
      config,
      credentials,
      DynamicsApiPaths.PRICE_LEVELS,
      priceLevelId,
      {
        $select: [
          'pricelevelid',
          'name',
          'description',
          'begindate',
          'enddate',
          'statecode',
          'statuscode',
        ],
      },
    );
  }

  /**
   * List price levels (price lists)
   */
  async listPriceLevels(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListPriceLevelsOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsPriceLevel[]>>> {
    this.logger.debug('Listing price levels');

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'pricelevelid',
        'name',
        'description',
        'begindate',
        'enddate',
        'statecode',
        'statuscode',
      ],
      $top: options?.top || 100,
      $skip: options?.skip,
      $count: true,
      $orderby: 'name asc',
    };

    const filters: string[] = [];

    if (options?.searchTerm) {
      filters.push(`contains(name,'${options.searchTerm}')`);
    }

    if (options?.activeOnly) {
      filters.push('statecode eq 0');
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    return this.webApiClient.get<DynamicsPriceLevel>(
      config,
      credentials,
      DynamicsApiPaths.PRICE_LEVELS,
      queryOptions,
    );
  }

  /**
   * Get products in a price list
   */
  async getProductsInPriceList(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    priceListId: string,
    options?: { top?: number; skip?: number },
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsProductPriceLevel[]>>> {
    this.logger.debug(`Getting products in price list ${priceListId}`);

    return this.webApiClient.get<DynamicsProductPriceLevel>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCT_PRICE_LEVELS,
      {
        $filter: `_pricelevelid_value eq ${priceListId}`,
        $expand: ['productid($select=productid,name,productnumber)'],
        $top: options?.top || 100,
        $skip: options?.skip,
        $count: true,
      },
    );
  }

  /**
   * Check if product exists
   */
  async exists(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productId: string,
  ): Promise<boolean> {
    const result = await this.webApiClient.getByKey<DynamicsProduct>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCTS,
      productId,
      {
        $select: ['productid'],
      },
    );

    return result.success && !!result.data;
  }

  /**
   * Get product by product number
   */
  async getByProductNumber(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productNumber: string,
  ): Promise<DynamicsConnectorResult<DynamicsProduct>> {
    this.logger.debug(`Getting product by number: ${productNumber}`);

    const result = await this.webApiClient.get<DynamicsProduct>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCTS,
      {
        $filter: `productnumber eq '${productNumber}'`,
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

    const products = result.data?.value || [];
    if (products.length === 0) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with number '${productNumber}' not found`,
          retryable: false,
        },
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: products[0],
      metadata: result.metadata,
    };
  }

  /**
   * Get stock items only
   */
  async listStockItems(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: { top?: number; skip?: number },
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsProduct[]>>> {
    return this.list(config, credentials, {
      ...options,
      stateCode: 0, // Active
    });
  }

  /**
   * Get available quantity for a product
   */
  async getAvailableQuantity(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productId: string,
  ): Promise<DynamicsConnectorResult<{ productId: string; quantityOnHand: number }>> {
    const result = await this.webApiClient.getByKey<DynamicsProduct>(
      config,
      credentials,
      DynamicsApiPaths.PRODUCTS,
      productId,
      {
        $select: ['productid', 'quantityonhand'],
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
        productId: result.data.productid || productId,
        quantityOnHand: result.data.quantityonhand || 0,
      },
      metadata: result.metadata,
    };
  }
}
