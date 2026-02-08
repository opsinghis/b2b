import { Logger } from '@nestjs/common';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import { NetSuiteInvoice, NetSuiteApiResponse, NetSuitePaginationOptions } from '../interfaces';

/**
 * NetSuite Invoice Status Codes
 */
export enum NetSuiteInvoiceStatusId {
  OPEN = 'open',
  PAID_IN_FULL = 'paidInFull',
  CANCELLED = 'cancelled',
}

/**
 * NetSuite Invoice Service
 * Handles invoice operations through NetSuite REST API
 */
export class NetSuiteInvoiceService {
  private readonly logger = new Logger(NetSuiteInvoiceService.name);
  private readonly recordType = 'invoice';

  constructor(private readonly restClient: NetSuiteRestClientService) {}

  /**
   * Get invoice by ID
   */
  async getById(id: string): Promise<NetSuiteInvoice> {
    this.logger.debug('Getting NetSuite invoice', { id });

    const response = await this.restClient.get<NetSuiteInvoice>(`${this.recordType}/${id}`, {
      expandSubResources: 'true',
    });

    return response.data || (response as unknown as NetSuiteInvoice);
  }

  /**
   * Get invoice by external ID
   */
  async getByExternalId(externalId: string): Promise<NetSuiteInvoice | null> {
    this.logger.debug('Getting NetSuite invoice by external ID', { externalId });

    try {
      const query = `
        SELECT id, tranid, trandate, status, entity, total, amountpaid, amountremaining
        FROM transaction
        WHERE type = 'CustInvc'
        AND custbody_external_id = '${this.escapeSql(externalId)}'
      `;

      const response = await this.restClient.executeSuiteQL<{ id: string }>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        return this.getById(response.items[0].id);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find invoice by external ID', {
        externalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get invoice by transaction ID (document number)
   */
  async getByTranId(tranId: string): Promise<NetSuiteInvoice | null> {
    this.logger.debug('Getting NetSuite invoice by tranId', { tranId });

    try {
      const query = `
        SELECT id, tranid, trandate, status, entity, total
        FROM transaction
        WHERE type = 'CustInvc'
        AND tranid = '${this.escapeSql(tranId)}'
      `;

      const response = await this.restClient.executeSuiteQL<{ id: string }>(query, {
        limit: 1,
      });

      if (response.items && response.items.length > 0) {
        return this.getById(response.items[0].id);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to find invoice by tranId', {
        tranId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get invoices for a sales order
   */
  async getBySalesOrder(salesOrderId: string): Promise<NetSuiteInvoice[]> {
    this.logger.debug('Getting invoices for sales order', { salesOrderId });

    const query = `
      SELECT id, tranid, trandate, status, entity, total, amountpaid, amountremaining
      FROM transaction
      WHERE type = 'CustInvc'
      AND createdfrom = ${salesOrderId}
      ORDER BY trandate DESC
    `;

    const response = await this.restClient.executeSuiteQL<{ id: string }>(query);

    if (!response.items || response.items.length === 0) {
      return [];
    }

    // Fetch full details for each invoice
    const invoices = await Promise.all(response.items.map((item) => this.getById(item.id)));

    return invoices;
  }

  /**
   * List invoices with optional filters
   */
  async list(
    filters?: {
      status?: NetSuiteInvoiceStatusId;
      customerId?: string;
      fromDate?: string;
      toDate?: string;
      minAmount?: number;
      maxAmount?: number;
      hasBalance?: boolean;
      externalIdPrefix?: string;
    },
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteInvoice>> {
    this.logger.debug('Listing NetSuite invoices', { filters, pagination });

    let query = `
      SELECT id, tranid, trandate, duedate, status, entity, total,
             amountpaid, amountremaining, custbody_external_id, memo
      FROM transaction
      WHERE type = 'CustInvc'
    `;

    if (filters?.status) {
      query += ` AND status = '${this.escapeSql(filters.status)}'`;
    }

    if (filters?.customerId) {
      query += ` AND entity = ${filters.customerId}`;
    }

    if (filters?.fromDate) {
      query += ` AND trandate >= TO_DATE('${filters.fromDate}', 'YYYY-MM-DD')`;
    }

    if (filters?.toDate) {
      query += ` AND trandate <= TO_DATE('${filters.toDate}', 'YYYY-MM-DD')`;
    }

    if (filters?.minAmount !== undefined) {
      query += ` AND total >= ${filters.minAmount}`;
    }

    if (filters?.maxAmount !== undefined) {
      query += ` AND total <= ${filters.maxAmount}`;
    }

    if (filters?.hasBalance === true) {
      query += ' AND amountremaining > 0';
    } else if (filters?.hasBalance === false) {
      query += ' AND amountremaining = 0';
    }

    if (filters?.externalIdPrefix) {
      query += ` AND custbody_external_id LIKE '${this.escapeSql(filters.externalIdPrefix)}%'`;
    }

    query += ' ORDER BY trandate DESC, id DESC';

    return this.restClient.executeSuiteQL<NetSuiteInvoice>(query, pagination);
  }

  /**
   * Get invoices modified since a specific date
   */
  async getModifiedSince(
    sinceDate: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteInvoice>> {
    this.logger.debug('Getting invoices modified since', { sinceDate });

    const query = `
      SELECT id, tranid, trandate, duedate, status, entity, total,
             amountpaid, amountremaining, custbody_external_id, lastmodifieddate
      FROM transaction
      WHERE type = 'CustInvc'
      AND lastmodifieddate >= TO_DATE('${sinceDate}', 'YYYY-MM-DD"T"HH24:MI:SS')
      ORDER BY lastmodifieddate DESC
    `;

    return this.restClient.executeSuiteQL<NetSuiteInvoice>(query, pagination);
  }

  /**
   * Get open invoices (with balance)
   */
  async getOpenInvoices(
    customerId?: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteInvoice>> {
    this.logger.debug('Getting open invoices', { customerId });

    let query = `
      SELECT id, tranid, trandate, duedate, status, entity, total,
             amountpaid, amountremaining, custbody_external_id
      FROM transaction
      WHERE type = 'CustInvc'
      AND amountremaining > 0
    `;

    if (customerId) {
      query += ` AND entity = ${customerId}`;
    }

    query += ' ORDER BY duedate ASC, id ASC';

    return this.restClient.executeSuiteQL<NetSuiteInvoice>(query, pagination);
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(
    customerId?: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<NetSuiteInvoice>> {
    this.logger.debug('Getting overdue invoices', { customerId });

    let query = `
      SELECT id, tranid, trandate, duedate, status, entity, total,
             amountpaid, amountremaining, custbody_external_id
      FROM transaction
      WHERE type = 'CustInvc'
      AND amountremaining > 0
      AND duedate < SYSDATE
    `;

    if (customerId) {
      query += ` AND entity = ${customerId}`;
    }

    query += ' ORDER BY duedate ASC, id ASC';

    return this.restClient.executeSuiteQL<NetSuiteInvoice>(query, pagination);
  }

  /**
   * Get invoice payment history
   */
  async getPaymentHistory(invoiceId: string): Promise<
    Array<{
      paymentId: string;
      paymentDate: string;
      amount: number;
      paymentMethod: string;
    }>
  > {
    this.logger.debug('Getting invoice payment history', { invoiceId });

    const query = `
      SELECT
        payment.id AS paymentid,
        payment.trandate AS paymentdate,
        appliedTo.amount AS amount,
        payment.paymentmethod AS paymentmethod
      FROM transaction AS payment
      INNER JOIN transactionLine AS appliedTo ON appliedTo.transaction = payment.id
      WHERE payment.type = 'CustPymt'
      AND appliedTo.appliedtotransaction = ${invoiceId}
      ORDER BY payment.trandate DESC
    `;

    const response = await this.restClient.executeSuiteQL<{
      paymentid: string;
      paymentdate: string;
      amount: number;
      paymentmethod: string;
    }>(query);

    return (response.items || []).map((item) => ({
      paymentId: item.paymentid,
      paymentDate: item.paymentdate,
      amount: item.amount,
      paymentMethod: item.paymentmethod || 'Unknown',
    }));
  }

  /**
   * Get invoice aging summary for a customer
   */
  async getAgingSummary(customerId: string): Promise<{
    current: number;
    days1To30: number;
    days31To60: number;
    days61To90: number;
    over90: number;
    total: number;
  }> {
    this.logger.debug('Getting invoice aging summary', { customerId });

    const query = `
      SELECT
        SUM(CASE WHEN SYSDATE - duedate <= 0 THEN amountremaining ELSE 0 END) AS current,
        SUM(CASE WHEN SYSDATE - duedate > 0 AND SYSDATE - duedate <= 30 THEN amountremaining ELSE 0 END) AS days1to30,
        SUM(CASE WHEN SYSDATE - duedate > 30 AND SYSDATE - duedate <= 60 THEN amountremaining ELSE 0 END) AS days31to60,
        SUM(CASE WHEN SYSDATE - duedate > 60 AND SYSDATE - duedate <= 90 THEN amountremaining ELSE 0 END) AS days61to90,
        SUM(CASE WHEN SYSDATE - duedate > 90 THEN amountremaining ELSE 0 END) AS over90,
        SUM(amountremaining) AS total
      FROM transaction
      WHERE type = 'CustInvc'
      AND entity = ${customerId}
      AND amountremaining > 0
    `;

    const response = await this.restClient.executeSuiteQL<{
      current: number;
      days1to30: number;
      days31to60: number;
      days61to90: number;
      over90: number;
      total: number;
    }>(query, { limit: 1 });

    if (response.items && response.items.length > 0) {
      const result = response.items[0];
      return {
        current: result.current || 0,
        days1To30: result.days1to30 || 0,
        days31To60: result.days31to60 || 0,
        days61To90: result.days61to90 || 0,
        over90: result.over90 || 0,
        total: result.total || 0,
      };
    }

    return {
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      over90: 0,
      total: 0,
    };
  }

  /**
   * Escape SQL string for SuiteQL
   */
  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }
}
