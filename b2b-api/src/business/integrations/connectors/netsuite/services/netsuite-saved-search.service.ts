import { Logger } from '@nestjs/common';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import {
  NetSuiteSavedSearch,
  NetSuiteSavedSearchResult,
  NetSuiteSearchParams,
  NetSuitePaginationOptions,
  NetSuiteApiResponse,
} from '../interfaces';

/**
 * NetSuite Saved Search Service
 * Handles saved search operations through NetSuite REST API and SuiteQL
 */
export class NetSuiteSavedSearchService {
  private readonly logger = new Logger(NetSuiteSavedSearchService.name);

  constructor(private readonly restClient: NetSuiteRestClientService) {}

  /**
   * Execute a saved search by ID
   */
  async executeSavedSearch(
    searchId: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteSavedSearchResult> {
    this.logger.debug('Executing saved search', { searchId });

    // Use SuiteQL to execute the saved search
    const query = `
      SELECT *
      FROM SAVEDSEARCH('${this.escapeSql(searchId)}')
    `;

    const response = await this.restClient.executeSuiteQL(query, {
      offset: pagination?.offset,
      limit: pagination?.limit || 100,
    });

    return {
      totalResults: response.totalResults || response.items?.length || 0,
      pageIndex: pagination?.offset ? Math.floor(pagination.offset / (pagination.limit || 100)) : 0,
      pageSize: pagination?.limit || 100,
      results: (response.items as Record<string, unknown>[]) || [],
    };
  }

  /**
   * Execute a custom SuiteQL query
   */
  async executeQuery(
    query: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteSavedSearchResult> {
    this.logger.debug('Executing custom query', {
      queryLength: query.length,
      pagination,
    });

    const response = await this.restClient.executeSuiteQL(query, {
      offset: pagination?.offset,
      limit: pagination?.limit || 100,
    });

    return {
      totalResults: response.totalResults || response.items?.length || 0,
      pageIndex: pagination?.offset ? Math.floor(pagination.offset / (pagination.limit || 100)) : 0,
      pageSize: pagination?.limit || 100,
      results: (response.items as Record<string, unknown>[]) || [],
    };
  }

  /**
   * Build and execute a dynamic search
   */
  async search(params: NetSuiteSearchParams): Promise<NetSuiteSavedSearchResult> {
    this.logger.debug('Building dynamic search', { params });

    // If a saved search ID is provided, use it
    if (params.searchId) {
      return this.executeSavedSearch(params.searchId, {
        offset: (params.pageIndex || 0) * (params.pageSize || 100),
        limit: params.pageSize,
      });
    }

    // Build a dynamic query
    if (!params.recordType) {
      throw new Error('Either searchId or recordType must be provided');
    }

    const columns = params.columns && params.columns.length > 0 ? params.columns.join(', ') : '*';

    let query = `SELECT ${columns} FROM ${params.recordType}`;

    // Add filters
    if (params.filters && params.filters.length > 0) {
      const whereClause = this.buildWhereClause(params.filters);
      query += ` WHERE ${whereClause}`;
    }

    const response = await this.restClient.executeSuiteQL(query, {
      offset: (params.pageIndex || 0) * (params.pageSize || 100),
      limit: params.pageSize || 100,
    });

    return {
      totalResults: response.totalResults || response.items?.length || 0,
      pageIndex: params.pageIndex || 0,
      pageSize: params.pageSize || 100,
      results: (response.items as Record<string, unknown>[]) || [],
    };
  }

  /**
   * List available saved searches
   */
  async listSavedSearches(
    recordType?: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteSavedSearch>> {
    this.logger.debug('Listing saved searches', { recordType });

    let query = `
      SELECT
        id,
        title,
        recordtype,
        description,
        ispublic
      FROM savedsearch
      WHERE 1=1
    `;

    if (recordType) {
      query += ` AND recordtype = '${this.escapeSql(recordType)}'`;
    }

    query += ' ORDER BY title';

    return this.restClient.executeSuiteQL<NetSuiteSavedSearch>(query, pagination);
  }

  /**
   * Get saved search details
   */
  async getSavedSearch(searchId: string): Promise<NetSuiteSavedSearch | null> {
    this.logger.debug('Getting saved search details', { searchId });

    const query = `
      SELECT
        id,
        title,
        recordtype,
        description,
        ispublic,
        isdefault
      FROM savedsearch
      WHERE id = ${searchId}
    `;

    const response = await this.restClient.executeSuiteQL<NetSuiteSavedSearch>(query, {
      limit: 1,
    });

    if (response.items && response.items.length > 0) {
      return response.items[0];
    }

    return null;
  }

  /**
   * Execute common record type searches
   */
  async searchRecords(
    recordType: string,
    filters?: Record<string, string | number | boolean>,
    options?: {
      columns?: string[];
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteSavedSearchResult> {
    this.logger.debug('Searching records', { recordType, filters });

    const columns = options?.columns?.join(', ') || '*';
    let query = `SELECT ${columns} FROM ${recordType}`;

    // Build WHERE clause
    if (filters && Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters).map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key} = '${this.escapeSql(value)}'`;
        } else if (typeof value === 'boolean') {
          return `${key} = '${value ? 'T' : 'F'}'`;
        } else {
          return `${key} = ${value}`;
        }
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    const response = await this.restClient.executeSuiteQL(query, pagination);

    return {
      totalResults: response.totalResults || response.items?.length || 0,
      pageIndex: pagination?.offset ? Math.floor(pagination.offset / (pagination.limit || 100)) : 0,
      pageSize: pagination?.limit || 100,
      results: (response.items as Record<string, unknown>[]) || [],
    };
  }

  /**
   * Execute a transaction search
   */
  async searchTransactions(
    transactionType?: string,
    filters?: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      customerId?: string;
      minAmount?: number;
      maxAmount?: number;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteSavedSearchResult> {
    this.logger.debug('Searching transactions', { transactionType, filters });

    let query = `
      SELECT id, tranid, trandate, type, status, entity, total, memo
      FROM transaction
      WHERE 1=1
    `;

    if (transactionType) {
      query += ` AND type = '${this.escapeSql(transactionType)}'`;
    }

    if (filters?.status) {
      query += ` AND status = '${this.escapeSql(filters.status)}'`;
    }

    if (filters?.fromDate) {
      query += ` AND trandate >= TO_DATE('${filters.fromDate}', 'YYYY-MM-DD')`;
    }

    if (filters?.toDate) {
      query += ` AND trandate <= TO_DATE('${filters.toDate}', 'YYYY-MM-DD')`;
    }

    if (filters?.customerId) {
      query += ` AND entity = ${filters.customerId}`;
    }

    if (filters?.minAmount !== undefined) {
      query += ` AND total >= ${filters.minAmount}`;
    }

    if (filters?.maxAmount !== undefined) {
      query += ` AND total <= ${filters.maxAmount}`;
    }

    query += ' ORDER BY trandate DESC, id DESC';

    const response = await this.restClient.executeSuiteQL(query, pagination);

    return {
      totalResults: response.totalResults || response.items?.length || 0,
      pageIndex: pagination?.offset ? Math.floor(pagination.offset / (pagination.limit || 100)) : 0,
      pageSize: pagination?.limit || 100,
      results: (response.items as Record<string, unknown>[]) || [],
    };
  }

  /**
   * Execute an item/product search
   */
  async searchItems(
    filters?: {
      itemType?: string;
      searchTerm?: string;
      includeInactive?: boolean;
      hasInventory?: boolean;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteSavedSearchResult> {
    this.logger.debug('Searching items', { filters });

    let query = `
      SELECT id, itemid, displayname, salesdescription, itemtype,
             baseprice, cost, quantityonhand, quantityavailable, isinactive
      FROM item
      WHERE 1=1
    `;

    if (!filters?.includeInactive) {
      query += " AND isinactive = 'F'";
    }

    if (filters?.itemType) {
      query += ` AND itemtype = '${this.escapeSql(filters.itemType)}'`;
    }

    if (filters?.searchTerm) {
      const term = this.escapeSql(filters.searchTerm);
      query += ` AND (
        LOWER(itemid) LIKE LOWER('%${term}%')
        OR LOWER(displayname) LIKE LOWER('%${term}%')
      )`;
    }

    if (filters?.hasInventory === true) {
      query += ' AND quantityavailable > 0';
    } else if (filters?.hasInventory === false) {
      query += ' AND (quantityavailable IS NULL OR quantityavailable <= 0)';
    }

    query += ' ORDER BY displayname';

    const response = await this.restClient.executeSuiteQL(query, pagination);

    return {
      totalResults: response.totalResults || response.items?.length || 0,
      pageIndex: pagination?.offset ? Math.floor(pagination.offset / (pagination.limit || 100)) : 0,
      pageSize: pagination?.limit || 100,
      results: (response.items as Record<string, unknown>[]) || [],
    };
  }

  /**
   * Execute a customer search
   */
  async searchCustomers(
    filters?: {
      searchTerm?: string;
      subsidiary?: string;
      includeInactive?: boolean;
      hasBalance?: boolean;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteSavedSearchResult> {
    this.logger.debug('Searching customers', { filters });

    let query = `
      SELECT id, entityid, companyname, firstname, lastname, email, phone,
             balance, creditlimit, isinactive
      FROM customer
      WHERE 1=1
    `;

    if (!filters?.includeInactive) {
      query += " AND isinactive = 'F'";
    }

    if (filters?.subsidiary) {
      query += ` AND subsidiary = ${filters.subsidiary}`;
    }

    if (filters?.searchTerm) {
      const term = this.escapeSql(filters.searchTerm);
      query += ` AND (
        LOWER(companyname) LIKE LOWER('%${term}%')
        OR LOWER(email) LIKE LOWER('%${term}%')
        OR LOWER(entityid) LIKE LOWER('%${term}%')
      )`;
    }

    if (filters?.hasBalance === true) {
      query += ' AND balance > 0';
    } else if (filters?.hasBalance === false) {
      query += ' AND (balance IS NULL OR balance <= 0)';
    }

    query += ' ORDER BY companyname, entityid';

    const response = await this.restClient.executeSuiteQL(query, pagination);

    return {
      totalResults: response.totalResults || response.items?.length || 0,
      pageIndex: pagination?.offset ? Math.floor(pagination.offset / (pagination.limit || 100)) : 0,
      pageSize: pagination?.limit || 100,
      results: (response.items as Record<string, unknown>[]) || [],
    };
  }

  /**
   * Build WHERE clause from filter array
   */
  private buildWhereClause(
    filters: Array<{
      field: string;
      operator: string;
      value: string | string[];
    }>,
  ): string {
    const conditions = filters.map((filter) => {
      const { field, operator, value } = filter;

      switch (operator.toLowerCase()) {
        case 'is':
        case '=':
          return typeof value === 'string'
            ? `${field} = '${this.escapeSql(value)}'`
            : `${field} = ${value}`;

        case 'isnot':
        case '!=':
        case '<>':
          return typeof value === 'string'
            ? `${field} != '${this.escapeSql(value)}'`
            : `${field} != ${value}`;

        case 'anyof':
        case 'in':
          const values = Array.isArray(value) ? value : [value];
          const quotedValues = values.map((v) => `'${this.escapeSql(v)}'`).join(', ');
          return `${field} IN (${quotedValues})`;

        case 'noneof':
        case 'notin':
          const notValues = Array.isArray(value) ? value : [value];
          const notQuotedValues = notValues.map((v) => `'${this.escapeSql(v)}'`).join(', ');
          return `${field} NOT IN (${notQuotedValues})`;

        case 'contains':
        case 'like':
          return `LOWER(${field}) LIKE LOWER('%${this.escapeSql(String(value))}%')`;

        case 'startswith':
          return `LOWER(${field}) LIKE LOWER('${this.escapeSql(String(value))}%')`;

        case 'endswith':
          return `LOWER(${field}) LIKE LOWER('%${this.escapeSql(String(value))}')`;

        case 'greaterthan':
        case '>':
          return `${field} > ${typeof value === 'string' ? `'${this.escapeSql(value)}'` : value}`;

        case 'lessthan':
        case '<':
          return `${field} < ${typeof value === 'string' ? `'${this.escapeSql(value)}'` : value}`;

        case 'greaterthanorequalto':
        case '>=':
          return `${field} >= ${typeof value === 'string' ? `'${this.escapeSql(value)}'` : value}`;

        case 'lessthanorequalto':
        case '<=':
          return `${field} <= ${typeof value === 'string' ? `'${this.escapeSql(value)}'` : value}`;

        case 'isempty':
        case 'isnull':
          return `${field} IS NULL`;

        case 'isnotempty':
        case 'isnotnull':
          return `${field} IS NOT NULL`;

        default:
          this.logger.warn(`Unknown operator: ${operator}`);
          return `${field} = '${this.escapeSql(String(value))}'`;
      }
    });

    return conditions.join(' AND ');
  }

  /**
   * Escape SQL string for SuiteQL
   */
  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }
}
