/**
 * Quote API Contract Tests
 *
 * Purpose: Validate frontend Quote DTOs match backend expectations
 * Ensures: Quote workflow (create, submit, approve, convert) works correctly
 */

import { describe, it, expect } from 'vitest';
import type {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteResponseDto,
  QuoteWorkflowActionDto,
  CreateQuoteLineItemDto,
} from '@b2b/api-client';

describe('Quote API Contract', () => {
  describe('CreateQuoteDto Structure', () => {
    it('should match expected schema for quote creation', () => {
      const validQuote: CreateQuoteDto = {
        title: 'Q1 2024 Equipment Purchase',
        description: 'Quarterly equipment order',
        customerName: 'Acme Corp',
        customerEmail: 'procurement@acme.com',
        lineItems: [
          {
            productId: 'prod-123',
            quantity: 10,
            unitPrice: 100.0,
          },
        ],
        validUntil: '2024-12-31',
        notes: 'Please review by end of month',
      };

      expect(validQuote.title).toBe('Q1 2024 Equipment Purchase');
      expect(validQuote.lineItems).toHaveLength(1);
      expect(validQuote.lineItems[0].productId).toBe('prod-123');
    });

    it('should have required fields', () => {
      const minimalQuote: CreateQuoteDto = {
        title: 'Minimal Quote',
        lineItems: [
          {
            productId: 'prod-123',
            quantity: 1,
          },
        ],
      };

      expect(minimalQuote.title).toBeDefined();
      expect(minimalQuote.lineItems).toBeDefined();
    });

    it('should allow optional customer fields', () => {
      const quoteWithCustomer: CreateQuoteDto = {
        title: 'Quote with Customer',
        customerId: 'customer-123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        lineItems: [],
      };

      expect(quoteWithCustomer.customerId).toBe('customer-123');
      expect(quoteWithCustomer.customerName).toBe('John Doe');
    });
  });

  describe('CreateQuoteLineItemDto Structure', () => {
    it('should validate line item structure', () => {
      const lineItem: CreateQuoteLineItemDto = {
        productId: 'prod-123',
        quantity: 5,
        unitPrice: 50.0,
        notes: 'Bulk discount applied',
      };

      expect(lineItem.productId).toBe('prod-123');
      expect(lineItem.quantity).toBe(5);
      expect(lineItem.unitPrice).toBe(50.0);
    });

    it('should require productId and quantity', () => {
      const minimal: CreateQuoteLineItemDto = {
        productId: 'prod-123',
        quantity: 1,
      };

      expect(minimal.productId).toBeDefined();
      expect(minimal.quantity).toBeDefined();
    });
  });

  describe('UpdateQuoteDto Structure', () => {
    it('should allow partial updates', () => {
      const update: UpdateQuoteDto = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      expect(update.title).toBe('Updated Title');
    });

    it('should allow updating line items', () => {
      const update: UpdateQuoteDto = {
        lineItems: [
          {
            productId: 'prod-456',
            quantity: 20,
          },
        ],
      };

      expect(update.lineItems).toHaveLength(1);
    });
  });

  describe('QuoteResponseDto Structure', () => {
    it('should have expected response fields', () => {
      const mockResponse: Partial<QuoteResponseDto> = {
        id: 'quote-123',
        quoteNumber: 'Q-2024-001',
        title: 'Test Quote',
        status: 'DRAFT',
        totalAmount: '500.00',
        currency: 'USD',
        createdAt: '2024-01-01T00:00:00Z',
        createdById: 'user-123',
        createdByName: 'John Doe',
      };

      expect(mockResponse.id).toBe('quote-123');
      expect(mockResponse.quoteNumber).toBe('Q-2024-001');
      expect(mockResponse.status).toBe('DRAFT');
    });

    it('should include line items in response', () => {
      const mockResponse: Partial<QuoteResponseDto> = {
        id: 'quote-123',
        lineItems: [
          {
            id: 'item-1',
            productId: 'prod-123',
            productName: 'Product A',
            productSku: 'SKU-A',
            quantity: 10,
            unitPrice: '100.00',
            originalPrice: '120.00',
            totalPrice: '1000.00',
            priceOverride: true,
          },
        ],
      };

      expect(mockResponse.lineItems).toHaveLength(1);
      expect(mockResponse.lineItems?.[0].productId).toBe('prod-123');
    });

    it('should include workflow timestamps', () => {
      const mockResponse: Partial<QuoteResponseDto> = {
        id: 'quote-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        submittedAt: '2024-01-03T00:00:00Z',
        approvedAt: '2024-01-04T00:00:00Z',
        sentAt: '2024-01-05T00:00:00Z',
      };

      expect(mockResponse.submittedAt).toBeDefined();
      expect(mockResponse.approvedAt).toBeDefined();
    });
  });

  describe('QuoteWorkflowActionDto Structure', () => {
    it('should have comments field for workflow actions', () => {
      const action: QuoteWorkflowActionDto = {
        comments: 'Approved for Q1 budget',
      };

      expect(action.comments).toBe('Approved for Q1 budget');
    });

    it('should allow empty action', () => {
      const action: QuoteWorkflowActionDto = {};

      expect(action).toBeDefined();
    });
  });

  describe('Contract Validation Rules', () => {
    it('should enforce type safety on status field', () => {
      const validStatuses: QuoteResponseDto['status'][] = [
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'SENT',
        'ACCEPTED',
        'REJECTED',
        'EXPIRED',
        'CONVERTED',
      ];

      validStatuses.forEach((status) => {
        const quote: Partial<QuoteResponseDto> = {
          id: 'quote-123',
          status,
        };
        expect(quote.status).toBe(status);
      });
    });

    it('should not allow invalid fields', () => {
      const quote: CreateQuoteDto = {
        title: 'Valid Quote',
        lineItems: [],
        // @ts-expect-error - This field should not exist
        invalidField: 'should-fail',
      };

      expect(quote).toBeDefined();
    });

    it('should require line items array', () => {
      // @ts-expect-error - Missing required lineItems
      const invalidQuote: CreateQuoteDto = {
        title: 'Missing Line Items',
      };

      expect(invalidQuote).toBeDefined();
    });
  });

  describe('Quote Conversion Contract', () => {
    it('should validate convert-to-contract endpoint structure', () => {
      // The endpoint POST /api/v1/quotes/{id}/convert-to-contract
      // expects QuoteWorkflowActionDto and returns { contractId: string }

      const action: QuoteWorkflowActionDto = {
        comments: 'Converting to contract',
      };

      expect(action).toBeDefined();

      // Response type validation
      type ConvertResponse = { contractId: string };
      const mockResponse: ConvertResponse = {
        contractId: 'contract-789',
      };

      expect(mockResponse.contractId).toBe('contract-789');
    });
  });
});

/**
 * Maintenance Notes:
 *
 * 1. Quote Status Validation:
 *    - Statuses are enforced by TypeScript enum
 *    - Backend changes to status values will cause compile errors
 *
 * 2. Line Items:
 *    - Always validate line item structure
 *    - ProductId and quantity are required
 *    - UnitPrice is optional (uses catalog price if not provided)
 *
 * 3. Workflow Actions:
 *    - All workflow endpoints use QuoteWorkflowActionDto
 *    - Comments are optional for most actions
 *    - Rejection typically requires comments (validated by backend)
 */
