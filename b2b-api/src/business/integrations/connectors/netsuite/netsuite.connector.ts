import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  IntegrationConnectorType,
  IntegrationDirection,
  CredentialType,
  CapabilityCategory,
} from '@prisma/client';
import {
  IConnector,
  ConnectorMetadata,
  CredentialRequirement,
  ConfigSchema,
  CapabilityDefinition,
  ConnectorContext,
  ConnectionTestResult,
  ConnectorOperationResult,
} from '../interfaces';
import {
  NetSuiteConnectionConfig,
  NetSuiteCredentials,
  NetSuiteCreateSalesOrderInput,
  NetSuiteCreateCustomerInput,
  NetSuiteInventoryCheckRequest,
  NetSuiteSearchParams,
} from './interfaces';
import {
  NetSuiteAuthService,
  NetSuiteRestClientService,
  NetSuiteSalesOrderService,
  NetSuiteSalesOrderStatusId,
  NetSuiteCustomerService,
  NetSuiteItemService,
  NetSuiteInvoiceService,
  NetSuiteInvoiceStatusId,
  NetSuiteInventoryService,
  NetSuiteSavedSearchService,
  NetSuiteMapperService,
  NetSuiteErrorHandlerService,
} from './services';

/**
 * NetSuite Connector
 * Implements IConnector interface for NetSuite REST API integration
 */
export class NetSuiteConnector implements IConnector {
  private readonly logger = new Logger(NetSuiteConnector.name);

  private authService!: NetSuiteAuthService;
  private restClient!: NetSuiteRestClientService;
  private salesOrderService!: NetSuiteSalesOrderService;
  private customerService!: NetSuiteCustomerService;
  private itemService!: NetSuiteItemService;
  private invoiceService!: NetSuiteInvoiceService;
  private inventoryService!: NetSuiteInventoryService;
  private savedSearchService!: NetSuiteSavedSearchService;
  private mapper!: NetSuiteMapperService;
  private errorHandler!: NetSuiteErrorHandlerService;

  private config?: NetSuiteConnectionConfig;
  private credentials?: NetSuiteCredentials;

