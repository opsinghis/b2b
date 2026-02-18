/**
 * Quote Builder Context Tests
 *
 * @feature quote-builder
 * @module quotes
 * @priority P0
 * @dependencies none (pure state management)
 */

import * as React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  QuoteBuilderProvider,
  useQuoteBuilder,
  type QuoteLineItemDraft,
  type InitializeFromQuoteData,
} from '../../app/quotes/context/quote-builder-context';
import type { CatalogProduct } from '../../app/catalog/hooks/use-catalog';

// Mock product data
const MOCK_PRODUCT_1: CatalogProduct = {
  id: 'prod-1',
  sku: 'PROD-001',
  name: 'Test Product 1',
  description: 'Product 1 description',
  category: 'Electronics',
  effectivePrice: '99.99',
  listPrice: '129.99',
  uom: 'EA',
  currency: 'USD',
  status: 'ACTIVE',
  availability: 'IN_STOCK',
  hasAccess: true,
};

const MOCK_PRODUCT_2: CatalogProduct = {
  id: 'prod-2',
  sku: 'PROD-002',
  name: 'Test Product 2',
  description: 'Product 2 description',
  category: 'Office',
  effectivePrice: '49.99',
  listPrice: '59.99',
  uom: 'EA',
  currency: 'USD',
  status: 'ACTIVE',
  availability: 'IN_STOCK',
  hasAccess: true,
};

