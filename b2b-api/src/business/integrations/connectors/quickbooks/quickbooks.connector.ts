import { Injectable, Logger } from '@nestjs/common';
import {
  QuickBooksAuthService,
  QuickBooksRestClientService,
  QuickBooksCustomerService,
  QuickBooksItemService,
  QuickBooksInvoiceService,
  QuickBooksSalesReceiptService,
  QuickBooksPaymentService,
  QuickBooksMapperService,
  QuickBooksErrorHandlerService,
  ListCustomersOptions,
  GetCustomerOptions,
  ListItemsOptions,
  GetItemOptions,
  ListInvoicesOptions,
  GetInvoiceOptions,
  ListSalesReceiptsOptions,
  GetSalesReceiptOptions,
  ListPaymentsOptions,
  GetPaymentOptions,
  CanonicalCustomer,
  CanonicalProduct,
  CanonicalInvoice,
  CanonicalOrder,
  CanonicalPayment,
} from './services';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksConnectorResult,
  QuickBooksCreateCustomerInput,
  QuickBooksCreateItemInput,
  QuickBooksCreateInvoiceInput,
  QuickBooksCreateSalesReceiptInput,
  QuickBooksCreatePaymentInput,
  QuickBooksCustomer,
  QuickBooksItem,
  QuickBooksInvoice,
  QuickBooksSalesReceipt,
  QuickBooksPayment,
} from './interfaces';

/**
 * Connector metadata interface
 */
export interface QuickBooksConnectorMetadata {
  id: string;
  name: string;
  version: string;
  vendor: string;
  description: string;
  supportedOperations: string[];
  configSchema: Record<string, unknown>;
}

/**
 * QuickBooks Online Connector
 * Implements integration with Intuit QuickBooks Online
 */
@Injectable()
export class QuickBooksConnector {
  private readonly logger = new Logger(QuickBooksConnector.name);

  readonly metadata: QuickBooksConnectorMetadata = {
    id: 'quickbooks-online',
    name: 'QuickBooks Online',
    version: '1.0.0',
    vendor: 'Intuit',
    description: 'Integration connector for Intuit QuickBooks Online',
    supportedOperations: [
      'createCustomer',
      'getCustomer',
      'listCustomers',
      'updateCustomer',
      'searchCustomers',
      'createItem',
      'getItem',
      'listItems',
      'updateItem',
      'searchItems',
      'createInvoice',
      'getInvoice',
      'listInvoices',
      'updateInvoice',
      'voidInvoice',
      'sendInvoice',
      'createSalesReceipt',
      'getSalesReceipt',
      'listSalesReceipts',
      'updateSalesReceipt',
      'voidSalesReceipt',
      'createPayment',
      'getPayment',
      'listPayments',
      'voidPayment',
    ],
    configSchema: {
      type: 'object',
      properties: {
        realmId: {
          type: 'string',
          description: 'QuickBooks Company ID (Realm ID)',
        },
        environment: {
          type: 'string',
          enum: ['sandbox', 'production'],
          description: 'QuickBooks environment',
        },
        clientId: {
          type: 'string',
          description: 'OAuth2 client ID',
        },
        clientSecret: {
          type: 'string',
          description: 'OAuth2 client secret',
          sensitive: true,
        },
        accessToken: {
          type: 'string',
          description: 'OAuth2 access token',
          sensitive: true,
        },
        refreshToken: {
          type: 'string',
          description: 'OAuth2 refresh token',
          sensitive: true,
        },
      },
      required: ['realmId', 'environment', 'clientId', 'clientSecret'],
    },
  };

  constructor(
    private readonly authService: QuickBooksAuthService,
    private readonly restClient: QuickBooksRestClientService,
    private readonly customerService: QuickBooksCustomerService,
    private readonly itemService: QuickBooksItemService,
    private readonly invoiceService: QuickBooksInvoiceService,
    private readonly salesReceiptService: QuickBooksSalesReceiptService,
    private readonly paymentService: QuickBooksPaymentService,
    private readonly mapper: QuickBooksMapperService,
    private readonly errorHandler: QuickBooksErrorHandlerService,
  ) {}