  /**
   * Initialize connector services with HttpService
   */
  initializeServices(httpService: HttpService): void {
    this.authService = new NetSuiteAuthService();
    this.restClient = new NetSuiteRestClientService(httpService, this.authService);
    this.salesOrderService = new NetSuiteSalesOrderService(this.restClient);
    this.customerService = new NetSuiteCustomerService(this.restClient);
    this.itemService = new NetSuiteItemService(this.restClient);
    this.invoiceService = new NetSuiteInvoiceService(this.restClient);
    this.inventoryService = new NetSuiteInventoryService(this.restClient);
    this.savedSearchService = new NetSuiteSavedSearchService(this.restClient);
    this.mapper = new NetSuiteMapperService();
    this.errorHandler = new NetSuiteErrorHandlerService();
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      code: 'netsuite',
      name: 'Oracle NetSuite',
      description: 'Connect to Oracle NetSuite using REST API and SuiteQL',
      version: '1.0.0',
      author: 'B2B Platform',
      type: IntegrationConnectorType.ERP,
      direction: IntegrationDirection.BIDIRECTIONAL,
      iconUrl: '/icons/connectors/netsuite.svg',
      documentationUrl: '/docs/connectors/netsuite',
    };
  }

  /**
   * Get credential requirements
   */
  getCredentialRequirements(): CredentialRequirement[] {
    return [
      {
        type: CredentialType.CUSTOM,
        required: true,
        fields: [
          {
            key: 'consumerKey',
            label: 'Consumer Key',
            type: 'password',
            required: true,
            description: 'Consumer Key from NetSuite Integration Record',
          },
          {
            key: 'consumerSecret',
            label: 'Consumer Secret',
            type: 'password',
            required: true,
            description: 'Consumer Secret from NetSuite Integration Record',
          },
          {
            key: 'tokenId',
            label: 'Token ID',
            type: 'password',
            required: true,
            description: 'Token ID from Access Token',
          },
          {
            key: 'tokenSecret',
            label: 'Token Secret',
            type: 'password',
            required: true,
            description: 'Token Secret from Access Token',
          },
          {
            key: 'realm',
            label: 'Account ID (Realm)',
            type: 'string',
            required: true,
            description: 'NetSuite Account ID (e.g., 1234567 or 1234567_SB1)',
          },
        ],
      },
    ];
  }

  /**
   * Get connector configuration schema
   */
  getConfigSchema(): ConfigSchema {
    return {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          title: 'Account ID',
          description: 'NetSuite Account ID',
        },
        baseUrl: {
          type: 'string',
          title: 'Base URL',
          description: 'Custom API Base URL (optional)',
        },
        apiVersion: {
          type: 'string',
          title: 'API Version',
          description: 'REST API Version',
          default: 'v1',
          enum: ['v1'],
        },
        timeout: {
          type: 'number',
          title: 'Timeout (ms)',
          description: 'Request timeout in milliseconds',
          default: 30000,
          minimum: 5000,
          maximum: 120000,
        },
        retryAttempts: {
          type: 'number',
          title: 'Retry Attempts',
          description: 'Number of retry attempts for failed requests',
          default: 3,
          minimum: 0,
          maximum: 10,
        },
      },
      required: ['accountId'],
    };
  }

  /**
   * Get declared capabilities
   */
  getCapabilities(): CapabilityDefinition[] {
    return [
      // Sales Order capabilities
      {
        code: 'salesOrder.create',
        name: 'Create Sales Order',
        description: 'Create a new sales order in NetSuite',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'salesOrder.get',
        name: 'Get Sales Order',
        description: 'Retrieve a sales order by ID',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'salesOrder.getStatus',
        name: 'Get Sales Order Status',
        description: 'Get the current status of a sales order',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'salesOrder.list',
        name: 'List Sales Orders',
        description: 'List sales orders with optional filters',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'salesOrder.update',
        name: 'Update Sales Order',
        description: 'Update an existing sales order',
        category: CapabilityCategory.CRUD,
      },

      // Customer capabilities
      {
        code: 'customer.create',
        name: 'Create Customer',
        description: 'Create a new customer in NetSuite',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'customer.get',
        name: 'Get Customer',
        description: 'Retrieve a customer by ID',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'customer.update',
        name: 'Update Customer',
        description: 'Update an existing customer',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'customer.list',
        name: 'List Customers',
        description: 'List customers with optional filters',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'customer.sync',
        name: 'Sync Customers',
        description: 'Sync customers modified since a date',
        category: CapabilityCategory.CRUD,
      },

      // Product/Item capabilities
      {
        code: 'item.get',
        name: 'Get Item',
        description: 'Retrieve an item by ID',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'item.list',
        name: 'List Items',
        description: 'List items with optional filters',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'item.sync',
        name: 'Sync Items',
        description: 'Sync items modified since a date',
        category: CapabilityCategory.CRUD,
      },

      // Invoice capabilities
      {
        code: 'invoice.get',
        name: 'Get Invoice',
        description: 'Retrieve an invoice by ID',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'invoice.list',
        name: 'List Invoices',
        description: 'List invoices with optional filters',
        category: CapabilityCategory.CRUD,
      },
      {
        code: 'invoice.sync',
        name: 'Sync Invoices',
        description: 'Sync invoices modified since a date',
        category: CapabilityCategory.CRUD,
      },

      // Inventory capabilities
      {
        code: 'inventory.check',
        name: 'Check Inventory',
        description: 'Check inventory availability for an item',
        category: CapabilityCategory.SYNC,
      },
      {
        code: 'inventory.checkMultiple',
        name: 'Check Multiple Inventory',
        description: 'Check inventory for multiple items',
        category: CapabilityCategory.SYNC,
      },
      {
        code: 'inventory.byLocation',
        name: 'Inventory by Location',
        description: 'Get inventory breakdown by location',
        category: CapabilityCategory.SYNC,
      },

      // Search capabilities
      {
        code: 'search.execute',
        name: 'Execute Search',
        description: 'Execute a saved search or custom query',
        category: CapabilityCategory.SEARCH,
      },
      {
        code: 'search.savedSearches',
        name: 'List Saved Searches',
        description: 'List available saved searches',
        category: CapabilityCategory.SEARCH,
      },
    ];
  }

  /**
   * Initialize the connector with configuration
   */
  async initialize(context: ConnectorContext): Promise<void> {
    this.logger.debug('Initializing NetSuite connector', {
      tenantId: context.tenantId,
      configId: context.configId,
    });

    // Extract configuration
    this.config = {
      accountId: context.config.accountId as string,
      baseUrl: context.config.baseUrl as string | undefined,
      apiVersion: (context.config.apiVersion as string) || 'v1',
      timeout: (context.config.timeout as number) || 30000,
      retryAttempts: (context.config.retryAttempts as number) ?? 3,
    };

    // Extract credentials
    this.credentials = {
      consumerKey: context.credentials.consumerKey as string,
      consumerSecret: context.credentials.consumerSecret as string,
      tokenId: context.credentials.tokenId as string,
      tokenSecret: context.credentials.tokenSecret as string,
      realm: (context.credentials.realm as string) || this.config.accountId,
    };

    // Validate credentials
    const validation = this.authService.validateCredentials(this.credentials);
    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
    }

    // Configure services
    this.authService.setCredentials(this.credentials);
    this.restClient.configure(this.config);

    this.logger.debug('NetSuite connector initialized', {
      accountId: this.config.accountId,
    });
  }

  /**
   * Test the connection
   */
  async testConnection(context: ConnectorContext): Promise<ConnectionTestResult> {
    this.logger.debug('Testing NetSuite connection');

    try {
      // Ensure we're initialized
      if (!this.authService.hasCredentials()) {
        await this.initialize(context);
      }

      // Test connection
      const result = await this.restClient.testConnection();

      if (result.success) {
        return {
          success: true,
          message: result.message,
          latencyMs: result.latencyMs,
          capabilities: this.getCapabilities().map((c) => c.code),
        };
      }

      return {
        success: false,
        message: result.message,
        latencyMs: result.latencyMs,
        errors: [result.message],
      };
    } catch (error) {
      const structured = this.errorHandler.parseError(error);
      return {
        success: false,
        message: this.errorHandler.getUserFriendlyMessage(error),
        errors: [structured.message, ...(structured.details || [])],
      };
    }
  }

  /**
   * Execute a capability
   */
  async executeCapability(
    capability: string,
    input: Record<string, unknown>,
    context: ConnectorContext,
  ): Promise<ConnectorOperationResult> {
    this.logger.debug('Executing capability', { capability, context: context.correlationId });

    try {
      // Ensure we're initialized
      if (!this.authService.hasCredentials()) {
        await this.initialize(context);
      }

      switch (capability) {
        // Sales Order capabilities
        case 'salesOrder.create':
          return this.createSalesOrder(input);
        case 'salesOrder.get':
          return this.getSalesOrder(input);
        case 'salesOrder.getStatus':
          return this.getSalesOrderStatus(input);
        case 'salesOrder.list':
          return this.listSalesOrders(input);
        case 'salesOrder.update':
          return this.updateSalesOrder(input);

        // Customer capabilities
        case 'customer.create':
          return this.createCustomer(input);
        case 'customer.get':
          return this.getCustomer(input);
        case 'customer.update':
          return this.updateCustomer(input);
        case 'customer.list':
          return this.listCustomers(input);
        case 'customer.sync':
          return this.syncCustomers(input);

        // Item capabilities
        case 'item.get':
          return this.getItem(input);
        case 'item.list':
          return this.listItems(input);
        case 'item.sync':
          return this.syncItems(input);

        // Invoice capabilities
        case 'invoice.get':
          return this.getInvoice(input);
        case 'invoice.list':
          return this.listInvoices(input);
        case 'invoice.sync':
          return this.syncInvoices(input);

        // Inventory capabilities
        case 'inventory.check':
          return this.checkInventory(input);
        case 'inventory.checkMultiple':
          return this.checkMultipleInventory(input);
        case 'inventory.byLocation':
          return this.getInventoryByLocation(input);

        // Search capabilities
        case 'search.execute':
          return this.executeSearch(input);
        case 'search.savedSearches':
          return this.listSavedSearches(input);

        default:
          return {
            success: false,
            error: `Unknown capability: ${capability}`,
            retryable: false,
          };
      }
    } catch (error) {
      const structured = this.errorHandler.parseError(error);
      return {
        success: false,
        error: structured.message,
        errorCode: structured.code,
        retryable: structured.retryable,
        metadata: {
          category: structured.category,
          details: structured.details,
          suggestedAction: structured.suggestedAction,
        },
      };
    }
  }

  // =========================
  // Sales Order Operations
  // =========================

  private async createSalesOrder(
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const orderInput = input as unknown as NetSuiteCreateSalesOrderInput;
    const order = await this.salesOrderService.create(orderInput);
    return {
      success: true,
      data: this.mapper.mapSalesOrder(order),
    };
  }

  private async getSalesOrder(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const id = input.id as string;
    const order = await this.salesOrderService.getById(id);
    return {
      success: true,
      data: this.mapper.mapSalesOrder(order),
    };
  }

  private async getSalesOrderStatus(
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const id = input.id as string;
    const status = await this.salesOrderService.getStatus(id);
    return {
      success: true,
      data: status,
    };
  }

  private async listSalesOrders(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const filters = input.filters as
      | {
          status?: NetSuiteSalesOrderStatusId;
          customerId?: string;
          fromDate?: string;
          toDate?: string;
        }
      | undefined;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.salesOrderService.list(filters, pagination);
    return {
      success: true,
      data: {
        items: (result.items || []).map((o) => this.mapper.mapSalesOrder(o)),
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  private async updateSalesOrder(
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const id = input.id as string;
    const data = input.data as Partial<NetSuiteCreateSalesOrderInput>;
    const order = await this.salesOrderService.update(id, data);
    return {
      success: true,
      data: this.mapper.mapSalesOrder(order),
    };
  }

  // =========================
  // Customer Operations
  // =========================

  private async createCustomer(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const customerInput = input as NetSuiteCreateCustomerInput;
    const customer = await this.customerService.create(customerInput);
    return {
      success: true,
      data: this.mapper.mapCustomer(customer),
    };
  }

  private async getCustomer(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const id = input.id as string;
    const customer = await this.customerService.getById(id);
    return {
      success: true,
      data: this.mapper.mapCustomer(customer),
    };
  }

  private async updateCustomer(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const id = input.id as string;
    const data = input.data as Partial<NetSuiteCreateCustomerInput>;
    const customer = await this.customerService.update(id, data);
    return {
      success: true,
      data: this.mapper.mapCustomer(customer),
    };
  }

  private async listCustomers(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const filters = input.filters as
      | {
          subsidiary?: string;
          category?: string;
          includeInactive?: boolean;
          searchTerm?: string;
        }
      | undefined;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.customerService.list(filters, pagination);
    return {
      success: true,
      data: {
        items: (result.items || []).map((c) => this.mapper.mapCustomer(c)),
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  private async syncCustomers(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const sinceDate = input.sinceDate as string;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.customerService.getModifiedSince(sinceDate, pagination);
    return {
      success: true,
      data: {
        items: (result.items || []).map((c) => this.mapper.mapCustomer(c)),
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  // =========================
  // Item Operations
  // =========================

  private async getItem(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const id = input.id as string;
    const item = await this.itemService.getById(id);
    return {
      success: true,
      data: this.mapper.mapProduct(item),
    };
  }

  private async listItems(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const filters = input.filters as
      | {
          itemType?: string;
          subsidiary?: string;
          includeInactive?: boolean;
          searchTerm?: string;
        }
      | undefined;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.itemService.list(filters, pagination);
    return {
      success: true,
      data: {
        items: (result.items || []).map((i) => this.mapper.mapProduct(i)),
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  private async syncItems(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const sinceDate = input.sinceDate as string;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.itemService.getModifiedSince(sinceDate, pagination);
    return {
      success: true,
      data: {
        items: (result.items || []).map((i) => this.mapper.mapProduct(i)),
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  // =========================
  // Invoice Operations
  // =========================

  private async getInvoice(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const id = input.id as string;
    const invoice = await this.invoiceService.getById(id);
    return {
      success: true,
      data: this.mapper.mapInvoice(invoice),
    };
  }

  private async listInvoices(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const filters = input.filters as
      | {
          status?: NetSuiteInvoiceStatusId;
          customerId?: string;
          fromDate?: string;
          toDate?: string;
          hasBalance?: boolean;
        }
      | undefined;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.invoiceService.list(filters, pagination);
    return {
      success: true,
      data: {
        items: (result.items || []).map((i) => this.mapper.mapInvoice(i)),
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  private async syncInvoices(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const sinceDate = input.sinceDate as string;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.invoiceService.getModifiedSince(sinceDate, pagination);
    return {
      success: true,
      data: {
        items: (result.items || []).map((i) => this.mapper.mapInvoice(i)),
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  // =========================
  // Inventory Operations
  // =========================

  private async checkInventory(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const request = input as unknown as NetSuiteInventoryCheckRequest;
    const inventory = await this.inventoryService.checkAvailability(request);
    return {
      success: true,
      data: this.mapper.mapInventoryStatus(inventory),
    };
  }

  private async checkMultipleInventory(
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const itemIds = input.itemIds as string[];
    const locationId = input.locationId as string | undefined;

    const inventoryMap = await this.inventoryService.checkMultipleAvailability(itemIds, locationId);

    const items: Record<string, unknown>[] = [];
    inventoryMap.forEach((inventory, itemId) => {
      items.push({
        itemId,
        ...this.mapper.mapInventoryStatus(inventory),
      });
    });

    return {
      success: true,
      data: { items },
    };
  }

  private async getInventoryByLocation(
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const itemId = input.itemId as string;
    const locations = await this.inventoryService.getInventoryByLocation(itemId);
    return {
      success: true,
      data: {
        itemId,
        locations: locations.map((inv) => this.mapper.mapInventoryStatus(inv)),
      },
    };
  }

  // =========================
  // Search Operations
  // =========================

  private async executeSearch(input: Record<string, unknown>): Promise<ConnectorOperationResult> {
    const params = input as NetSuiteSearchParams;
    const result = await this.savedSearchService.search(params);
    return {
      success: true,
      data: result,
    };
  }

  private async listSavedSearches(
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const recordType = input.recordType as string | undefined;
    const pagination = input.pagination as { offset?: number; limit?: number } | undefined;

    const result = await this.savedSearchService.listSavedSearches(recordType, pagination);
    return {
      success: true,
      data: {
        items: result.items || [],
        totalResults: result.totalResults,
        hasMore: result.hasMore,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.logger.debug('Destroying NetSuite connector');
    // Clean up any resources if needed
    this.config = undefined;
    this.credentials = undefined;
  }
}
