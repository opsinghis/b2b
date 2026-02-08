import { Injectable, Logger } from '@nestjs/common';
import {
  OracleAuthService,
  OracleRestClientService,
  OracleSalesOrderService,
  OracleCustomerService,
  OracleItemService,
  OracleInvoiceService,
  OracleMapperService,
  OracleErrorHandlerService,
  ListSalesOrdersOptions,
  GetSalesOrderOptions,
  ListCustomersOptions,
  GetCustomerOptions,
  ListItemsOptions,
  GetItemOptions,
  ListInvoicesOptions,
  GetInvoiceOptions,
  CanonicalOrder,
  CanonicalCustomer,
  CanonicalProduct,
  CanonicalInvoice,
} from './services';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleSalesOrder,
  OracleCustomer,
  OracleItem,
  OracleInvoice,
  OracleApiResponse,
  OracleConnectorResult,
  OracleCreateSalesOrderInput,
  OracleCreateCustomerInput,
} from './interfaces';

/**
 * Connector metadata interface
 */
export interface OracleERPConnectorMetadata {
  id: string;
  name: string;
  version: string;
  vendor: string;
  description: string;
  supportedOperations: string[];
  configSchema: Record<string, unknown>;
}

/**
 * Oracle ERP Cloud Connector
 * Implements integration with Oracle Fusion Cloud ERP
 */
@Injectable()
export class OracleERPConnector {
  private readonly logger = new Logger(OracleERPConnector.name);

  readonly metadata: OracleERPConnectorMetadata = {
    id: 'oracle-erp-cloud',
    name: 'Oracle ERP Cloud',
    version: '1.0.0',
    vendor: 'Oracle',
    description: 'Integration connector for Oracle Fusion Cloud ERP',
    supportedOperations: [
      'createSalesOrder',
      'getSalesOrder',
      'getSalesOrderStatus',
      'listSalesOrders',
      'updateSalesOrder',
      'cancelSalesOrder',
      'getCustomer',
      'createCustomer',
      'listCustomers',
      'updateCustomer',
      'searchCustomers',
      'getItem',
      'listItems',
      'searchItems',
      'checkAvailability',
      'getInvoice',
      'listInvoices',
      'getOutstandingInvoices',
    ],
    configSchema: {
      type: 'object',
      properties: {
        instanceUrl: {
          type: 'string',
          description: 'Oracle ERP Cloud instance URL',
        },
        authType: {
          type: 'string',
          enum: ['oauth2', 'basic_auth'],
          description: 'Authentication type',
        },
        clientId: {
          type: 'string',
          description: 'OAuth2 client ID (for oauth2 auth type)',
        },
        clientSecret: {
          type: 'string',
          description: 'OAuth2 client secret (for oauth2 auth type)',
          sensitive: true,
        },
        tokenEndpoint: {
          type: 'string',
          description: 'OAuth2 token endpoint URL',
        },
        username: {
          type: 'string',
          description: 'Username (for basic_auth auth type)',
        },
        password: {
          type: 'string',
          description: 'Password (for basic_auth auth type)',
          sensitive: true,
        },
        defaultBusinessUnit: {
          type: 'string',
          description: 'Default business unit for orders',
        },
        defaultCurrency: {
          type: 'string',
          description: 'Default currency code',
        },
      },
      required: ['instanceUrl', 'authType'],
    },
  };

  constructor(
    private readonly authService: OracleAuthService,
    private readonly restClient: OracleRestClientService,
    private readonly salesOrderService: OracleSalesOrderService,
    private readonly customerService: OracleCustomerService,
    private readonly itemService: OracleItemService,
    private readonly invoiceService: OracleInvoiceService,
    private readonly mapper: OracleMapperService,
    private readonly errorHandler: OracleErrorHandlerService,
  ) {}