  /**
   * Test connection to QuickBooks Online
   */
  async testConnection(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
  ): Promise<QuickBooksConnectorResult<{ connected: boolean; message?: string }>> {
    this.logger.debug('Testing QuickBooks Online connection');

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
            message: 'Successfully connected to QuickBooks Online',
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
          message: authTest.error || 'Failed to connect to QuickBooks Online',
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

  // ==================== Customer Operations ====================

  /**
   * Create customer
   */
  async createCustomer(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateCustomerInput,
  ): Promise<QuickBooksConnectorResult<CanonicalCustomer>> {
    this.logger.debug(`Creating customer: ${input.displayName}`);

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
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId: string,
    options?: GetCustomerOptions,
  ): Promise<QuickBooksConnectorResult<CanonicalCustomer>> {
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
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListCustomersOptions,
  ): Promise<
    QuickBooksConnectorResult<{ customers: CanonicalCustomer[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.customerService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const customers =
      result.data.QueryResponse?.Customer?.map((c) => this.mapper.mapCustomerToCanonical(c)) || [];

    return {
      success: true,
      data: {
        customers,
        total: result.metadata?.totalResults,
        hasMore: result.metadata?.hasMore || false,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Update customer
   */
  async updateCustomer(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateCustomerInput>,
  ): Promise<QuickBooksConnectorResult<CanonicalCustomer>> {
    const result = await this.customerService.update(
      config,
      credentials,
      customerId,
      syncToken,
      input,
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
      data: this.mapper.mapCustomerToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Search customers
   */
  async searchCustomers(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    searchTerm: string,
    limit?: number,
  ): Promise<QuickBooksConnectorResult<CanonicalCustomer[]>> {
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
      data: result.data.map((c) => this.mapper.mapCustomerToCanonical(c)),
      metadata: result.metadata,
    };
  }

  // ==================== Item/Product Operations ====================

  /**
   * Create item
   */
  async createItem(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateItemInput,
  ): Promise<QuickBooksConnectorResult<CanonicalProduct>> {
    this.logger.debug(`Creating item: ${input.name}`);

    const result = await this.itemService.create(config, credentials, input);

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
   * Get item by ID
   */
  async getItem(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    itemId: string,
    options?: GetItemOptions,
  ): Promise<QuickBooksConnectorResult<CanonicalProduct>> {
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
   * Get item by SKU
   */
  async getItemBySku(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    sku: string,
  ): Promise<QuickBooksConnectorResult<CanonicalProduct | null>> {
    const result = await this.itemService.getBySku(config, credentials, sku);

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
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListItemsOptions,
  ): Promise<
    QuickBooksConnectorResult<{ products: CanonicalProduct[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.itemService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const products =
      result.data.QueryResponse?.Item?.map((i) => this.mapper.mapItemToCanonical(i)) || [];

    return {
      success: true,
      data: {
        products,
        total: result.metadata?.totalResults,
        hasMore: result.metadata?.hasMore || false,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Update item
   */
  async updateItem(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    itemId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateItemInput>,
  ): Promise<QuickBooksConnectorResult<CanonicalProduct>> {
    const result = await this.itemService.update(config, credentials, itemId, syncToken, input);

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
   * Search items
   */
  async searchItems(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    searchTerm: string,
    options?: { type?: QuickBooksItem['Type']; activeOnly?: boolean; limit?: number },
  ): Promise<QuickBooksConnectorResult<CanonicalProduct[]>> {
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
      data: result.data.map((i) => this.mapper.mapItemToCanonical(i)),
      metadata: result.metadata,
    };
  }

  // ==================== Invoice Operations ====================

  /**
   * Create invoice
   */
  async createInvoice(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateInvoiceInput,
  ): Promise<QuickBooksConnectorResult<CanonicalInvoice>> {
    this.logger.debug(`Creating invoice for customer: ${input.customerId}`);

    const result = await this.invoiceService.create(config, credentials, input);

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
   * Get invoice by ID
   */
  async getInvoice(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    options?: GetInvoiceOptions,
  ): Promise<QuickBooksConnectorResult<CanonicalInvoice>> {
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
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListInvoicesOptions,
  ): Promise<
    QuickBooksConnectorResult<{ invoices: CanonicalInvoice[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.invoiceService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const invoices =
      result.data.QueryResponse?.Invoice?.map((i) => this.mapper.mapInvoiceToCanonical(i)) || [];

    return {
      success: true,
      data: {
        invoices,
        total: result.metadata?.totalResults,
        hasMore: result.metadata?.hasMore || false,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Update invoice
   */
  async updateInvoice(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateInvoiceInput>,
  ): Promise<QuickBooksConnectorResult<CanonicalInvoice>> {
    const result = await this.invoiceService.update(
      config,
      credentials,
      invoiceId,
      syncToken,
      input,
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
      data: this.mapper.mapInvoiceToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Void invoice
   */
  async voidInvoice(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<CanonicalInvoice>> {
    const result = await this.invoiceService.void(config, credentials, invoiceId, syncToken);

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
   * Send invoice via email
   */
  async sendInvoice(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
    email?: string,
  ): Promise<QuickBooksConnectorResult<CanonicalInvoice>> {
    const result = await this.invoiceService.send(config, credentials, invoiceId, email);

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
   * Get outstanding invoices
   */
  async getOutstandingInvoices(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<QuickBooksConnectorResult<CanonicalInvoice[]>> {
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
      data: result.data.map((i) => this.mapper.mapInvoiceToCanonical(i)),
      metadata: result.metadata,
    };
  }

  // ==================== Sales Receipt Operations ====================

  /**
   * Create sales receipt
   */
  async createSalesReceipt(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateSalesReceiptInput,
  ): Promise<QuickBooksConnectorResult<CanonicalOrder>> {
    this.logger.debug(`Creating sales receipt`);

    const result = await this.salesReceiptService.create(config, credentials, input);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapSalesReceiptToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get sales receipt by ID
   */
  async getSalesReceipt(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    salesReceiptId: string,
    options?: GetSalesReceiptOptions,
  ): Promise<QuickBooksConnectorResult<CanonicalOrder>> {
    const result = await this.salesReceiptService.getById(
      config,
      credentials,
      salesReceiptId,
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
      data: this.mapper.mapSalesReceiptToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * List sales receipts
   */
  async listSalesReceipts(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListSalesReceiptsOptions,
  ): Promise<
    QuickBooksConnectorResult<{ orders: CanonicalOrder[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.salesReceiptService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const orders =
      result.data.QueryResponse?.SalesReceipt?.map((sr) =>
        this.mapper.mapSalesReceiptToCanonical(sr),
      ) || [];

    return {
      success: true,
      data: {
        orders,
        total: result.metadata?.totalResults,
        hasMore: result.metadata?.hasMore || false,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Update sales receipt
   */
  async updateSalesReceipt(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    salesReceiptId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateSalesReceiptInput>,
  ): Promise<QuickBooksConnectorResult<CanonicalOrder>> {
    const result = await this.salesReceiptService.update(
      config,
      credentials,
      salesReceiptId,
      syncToken,
      input,
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
      data: this.mapper.mapSalesReceiptToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Void sales receipt
   */
  async voidSalesReceipt(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    salesReceiptId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<CanonicalOrder>> {
    const result = await this.salesReceiptService.void(
      config,
      credentials,
      salesReceiptId,
      syncToken,
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
      data: this.mapper.mapSalesReceiptToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  // ==================== Payment Operations ====================

  /**
   * Create payment
   */
  async createPayment(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreatePaymentInput,
  ): Promise<QuickBooksConnectorResult<CanonicalPayment>> {
    this.logger.debug(`Creating payment for customer: ${input.customerId}`);

    const result = await this.paymentService.create(config, credentials, input);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapPaymentToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get payment by ID
   */
  async getPayment(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    paymentId: string,
    options?: GetPaymentOptions,
  ): Promise<QuickBooksConnectorResult<CanonicalPayment>> {
    const result = await this.paymentService.getById(config, credentials, paymentId, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapPaymentToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * List payments
   */
  async listPayments(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListPaymentsOptions,
  ): Promise<
    QuickBooksConnectorResult<{ payments: CanonicalPayment[]; total?: number; hasMore: boolean }>
  > {
    const result = await this.paymentService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const payments =
      result.data.QueryResponse?.Payment?.map((p) => this.mapper.mapPaymentToCanonical(p)) || [];

    return {
      success: true,
      data: {
        payments,
        total: result.metadata?.totalResults,
        hasMore: result.metadata?.hasMore || false,
      },
      metadata: result.metadata,
    };
  }

  /**
   * Void payment
   */
  async voidPayment(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    paymentId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<CanonicalPayment>> {
    const result = await this.paymentService.void(config, credentials, paymentId, syncToken);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: this.mapper.mapPaymentToCanonical(result.data),
      metadata: result.metadata,
    };
  }

  /**
   * Get payments for invoice
   */
  async getPaymentsForInvoice(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    invoiceId: string,
  ): Promise<QuickBooksConnectorResult<CanonicalPayment[]>> {
    const result = await this.paymentService.getForInvoice(config, credentials, invoiceId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.map((p) => this.mapper.mapPaymentToCanonical(p)),
      metadata: result.metadata,
    };
  }

  // ==================== Raw Data Access ====================

  /**
   * Get raw QuickBooks entities (for advanced usage)
   */
  async getRawCustomers(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListCustomersOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksCustomer[]>> {
    const result = await this.customerService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.QueryResponse?.Customer || [],
      metadata: result.metadata,
    };
  }

  async getRawItems(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListItemsOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksItem[]>> {
    const result = await this.itemService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.QueryResponse?.Item || [],
      metadata: result.metadata,
    };
  }

  async getRawInvoices(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListInvoicesOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksInvoice[]>> {
    const result = await this.invoiceService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.QueryResponse?.Invoice || [],
      metadata: result.metadata,
    };
  }

  async getRawSalesReceipts(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListSalesReceiptsOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksSalesReceipt[]>> {
    const result = await this.salesReceiptService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.QueryResponse?.SalesReceipt || [],
      metadata: result.metadata,
    };
  }

  async getRawPayments(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListPaymentsOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksPayment[]>> {
    const result = await this.paymentService.list(config, credentials, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      data: result.data.QueryResponse?.Payment || [],
      metadata: result.metadata,
    };
  }
}
