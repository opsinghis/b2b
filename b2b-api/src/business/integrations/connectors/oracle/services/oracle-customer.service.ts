import { Injectable, Logger } from '@nestjs/common';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleCustomer,
  OracleContact,
  OracleAddress,
  OracleApiPaths,
  OracleCreateCustomerInput,
  OracleConnectorResult,
  OracleApiResponse,
} from '../interfaces';
import { OracleRestClientService } from './oracle-rest-client.service';
import { OracleErrorHandlerService } from './oracle-error-handler.service';

/**
 * List customers options
 */
export interface ListCustomersOptions {
  /** Filter by status */
  status?: string;

  /** Filter by customer type */
  customerType?: string;

  /** Search by name (contains) */
  nameContains?: string;

  /** Filter by customer class */
  customerClassCode?: string;

  /** Filter by sales person ID */
  salesPersonId?: number;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Order by field */
  orderBy?: string;

  /** Include addresses */
  includeAddresses?: boolean;

  /** Include contacts */
  includeContacts?: boolean;
}

/**
 * Get customer options
 */
export interface GetCustomerOptions {
  /** Include addresses */
  includeAddresses?: boolean;

  /** Include contacts */
  includeContacts?: boolean;

  /** Additional fields to select */
  fields?: string[];

  /** Expand related resources */
  expand?: string[];
}

/**
 * Create contact input
 */
export interface CreateContactInput {
  firstName: string;
  lastName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
}

/**
 * Oracle ERP Cloud Customer Service
 * Handles Customer (Trading Community Architecture) operations
 */
@Injectable()
export class OracleCustomerService {
  private readonly logger = new Logger(OracleCustomerService.name);

  constructor(
    private readonly restClient: OracleRestClientService,
    private readonly errorHandler: OracleErrorHandlerService,
  ) {}

  /**
   * Create customer account
   */
  async create(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    input: OracleCreateCustomerInput,
  ): Promise<OracleConnectorResult<OracleCustomer>> {
    this.logger.debug(`Creating customer: ${input.name}`);

    const payload = this.buildCreatePayload(input);

    const result = await this.restClient.post<OracleCustomer>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      payload,
    );

    if (result.success && result.data) {
      this.logger.debug(
        `Created customer: ${result.data.CustomerAccountNumber || result.data.CustomerAccountId}`,
      );
    }

