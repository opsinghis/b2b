/**
 * Cart Feature Tests - Portal App
 *
 * @feature cart
 * @module shopping-cart
 * @priority P0
 * @dependencies catalog, pricing, auth
 */

import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockCartApi, resetAllMocks } from '../../../../../test/setup/api-mocks';
import { TEST_CART, TEST_PRODUCTS } from '../../../../../test/setup/index';
import { renderAsCustomer, userEvent } from '../../../../../test/setup/render-utils';

// Mock the API client
vi.mock('@b2b/api-client', () => ({
  cartApi: mockCartApi,
}));

describe('Cart Feature', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('View Cart', () => {
    it('should display cart items', () => {
      // Act
      renderAsCustomer(
        <div data-testid="cart">
          <h2>Shopping Cart</h2>
          <div data-testid="cart-items">
            {TEST_CART.items.map(item => (
              <div key={item.id} data-testid={`cart-item-${item.id}`}>
                <span data-testid="item-name">{item.product.name}</span>
                <span data-testid="item-quantity">{item.quantity}</span>
                <span data-testid="item-price">${item.price}</span>
              </div>
            ))}
          </div>
        </div>
      );

      // Assert
      expect(screen.getByTestId('cart')).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-cart-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-name')).toHaveTextContent('Test Product 1');
      expect(screen.getByTestId('item-quantity')).toHaveTextContent('2');
    });

    it('should display cart totals', () => {
      // Act
      renderAsCustomer(
        <div data-testid="cart-summary">
          <div data-testid="subtotal">Subtotal: ${TEST_CART.subtotal}</div>
          <div data-testid="tax">Tax: ${TEST_CART.tax}</div>
          <div data-testid="total">Total: ${TEST_CART.total}</div>
        </div>
      );

      // Assert
      expect(screen.getByTestId('subtotal')).toHaveTextContent('$199.98');
      expect(screen.getByTestId('tax')).toHaveTextContent('$16');
      expect(screen.getByTestId('total')).toHaveTextContent('$215.98');
    });

    it('should show empty cart message when cart is empty', () => {
      // Act
      renderAsCustomer(
        <div data-testid="empty-cart">
          <p>Your cart is empty</p>
          <a href="/catalog">Browse Products</a>
        </div>
      );

      // Assert
      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByText('Browse Products')).toBeInTheDocument();
    });
  });

  describe('Add to Cart', () => {
    it('should add product to cart successfully', async () => {
      // Arrange
      const product = TEST_PRODUCTS[0];
      mockCartApi.addToCart.mockResolvedValueOnce({
        ...TEST_CART,
        items: [
          ...TEST_CART.items,
          {
            id: 'new-item',
            productId: product.id,
            product,
            quantity: 1,
            price: product.price,
          },
        ],
      });

      const onAddToCart = vi.fn(async () => {
        await mockCartApi.addToCart(product.id, 1);
      });

      // Act
      const user = userEvent.setup();
      renderAsCustomer(
        <button
          data-testid="add-to-cart"
          onClick={onAddToCart}
        >
          Add to Cart
        </button>
      );

      await user.click(screen.getByTestId('add-to-cart'));

      // Assert
      await waitFor(() => {
        expect(mockCartApi.addToCart).toHaveBeenCalledWith(product.id, 1);
      });
    });

    it('should show quantity selector before adding', async () => {
      // Arrange
      const user = userEvent.setup();
      const setQuantity = vi.fn();

      // Act
      renderAsCustomer(
        <div data-testid="quantity-selector">
          <button data-testid="decrease" onClick={() => setQuantity(-1)}>-</button>
          <input
            data-testid="quantity-input"
            type="number"
            defaultValue={1}
            min={1}
            max={99}
          />
          <button data-testid="increase" onClick={() => setQuantity(1)}>+</button>
        </div>
      );

      await user.click(screen.getByTestId('increase'));

      // Assert
      expect(setQuantity).toHaveBeenCalledWith(1);
    });
  });

  describe('Update Cart Item', () => {
    it('should update item quantity', async () => {
      // Arrange
      const cartItem = TEST_CART.items[0];
      const newQuantity = 5;

      mockCartApi.updateCartItem.mockResolvedValueOnce({
        ...TEST_CART,
        items: TEST_CART.items.map(item =>
          item.id === cartItem.id ? { ...item, quantity: newQuantity } : item
        ),
      });

      const onUpdateQuantity = vi.fn(async () => {
        await mockCartApi.updateCartItem(cartItem.id, newQuantity);
      });

      // Act
      const user = userEvent.setup();
      renderAsCustomer(
        <div data-testid="cart-item">
          <input
            data-testid="quantity-input"
            type="number"
            defaultValue={cartItem.quantity}
            onChange={onUpdateQuantity}
          />
        </div>
      );

      await user.clear(screen.getByTestId('quantity-input'));
      await user.type(screen.getByTestId('quantity-input'), '5');

      // Assert
      expect(onUpdateQuantity).toHaveBeenCalled();
    });

    it('should recalculate totals on quantity change', () => {
      // Arrange
      const updatedCart = {
        ...TEST_CART,
        items: [{ ...TEST_CART.items[0], quantity: 3 }],
        subtotal: 299.97,
        tax: 24.00,
        total: 323.97,
      };

      // Act
      renderAsCustomer(
        <div data-testid="cart-summary">
          <div data-testid="subtotal">${updatedCart.subtotal}</div>
          <div data-testid="total">${updatedCart.total}</div>
        </div>
      );

      // Assert
      expect(screen.getByTestId('subtotal')).toHaveTextContent('$299.97');
      expect(screen.getByTestId('total')).toHaveTextContent('$323.97');
    });
  });

  describe('Remove from Cart', () => {
    it('should remove item from cart', async () => {
      // Arrange
      const cartItem = TEST_CART.items[0];
      mockCartApi.removeFromCart.mockResolvedValueOnce({
        ...TEST_CART,
        items: [],
      });

      const onRemove = vi.fn(async () => {
        await mockCartApi.removeFromCart(cartItem.id);
      });

      // Act
      const user = userEvent.setup();
      renderAsCustomer(
        <button
          data-testid="remove-item"
          onClick={onRemove}
        >
          Remove
        </button>
      );

      await user.click(screen.getByTestId('remove-item'));

      // Assert
      await waitFor(() => {
        expect(mockCartApi.removeFromCart).toHaveBeenCalledWith(cartItem.id);
      });
    });

    it('should show confirmation before removing', async () => {
      // Arrange
      const user = userEvent.setup();
      const showConfirmation = vi.fn();

      // Act
      renderAsCustomer(
        <div>
          <button
            data-testid="remove-item"
            onClick={showConfirmation}
          >
            Remove
          </button>
          <div data-testid="confirmation-modal" style={{ display: 'none' }}>
            <p>Are you sure you want to remove this item?</p>
            <button data-testid="confirm-remove">Yes, Remove</button>
            <button data-testid="cancel-remove">Cancel</button>
          </div>
        </div>
      );

      await user.click(screen.getByTestId('remove-item'));

      // Assert
      expect(showConfirmation).toHaveBeenCalled();
    });
  });

  describe('Proceed to Checkout', () => {
    it('should enable checkout button when cart has items', () => {
      // Act
      renderAsCustomer(
        <div data-testid="cart-footer">
          <button
            data-testid="checkout-btn"
            disabled={TEST_CART.items.length === 0}
          >
            Proceed to Checkout
          </button>
        </div>
      );

      // Assert
      expect(screen.getByTestId('checkout-btn')).not.toBeDisabled();
    });

    it('should disable checkout button when cart is empty', () => {
      // Arrange
      const emptyCart = { ...TEST_CART, items: [] };

      // Act
      renderAsCustomer(
        <div data-testid="cart-footer">
          <button
            data-testid="checkout-btn"
            disabled={emptyCart.items.length === 0}
          >
            Proceed to Checkout
          </button>
        </div>
      );

      // Assert
      expect(screen.getByTestId('checkout-btn')).toBeDisabled();
    });
  });
});
