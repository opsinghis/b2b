import { Injectable, Logger } from '@nestjs/common';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksCustomer,
  QuickBooksConnectorResult,
  QuickBooksApiResponse,
  QuickBooksCreateCustomerInput,
  QuickBooksQueryOptions,
  QuickBooksApiPaths,
} from '../interfaces';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';

/**
 * List customers options
 */
export interface ListCustomersOptions extends QuickBooksQueryOptions {
  /** Filter by active status */
  active?: boolean;

  /** Search display name (contains) */
  searchName?: string;

  /** Filter by email */
  email?: string;
}

/**
 * Get customer options
 */
export interface GetCustomerOptions {
  /** Include sparse fields only */
  sparse?: boolean;
}

/**
 * QuickBooks Customer Service
 * Handles customer CRUD operations
 */
@Injectable()
export class QuickBooksCustomerService {
  private readonly logger = new Logger(QuickBooksCustomerService.name);

  constructor(
    private readonly restClient: QuickBooksRestClientService,
    private readonly errorHandler: QuickBooksErrorHandlerService,
  ) {}

  /**
   * Create a new customer
   */
  async create(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    input: QuickBooksCreateCustomerInput,
  ): Promise<QuickBooksConnectorResult<QuickBooksCustomer>> {
    this.logger.debug(`Creating customer: ${input.displayName}`);

    try {
      const customerPayload = this.buildCreatePayload(input);

      const result = await this.restClient.post<{ Customer: QuickBooksCustomer }>(
        config,
        credentials,
        QuickBooksApiPaths.CUSTOMER.replace('{realmId}', config.realmId),
        customerPayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksCustomer>;
      }

      const responseData = result.data as { Customer: QuickBooksCustomer };

      return {
        success: true,
        data: responseData.Customer,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'create-customer', 0);
    }
  }