    return result;
  }

  /**
   * Get customer by ID
   */
  async getById(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
    options?: GetCustomerOptions,
  ): Promise<OracleConnectorResult<OracleCustomer>> {
    const params: Record<string, string | boolean | undefined> = {};

    if (options?.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }

    // Build expand list
    const expands: string[] = [];
    if (options?.expand) {
      expands.push(...options.expand);
    }
    if (options?.includeAddresses && !expands.includes('addresses')) {
      expands.push('addresses');
    }
    if (options?.includeContacts && !expands.includes('contacts')) {
      expands.push('contacts');
    }
    if (expands.length > 0) {
      params.expand = expands.join(',');
    }

    const result = await this.restClient.getById<OracleCustomer>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      customerId,
      { params },
    );

    // Fetch related data separately if not expanded
    if (result.success && result.data) {
      if (options?.includeAddresses && !result.data.Addresses) {
        const addressesResult = await this.getAddresses(config, credentials, customerId);
        if (addressesResult.success && addressesResult.data?.items) {
          result.data.Addresses = addressesResult.data.items;
        }
      }

      if (options?.includeContacts && !result.data.Contacts) {
        const contactsResult = await this.getContacts(config, credentials, customerId);
        if (contactsResult.success && contactsResult.data?.items) {
          result.data.Contacts = contactsResult.data.items;
        }
      }
    }

    return result;
  }

  /**
   * Get customer by account number
   */
  async getByAccountNumber(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    accountNumber: string,
    options?: GetCustomerOptions,
  ): Promise<OracleConnectorResult<OracleCustomer | null>> {
    const result = await this.list(config, credentials, {
      limit: 1,
      includeAddresses: options?.includeAddresses,
      includeContacts: options?.includeContacts,
    });

    // Use finder or filter to search by account number
    const finderResult = await this.restClient.get<OracleCustomer>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      {
        params: {
          q: `CustomerAccountNumber='${accountNumber}'`,
          limit: 1,
        },
      },
    );

    if (!finderResult.success) {
      return {
        success: false,
        error: finderResult.error,
        metadata: finderResult.metadata,
      };
    }

    const customer = finderResult.data?.items?.[0] || null;

    return {
      success: true,
      data: customer,
      metadata: finderResult.metadata,
    };
  }

  /**
   * List customers
   */
  async list(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    options?: ListCustomersOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleCustomer>>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    const filters: string[] = [];

    // Build filters
    if (options?.status) {
      filters.push(`CustomerAccountStatus='${options.status}'`);
    }

    if (options?.customerType) {
      filters.push(`CustomerType='${options.customerType}'`);
    }

    if (options?.nameContains) {
      filters.push(`PartyName like '*${options.nameContains}*'`);
    }

    if (options?.customerClassCode) {
      filters.push(`CustomerClassCode='${options.customerClassCode}'`);
    }

    if (options?.salesPersonId) {
      filters.push(`SalesPersonId=${options.salesPersonId}`);
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

    // Expand related resources
    const expands: string[] = [];
    if (options?.includeAddresses) {
      expands.push('addresses');
    }
    if (options?.includeContacts) {
      expands.push('contacts');
    }
    if (expands.length > 0) {
      params.expand = expands.join(',');
    }

    params.totalResults = true;

    return this.restClient.get<OracleCustomer>(config, credentials, OracleApiPaths.CUSTOMERS, {
      params,
    });
  }

  /**
   * Update customer
   */
  async update(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
    data: Partial<OracleCreateCustomerInput>,
  ): Promise<OracleConnectorResult<OracleCustomer>> {
    this.logger.debug(`Updating customer ${customerId}`);

    const payload: Record<string, unknown> = {};

    if (data.name !== undefined) {
      payload.PartyName = data.name;
    }

    if (data.customerType !== undefined) {
      payload.CustomerType = data.customerType;
    }

    if (data.customerClassCode !== undefined) {
      payload.CustomerClassCode = data.customerClassCode;
    }

    if (data.taxpayerIdentificationNumber !== undefined) {
      payload.TaxpayerIdentificationNumber = data.taxpayerIdentificationNumber;
    }

    if (data.email !== undefined) {
      payload.PrimaryEmailAddress = data.email;
    }

    if (data.phone !== undefined) {
      payload.PrimaryPhoneNumber = data.phone;
    }

    if (data.url !== undefined) {
      payload.PrimaryURL = data.url;
    }

    if (data.currencyCode !== undefined) {
      payload.CurrencyCode = data.currencyCode;
    }

    if (data.paymentTermsCode !== undefined) {
      payload.PaymentTermsCode = data.paymentTermsCode;
    }

    if (data.creditLimit !== undefined) {
      payload.CreditLimit = data.creditLimit;
    }

    return this.restClient.patch<OracleCustomer>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      customerId,
      payload,
    );
  }

  /**
   * Get customer addresses
   */
  async getAddresses(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleAddress>>> {
    return this.restClient.getChild<OracleAddress>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      customerId,
      'addresses',
    );
  }

  /**
   * Add address to customer
   */
  async addAddress(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
    address: {
      address1: string;
      address2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      addressType?: string;
      isPrimary?: boolean;
    },
  ): Promise<OracleConnectorResult<OracleAddress>> {
    this.logger.debug(`Adding address to customer ${customerId}`);

    const payload: Record<string, unknown> = {
      Address1: address.address1,
      City: address.city,
      PostalCode: address.postalCode,
      Country: address.country,
    };

    if (address.address2) {
      payload.Address2 = address.address2;
    }

    if (address.state) {
      payload.State = address.state;
    }

    if (address.addressType) {
      payload.AddressType = address.addressType;
    }

    if (address.isPrimary !== undefined) {
      payload.IsPrimary = address.isPrimary;
    }

    return this.restClient.postChild<OracleAddress>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      customerId,
      'addresses',
      payload,
    );
  }

  /**
   * Get customer contacts
   */
  async getContacts(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleContact>>> {
    return this.restClient.getChild<OracleContact>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      customerId,
      'contacts',
    );
  }

  /**
   * Add contact to customer
   */
  async addContact(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    customerId: string | number,
    contact: CreateContactInput,
  ): Promise<OracleConnectorResult<OracleContact>> {
    this.logger.debug(`Adding contact to customer ${customerId}`);

    const payload: Record<string, unknown> = {
      FirstName: contact.firstName,
      LastName: contact.lastName,
    };

    if (contact.jobTitle) {
      payload.JobTitle = contact.jobTitle;
    }

    if (contact.email) {
      payload.EmailAddress = contact.email;
    }

    if (contact.phone) {
      payload.PhoneNumber = contact.phone;
    }

    if (contact.mobile) {
      payload.MobileNumber = contact.mobile;
    }

    if (contact.isPrimary !== undefined) {
      payload.IsPrimary = contact.isPrimary;
    }

    return this.restClient.postChild<OracleContact>(
      config,
      credentials,
      OracleApiPaths.CUSTOMERS,
      customerId,
      'contacts',
      payload,
    );
  }

  /**
   * Search customers by name
   */
  async search(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    searchTerm: string,
    limit: number = 25,
  ): Promise<OracleConnectorResult<OracleApiResponse<OracleCustomer>>> {
    return this.list(config, credentials, {
      nameContains: searchTerm,
      limit,
      status: 'A', // Active only
    });
  }

  // ==================== Private Methods ====================

  /**
   * Build create payload
   */
  private buildCreatePayload(input: OracleCreateCustomerInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      PartyName: input.name,
    };

    if (input.customerType) {
      payload.CustomerType = input.customerType;
    }

    if (input.customerClassCode) {
      payload.CustomerClassCode = input.customerClassCode;
    }

    if (input.taxpayerIdentificationNumber) {
      payload.TaxpayerIdentificationNumber = input.taxpayerIdentificationNumber;
    }

    if (input.email) {
      payload.PrimaryEmailAddress = input.email;
    }

    if (input.phone) {
      payload.PrimaryPhoneNumber = input.phone;
    }

    if (input.url) {
      payload.PrimaryURL = input.url;
    }

    if (input.currencyCode) {
      payload.CurrencyCode = input.currencyCode;
    }

    if (input.paymentTermsCode) {
      payload.PaymentTermsCode = input.paymentTermsCode;
    }

    if (input.creditLimit !== undefined) {
      payload.CreditLimit = input.creditLimit;
    }

    // Address as nested resource
    if (input.address) {
      payload.addresses = [
        {
          Address1: input.address.address1,
          Address2: input.address.address2,
          Address3: input.address.address3,
          City: input.address.city,
          State: input.address.state,
          PostalCode: input.address.postalCode,
          Country: input.address.country,
          IsPrimary: true,
        },
      ];
    }

    // Additional attributes
    if (input.additionalAttributes) {
      Object.assign(payload, input.additionalAttributes);
    }

    return payload;
  }
}
