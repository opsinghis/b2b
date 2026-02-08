import { Injectable, Logger } from '@nestjs/common';
import {
  DynamicsAuthService,
  DynamicsWebApiClientService,
  DynamicsSalesOrderService,
  DynamicsAccountService,
  DynamicsProductService,
  DynamicsInvoiceService,
  DynamicsMapperService,
  DynamicsErrorHandlerService,
  ListSalesOrdersOptions,
  GetSalesOrderOptions,
  ListAccountsOptions,
  GetAccountOptions,
  CreateContactInput,
  ListContactsOptions,
  ListProductsOptions,
  GetProductOptions,
  ListPriceLevelsOptions,
  ListInvoicesOptions,
  GetInvoiceOptions,
  CanonicalOrder,
  CanonicalCustomer,
  CanonicalProduct,
  CanonicalInvoice,
} from './services';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsSalesOrder,
  DynamicsAccount,
  DynamicsProduct,
  DynamicsInvoice,
  DynamicsPriceLevel,
  DynamicsODataResponse,
  DynamicsConnectorResult,
  DynamicsCreateSalesOrderInput,
  DynamicsCreateAccountInput,
} from './interfaces';

/**
 * Connector metadata interface
 */
export interface Dynamics365ConnectorMetadata {
  id: string;
  name: string;
  version: string;
  vendor: string;
  description: string;
  supportedOperations: string[];
  configSchema: Record<string, unknown>;
}

/**
 * Microsoft Dynamics 365 Connector
 * Implements integration with Dynamics 365 Sales/CRM
 */
@Injectable()
export class Dynamics365Connector {
  private readonly logger = new Logger(Dynamics365Connector.name);

  readonly metadata: Dynamics365ConnectorMetadata = {
    id: 'dynamics-365',
    name: 'Microsoft Dynamics 365',
    version: '1.0.0',
    vendor: 'Microsoft',
    description: 'Integration connector for Microsoft Dynamics 365 Sales/CRM',
    supportedOperations: [
      'createSalesOrder',
      'getSalesOrder',
      'getSalesOrderStatus',
      'listSalesOrders',
      'updateSalesOrder',
      'getAccount',
      'createAccount',
      'listAccounts',
      'updateAccount',
      'getContact',
      'createContact',
      'listContacts',
      'getProduct',
      'listProducts',
      'getInvoice',
      'listInvoices',
      'getPriceLevel',
      'listPriceLevels',
      'getProductPrice',
    ],
    configSchema: {
      type: 'object',
      properties: {
        organizationUrl: {
          type: 'string',
          description: 'Dynamics 365 organization URL (e.g., https://org.crm.dynamics.com)',
        },
        tenantId: {
          type: 'string',
          description: 'Azure AD tenant ID',
        },
        clientId: {
          type: 'string',
          description: 'Azure AD application (client) ID',
        },
        clientSecret: {
          type: 'string',
          description: 'Azure AD client secret',
          sensitive: true,
        },
        apiVersion: {
          type: 'string',
          description: 'Web API version (default: v9.2)',
          default: 'v9.2',
        },
        defaultPriceLevelId: {
          type: 'string',
          description: 'Default price list ID for orders',
        },
        defaultCurrency: {
          type: 'string',
          description: 'Default transaction currency ID',
        },
      },
      required: ['organizationUrl', 'tenantId', 'clientId', 'clientSecret'],
    },
  };

  constructor(
    private readonly authService: DynamicsAuthService,
    private readonly webApiClient: DynamicsWebApiClientService,
    private readonly salesOrderService: DynamicsSalesOrderService,
    private readonly accountService: DynamicsAccountService,
    private readonly productService: DynamicsProductService,
    private readonly invoiceService: DynamicsInvoiceService,
    private readonly mapper: DynamicsMapperService,
    private readonly errorHandler: DynamicsErrorHandlerService,
  ) {}