describe('Quote Builder Context', () => {
  describe('Provider and Hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useQuoteBuilder());
      }).toThrow('useQuoteBuilder must be used within a QuoteBuilderProvider');

      consoleSpy.mockRestore();
    });

    it('should provide context when used inside provider', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      expect(result.current).toBeDefined();
      expect(result.current.state).toBeDefined();
      expect(result.current.dispatch).toBeDefined();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      expect(result.current.state).toEqual({
        currentStep: 'details',
        isEditMode: false,
        editingQuoteId: null,
        title: '',
        description: '',
        customerName: '',
        customerEmail: '',
        validUntil: '',
        notes: '',
        internalNotes: '',
        discountPercent: 0,
        lineItems: [],
        savedQuoteId: null,
        quoteNumber: null,
        isProcessing: false,
        error: null,
      });
    });

    it('should have correct initial computed values', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      expect(result.current.subtotal).toBe(0);
      expect(result.current.discountAmount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('Quote Details Setters', () => {
    it('should update title', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setTitle('Q1 2024 Equipment');
      });

      expect(result.current.state.title).toBe('Q1 2024 Equipment');
    });

    it('should update description', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setDescription('Annual equipment purchase');
      });

      expect(result.current.state.description).toBe('Annual equipment purchase');
    });

    it('should update customer name', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setCustomerName('Acme Corp');
      });

      expect(result.current.state.customerName).toBe('Acme Corp');
    });

    it('should update customer email', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setCustomerEmail('buyer@acme.com');
      });

      expect(result.current.state.customerEmail).toBe('buyer@acme.com');
    });

    it('should update valid until date', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setValidUntil('2024-12-31');
      });

      expect(result.current.state.validUntil).toBe('2024-12-31');
    });

    it('should update notes', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setNotes('Please review by end of month');
      });

      expect(result.current.state.notes).toBe('Please review by end of month');
    });

    it('should update internal notes', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setInternalNotes('VIP customer - priority discount');
      });

      expect(result.current.state.internalNotes).toBe('VIP customer - priority discount');
    });

    it('should update discount percent', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setDiscountPercent(10);
      });

      expect(result.current.state.discountPercent).toBe(10);
    });
  });

  describe('Line Item Operations', () => {
    describe('addProduct', () => {
      it('should add a new product to line items', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
        });

        expect(result.current.state.lineItems).toHaveLength(1);
        expect(result.current.state.lineItems[0].product.id).toBe('prod-1');
        expect(result.current.state.lineItems[0].quantity).toBe(1);
        expect(result.current.state.lineItems[0].unitPrice).toBe(99.99);
        expect(result.current.state.lineItems[0].priceOverride).toBe(false);
      });

      it('should add multiple different products', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
          result.current.addProduct(MOCK_PRODUCT_2);
        });

        expect(result.current.state.lineItems).toHaveLength(2);
        expect(result.current.state.lineItems[0].product.id).toBe('prod-1');
        expect(result.current.state.lineItems[1].product.id).toBe('prod-2');
      });

      it('should increment quantity when adding same product twice', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
          result.current.addProduct(MOCK_PRODUCT_1);
        });

        expect(result.current.state.lineItems).toHaveLength(1);
        expect(result.current.state.lineItems[0].quantity).toBe(2);
      });
    });

    describe('updateLineItem', () => {
      it('should update line item quantity', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
        });

        const itemId = result.current.state.lineItems[0].id;

        act(() => {
          result.current.updateLineItem(itemId, { quantity: 5 });
        });

        expect(result.current.state.lineItems[0].quantity).toBe(5);
      });

      it('should update line item unit price', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
        });

        const itemId = result.current.state.lineItems[0].id;

        act(() => {
          result.current.updateLineItem(itemId, {
            unitPrice: 89.99,
            priceOverride: true,
          });
        });

        expect(result.current.state.lineItems[0].unitPrice).toBe(89.99);
        expect(result.current.state.lineItems[0].priceOverride).toBe(true);
      });

      it('should update line item notes', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
        });

        const itemId = result.current.state.lineItems[0].id;

        act(() => {
          result.current.updateLineItem(itemId, {
            notes: 'Bulk discount applied',
          });
        });

        expect(result.current.state.lineItems[0].notes).toBe('Bulk discount applied');
      });

      it('should not update other line items', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
          result.current.addProduct(MOCK_PRODUCT_2);
        });

        const item1Id = result.current.state.lineItems[0].id;

        act(() => {
          result.current.updateLineItem(item1Id, { quantity: 10 });
        });

        expect(result.current.state.lineItems[0].quantity).toBe(10);
        expect(result.current.state.lineItems[1].quantity).toBe(1); // Unchanged
      });
    });

    describe('removeLineItem', () => {
      it('should remove a line item', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
          result.current.addProduct(MOCK_PRODUCT_2);
        });

        expect(result.current.state.lineItems).toHaveLength(2);

        const item1Id = result.current.state.lineItems[0].id;

        act(() => {
          result.current.removeLineItem(item1Id);
        });

        expect(result.current.state.lineItems).toHaveLength(1);
        expect(result.current.state.lineItems[0].product.id).toBe('prod-2');
      });
    });

    describe('clearLineItems', () => {
      it('should remove all line items', () => {
        const { result } = renderHook(() => useQuoteBuilder(), {
          wrapper: QuoteBuilderProvider,
        });

        act(() => {
          result.current.addProduct(MOCK_PRODUCT_1);
          result.current.addProduct(MOCK_PRODUCT_2);
        });

        expect(result.current.state.lineItems).toHaveLength(2);

        act(() => {
          result.current.clearLineItems();
        });

        expect(result.current.state.lineItems).toHaveLength(0);
      });
    });
  });

  describe('Computed Values', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_1); // $99.99 x 1
        result.current.addProduct(MOCK_PRODUCT_2); // $49.99 x 1
      });

      expect(result.current.subtotal).toBe(149.98);
    });

    it('should calculate subtotal with quantities', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_1);
      });

      const itemId = result.current.state.lineItems[0].id;

      act(() => {
        result.current.updateLineItem(itemId, { quantity: 5 });
      });

      expect(result.current.subtotal).toBe(499.95); // $99.99 * 5
    });

    it('should calculate subtotal with price overrides', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_1);
      });

      const itemId = result.current.state.lineItems[0].id;

      act(() => {
        result.current.updateLineItem(itemId, {
          quantity: 10,
          unitPrice: 89.99,
          priceOverride: true,
        });
      });

      expect(result.current.subtotal).toBe(899.90); // $89.99 * 10
    });

    it('should calculate discount amount correctly', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_1); // $99.99
        result.current.setDiscountPercent(10); // 10%
      });

      expect(result.current.discountAmount).toBeCloseTo(9.999, 2);
    });

    it('should calculate total correctly', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_1); // $99.99
        result.current.setDiscountPercent(10); // 10%
      });

      // $99.99 - ($99.99 * 0.10) = $89.991
      expect(result.current.total).toBeCloseTo(89.991, 2);
    });

    it('should recalculate when line items change', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_1);
        result.current.setDiscountPercent(10);
      });

      const initialTotal = result.current.total;

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_2);
      });

      expect(result.current.total).not.toBe(initialTotal);
      // ($99.99 + $49.99) * 0.9 = $134.982
      expect(result.current.total).toBeCloseTo(134.982, 2);
    });
  });

  describe('Step Navigation', () => {
    it('should start at details step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      expect(result.current.state.currentStep).toBe('details');
    });

    it('should navigate to next step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe('products');

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe('review');
    });

    it('should not go beyond last step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.goToStep('confirmation');
      });

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe('confirmation');
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.goToStep('review');
      });

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe('products');
    });

    it('should not go before first step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe('details');
    });

    it('should jump to specific step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.goToStep('review');
      });

      expect(result.current.state.currentStep).toBe('review');
    });

    it('should clear error when changing steps', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setError('Some error');
      });

      expect(result.current.state.error).toBe('Some error');

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Validation (canProceed)', () => {
    it('should require title on details step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      expect(result.current.state.currentStep).toBe('details');
      expect(result.current.canProceed()).toBe(false);

      act(() => {
        result.current.setTitle('Test Quote');
      });

      expect(result.current.canProceed()).toBe(true);
    });

    it('should not allow whitespace-only title', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setTitle('   ');
      });

      expect(result.current.canProceed()).toBe(false);
    });

    it('should require at least one line item on products step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.goToStep('products');
      });

      expect(result.current.canProceed()).toBe(false);

      act(() => {
        result.current.addProduct(MOCK_PRODUCT_1);
      });

      expect(result.current.canProceed()).toBe(true);
    });

    it('should always allow proceeding from review step', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.goToStep('review');
      });

      expect(result.current.canProceed()).toBe(true);
    });
  });

  describe('UI State Management', () => {
    it('should set processing state', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setProcessing(true);
      });

      expect(result.current.state.isProcessing).toBe(true);

      act(() => {
        result.current.setProcessing(false);
      });

      expect(result.current.state.isProcessing).toBe(false);
    });

    it('should set error message', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setError('Failed to save quote');
      });

      expect(result.current.state.error).toBe('Failed to save quote');
    });

    it('should clear error message', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setError('Some error');
        result.current.setError(null);
      });

      expect(result.current.state.error).toBeNull();
    });

    it('should set saved quote information', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.setSavedQuote('quote-123', 'Q-2024-001');
      });

      expect(result.current.state.savedQuoteId).toBe('quote-123');
      expect(result.current.state.quoteNumber).toBe('Q-2024-001');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      // Make various changes
      act(() => {
        result.current.setTitle('Test Quote');
        result.current.setDescription('Test Description');
        result.current.addProduct(MOCK_PRODUCT_1);
        result.current.setDiscountPercent(15);
        result.current.goToStep('review');
        result.current.setError('Test error');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify all state is back to initial
      expect(result.current.state).toEqual({
        currentStep: 'details',
        isEditMode: false,
        editingQuoteId: null,
        title: '',
        description: '',
        customerName: '',
        customerEmail: '',
        validUntil: '',
        notes: '',
        internalNotes: '',
        discountPercent: 0,
        lineItems: [],
        savedQuoteId: null,
        quoteNumber: null,
        isProcessing: false,
        error: null,
      });
    });
  });

  describe('Edit Mode - Initialize from Quote', () => {
    const MOCK_QUOTE: InitializeFromQuoteData = {
      id: 'quote-123',
      quoteNumber: 'Q-2024-001',
      title: 'Existing Quote',
      description: 'Quote description',
      customerName: 'Acme Corp',
      customerEmail: 'buyer@acme.com',
      validUntil: '2024-12-31',
      notes: 'Customer notes',
      internalNotes: 'Internal notes',
      discountPercent: '10',
      lineItems: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product 1',
          productSku: 'PROD-001',
          quantity: 5,
          unitPrice: '89.99',
          originalPrice: '99.99',
          priceOverride: true,
          notes: 'Bulk discount',
        },
      ],
    };

    it('should initialize from existing quote', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.initializeFromQuote(MOCK_QUOTE);
      });

      expect(result.current.state.isEditMode).toBe(true);
      expect(result.current.state.editingQuoteId).toBe('quote-123');
      expect(result.current.state.quoteNumber).toBe('Q-2024-001');
      expect(result.current.state.title).toBe('Existing Quote');
      expect(result.current.state.description).toBe('Quote description');
      expect(result.current.state.customerName).toBe('Acme Corp');
      expect(result.current.state.customerEmail).toBe('buyer@acme.com');
      expect(result.current.state.validUntil).toBe('2024-12-31');
      expect(result.current.state.notes).toBe('Customer notes');
      expect(result.current.state.internalNotes).toBe('Internal notes');
      expect(result.current.state.discountPercent).toBe(10);
    });

    it('should initialize line items from existing quote', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.initializeFromQuote(MOCK_QUOTE);
      });

      expect(result.current.state.lineItems).toHaveLength(1);
      expect(result.current.state.lineItems[0].id).toBe('item-1');
      expect(result.current.state.lineItems[0].product.id).toBe('prod-1');
      expect(result.current.state.lineItems[0].product.name).toBe('Test Product 1');
      expect(result.current.state.lineItems[0].product.sku).toBe('PROD-001');
      expect(result.current.state.lineItems[0].quantity).toBe(5);
      expect(result.current.state.lineItems[0].unitPrice).toBe(89.99);
      expect(result.current.state.lineItems[0].originalPrice).toBe(99.99);
      expect(result.current.state.lineItems[0].priceOverride).toBe(true);
      expect(result.current.state.lineItems[0].notes).toBe('Bulk discount');
    });

    it('should handle optional fields in initialization', () => {
      const minimalQuote: InitializeFromQuoteData = {
        id: 'quote-456',
        quoteNumber: 'Q-2024-002',
        title: 'Minimal Quote',
        lineItems: [],
      };

      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.initializeFromQuote(minimalQuote);
      });

      expect(result.current.state.description).toBe('');
      expect(result.current.state.customerName).toBe('');
      expect(result.current.state.customerEmail).toBe('');
      expect(result.current.state.validUntil).toBe('');
      expect(result.current.state.notes).toBe('');
      expect(result.current.state.internalNotes).toBe('');
      expect(result.current.state.discountPercent).toBe(0);
    });

    it('should calculate totals correctly for initialized quote', () => {
      const { result } = renderHook(() => useQuoteBuilder(), {
        wrapper: QuoteBuilderProvider,
      });

      act(() => {
        result.current.initializeFromQuote(MOCK_QUOTE);
      });

      // 5 * $89.99 = $449.95
      expect(result.current.subtotal).toBeCloseTo(449.95, 2);
      // 10% of $449.95 = $44.995
      expect(result.current.discountAmount).toBeCloseTo(44.995, 2);
      // $449.95 - $44.995 = $404.955
      expect(result.current.total).toBeCloseTo(404.955, 2);
    });
  });
});
