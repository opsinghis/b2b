import { Injectable, Logger } from '@nestjs/common';
import {
  SapConnectionConfig,
  SapCredentials,
  SapODataQueryOptions,
  SapODataServicePaths,
  SapBusinessPartner,
  SapCustomer,
  SapCreateBusinessPartnerInput,
  SapConnectorResult,
  SapODataResponse,
} from '../interfaces';
import { SapODataClientService } from './sap-odata-client.service';

/**
 * Business Partner Category
 */
export enum SapBusinessPartnerCategory {
  ORGANIZATION = '2',
  PERSON = '1',
  GROUP = '3',
}

/**
 * SAP Business Partner Service
 * Handles CRUD operations for SAP Business Partners and Customers
 */
@Injectable()
export class SapBusinessPartnerService {
  private readonly logger = new Logger(SapBusinessPartnerService.name);
  private readonly bpServicePath = SapODataServicePaths.BUSINESS_PARTNER;
  private readonly bpEntitySet = 'A_BusinessPartner';
  private readonly customerServicePath = SapODataServicePaths.CUSTOMER;
  private readonly customerEntitySet = 'A_Customer';

  constructor(private readonly odataClient: SapODataClientService) {}

  /**
   * Get business partner by ID
   */
  async getById(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    businessPartnerId: string,
    options?: {
      includeAddresses?: boolean;
      includeCustomer?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapBusinessPartner>> {
    this.logger.log(`Getting business partner: ${businessPartnerId}`);

    const queryOptions: Pick<SapODataQueryOptions, '$select' | '$expand'> = {};

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    const expand: string[] = [];
    if (options?.includeAddresses) {
      expand.push('to_BusinessPartnerAddress');
    }
    if (options?.includeCustomer) {
      expand.push('to_Customer');
    }
    if (expand.length > 0) {
      queryOptions.$expand = expand;
    }

    return await this.odataClient.getByKey<SapBusinessPartner>(
      config,
      credentials,
      this.bpServicePath,
      this.bpEntitySet,
      businessPartnerId,
      queryOptions,
    );
  }

  /**
   * List business partners with filters
   */
  async list(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    options?: {
      category?: SapBusinessPartnerCategory;
      searchTerm?: string;
      country?: string;
      isCustomer?: boolean;
      top?: number;
      skip?: number;
      orderBy?: string;
      includeAddresses?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapBusinessPartner[]>>> {
    this.logger.log('Listing business partners');

    const queryOptions: SapODataQueryOptions = {
      $count: true,
    };

    // Build filter
    const filters: string[] = [];

    if (options?.category) {
      filters.push(`BusinessPartnerCategory eq '${options.category}'`);
    }

    if (options?.searchTerm) {
      filters.push(
        `(contains(BusinessPartnerFullName,'${options.searchTerm}') or ` +
          `contains(OrganizationBPName1,'${options.searchTerm}') or ` +
          `contains(FirstName,'${options.searchTerm}') or ` +
          `contains(LastName,'${options.searchTerm}'))`,
      );
    }

    if (options?.isCustomer) {
      filters.push(`Customer ne ''`);
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    if (options?.includeAddresses) {
      queryOptions.$expand = ['to_BusinessPartnerAddress'];
    }

    if (options?.top) {
      queryOptions.$top = options.top;
    }

    if (options?.skip) {
      queryOptions.$skip = options.skip;
    }

    if (options?.orderBy) {
      queryOptions.$orderby = options.orderBy;
    }

    return await this.odataClient.get<SapBusinessPartner[]>(
      config,
      credentials,
      this.bpServicePath,
      this.bpEntitySet,
      queryOptions,
    );
  }

  /**
   * Create business partner
   */
  async create(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    input: SapCreateBusinessPartnerInput,
  ): Promise<SapConnectorResult<SapBusinessPartner>> {
    this.logger.log('Creating business partner');

    const bpData = this.mapCreateInputToSapFormat(input);

    return await this.odataClient.post<SapBusinessPartner>(
      config,
      credentials,
      this.bpServicePath,
      this.bpEntitySet,
      bpData,
    );
  }

  /**
   * Update business partner
   */
  async update(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    businessPartnerId: string,
    updates: Partial<{
      organizationName1: string;
      organizationName2: string;
      firstName: string;
      lastName: string;
      language: string;
    }>,
    etag?: string,
  ): Promise<SapConnectorResult<SapBusinessPartner>> {
    this.logger.log(`Updating business partner: ${businessPartnerId}`);

    const updateData: Record<string, unknown> = {};

    if (updates.organizationName1 !== undefined) {
      updateData.OrganizationBPName1 = updates.organizationName1;
    }
    if (updates.organizationName2 !== undefined) {
      updateData.OrganizationBPName2 = updates.organizationName2;
    }
    if (updates.firstName !== undefined) {
      updateData.FirstName = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      updateData.LastName = updates.lastName;
    }
    if (updates.language !== undefined) {
      updateData.Language = updates.language;
    }

    return await this.odataClient.patch<SapBusinessPartner>(
      config,
      credentials,
      this.bpServicePath,
      this.bpEntitySet,
      businessPartnerId,
      updateData,
      etag,
    );
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    customerId: string,
    options?: {
      includeSalesAreas?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapCustomer>> {
    this.logger.log(`Getting customer: ${customerId}`);

    const queryOptions: Pick<SapODataQueryOptions, '$select' | '$expand'> = {};

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    if (options?.includeSalesAreas) {
      queryOptions.$expand = ['to_CustomerSalesArea'];
    }

    return await this.odataClient.getByKey<SapCustomer>(
      config,
      credentials,
      this.customerServicePath,
      this.customerEntitySet,
      customerId,
      queryOptions,
    );
  }

  /**
   * List customers with filters
   */
  async listCustomers(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    options?: {
      accountGroup?: string;
      searchTerm?: string;
      country?: string;
      top?: number;
      skip?: number;
      orderBy?: string;
      includeSalesAreas?: boolean;
      select?: string[];
    },
  ): Promise<SapConnectorResult<SapODataResponse<SapCustomer[]>>> {
    this.logger.log('Listing customers');

    const queryOptions: SapODataQueryOptions = {
      $count: true,
    };

    // Build filter
    const filters: string[] = [];

    if (options?.accountGroup) {
      filters.push(`CustomerAccountGroup eq '${options.accountGroup}'`);
    }

    if (options?.searchTerm) {
      filters.push(
        `(contains(CustomerName,'${options.searchTerm}') or ` +
          `contains(CustomerFullName,'${options.searchTerm}'))`,
      );
    }

    if (filters.length > 0) {
      queryOptions.$filter = filters.join(' and ');
    }

    if (options?.select) {
      queryOptions.$select = options.select;
    }

    if (options?.includeSalesAreas) {
      queryOptions.$expand = ['to_CustomerSalesArea'];
    }

    if (options?.top) {
      queryOptions.$top = options.top;
    }

    if (options?.skip) {
      queryOptions.$skip = options.skip;
    }

    if (options?.orderBy) {
      queryOptions.$orderby = options.orderBy;
    }

    return await this.odataClient.get<SapCustomer[]>(
      config,
      credentials,
      this.customerServicePath,
      this.customerEntitySet,
      queryOptions,
    );
  }

  /**
   * Search business partners by VAT number
   */
  async searchByVat(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    vatNumber: string,
  ): Promise<SapConnectorResult<SapODataResponse<SapBusinessPartner[]>>> {
    this.logger.log(`Searching business partners by VAT: ${vatNumber}`);

    const queryOptions: SapODataQueryOptions = {
      $filter: `VATRegistration eq '${vatNumber}'`,
      $expand: ['to_BusinessPartnerAddress'],
    };

    return await this.odataClient.get<SapBusinessPartner[]>(
      config,
      credentials,
      this.bpServicePath,
      this.bpEntitySet,
      queryOptions,
    );
  }

  /**
   * Search business partners by tax number
   */
  async searchByTaxNumber(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    taxNumber: string,
    taxNumberType: '1' | '2' = '1',
  ): Promise<SapConnectorResult<SapODataResponse<SapBusinessPartner[]>>> {
    this.logger.log(`Searching business partners by tax number: ${taxNumber}`);

    const field = taxNumberType === '1' ? 'TaxNumber1' : 'TaxNumber2';
    const queryOptions: SapODataQueryOptions = {
      $filter: `${field} eq '${taxNumber}'`,
      $expand: ['to_BusinessPartnerAddress'],
    };

    return await this.odataClient.get<SapBusinessPartner[]>(
      config,
      credentials,
      this.bpServicePath,
      this.bpEntitySet,
      queryOptions,
    );
  }

  /**
   * Get customer credit info
   */
  async getCustomerCreditInfo(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    customerId: string,
  ): Promise<
    SapConnectorResult<{
      customer: string;
      creditLimit: number;
      currency: string;
      paymentTerms: string;
    }>
  > {
    this.logger.log(`Getting credit info for customer: ${customerId}`);

    const result = await this.odataClient.getByKey<SapCustomer>(
      config,
      credentials,
      this.customerServicePath,
      this.customerEntitySet,
      customerId,
      {
        $select: ['Customer', 'CreditLimit', 'Currency', 'PaymentTerms'],
      },
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const customer = result.data;

    return {
      success: true,
      data: {
        customer: customer.Customer || customerId,
        creditLimit: parseFloat(customer.CreditLimit || '0'),
        currency: customer.Currency || '',
        paymentTerms: customer.PaymentTerms || '',
      },
      metadata: result.metadata,
    };
  }

  /**
   * Map create input to SAP format
   */
  private mapCreateInputToSapFormat(input: SapCreateBusinessPartnerInput): Record<string, unknown> {
    const bp: Record<string, unknown> = {
      BusinessPartnerCategory: input.businessPartnerCategory,
    };

    if (input.firstName) {
      bp.FirstName = input.firstName;
    }
    if (input.lastName) {
      bp.LastName = input.lastName;
    }
    if (input.organizationName1) {
      bp.OrganizationBPName1 = input.organizationName1;
    }
    if (input.organizationName2) {
      bp.OrganizationBPName2 = input.organizationName2;
    }
    if (input.language) {
      bp.Language = input.language;
    }
    if (input.taxNumber1) {
      bp.TaxNumber1 = input.taxNumber1;
    }
    if (input.vatRegistration) {
      bp.VATRegistration = input.vatRegistration;
    }

    // Add addresses
    if (input.addresses?.length) {
      bp.to_BusinessPartnerAddress = input.addresses.map((addr) => ({
        StreetName: addr.streetName,
        HouseNumber: addr.houseNumber || '',
        PostalCode: addr.postalCode,
        CityName: addr.cityName,
        Region: addr.region || '',
        Country: addr.country,
        PhoneNumber: addr.phoneNumber || '',
        EmailAddress: addr.emailAddress || '',
      }));
    }

    return bp;
  }
}