  /**
   * Test connection to Dynamics 365
   */
  async testConnection(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
  ): Promise<DynamicsConnectorResult<{ connected: boolean; organizationName?: string }>> {
    this.logger.debug('Testing Dynamics 365 connection');

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

      // Try to get WhoAmI to verify connection
      const result = await this.webApiClient.executeFunction<{
        UserId: string;
        BusinessUnitId: string;
        OrganizationId: string;
      }>(config, credentials, 'WhoAmI');

      if (result.success && result.data) {
        return {
          success: true,
          data: {
            connected: true,
            organizationName: result.data.OrganizationId,
          },
          metadata: result.metadata,
        };
      }

      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
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
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    input: DynamicsCreateSalesOrderInput,
  ): Promise<DynamicsConnectorResult<CanonicalOrder>> {
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
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
    options?: GetSalesOrderOptions,
  ): Promise<DynamicsConnectorResult<CanonicalOrder>> {
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
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
  ): Promise<DynamicsConnectorResult<{ status: string; stateCode: number; statusCode: number }>> {
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
        status: result.data.stateName,
        stateCode: result.data.stateCode,
        statusCode: result.data.statusCode,
      },
      metadata: result.metadata,
    };
  }

  /**
   * List sales orders
   */
  async listSalesOrders(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListSalesOrdersOptions,
  ): Promise<
    DynamicsConnectorResult<{ orders: CanonicalOrder[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.salesOrderService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const orders = result.data.value.map((o) => this.mapper.mapSalesOrderToCanonical(o));
    const total = result.data.metadata['@odata.count'];
    const hasMore = !!result.data.metadata['@odata.nextLink'];

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
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
    data: Parameters<DynamicsSalesOrderService['update']>[3],
    etag?: string,
  ): Promise<DynamicsConnectorResult<CanonicalOrder>> {
    const result = await this.salesOrderService.update(config, credentials, orderId, data, etag);

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
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
  ): Promise<DynamicsConnectorResult<void>> {
    return this.salesOrderService.submit(config, credentials, orderId);
  }

  /**
   * Convert sales order to invoice
   */
  async convertSalesOrderToInvoice(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    orderId: string,
  ): Promise<DynamicsConnectorResult<{ invoiceId: string }>> {
    return this.salesOrderService.convertToInvoice(config, credentials, orderId);
  }

  // ==================== Account Operations ====================

  /**
   * Create account
   */
  async createAccount(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    input: DynamicsCreateAccountInput,
  ): Promise<DynamicsConnectorResult<CanonicalCustomer>> {
    const result = await this.accountService.create(config, credentials, input);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapAccountToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get account by ID
   */
  async getAccount(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    accountId: string,
    options?: GetAccountOptions,
  ): Promise<DynamicsConnectorResult<CanonicalCustomer>> {
    const result = await this.accountService.getById(config, credentials, accountId, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapAccountToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * List accounts
   */
  async listAccounts(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListAccountsOptions,
  ): Promise<
    DynamicsConnectorResult<{ customers: CanonicalCustomer[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.accountService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const customers = result.data.value.map((a) => this.mapper.mapAccountToCanonical(a));
    const total = result.data.metadata['@odata.count'];
    const hasMore = !!result.data.metadata['@odata.nextLink'];

    return {
      success: true,
      data: { customers, total, hasMore },
      metadata: result.metadata,
    };
  }

  /**
   * Update account
   */
  async updateAccount(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    accountId: string,
    data: Partial<DynamicsCreateAccountInput>,
    etag?: string,
  ): Promise<DynamicsConnectorResult<CanonicalCustomer>> {
    const result = await this.accountService.update(config, credentials, accountId, data, etag);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapAccountToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  // ==================== Contact Operations ====================

  /**
   * Create contact
   */
  async createContact(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    input: CreateContactInput,
  ): Promise<DynamicsConnectorResult<CanonicalCustomer>> {
    const result = await this.accountService.createContact(config, credentials, input);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapContactToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get contact by ID
   */
  async getContact(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    contactId: string,
  ): Promise<DynamicsConnectorResult<CanonicalCustomer>> {
    const result = await this.accountService.getContactById(config, credentials, contactId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapContactToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * List contacts
   */
  async listContacts(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListContactsOptions,
  ): Promise<
    DynamicsConnectorResult<{ contacts: CanonicalCustomer[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.accountService.listContacts(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const contacts = result.data.value.map((c) => this.mapper.mapContactToCanonical(c));
    const total = result.data.metadata['@odata.count'];
    const hasMore = !!result.data.metadata['@odata.nextLink'];

    return {
      success: true,
      data: { contacts, total, hasMore },
      metadata: result.metadata,
    };
  }

  // ==================== Product Operations ====================

  /**
   * Get product by ID
   */
  async getProduct(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productId: string,
    options?: GetProductOptions,
  ): Promise<DynamicsConnectorResult<CanonicalProduct>> {
    const result = await this.productService.getById(config, credentials, productId, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapProductToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * List products
   */
  async listProducts(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListProductsOptions,
  ): Promise<
    DynamicsConnectorResult<{ products: CanonicalProduct[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.productService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const products = result.data.value.map((p) => this.mapper.mapProductToCanonical(p));
    const total = result.data.metadata['@odata.count'];
    const hasMore = !!result.data.metadata['@odata.nextLink'];

    return {
      success: true,
      data: { products, total, hasMore },
      metadata: result.metadata,
    };
  }

  /**
   * Search products
   */
  async searchProducts(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    searchTerm: string,
    limit?: number,
  ): Promise<DynamicsConnectorResult<CanonicalProduct[]>> {
    const result = await this.productService.search(config, credentials, searchTerm, limit);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.value.map((p) => this.mapper.mapProductToCanonical(p)),
      metadata: result.metadata,
    };
  }

  /**
   * Get product price from price list
   */
  async getProductPrice(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    productId: string,
    priceListId: string,
  ): Promise<DynamicsConnectorResult<{ price: number; currency?: string }>> {
    const result = await this.productService.getProductPrice(
      config,
      credentials,
      productId,
      priceListId,
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
        price: result.data.amount || 0,
      },
      metadata: result.metadata,
    };
  }

  // ==================== Price Level Operations ====================

  /**
   * Get price level by ID
   */
  async getPriceLevel(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    priceLevelId: string,
  ): Promise<DynamicsConnectorResult<DynamicsPriceLevel>> {
    return this.productService.getPriceLevelById(config, credentials, priceLevelId);
  }

  /**
   * List price levels
   */
  async listPriceLevels(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListPriceLevelsOptions,
  ): Promise<DynamicsConnectorResult<{ priceLevels: DynamicsPriceLevel[]; total?: number }>> {
    const result = await this.productService.listPriceLevels(config, credentials, options);

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
        priceLevels: result.data.value,
        total: result.data.metadata['@odata.count'],
      },
      metadata: result.metadata,
    };
  }

  // ==================== Invoice Operations ====================

  /**
   * Get invoice by ID
   */
  async getInvoice(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    invoiceId: string,
    options?: GetInvoiceOptions,
  ): Promise<DynamicsConnectorResult<CanonicalInvoice>> {
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
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListInvoicesOptions,
  ): Promise<
    DynamicsConnectorResult<{ invoices: CanonicalInvoice[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.invoiceService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const invoices = result.data.value.map((i) => this.mapper.mapInvoiceToCanonical(i));
    const total = result.data.metadata['@odata.count'];
    const hasMore = !!result.data.metadata['@odata.nextLink'];

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
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    salesOrderId: string,
  ): Promise<DynamicsConnectorResult<CanonicalInvoice[]>> {
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
      data: result.data.value.map((i) => this.mapper.mapInvoiceToCanonical(i)),
      metadata: result.metadata,
    };
  }

  /**
   * Get raw Dynamics entities (for advanced usage)
   */
  async getRawSalesOrders(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListSalesOrdersOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsSalesOrder[]>>> {
    return this.salesOrderService.list(config, credentials, options);
  }

  async getRawAccounts(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListAccountsOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsAccount[]>>> {
    return this.accountService.list(config, credentials, options);
  }

  async getRawProducts(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListProductsOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsProduct[]>>> {
    return this.productService.list(config, credentials, options);
  }

  async getRawInvoices(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListInvoicesOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsInvoice[]>>> {
    return this.invoiceService.list(config, credentials, options);
  }
}
