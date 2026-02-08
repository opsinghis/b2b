import { Injectable, Logger } from '@nestjs/common';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsAccount,
  DynamicsContact,
  DynamicsODataResponse,
  DynamicsConnectorResult,
  DynamicsApiPaths,
  DynamicsCreateAccountInput,
  DynamicsEntityState,
  DynamicsQueryOptions,
} from '../interfaces';

export interface ListAccountsOptions {
  searchTerm?: string;
  industryCode?: number;
  stateCode?: DynamicsEntityState;
  parentAccountId?: string;
  top?: number;
  skip?: number;
  orderby?: string;
  includeContacts?: boolean;
}

export interface GetAccountOptions {
  includeContacts?: boolean;
  includePrimaryContact?: boolean;
}

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  jobTitle?: string;
  accountId?: string;
  address?: DynamicsCreateAccountInput['address'];
}

export interface ListContactsOptions {
  searchTerm?: string;
  accountId?: string;
  stateCode?: DynamicsEntityState;
  top?: number;
  skip?: number;
  orderby?: string;
}

/**
 * Dynamics 365 Account Service
 * Handles Account and Contact CRUD operations
 */
@Injectable()
export class DynamicsAccountService {
  private readonly logger = new Logger(DynamicsAccountService.name);

  constructor(private readonly webApiClient: DynamicsWebApiClientService) {}

  /**
   * Create a new account
   */
  async create(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    input: DynamicsCreateAccountInput,
  ): Promise<DynamicsConnectorResult<DynamicsAccount>> {
    this.logger.debug(`Creating account: ${input.name}`);

    const accountData = this.buildAccountPayload(input);

    return this.webApiClient.post<DynamicsAccount>(
      config,
      credentials,
      DynamicsApiPaths.ACCOUNTS,
      accountData,
    );
  }