  /**
   * Test connection to Oracle ERP Cloud
   */
  async testConnection(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
  ): Promise<OracleConnectorResult<{ connected: boolean; message?: string }>> {
    this.logger.debug('Testing Oracle ERP Cloud connection');

    try {
      // Validate credentials first
      const validation = this.authService.validateCredentials(config, credentials);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: `Invalid credentials: ${validation.errors.join(', ')}`,
            retryable: false,
          },
          metadata: {
            requestId: 'validation',
            durationMs: 0,
          },
        };
      }

      // Test authentication
      const authTest = await this.authService.testAuthentication(config, credentials);

      if (authTest.success) {
        return {
          success: true,
          data: {
            connected: true,
            message: 'Successfully connected to Oracle ERP Cloud',
          },
          metadata: {
            requestId: 'test-connection',
            durationMs: 0,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: authTest.error || 'Failed to connect to Oracle ERP Cloud',
          retryable: true,
        },
        metadata: {
          requestId: 'test-connection',
          durationMs: 0,
        },
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'test-connection', 0);
    }
  }

  // ==================== Sales Order Operations ====================

  /**
   * Create sales order
   */
  async createSalesOrder(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    input: OracleCreateSalesOrderInput,
  ): Promise<OracleConnectorResult<CanonicalOrder>> {
    this.logger.debug(`Creating sales order for customer ${input.customerId}`);

    const result = await this.salesOrderService.create(config, credentials, input);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapSalesOrderToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get sales order by ID
   */
  async getSalesOrder(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
    options?: GetSalesOrderOptions,
  ): Promise<OracleConnectorResult<CanonicalOrder>> {
    const result = await this.salesOrderService.getById(config, credentials, orderId, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapSalesOrderToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get sales order status
   */
  async getSalesOrderStatus(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
  ): Promise<
    OracleConnectorResult<{ status: string; statusCode: string; fulfillmentStatus: string }>
  > {
    const result = await this.salesOrderService.getStatus(config, credentials, orderId);

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
        status: result.data.statusName,
        statusCode: result.data.statusCode,
        fulfillmentStatus: result.data.fulfillmentStatus,
      },
      metadata: result.metadata,
    };
  }

  /**
   * List sales orders
   */
  async listSalesOrders(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListSalesOrdersOptions,
  ): Promise<
    OracleConnectorResult<{ orders: CanonicalOrder[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.salesOrderService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const orders = result.data.items?.map((o) => this.mapper.mapSalesOrderToCanonical(o)) || [];
    const total = result.data.metadata.totalResults;
    const hasMore = result.data.metadata.hasMore || false;

    return {
      success: true,
      data: { orders, total, hasMore },
      metadata: result.metadata,
    };
  }

  /**
   * Update sales order
   */
  async updateSalesOrder(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
    data: Parameters<OracleSalesOrderService['update']>[3],
  ): Promise<OracleConnectorResult<CanonicalOrder>> {
    const result = await this.salesOrderService.update(config, credentials, orderId, data);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapSalesOrderToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Submit sales order
   */
  async submitSalesOrder(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
  ): Promise<OracleConnectorResult<CanonicalOrder>> {
    const result = await this.salesOrderService.submit(config, credentials, orderId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapSalesOrderToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Cancel sales order
   */
  async cancelSalesOrder(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    orderId: string | number,
    reason?: string,
  ): Promise<OracleConnectorResult<CanonicalOrder>> {
    const result = await this.salesOrderService.cancel(config, credentials, orderId, reason);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapSalesOrderToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  // ==================== Customer Operations ====================

  /**
   * Create customer
   */
  async createCustomer(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    input: OracleCreateCustomerInput,
  ): Promise<OracleConnectorResult<CanonicalCustomer>> {
    const result = await this.customerService.create(config, credentials, input);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapCustomerToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get customer by ID
   */
  async getCustomer(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
    options?: GetCustomerOptions,
  ): Promise<OracleConnectorResult<CanonicalCustomer>> {
    const result = await this.customerService.getById(config, credentials, customerId, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapCustomerToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * List customers
   */
  async listCustomers(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListCustomersOptions,
  ): Promise<
    OracleConnectorResult<{ customers: CanonicalCustomer[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.customerService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const customers = result.data.items?.map((c) => this.mapper.mapCustomerToCanonical(c)) || [];
    const total = result.data.metadata.totalResults;
    const hasMore = result.data.metadata.hasMore || false;

    return {
      success: true,
      data: { customers, total, hasMore },
      metadata: result.metadata,
    };
  }

  /**
   * Update customer
   */
  async updateCustomer(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
    data: Partial<OracleCreateCustomerInput>,
  ): Promise<OracleConnectorResult<CanonicalCustomer>> {
    const result = await this.customerService.update(config, credentials, customerId, data);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapCustomerToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Search customers
   */
  async searchCustomers(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    searchTerm: string,
    limit?: number,
  ): Promise<OracleConnectorResult<CanonicalCustomer[]>> {
    const result = await this.customerService.search(config, credentials, searchTerm, limit);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.items?.map((c) => this.mapper.mapCustomerToCanonical(c)) || [],
      metadata: result.metadata,
    };
  }

  // ==================== Item/Product Operations ====================

  /**
   * Get item by ID
   */
  async getItem(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    itemId: string | number,
    options?: GetItemOptions,
  ): Promise<OracleConnectorResult<CanonicalProduct>> {
    const result = await this.itemService.getById(config, credentials, itemId, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapItemToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get item by item number (SKU)
   */
  async getItemByNumber(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    itemNumber: string,
    organizationId?: number,
  ): Promise<OracleConnectorResult<CanonicalProduct | null>> {
    const result = await this.itemService.getByItemNumber(
      config,
      credentials,
      itemNumber,
      organizationId,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data ? this.mapper.mapItemToCanonical(result.data) : null,
      metadata: result.metadata,
    };
  }

  /**
   * List items
   */
  async listItems(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListItemsOptions,
  ): Promise<
    OracleConnectorResult<{ products: CanonicalProduct[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.itemService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const products = result.data.items?.map((i) => this.mapper.mapItemToCanonical(i)) || [];
    const total = result.data.metadata.totalResults;
    const hasMore = result.data.metadata.hasMore || false;

    return {
      success: true,
      data: { products, total, hasMore },
      metadata: result.metadata,
    };
  }

  /**
   * Search items
   */
  async searchItems(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    searchTerm: string,
    options?: {
      organizationId?: number;
      orderableOnly?: boolean;
      limit?: number;
    },
  ): Promise<OracleConnectorResult<CanonicalProduct[]>> {
    const result = await this.itemService.search(config, credentials, searchTerm, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.items?.map((i) => this.mapper.mapItemToCanonical(i)) || [],
      metadata: result.metadata,
    };
  }

  /**
   * Check item availability
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
    }>
  > {
    return this.itemService.checkAvailability(
      config,
      credentials,
      itemNumber,
      organizationId,
      requestedQuantity,
    );
  }

  // ==================== Invoice Operations ====================

  /**
   * Get invoice by ID
   */
  async getInvoice(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    invoiceId: string | number,
    options?: GetInvoiceOptions,
  ): Promise<OracleConnectorResult<CanonicalInvoice>> {
    const result = await this.invoiceService.getById(config, credentials, invoiceId, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapInvoiceToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * List invoices
   */
  async listInvoices(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListInvoicesOptions,
  ): Promise<
    OracleConnectorResult<{ invoices: CanonicalInvoice[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.invoiceService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const invoices = result.data.items?.map((i) => this.mapper.mapInvoiceToCanonical(i)) || [];
    const total = result.data.metadata.totalResults;
    const hasMore = result.data.metadata.hasMore || false;

    return {
      success: true,
      data: { invoices, total, hasMore },
      metadata: result.metadata,
    };
  }

  /**
   * Get invoices for sales order
   */
  async getInvoicesForSalesOrder(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    salesOrderId: string | number,
  ): Promise<OracleConnectorResult<CanonicalInvoice[]>> {
    const result = await this.invoiceService.getForSalesOrder(config, credentials, salesOrderId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.items?.map((i) => this.mapper.mapInvoiceToCanonical(i)) || [],
      metadata: result.metadata,
    };
  }

  /**
   * Get outstanding invoices
   */
  async getOutstandingInvoices(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId?: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<OracleConnectorResult<CanonicalInvoice[]>> {
    const result = await this.invoiceService.getOutstanding(
      config,
      credentials,
      customerId,
      options,
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
      data: result.data.items?.map((i) => this.mapper.mapInvoiceToCanonical(i)) || [],
      metadata: result.metadata,
    };
  }

  // ==================== Raw Data Access ====================

  /**
   * Get raw Oracle entities (for advanced usage)
   */
  async getRawSalesOrders(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListSalesOrdersOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleSalesOrder>>> {
    return this.salesOrderService.list(config, credentials, options);
  }

  async getRawCustomers(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListCustomersOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleCustomer>>> {
    return this.customerService.list(config, credentials, options);
  }

  async getRawItems(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListItemsOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleItem>>> {
    return this.itemService.list(config, credentials, options);
  }

  async getRawInvoices(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListInvoicesOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleInvoice>>> {
    return this.invoiceService.list(config, credentials, options);
  }
}
