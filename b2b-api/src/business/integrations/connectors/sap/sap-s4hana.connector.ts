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
  SapConnectionConfig,
  SapCredentials,
  SapCreateSalesOrderInput,
  SapCreateBusinessPartnerInput,
  SapAtpCheckRequest,
} from './interfaces';
import {
  SapAuthService,
  SapODataClientService,
  SapSalesOrderService,
  SapBusinessPartnerService,
  SapProductService,
  SapBillingDocumentService,
  SapAtpService,
  SapErrorHandlerService,
  SapMapperService,
  SapSalesOrderStatus,
  SapBusinessPartnerCategory,
  SapBillingDocumentType,
} from './services';

/**
 * SAP S/4HANA Connector
 * Implements IConnector interface for SAP S/4HANA OData V4 integration
 */
export class SapS4HanaConnector implements IConnector {
  private readonly logger = new Logger(SapS4HanaConnector.name);

  private authService!: SapAuthService;
  private odataClient!: SapODataClientService;
  private salesOrderService!: SapSalesOrderService;
  private businessPartnerService!: SapBusinessPartnerService;
  private productService!: SapProductService;
  private billingDocumentService!: SapBillingDocumentService;
  private atpService!: SapAtpService;
  private errorHandler!: SapErrorHandlerService;
  private mapper!: SapMapperService;

  private config?: SapConnectionConfig;
  private credentials?: SapCredentials;