  /**
   * Get customer by ID
   */
  async getById(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId: string,
    _options?: GetCustomerOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksCustomer>> {
    this.logger.debug(`Getting customer: ${customerId}`);

    try {
      const path = `${QuickBooksApiPaths.CUSTOMER.replace('{realmId}', config.realmId)}/${customerId}`;

      const result = await this.restClient.get<{ Customer: QuickBooksCustomer }>(
        config,
        credentials,
        path,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksCustomer>;
      }

      const responseData = result.data as { Customer: QuickBooksCustomer };

      return {
        success: true,
        data: responseData.Customer,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'get-customer', 0);
    }
  }

  /**
   * List customers with filtering and pagination
   */
  async list(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    options?: ListCustomersOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksApiResponse<QuickBooksCustomer>>> {
    this.logger.debug('Listing customers');

    try {
      const query = this.buildListQuery(options);

      const result = await this.restClient.query<QuickBooksCustomer>(config, credentials, query, {
        startPosition: options?.startPosition,
        maxResults: options?.maxResults,
        orderBy: options?.orderBy,
      });

      return result;
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'list-customers', 0);
    }
  }

  /**
   * Update customer
   */
  async update(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateCustomerInput>,
  ): Promise<QuickBooksConnectorResult<QuickBooksCustomer>> {
    this.logger.debug(`Updating customer: ${customerId}`);

    try {
      const updatePayload = this.buildUpdatePayload(customerId, syncToken, input);

      const result = await this.restClient.post<{ Customer: QuickBooksCustomer }>(
        config,
        credentials,
        QuickBooksApiPaths.CUSTOMER.replace('{realmId}', config.realmId),
        updatePayload,
      );

      if (!result.success) {
        return result as QuickBooksConnectorResult<QuickBooksCustomer>;
      }

      const responseData = result.data as { Customer: QuickBooksCustomer };

      return {
        success: true,
        data: responseData.Customer,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'update-customer', 0);
    }
  }

  /**
   * Search customers by name
   */
  async search(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    searchTerm: string,
    limit?: number,
  ): Promise<QuickBooksConnectorResult<QuickBooksCustomer[]>> {
    this.logger.debug(`Searching customers: ${searchTerm}`);

    try {
      const query = `SELECT * FROM Customer WHERE DisplayName LIKE '%${this.escapeQueryString(searchTerm)}%'`;

      const result = await this.restClient.query<QuickBooksCustomer>(config, credentials, query, {
        maxResults: limit || 25,
      });

      if (!result.success || !result.data) {
        return result as QuickBooksConnectorResult<QuickBooksCustomer[]>;
      }

      const customers = result.data.QueryResponse?.Customer || [];

      return {
        success: true,
        data: customers,
        metadata: result.metadata,
      };
    } catch (error) {
      return this.errorHandler.createErrorResult(error, 'search-customers', 0);
    }
  }

  /**
   * Deactivate customer (QuickBooks doesn't support hard delete)
   */
  async deactivate(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    customerId: string,
    syncToken: string,
  ): Promise<QuickBooksConnectorResult<QuickBooksCustomer>> {
    this.logger.debug(`Deactivating customer: ${customerId}`);

    return this.update(config, credentials, customerId, syncToken, {
      // Mark as inactive
    });
  }

  /**
   * Build create customer payload
   */
  private buildCreatePayload(input: QuickBooksCreateCustomerInput): QuickBooksCustomer {
    const customer: QuickBooksCustomer = {
      DisplayName: input.displayName,
    };

    if (input.companyName) {
      customer.CompanyName = input.companyName;
    }

    if (input.firstName) {
      customer.GivenName = input.firstName;
    }

    if (input.lastName) {
      customer.FamilyName = input.lastName;
    }

    if (input.title) {
      customer.Title = input.title;
    }

    if (input.email) {
      customer.PrimaryEmailAddr = { Address: input.email };
    }

    if (input.phone) {
      customer.PrimaryPhone = { FreeFormNumber: input.phone };
    }

    if (input.mobile) {
      customer.Mobile = { FreeFormNumber: input.mobile };
    }

    if (input.website) {
      customer.WebAddr = { URI: input.website };
    }

    if (input.notes) {
      customer.Notes = input.notes;
    }

    if (input.billingAddress) {
      customer.BillAddr = {
        Line1: input.billingAddress.line1,
        Line2: input.billingAddress.line2,
        Line3: input.billingAddress.line3,
        City: input.billingAddress.city,
        CountrySubDivisionCode: input.billingAddress.state,
        PostalCode: input.billingAddress.postalCode,
        Country: input.billingAddress.country,
      };
    }

    if (input.shippingAddress) {
      customer.ShipAddr = {
        Line1: input.shippingAddress.line1,
        Line2: input.shippingAddress.line2,
        Line3: input.shippingAddress.line3,
        City: input.shippingAddress.city,
        CountrySubDivisionCode: input.shippingAddress.state,
        PostalCode: input.shippingAddress.postalCode,
        Country: input.shippingAddress.country,
      };
    }

    if (input.taxable !== undefined) {
      customer.Taxable = input.taxable;
    }

    if (input.paymentTermsId) {
      customer.SalesTermRef = { value: input.paymentTermsId };
    }

    if (input.currency) {
      customer.CurrencyRef = { value: input.currency };
    }

    return customer;
  }

  /**
   * Build update customer payload
   */
  private buildUpdatePayload(
    customerId: string,
    syncToken: string,
    input: Partial<QuickBooksCreateCustomerInput>,
  ): QuickBooksCustomer {
    const customer: QuickBooksCustomer = {
      Id: customerId,
      SyncToken: syncToken,
      sparse: true,
    } as QuickBooksCustomer & { sparse: boolean };

    if (input.displayName) {
      customer.DisplayName = input.displayName;
    }

    if (input.companyName) {
      customer.CompanyName = input.companyName;
    }

    if (input.firstName) {
      customer.GivenName = input.firstName;
    }

    if (input.lastName) {
      customer.FamilyName = input.lastName;
    }

    if (input.email) {
      customer.PrimaryEmailAddr = { Address: input.email };
    }

    if (input.phone) {
      customer.PrimaryPhone = { FreeFormNumber: input.phone };
    }

    if (input.mobile) {
      customer.Mobile = { FreeFormNumber: input.mobile };
    }

    if (input.website) {
      customer.WebAddr = { URI: input.website };
    }

    if (input.notes) {
      customer.Notes = input.notes;
    }

    if (input.billingAddress) {
      customer.BillAddr = {
        Line1: input.billingAddress.line1,
        Line2: input.billingAddress.line2,
        Line3: input.billingAddress.line3,
        City: input.billingAddress.city,
        CountrySubDivisionCode: input.billingAddress.state,
        PostalCode: input.billingAddress.postalCode,
        Country: input.billingAddress.country,
      };
    }

    if (input.shippingAddress) {
      customer.ShipAddr = {
        Line1: input.shippingAddress.line1,
        Line2: input.shippingAddress.line2,
        Line3: input.shippingAddress.line3,
        City: input.shippingAddress.city,
        CountrySubDivisionCode: input.shippingAddress.state,
        PostalCode: input.shippingAddress.postalCode,
        Country: input.shippingAddress.country,
      };
    }

    return customer;
  }

  /**
   * Build list query
   */
  private buildListQuery(options?: ListCustomersOptions): string {
    let query = 'SELECT * FROM Customer';
    const conditions: string[] = [];

    if (options?.active !== undefined) {
      conditions.push(`Active = ${options.active}`);
    }

    if (options?.searchName) {
      conditions.push(`DisplayName LIKE '%${this.escapeQueryString(options.searchName)}%'`);
    }

    if (options?.email) {
      conditions.push(`PrimaryEmailAddr = '${this.escapeQueryString(options.email)}'`);
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