  /**
   * Get account by ID
   */
  async getById(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    accountId: string,
    options?: GetAccountOptions,
  ): Promise<DynamicsConnectorResult<DynamicsAccount>> {
    this.logger.debug(`Getting account ${accountId}`);

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'accountid',
        'name',
        'accountnumber',
        'address1_line1',
        'address1_line2',
        'address1_city',
        'address1_stateorprovince',
        'address1_postalcode',
        'address1_country',
        'telephone1',
        'telephone2',
        'fax',
        'emailaddress1',
        'websiteurl',
        'industrycode',
        'revenue',
        'numberofemployees',
        'creditlimit',
        'creditonhold',
        'paymenttermscode',
        'statecode',
        'statuscode',
        'createdon',
        'modifiedon',
      ],
    };

    const expands: string[] = [];

    if (options?.includePrimaryContact) {
      expands.push(
        'primarycontactid($select=contactid,firstname,lastname,fullname,emailaddress1,telephone1)',
      );
    }

    if (options?.includeContacts) {
      expands.push(
        'contact_customer_accounts($select=contactid,firstname,lastname,fullname,emailaddress1,jobtitle)',
      );
    }

    if (expands.length > 0) {
      queryOptions.$expand = expands;
    }

    return this.webApiClient.getByKey<DynamicsAccount>(
      config,
      credentials,
      DynamicsApiPaths.ACCOUNTS,
      accountId,
      queryOptions,
    );
  }

  /**
   * List accounts
   */
  async list(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListAccountsOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsAccount[]>>> {
    this.logger.debug('Listing accounts');

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'accountid',
        'name',
        'accountnumber',
        'address1_city',
        'address1_country',
        'telephone1',
        'emailaddress1',
        'industrycode',
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
        `(contains(name,'${options.searchTerm}') or contains(accountnumber,'${options.searchTerm}') or contains(emailaddress1,'${options.searchTerm}'))`,
      );
    }

    if (options?.industryCode !== undefined) {
      filters.push(`industrycode eq ${options.industryCode}`);
    }

    if (options?.stateCode !== undefined) {
      filters.push(`statecode eq ${options.stateCode}`);
    }

    if (options?.parentAccountId) {
      filters.push(`_parentaccountid_value eq ${options.parentAccountId}`);
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    if (options?.includeContacts) {
      queryOptions.$expand = [
        'contact_customer_accounts($select=contactid,firstname,lastname,emailaddress1;$top=5)',
      ];
    }

    return this.webApiClient.get<DynamicsAccount>(
      config,
      credentials,
      DynamicsApiPaths.ACCOUNTS,
      queryOptions,
    );
  }

  /**
   * Update account
   */
  async update(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    accountId: string,
    data: Partial<DynamicsCreateAccountInput>,
    etag?: string,
  ): Promise<DynamicsConnectorResult<DynamicsAccount>> {
    this.logger.debug(`Updating account ${accountId}`);

    const updateData: Record<string, unknown> = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.accountNumber) {
      updateData.accountnumber = data.accountNumber;
    }

    if (data.telephone) {
      updateData.telephone1 = data.telephone;
    }

    if (data.email) {
      updateData.emailaddress1 = data.email;
    }

    if (data.website) {
      updateData.websiteurl = data.website;
    }

    if (data.industryCode !== undefined) {
      updateData.industrycode = data.industryCode;
    }

    if (data.creditLimit !== undefined) {
      updateData.creditlimit = data.creditLimit;
    }

    if (data.paymentTermsCode !== undefined) {
      updateData.paymenttermscode = data.paymentTermsCode;
    }

    if (data.primaryContactId) {
      updateData['primarycontactid@odata.bind'] = `/contacts(${data.primaryContactId})`;
    }

    if (data.parentAccountId) {
      updateData['parentaccountid@odata.bind'] = `/accounts(${data.parentAccountId})`;
    }

    if (data.currencyId) {
      updateData['transactioncurrencyid@odata.bind'] = `/transactioncurrencies(${data.currencyId})`;
    }

    if (data.address) {
      updateData.address1_line1 = data.address.line1;
      if (data.address.line2) {
        updateData.address1_line2 = data.address.line2;
      }
      updateData.address1_city = data.address.city;
      updateData.address1_stateorprovince = data.address.stateOrProvince;
      updateData.address1_postalcode = data.address.postalCode;
      updateData.address1_country = data.address.country;
    }

    return this.webApiClient.patch<DynamicsAccount>(
      config,
      credentials,
      DynamicsApiPaths.ACCOUNTS,
      accountId,
      updateData,
      etag,
    );
  }

  /**
   * Deactivate account
   */
  async deactivate(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    accountId: string,
  ): Promise<DynamicsConnectorResult<void>> {
    this.logger.debug(`Deactivating account ${accountId}`);

    return this.webApiClient.patch<void>(
      config,
      credentials,
      DynamicsApiPaths.ACCOUNTS,
      accountId,
      {
        statecode: DynamicsEntityState.INACTIVE,
        statuscode: 2, // Inactive status
      },
    );
  }

  /**
   * Activate account
   */
  async activate(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    accountId: string,
  ): Promise<DynamicsConnectorResult<void>> {
    this.logger.debug(`Activating account ${accountId}`);

    return this.webApiClient.patch<void>(
      config,
      credentials,
      DynamicsApiPaths.ACCOUNTS,
      accountId,
      {
        statecode: DynamicsEntityState.ACTIVE,
        statuscode: 1, // Active status
      },
    );
  }

  /**
   * Delete account
   */
  async delete(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    accountId: string,
  ): Promise<DynamicsConnectorResult<void>> {
    this.logger.debug(`Deleting account ${accountId}`);

    return this.webApiClient.delete(config, credentials, DynamicsApiPaths.ACCOUNTS, accountId);
  }

  // ==================== Contact Methods ====================

  /**
   * Create a new contact
   */
  async createContact(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    input: CreateContactInput,
  ): Promise<DynamicsConnectorResult<DynamicsContact>> {
    this.logger.debug(`Creating contact: ${input.firstName} ${input.lastName}`);

    const contactData: Record<string, unknown> = {
      firstname: input.firstName,
      lastname: input.lastName,
    };

    if (input.email) {
      contactData.emailaddress1 = input.email;
    }

    if (input.telephone) {
      contactData.telephone1 = input.telephone;
    }

    if (input.mobile) {
      contactData.mobilephone = input.mobile;
    }

    if (input.jobTitle) {
      contactData.jobtitle = input.jobTitle;
    }

    if (input.accountId) {
      contactData['parentcustomerid_account@odata.bind'] = `/accounts(${input.accountId})`;
    }

    if (input.address) {
      contactData.address1_line1 = input.address.line1;
      if (input.address.line2) {
        contactData.address1_line2 = input.address.line2;
      }
      contactData.address1_city = input.address.city;
      contactData.address1_stateorprovince = input.address.stateOrProvince;
      contactData.address1_postalcode = input.address.postalCode;
      contactData.address1_country = input.address.country;
    }

    return this.webApiClient.post<DynamicsContact>(
      config,
      credentials,
      DynamicsApiPaths.CONTACTS,
      contactData,
    );
  }

  /**
   * Get contact by ID
   */
  async getContactById(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    contactId: string,
  ): Promise<DynamicsConnectorResult<DynamicsContact>> {
    this.logger.debug(`Getting contact ${contactId}`);

    return this.webApiClient.getByKey<DynamicsContact>(
      config,
      credentials,
      DynamicsApiPaths.CONTACTS,
      contactId,
      {
        $select: [
          'contactid',
          'firstname',
          'lastname',
          'fullname',
          'jobtitle',
          'address1_line1',
          'address1_city',
          'address1_stateorprovince',
          'address1_postalcode',
          'address1_country',
          'telephone1',
          'mobilephone',
          'emailaddress1',
          'statecode',
          'statuscode',
          'createdon',
          'modifiedon',
        ],
      },
    );
  }

  /**
   * List contacts
   */
  async listContacts(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: ListContactsOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<DynamicsContact[]>>> {
    this.logger.debug('Listing contacts');

    const queryOptions: DynamicsQueryOptions = {
      $select: [
        'contactid',
        'firstname',
        'lastname',
        'fullname',
        'jobtitle',
        'emailaddress1',
        'telephone1',
        'statecode',
        'createdon',
      ],
      $top: options?.top || 100,
      $skip: options?.skip,
      $count: true,
      $orderby: options?.orderby || 'lastname asc',
    };

    // Build filter
    const filters: string[] = [];

    if (options?.searchTerm) {
      filters.push(
        `(contains(fullname,'${options.searchTerm}') or contains(emailaddress1,'${options.searchTerm}'))`,
      );
    }

    if (options?.accountId) {
      filters.push(`_parentcustomerid_value eq ${options.accountId}`);
    }

    if (options?.stateCode !== undefined) {
      filters.push(`statecode eq ${options.stateCode}`);
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    return this.webApiClient.get<DynamicsContact>(
      config,
      credentials,
      DynamicsApiPaths.CONTACTS,
      queryOptions,
    );
  }

  /**
   * Update contact
   */
  async updateContact(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    contactId: string,
    data: Partial<CreateContactInput>,
    etag?: string,
  ): Promise<DynamicsConnectorResult<DynamicsContact>> {
    this.logger.debug(`Updating contact ${contactId}`);

    const updateData: Record<string, unknown> = {};

    if (data.firstName) {
      updateData.firstname = data.firstName;
    }

    if (data.lastName) {
      updateData.lastname = data.lastName;
    }

    if (data.email) {
      updateData.emailaddress1 = data.email;
    }

    if (data.telephone) {
      updateData.telephone1 = data.telephone;
    }

    if (data.mobile) {
      updateData.mobilephone = data.mobile;
    }

    if (data.jobTitle) {
      updateData.jobtitle = data.jobTitle;
    }

    if (data.accountId) {
      updateData['parentcustomerid_account@odata.bind'] = `/accounts(${data.accountId})`;
    }

    if (data.address) {
      updateData.address1_line1 = data.address.line1;
      updateData.address1_city = data.address.city;
      updateData.address1_stateorprovince = data.address.stateOrProvince;
      updateData.address1_postalcode = data.address.postalCode;
      updateData.address1_country = data.address.country;
    }

    return this.webApiClient.patch<DynamicsContact>(
      config,
      credentials,
      DynamicsApiPaths.CONTACTS,
      contactId,
      updateData,
      etag,
    );
  }

  /**
   * Build account payload for create
   */
  private buildAccountPayload(input: DynamicsCreateAccountInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: input.name,
    };

    if (input.accountNumber) {
      payload.accountnumber = input.accountNumber;
    }

    if (input.telephone) {
      payload.telephone1 = input.telephone;
    }

    if (input.email) {
      payload.emailaddress1 = input.email;
    }

    if (input.website) {
      payload.websiteurl = input.website;
    }

    if (input.industryCode !== undefined) {
      payload.industrycode = input.industryCode;
    }

    if (input.creditLimit !== undefined) {
      payload.creditlimit = input.creditLimit;
    }

    if (input.paymentTermsCode !== undefined) {
      payload.paymenttermscode = input.paymentTermsCode;
    }

    if (input.primaryContactId) {
      payload['primarycontactid@odata.bind'] = `/contacts(${input.primaryContactId})`;
    }

    if (input.parentAccountId) {
      payload['parentaccountid@odata.bind'] = `/accounts(${input.parentAccountId})`;
    }

    if (input.currencyId) {
      payload['transactioncurrencyid@odata.bind'] = `/transactioncurrencies(${input.currencyId})`;
    }

    if (input.address) {
      payload.address1_line1 = input.address.line1;
      if (input.address.line2) {
        payload.address1_line2 = input.address.line2;
      }
      payload.address1_city = input.address.city;
      payload.address1_stateorprovince = input.address.stateOrProvince;
      payload.address1_postalcode = input.address.postalCode;
      payload.address1_country = input.address.country;
    }

    return payload;
  }
}
