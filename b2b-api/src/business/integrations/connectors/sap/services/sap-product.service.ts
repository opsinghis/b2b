import { Injectable, Logger } from '@nestjs/common';
import {
  SapConnectionConfig,
  SapCredentials,
  SapODataQueryOptions,
  SapODataServicePaths,
  SapProduct,
  SapConnectorResult,
  SapODataResponse,
} from '../interfaces';
import { SapODataClientService } from './sap-odata-client.service';

/**
 * Product cross-plant status
 */
export enum SapProductStatus {
  ACTIVE = '',
  BLOCKED_FOR_PROCUREMENT = '01',
  BLOCKED_FOR_SALES = '02',
  BLOCKED = '03',
}

/**
 * SAP Product/Material Service
 * Handles read operations for SAP Products (A_Product)
 */
@Injectable()
export class SapProductService {
  private readonly logger = new Logger(SapProductService.name);
  private readonly servicePath = SapODataServicePaths.PRODUCT;
  private readonly entitySet = 'A_Product';

  constructor(private readonly odataClient: SapODataClientService) {}

  /**
   * Get product by ID (material number)
   */
  async getById(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    productId: string,
    options?: {
      includeDescriptions?: boolean;
      includePlantData?: boolean;
      includeSalesData?: boolean;
      includeValuation?: boolean;
      language?: string;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapProduct>> {
    this.logger.log(`Getting product: ${productId}`);

    const queryOptions: Pick<SapODataQueryOptions, '$select' | '$expand'> = {};

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    const expand: string[] = [];
    if (options?.includeDescriptions) {
      if (options.language) {
        expand.push(`to_Description($filter=Language eq '${options.language}')`);
      } else {
        expand.push('to_Description');
      }
    }
    if (options?.includePlantData) {
      expand.push('to_Plant');
    }
    if (options?.includeSalesData) {
      expand.push('to_SalesDelivery');
    }
    if (options?.includeValuation) {
      expand.push('to_Valuation');
    }
    if (expand.length > 0) {
      queryOptions.$expand = expand;
    }

    return await this.odataClient.getByKey<SapProduct>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      productId,
      queryOptions,
    );
  }

  /**
   * List products with filters
   */
  async list(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    options?: {
      productType?: string;
      productGroup?: string;
      division?: string;
      searchTerm?: string;
      status?: SapProductStatus;
      top?: number;
      skip?: number;
      orderBy?: string;
      includeDescriptions?: boolean;
      language?: string;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapProduct[]>>> {
    this.logger.log('Listing products');

    const queryOptions: SapODataQueryOptions = {
      $count: true,
    };

    // Build filter
    const filters: string[] = [];

    if (options?.productType) {
      filters.push(`ProductType eq '${options.productType}'`);
    }

    if (options?.productGroup) {
      filters.push(`ProductGroup eq '${options.productGroup}'`);
    }

    if (options?.division) {
      filters.push(`Division eq '${options.division}'`);
    }

    if (options?.status !== undefined) {
      filters.push(`CrossPlantStatus eq '${options.status}'`);
    }

    if (options?.searchTerm) {
      filters.push(`contains(Product,'${options.searchTerm}')`);
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    if (options?.includeDescriptions) {
      if (options.language) {
        queryOptions.$expand = [`to_Description($filter=Language eq '${options.language}')`];
      } else {
        queryOptions.$expand = ['to_Description'];
      }
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
      queryOptions.$orderby = 'Product asc';
    }

    return await this.odataClient.get<SapProduct[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Search products by description
   */
  async searchByDescription(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    searchTerm: string,
    options?: {
      language?: string;
      top?: number;
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapProduct[]>>> {
    this.logger.log(`Searching products by description: ${searchTerm}`);

    // For description search, we need to use $search or filter on to_Description
    const language = options?.language || 'EN';

    const queryOptions: SapODataQueryOptions = {
      $expand: [`to_Description($filter=Language eq '${language}')`],
      $filter: `to_Description/any(d:contains(d/ProductDescription,'${searchTerm}') and d/Language eq '${language}')`,
      $top: options?.top || 100,
    };

    return await this.odataClient.get<SapProduct[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Get product availability for sales
   */
  async getProductSalesData(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    productId: string,
    salesOrganization: string,
    distributionChannel: string,
  ): Promise<
    SapConnectorResult<{
      product: string;
      salesOrganization: string;
      distributionChannel: string;
      isAvailable: boolean;
      salesUnit: string;
    } | null>
  > {
    this.logger.log(`Getting sales data for product: ${productId}`);

    const result = await this.odataClient.getByKey<SapProduct>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      productId,
      {
        $expand: [
          `to_SalesDelivery($filter=ProductSalesOrg eq '${salesOrganization}' and ProductDistributionChnl eq '${distributionChannel}')`,
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

    const product = result.data;
    const salesData = product.to_SalesDelivery?.[0];

    if (!salesData) {
      return {
        success: true,
        data: null,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: {
        product: product.Product || productId,
        salesOrganization,
        distributionChannel,
        isAvailable: !salesData.IsMarkedForDeletion,
        salesUnit: salesData.SalesMeasureUnit || product.BaseUnit || '',
      },
      metadata: result.metadata,
    };
  }

  /**
   * Get product valuation (price info)
   */
  async getProductValuation(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    productId: string,
    valuationArea: string,
  ): Promise<
    SapConnectorResult<{
      product: string;
      valuationArea: string;
      standardPrice: number;
      currency: string;
      priceUnit: number;
    } | null>
  > {
    this.logger.log(`Getting valuation for product: ${productId}, area: ${valuationArea}`);

    const result = await this.odataClient.getByKey<SapProduct>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      productId,
      {
        $expand: [`to_Valuation($filter=ValuationArea eq '${valuationArea}')`],
      },
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const product = result.data;
    const valuation = product.to_Valuation?.[0];

    if (!valuation) {
      return {
        success: true,
        data: null,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: {
        product: product.Product || productId,
        valuationArea,
        standardPrice: parseFloat(valuation.StandardPrice || '0'),
        currency: valuation.Currency || '',
        priceUnit: parseInt(valuation.PriceUnitQty || '1', 10),
      },
      metadata: result.metadata,
    };
  }

  /**
   * Get products by product group
   */
  async getByProductGroup(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    productGroup: string,
    options?: {
      activeOnly?: boolean;
      top?: number;
      skip?: number;
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapProduct[]>>> {
    this.logger.log(`Getting products by group: ${productGroup}`);

    const filters: string[] = [`ProductGroup eq '${productGroup}'`];

    if (options?.activeOnly) {
      filters.push(`CrossPlantStatus eq ''`);
    }

    const queryOptions: SapODataQueryOptions = {
      $filter: filters.join(' and '),
      $orderby: 'Product asc',
      $count: true,
    };

    if (options?.top) {
      queryOptions.$top = options.top;
    }

    if (options?.skip) {
      queryOptions.$skip = options.skip;
    }

    return await this.odataClient.get<SapProduct[]>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      queryOptions,
    );
  }

  /**
   * Get product plant data
   */
  async getPlantData(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    productId: string,
    plant?: string,
  ): Promise<
    SapConnectorResult<{
      product: string;
      plants: Array<{
        plant: string;
        mrpType: string;
        purchasingGroup: string;
        availabilityCheckType: string;
      }>;
    }>
  > {
    this.logger.log(`Getting plant data for product: ${productId}`);

    let expandFilter = 'to_Plant';
    if (plant) {
      expandFilter = `to_Plant($filter=Plant eq '${plant}')`;
    }

    const result = await this.odataClient.getByKey<SapProduct>(
      config,
      credentials,
      this.servicePath,
      this.entitySet,
      productId,
      {
        $expand: [expandFilter],
      },
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const product = result.data;
    const plants = (product.to_Plant || []).map((p) => ({
      plant: p.Plant || '',
      mrpType: p.MRPType || '',
      purchasingGroup: p.PurchasingGroup || '',
      availabilityCheckType: p.AvailabilityCheckType || '',
    }));

    return {
      success: true,
      data: {
        product: product.Product || productId,
        plants,
      },
      metadata: result.metadata,
    };
  }
}
