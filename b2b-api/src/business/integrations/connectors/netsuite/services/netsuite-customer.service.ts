import { Logger } from '@nestjs/common';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import {
  NetSuiteCustomer,
  NetSuiteApiResponse,
  NetSuiteCreateCustomerInput,
  NetSuitePaginationOptions,
} from '../interfaces';

/**
 * NetSuite Customer Service
 * Handles customer operations through NetSuite REST API
 */
export class NetSuiteCustomerService {
  private readonly logger = new Logger(NetSuiteCustomerService.name);
  private readonly recordType = 'customer';

  constructor(private readonly restClient: NetSuiteRestClientService) {}

  /**
   * Create a new customer
   */
  async create(input: NetSuiteCreateCustomerInput): Promise<NetSuiteCustomer> {
    this.logger.debug('Creating NetSuite customer', {
      companyName: input.companyName,
      email: input.email,
    });

    const customerData = this.mapInputToNetSuiteFormat(input);

    const response = await this.restClient.post<NetSuiteCustomer>(this.recordType, customerData);

    const createdCustomer = response.data || (response as unknown as NetSuiteCustomer);

    this.logger.debug('Customer created', { customerId: createdCustomer.id });

    return createdCustomer;
  }

  /**
   * Get customer by ID
   */
  async getById(id: string): Promise<NetSuiteCustomer> {
    this.logger.debug('Getting NetSuite customer', { id });

    const response = await this.restClient.get<NetSuiteCustomer>(`${this.recordType}/${id}`, {
      expandSubResources: 'true',
    });

    return response.data || (response as unknown as NetSuiteCustomer);
  }