  /**
   * Initialize connector services with HttpService
   */
  initializeServices(httpService: HttpService): void {
    this.authService = new SapAuthService(httpService);
    this.odataClient = new SapODataClientService(httpService, this.authService);
    this.salesOrderService = new SapSalesOrderService(this.odataClient);
    this.businessPartnerService = new SapBusinessPartnerService(this.odataClient);
    this.productService = new SapProductService(this.odataClient);
    this.billingDocumentService = new SapBillingDocumentService(this.odataClient);
    this.atpService = new SapAtpService(this.odataClient);
    this.errorHandler = new SapErrorHandlerService();
    this.mapper = new SapMapperService();
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      code: 'sap-s4hana',
      name: 'SAP S/4HANA',
      description: 'Connect to SAP S/4HANA Cloud or On-Premise using OData V4 APIs',
      version: '1.0.0',
      author: 'B2B Platform',
      type: IntegrationConnectorType.ERP,
      direction: IntegrationDirection.BIDIRECTIONAL,
      iconUrl: '/icons/connectors/sap.svg',
      documentationUrl: '/docs/connectors/sap-s4hana',
    };
  }

  /**
   * Get credential requirements
   */
  getCredentialRequirements(): CredentialRequirement[] {
    return [
      {
        type: CredentialType.BASIC_AUTH,
        required: false,
        fields: [
          {
            key: 'username',
            label: 'SAP Username',
            type: 'string',
            required: true,
            description: 'SAP system username',
          },
          {
            key: 'password',
            label: 'SAP Password',
            type: 'password',
            required: true,
            description: 'SAP system password',
          },
        ],
      },
      {
        type: CredentialType.OAUTH2,
        required: false,
        fields: [
          {
            key: 'tokenUrl',
            label: 'Token URL',
            type: 'string',
            required: true,
            description: 'SAP OAuth2 token endpoint URL',
            placeholder: 'https://your-tenant.authentication.sap.hana.ondemand.com/oauth/token',
          },
          {
            key: 'clientId',
            label: 'Client ID',
            type: 'string',
            required: true,
            description: 'OAuth2 client ID from SAP BTP',
          },
          {
            key: 'clientSecret',
            label: 'Client Secret',
            type: 'password',
            required: true,
            description: 'OAuth2 client secret',
          },
          {
            key: 'scopes',
            label: 'Scopes',
            type: 'string',
            required: false,
            description: 'Space-separated OAuth2 scopes',
            placeholder: 'API_SALES_ORDER_SRV',
          },
        ],
        oauth2Config: {
          authorizationUrl: '',
          tokenUrl: '',
          scopes: [],
          grantType: 'client_credentials',
        },
      },
    ];
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): ConfigSchema {
    return {
      type: 'object',
      properties: {
        baseUrl: {
          type: 'string',
          title: 'SAP System URL',
          description: 'Base URL of your SAP S/4HANA system',
          format: 'uri',
        },
        client: {
          type: 'string',
          title: 'SAP Client',
          description: 'SAP client number (e.g., 100)',
          pattern: '^[0-9]{3}$',
        },
        language: {
          type: 'string',
          title: 'Language',
          description: 'Default language code (e.g., EN)',
          default: 'EN',
          minLength: 2,
          maxLength: 2,
        },
        authType: {
          type: 'string',
          title: 'Authentication Type',
          description: 'How to authenticate with SAP',
          enum: ['basic', 'oauth2'],
          default: 'oauth2',
        },
        timeout: {
          type: 'number',
          title: 'Request Timeout',
          description: 'Request timeout in milliseconds',
          default: 30000,
          minimum: 5000,
          maximum: 120000,
        },
        salesOrganization: {
          type: 'string',
          title: 'Sales Organization',
          description: 'Default sales organization for orders',
        },
        distributionChannel: {
          type: 'string',
          title: 'Distribution Channel',
          description: 'Default distribution channel',
        },
        division: {
          type: 'string',
          title: 'Division',
          description: 'Default division',
        },
        defaultPlant: {
          type: 'string',
          title: 'Default Plant',
          description: 'Default plant for inventory checks',
        },
      },
      required: ['baseUrl', 'authType'],
    };
  }

  /**
   * Get declared capabilities
   */
  getCapabilities(): CapabilityDefinition[] {
    return [
      // Sales Order capabilities
      {
        code: 'createSalesOrder',
        name: 'Create Sales Order',
        description: 'Create a new sales order in SAP S/4HANA',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            order: { type: 'object', description: 'Order data in canonical format' },
          },
          required: ['order'],
        },
      },
      {
        code: 'getSalesOrder',
        name: 'Get Sales Order',
        description: 'Retrieve a sales order by ID',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            salesOrderId: { type: 'string', description: 'SAP Sales Order number' },
            includeItems: { type: 'boolean', description: 'Include line items' },
          },
          required: ['salesOrderId'],
        },
      },
      {
        code: 'getSalesOrderStatus',
        name: 'Get Sales Order Status',
        description: 'Get the status of a sales order',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            salesOrderId: { type: 'string', description: 'SAP Sales Order number' },
          },
          required: ['salesOrderId'],
        },
      },
      {
        code: 'listSalesOrders',
        name: 'List Sales Orders',
        description: 'List sales orders with filters',
        category: CapabilityCategory.BATCH,
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Filter by customer' },
            fromDate: { type: 'string', format: 'date', description: 'From date' },
            toDate: { type: 'string', format: 'date', description: 'To date' },
            status: { type: 'string', description: 'Filter by status' },
            top: { type: 'number', description: 'Max results' },
            skip: { type: 'number', description: 'Skip results' },
          },
        },
      },

      // Customer/Business Partner capabilities
      {
        code: 'getBusinessPartner',
        name: 'Get Business Partner',
        description: 'Retrieve a business partner by ID',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            businessPartnerId: { type: 'string', description: 'Business Partner ID' },
            includeAddresses: { type: 'boolean', description: 'Include addresses' },
          },
          required: ['businessPartnerId'],
        },
      },
      {
        code: 'createBusinessPartner',
        name: 'Create Business Partner',
        description: 'Create a new business partner',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'object', description: 'Customer data in canonical format' },
          },
          required: ['customer'],
        },
      },
      {
        code: 'listBusinessPartners',
        name: 'List Business Partners',
        description: 'List business partners with filters',
        category: CapabilityCategory.BATCH,
        inputSchema: {
          type: 'object',
          properties: {
            searchTerm: { type: 'string', description: 'Search term' },
            category: { type: 'string', description: 'BP category (1=person, 2=org)' },
            top: { type: 'number', description: 'Max results' },
          },
        },
      },
      {
        code: 'getCustomer',
        name: 'Get Customer',
        description: 'Retrieve customer details including credit info',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Customer ID' },
          },
          required: ['customerId'],
        },
      },

      // Product capabilities
      {
        code: 'getProduct',
        name: 'Get Product',
        description: 'Retrieve a product/material by ID',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Material number' },
            language: { type: 'string', description: 'Language for description' },
          },
          required: ['productId'],
        },
      },
      {
        code: 'listProducts',
        name: 'List Products',
        description: 'List products with filters',
        category: CapabilityCategory.BATCH,
        inputSchema: {
          type: 'object',
          properties: {
            productGroup: { type: 'string', description: 'Product group' },
            searchTerm: { type: 'string', description: 'Search term' },
            top: { type: 'number', description: 'Max results' },
          },
        },
      },

      // Invoice capabilities
      {
        code: 'getBillingDocument',
        name: 'Get Billing Document',
        description: 'Retrieve a billing document (invoice)',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            billingDocumentId: { type: 'string', description: 'Billing document number' },
            includeItems: { type: 'boolean', description: 'Include line items' },
          },
          required: ['billingDocumentId'],
        },
      },
      {
        code: 'listBillingDocuments',
        name: 'List Billing Documents',
        description: 'List billing documents with filters',
        category: CapabilityCategory.BATCH,
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Filter by customer' },
            fromDate: { type: 'string', format: 'date', description: 'From date' },
            toDate: { type: 'string', format: 'date', description: 'To date' },
            documentType: { type: 'string', description: 'Document type' },
          },
        },
      },

      // ATP capabilities
      {
        code: 'checkAtp',
        name: 'Check ATP',
        description: 'Check material availability (ATP)',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            material: { type: 'string', description: 'Material number' },
            plant: { type: 'string', description: 'Plant' },
            quantity: { type: 'number', description: 'Requested quantity' },
            unit: { type: 'string', description: 'Unit of measure' },
            requestedDate: { type: 'string', format: 'date', description: 'Requested date' },
          },
          required: ['material', 'plant', 'quantity', 'unit', 'requestedDate'],
        },
      },
    ];
  }

  /**
   * Initialize the connector
   */
  async initialize(context: ConnectorContext): Promise<void> {
    this.logger.log(`Initializing SAP S/4HANA connector for tenant ${context.tenantId}`);

    this.config = this.buildConfig(context.config);
    this.credentials = this.buildCredentials(context.config, context.credentials);

    // Validate credentials
    const validation = this.authService.validateCredentials(this.config, this.credentials);
    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
    }

    this.logger.log('SAP S/4HANA connector initialized');
  }

  /**
   * Test connection to SAP
   */
  async testConnection(context: ConnectorContext): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const config = this.config || this.buildConfig(context.config);
      const credentials =
        this.credentials || this.buildCredentials(context.config, context.credentials);

      // Try to get auth header (validates credentials)
      await this.authService.getAuthorizationHeader(config, credentials);

      // Try a simple API call
      const result = await this.productService.list(config, credentials, { top: 1 });

      if (result.success) {
        return {
          success: true,
          message: 'Successfully connected to SAP S/4HANA',
          latencyMs: Date.now() - startTime,
          details: {
            baseUrl: config.baseUrl,
            client: config.client,
          },
          capabilities: this.getCapabilities().map((c) => c.code),
        };
      } else {
        return {
          success: false,
          message: result.error?.message || 'Connection test failed',
          latencyMs: Date.now() - startTime,
          errors: [result.error?.message || 'Unknown error'],
        };
      }
    } catch (error) {
      const normalizedError = this.errorHandler.normalize(error);
      return {
        success: false,
        message: this.errorHandler.getUserMessage(normalizedError),
        latencyMs: Date.now() - startTime,
        errors: [normalizedError.message],
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
    const config = this.config || this.buildConfig(context.config);
    const credentials =
      this.credentials || this.buildCredentials(context.config, context.credentials);

    try {
      switch (capability) {
        // Sales Orders
        case 'createSalesOrder':
          return await this.executeCreateSalesOrder(config, credentials, input, context);

        case 'getSalesOrder':
          return await this.executeGetSalesOrder(config, credentials, input);

        case 'getSalesOrderStatus':
          return await this.executeGetSalesOrderStatus(config, credentials, input);

        case 'listSalesOrders':
          return await this.executeListSalesOrders(config, credentials, input);

        // Business Partners
        case 'getBusinessPartner':
          return await this.executeGetBusinessPartner(config, credentials, input);

        case 'createBusinessPartner':
          return await this.executeCreateBusinessPartner(config, credentials, input);

        case 'listBusinessPartners':
          return await this.executeListBusinessPartners(config, credentials, input);

        case 'getCustomer':
          return await this.executeGetCustomer(config, credentials, input);

        // Products
        case 'getProduct':
          return await this.executeGetProduct(config, credentials, input);

        case 'listProducts':
          return await this.executeListProducts(config, credentials, input);

        // Billing Documents
        case 'getBillingDocument':
          return await this.executeGetBillingDocument(config, credentials, input);

        case 'listBillingDocuments':
          return await this.executeListBillingDocuments(config, credentials, input);

        // ATP
        case 'checkAtp':
          return await this.executeCheckAtp(config, credentials, input);

        default:
          return {
            success: false,
            error: `Unknown capability: ${capability}`,
            retryable: false,
          };
      }
    } catch (error) {
      const normalizedError = this.errorHandler.normalize(error);
      this.errorHandler.logError(normalizedError, {
        operation: capability,
        tenantId: context.tenantId,
        requestId: context.correlationId,
      });

      return {
        success: false,
        error: this.errorHandler.getUserMessage(normalizedError),
        errorCode: normalizedError.code,
        retryable: normalizedError.retryable,
      };
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.logger.log('Destroying SAP S/4HANA connector');
    if (this.config && this.credentials) {
      this.authService.clearTokenCache(this.config, this.credentials);
    }
    this.config = undefined;
    this.credentials = undefined;
  }

  // ==================== Capability Implementations ====================

  private async executeCreateSalesOrder(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
    context: ConnectorContext,
  ): Promise<ConnectorOperationResult> {
    const order = input.order as any;

    const sapInput = this.mapper.mapCanonicalToSalesOrderInput(order, {
      salesOrganization: (context.config.salesOrganization as string) || '',
      distributionChannel: (context.config.distributionChannel as string) || '',
      division: (context.config.division as string) || '',
    });

    const result = await this.salesOrderService.create(config, credentials, sapInput);

    if (result.success && result.data) {
      return {
        success: true,
        data: this.mapper.mapSalesOrderToCanonical(result.data),
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeGetSalesOrder(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.salesOrderService.getById(
      config,
      credentials,
      input.salesOrderId as string,
      { includeItems: input.includeItems as boolean },
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: this.mapper.mapSalesOrderToCanonical(result.data),
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeGetSalesOrderStatus(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.salesOrderService.getStatus(
      config,
      credentials,
      input.salesOrderId as string,
    );

    return {
      success: result.success,
      data: result.data,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
      metadata: result.metadata,
    };
  }

  private async executeListSalesOrders(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.salesOrderService.list(config, credentials, {
      customer: input.customer as string,
      fromDate: input.fromDate ? new Date(input.fromDate as string) : undefined,
      toDate: input.toDate ? new Date(input.toDate as string) : undefined,
      status: input.status as SapSalesOrderStatus,
      top: input.top as number,
      skip: input.skip as number,
      includeItems: input.includeItems as boolean,
    });

    if (result.success && result.data) {
      const orders = result.data.value.map((o) => this.mapper.mapSalesOrderToCanonical(o));

      return {
        success: true,
        data: {
          items: orders,
          total: result.data.metadata['@odata.count'],
          hasMore: !!result.data.metadata['@odata.nextLink'],
        },
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeGetBusinessPartner(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.businessPartnerService.getById(
      config,
      credentials,
      input.businessPartnerId as string,
      {
        includeAddresses: input.includeAddresses as boolean,
        includeCustomer: input.includeCustomer as boolean,
      },
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: this.mapper.mapBusinessPartnerToCanonical(result.data),
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeCreateBusinessPartner(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const customer = input.customer as any;
    const sapInput = this.mapper.mapCanonicalToBusinessPartnerInput(customer);

    const result = await this.businessPartnerService.create(config, credentials, sapInput);

    if (result.success && result.data) {
      return {
        success: true,
        data: this.mapper.mapBusinessPartnerToCanonical(result.data),
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeListBusinessPartners(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.businessPartnerService.list(config, credentials, {
      searchTerm: input.searchTerm as string,
      category: input.category as SapBusinessPartnerCategory,
      top: input.top as number,
      skip: input.skip as number,
      includeAddresses: input.includeAddresses as boolean,
    });

    if (result.success && result.data) {
      const partners = result.data.value.map((bp) => this.mapper.mapBusinessPartnerToCanonical(bp));

      return {
        success: true,
        data: {
          items: partners,
          total: result.data.metadata['@odata.count'],
          hasMore: !!result.data.metadata['@odata.nextLink'],
        },
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeGetCustomer(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.businessPartnerService.getCustomerById(
      config,
      credentials,
      input.customerId as string,
      { includeSalesAreas: true },
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: this.mapper.mapCustomerToCanonical(result.data),
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeGetProduct(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.productService.getById(
      config,
      credentials,
      input.productId as string,
      {
        includeDescriptions: true,
        language: input.language as string,
      },
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: this.mapper.mapProductToCanonical(result.data),
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeListProducts(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.productService.list(config, credentials, {
      productGroup: input.productGroup as string,
      searchTerm: input.searchTerm as string,
      top: input.top as number,
      skip: input.skip as number,
      includeDescriptions: true,
      language: input.language as string,
    });

    if (result.success && result.data) {
      const products = result.data.value.map((p) => this.mapper.mapProductToCanonical(p));

      return {
        success: true,
        data: {
          items: products,
          total: result.data.metadata['@odata.count'],
          hasMore: !!result.data.metadata['@odata.nextLink'],
        },
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeGetBillingDocument(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.billingDocumentService.getById(
      config,
      credentials,
      input.billingDocumentId as string,
      { includeItems: input.includeItems as boolean },
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: this.mapper.mapBillingDocumentToCanonical(result.data),
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeListBillingDocuments(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const result = await this.billingDocumentService.list(config, credentials, {
      customer: input.customer as string,
      fromDate: input.fromDate ? new Date(input.fromDate as string) : undefined,
      toDate: input.toDate ? new Date(input.toDate as string) : undefined,
      billingDocumentType: input.documentType as SapBillingDocumentType,
      top: input.top as number,
      skip: input.skip as number,
      includeItems: input.includeItems as boolean,
    });

    if (result.success && result.data) {
      const invoices = result.data.value.map((doc) =>
        this.mapper.mapBillingDocumentToCanonical(doc),
      );

      return {
        success: true,
        data: {
          items: invoices,
          total: result.data.metadata['@odata.count'],
          hasMore: !!result.data.metadata['@odata.nextLink'],
        },
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  private async executeCheckAtp(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: Record<string, unknown>,
  ): Promise<ConnectorOperationResult> {
    const request: SapAtpCheckRequest = {
      Material: input.material as string,
      Plant: input.plant as string,
      RequestedQuantity: input.quantity as number,
      RequestedQuantityUnit: input.unit as string,
      RequestedDeliveryDate: input.requestedDate as string,
      Customer: input.customer as string,
      SalesOrganization: input.salesOrganization as string,
      DistributionChannel: input.distributionChannel as string,
    };

    const result = await this.atpService.checkAvailability(config, credentials, request);

    if (result.success && result.data) {
      return {
        success: true,
        data: {
          ...this.mapper.mapAtpToCanonical(result.data),
          isAvailable: result.data.IsAvailable,
          confirmedQuantity: result.data.ConfirmedQuantity,
          availabilityDate: result.data.AvailabilityDate,
        },
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: result.error?.message,
      errorCode: result.error?.code,
      retryable: result.error?.retryable ?? false,
    };
  }

  // ==================== Helper Methods ====================

  private buildConfig(config: Record<string, unknown>): SapConnectionConfig {
    return {
      baseUrl: config.baseUrl as string,
      client: config.client as string,
      language: (config.language as string) || 'EN',
      authType: (config.authType as 'basic' | 'oauth2') || 'oauth2',
      timeout: (config.timeout as number) || 30000,
    };
  }

  private buildCredentials(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>,
  ): SapCredentials {
    const authType = config.authType as string;

    if (authType === 'basic') {
      return {
        basic: {
          username: credentials.username as string,
          password: credentials.password as string,
        },
      };
    }

    return {
      oauth2: {
        tokenUrl: credentials.tokenUrl as string,
        clientId: credentials.clientId as string,
        clientSecret: credentials.clientSecret as string,
        grantType: (credentials.grantType as 'client_credentials') || 'client_credentials',
        scopes: credentials.scopes ? (credentials.scopes as string).split(' ') : undefined,
      },
    };
  }
}

/**
 * Factory for creating SAP S/4HANA Connector instances
 */
export class SapS4HanaConnectorFactory {
  constructor(private readonly httpService: HttpService) {}

  create(): SapS4HanaConnector {
    const connector = new SapS4HanaConnector();
    connector.initializeServices(this.httpService);
    return connector;
  }
}