  /**
   * Get customer by external ID
   */
  async getByExternalId(externalId: string): Promise<NetSuiteCustomer | null> {
    this.logger.debug('Getting NetSuite customer by external ID', { externalId });

    try {
      const query = `
        SELECT id, entityid, companyname, email, phone, isinactive
        FROM customer
        WHERE custentity_external_id = '${this.escapeSql(externalId)}'
      `;

      const response = await this.restClient.executeSuiteQL<{ id: string }>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        return this.getById(response.items[0].id);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find customer by external ID', {
        externalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get customer by email
   */
  async getByEmail(email: string): Promise<NetSuiteCustomer | null> {
    this.logger.debug('Getting NetSuite customer by email', { email });

    try {
      const query = `
        SELECT id, entityid, companyname, email, phone, isinactive
        FROM customer
        WHERE LOWER(email) = LOWER('${this.escapeSql(email)}')
      `;

      const response = await this.restClient.executeSuiteQL<{ id: string }>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        return this.getById(response.items[0].id);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find customer by email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Update customer
   */
  async update(id: string, data: Partial<NetSuiteCreateCustomerInput>): Promise<NetSuiteCustomer> {
    this.logger.debug('Updating NetSuite customer', { id });

    const updateData = this.mapPartialInputToNetSuiteFormat(data);

    const response = await this.restClient.patch<NetSuiteCustomer>(
      `${this.recordType}/${id}`,
      updateData,
    );

    return response.data || (response as unknown as NetSuiteCustomer);
  }

  /**
   * List customers with optional filters
   */
  async list(
    filters?: {
      subsidiary?: string;
      category?: string;
      includeInactive?: boolean;
      searchTerm?: string;
      externalIdPrefix?: string;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteCustomer>> {
    this.logger.debug('Listing NetSuite customers', { filters, pagination });

    let query = `
      SELECT id, entityid, companyname, firstname, lastname, email, phone,
             subsidiary, balance, creditlimit, isinactive, custentity_external_id
      FROM customer
      WHERE 1=1
    `;

    if (!filters?.includeInactive) {
      query += " AND isinactive = 'F'";
    }

    if (filters?.subsidiary) {
      query += ` AND subsidiary = ${filters.subsidiary}`;
    }

    if (filters?.category) {
      query += ` AND category = ${filters.category}`;
    }

    if (filters?.searchTerm) {
      const term = this.escapeSql(filters.searchTerm);
      query += ` AND (
        LOWER(companyname) LIKE LOWER('%${term}%')
        OR LOWER(email) LIKE LOWER('%${term}%')
        OR LOWER(entityid) LIKE LOWER('%${term}%')
      )`;
    }

    if (filters?.externalIdPrefix) {
      query += ` AND custentity_external_id LIKE '${this.escapeSql(filters.externalIdPrefix)}%'`;
    }

    query += ' ORDER BY companyname, entityid';

    return this.restClient.executeSuiteQL<NetSuiteCustomer>(query, pagination);
  }

  /**
   * Get customers modified since a specific date
   */
  async getModifiedSince(
    sinceDate: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteCustomer>> {
    this.logger.debug('Getting customers modified since', { sinceDate });

    const query = `
      SELECT id, entityid, companyname, firstname, lastname, email, phone,
             subsidiary, balance, creditlimit, isinactive, custentity_external_id,
             lastmodifieddate
      FROM customer
      WHERE lastmodifieddate >= TO_DATE('${sinceDate}', 'YYYY-MM-DD"T"HH24:MI:SS')
      ORDER BY lastmodifieddate DESC
    `;

    return this.restClient.executeSuiteQL<NetSuiteCustomer>(query, pagination);
  }

  /**
   * Get customer balance and credit info
   */
  async getBalanceInfo(id: string): Promise<{
    id: string;
    balance: number;
    overdueBalance: number;
    creditLimit: number;
    unbilledOrders: number;
    availableCredit: number;
  }> {
    this.logger.debug('Getting customer balance info', { id });

    const response = await this.restClient.get<NetSuiteCustomer>(`${this.recordType}/${id}`, {
      fields: 'id,balance,overdueBalance,creditLimit,unbilledOrders',
    });

    const customer = response.data || (response as unknown as NetSuiteCustomer);
    const balance = customer.balance || 0;
    const creditLimit = customer.creditLimit || 0;

    return {
      id: customer.id || id,
      balance,
      overdueBalance: customer.overdueBalance || 0,
      creditLimit,
      unbilledOrders: customer.unbilledOrders || 0,
      availableCredit: Math.max(0, creditLimit - balance),
    };
  }

  /**
   * Search customers
   */
  async search(
    searchTerm: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteCustomer>> {
    return this.list({ searchTerm, includeInactive: false }, pagination);
  }

  /**
   * Map input to NetSuite customer format
   */
  private mapInputToNetSuiteFormat(input: NetSuiteCreateCustomerInput): Record<string, unknown> {
    const customer: Record<string, unknown> = {};

    if (input.isPerson !== undefined) {
      customer.isPerson = input.isPerson;
    }

    if (input.companyName) {
      customer.companyName = input.companyName;
    }

    if (input.firstName) {
      customer.firstName = input.firstName;
    }

    if (input.lastName) {
      customer.lastName = input.lastName;
    }

    if (input.email) {
      customer.email = input.email;
    }

    if (input.phone) {
      customer.phone = input.phone;
    }

    if (input.externalId) {
      customer.custentity_external_id = input.externalId;
      customer.custentity_b2b_org_id = input.externalId;
    }

    if (input.subsidiary) {
      customer.subsidiary = { id: input.subsidiary };
    }

    if (input.currency) {
      customer.currency = { id: input.currency };
    }

    if (input.terms) {
      customer.terms = { id: input.terms };
    }

    if (input.priceLevel) {
      customer.priceLevel = { id: input.priceLevel };
    }

    if (input.creditLimit !== undefined) {
      customer.creditLimit = input.creditLimit;
    }

    // Map addresses
    if (input.addresses && input.addresses.length > 0) {
      customer.addressbook = {
        items: input.addresses.map((addr) => ({
          label: addr.label,
          defaultShipping: addr.defaultShipping || false,
          defaultBilling: addr.defaultBilling || false,
          addressBookAddress: {
            addr1: addr.addr1,
            addr2: addr.addr2,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
            country: addr.country ? { id: addr.country } : undefined,
          },
        })),
      };
    }

    // Add custom fields
    if (input.customFields) {
      Object.entries(input.customFields).forEach(([key, value]) => {
        customer[key] = value;
      });
    }

    return customer;
  }

  /**
   * Map partial input for updates
   */
  private mapPartialInputToNetSuiteFormat(
    data: Partial<NetSuiteCreateCustomerInput>,
  ): Record<string, unknown> {
    const update: Record<string, unknown> = {};

    if (data.companyName !== undefined) {
      update.companyName = data.companyName;
    }

    if (data.firstName !== undefined) {
      update.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      update.lastName = data.lastName;
    }

    if (data.email !== undefined) {
      update.email = data.email;
    }

    if (data.phone !== undefined) {
      update.phone = data.phone;
    }

    if (data.creditLimit !== undefined) {
      update.creditLimit = data.creditLimit;
    }

    if (data.terms) {
      update.terms = { id: data.terms };
    }

    if (data.priceLevel) {
      update.priceLevel = { id: data.priceLevel };
    }

    if (data.customFields) {
      Object.entries(data.customFields).forEach(([key, value]) => {
        update[key] = value;
      });
    }

    return update;
  }

  /**
   * Escape SQL string for SuiteQL
   */
  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }
}
