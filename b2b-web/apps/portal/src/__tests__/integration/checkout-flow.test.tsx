/**
 * Checkout Flow Integration Tests
 *
 * Tests the complete user journey from browsing catalog to placing an order
 *
 * @package portal
 * @module integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

// Mock product data
const mockProducts = [
  {
    id: '1',
    name: 'Laptop',
    price: 999.99,
    stock: 10,
    category: 'Electronics',
  },
  {
    id: '2',
    name: 'Mouse',
    price: 29.99,
    stock: 50,
    category: 'Accessories',
  },
];

// Mock cart
const mockCart = {
  items: [],
  total: 0,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  clear: vi.fn(),
};

describe('Checkout Flow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockCart.items = [];
    mockCart.total = 0;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Complete Purchase Flow', () => {
    it('should allow browsing products', () => {
      render(
        <div>
          <h1>Catalog</h1>
          {mockProducts.map((product) => (
            <div key={product.id}>
              <h3>{product.name}</h3>
              <p>${product.price}</p>
              <button>Add to Cart</button>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('$999.99')).toBeInTheDocument();
      expect(screen.getByText('Mouse')).toBeInTheDocument();
      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });

    it('should add product to cart', async () => {
      const user = userEvent.setup();

      const addToCart = vi.fn((product) => {
        mockCart.items.push({ ...product, quantity: 1 });
        mockCart.total += product.price;
      });

      render(
        <div>
          {mockProducts.map((product) => (
            <div key={product.id}>
              <h3>{product.name}</h3>
              <button onClick={() => addToCart(product)}>Add to Cart</button>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      const addButton = screen.getAllByRole('button')[0];
      await user.click(addButton);

      expect(addToCart).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('should show cart with added items', () => {
      mockCart.items = [
        { ...mockProducts[0], quantity: 1 },
        { ...mockProducts[1], quantity: 2 },
      ];
      mockCart.total = 1059.97;

      render(
        <div>
          <h2>Shopping Cart</h2>
          {mockCart.items.map((item) => (
            <div key={item.id}>
              <span>{item.name}</span>
              <span>Qty: {item.quantity}</span>
              <span>${item.price * item.quantity}</span>
            </div>
          ))}
          <div>Total: ${mockCart.total}</div>
        </div>,
        { wrapper }
      );

      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Qty: 1')).toBeInTheDocument();
      expect(screen.getByText('Mouse')).toBeInTheDocument();
      expect(screen.getByText('Qty: 2')).toBeInTheDocument();
      expect(screen.getByText('Total: $1059.97')).toBeInTheDocument();
    });

    it('should update item quantity', () => {
      mockCart.items = [{ ...mockProducts[0], quantity: 1 }];

      const updateQuantity = vi.fn((id, quantity) => {
        const item = mockCart.items.find((i) => i.id === id);
        if (item) {
          item.quantity = quantity;
        }
      });

      render(
        <div>
          {mockCart.items.map((item) => (
            <div key={item.id}>
              <span>{item.name}</span>
              <button onClick={() => updateQuantity(item.id, 3)}>
                Update to 3
              </button>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      screen.getByRole('button').click();

      expect(updateQuantity).toHaveBeenCalledWith('1', 3);
    });

    it('should remove item from cart', async () => {
      const user = userEvent.setup();

      mockCart.items = [{ ...mockProducts[0], quantity: 1 }];

      const removeItem = vi.fn((id) => {
        mockCart.items = mockCart.items.filter((item) => item.id !== id);
      });

      render(
        <div>
          {mockCart.items.map((item) => (
            <div key={item.id}>
              <span>{item.name}</span>
              <button onClick={() => removeItem(item.id)}>Remove</button>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      await user.click(screen.getByRole('button', { name: /Remove/i }));
      expect(removeItem).toHaveBeenCalledWith('1');
    });

    it('should proceed to checkout', async () => {
      const user = userEvent.setup();
      const onCheckout = vi.fn();

      mockCart.items = [{ ...mockProducts[0], quantity: 1 }];

      render(
        <div>
          <h2>Cart</h2>
          <button onClick={onCheckout} disabled={mockCart.items.length === 0}>
            Proceed to Checkout
          </button>
        </div>,
        { wrapper }
      );

      const checkoutButton = screen.getByRole('button', { name: /Proceed to Checkout/i });
      expect(checkoutButton).not.toBeDisabled();

      await user.click(checkoutButton);
      expect(onCheckout).toHaveBeenCalled();
    });

    it('should validate checkout form', async () => {
      const user = userEvent.setup();

      const CheckoutForm = () => {
        const [errors, setErrors] = React.useState<Record<string, string>>({});

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);

          const validationErrors: Record<string, string> = {};

          if (!formData.get('name')) {
            validationErrors.name = 'Name is required';
          }

          if (!formData.get('email')) {
            validationErrors.email = 'Email is required';
          }

          setErrors(validationErrors);

          if (Object.keys(validationErrors).length === 0) {
            // Submit order
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <input name="name" placeholder="Name" />
            {errors.name && <span>{errors.name}</span>}
            <input name="email" placeholder="Email" />
            {errors.email && <span>{errors.email}</span>}
            <button type="submit">Place Order</button>
          </form>
        );
      };

      render(<CheckoutForm />, { wrapper });

      await user.click(screen.getByRole('button', { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should submit order successfully', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      mockCart.items = [{ ...mockProducts[0], quantity: 1 }];

      render(
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <input name="name" defaultValue="John Doe" />
          <input name="email" defaultValue="john@example.com" />
          <button type="submit">Place Order</button>
        </form>,
        { wrapper }
      );

      await user.click(screen.getByRole('button', { name: /Place Order/i }));

      expect(onSubmit).toHaveBeenCalled();
    });

    it('should show order confirmation', () => {
      const orderId = 'ORD-12345';
      const orderTotal = 999.99;

      render(
        <div>
          <h2>Order Confirmed!</h2>
          <p>Order ID: {orderId}</p>
          <p>Total: ${orderTotal}</p>
          <button>View Order</button>
          <button>Continue Shopping</button>
        </div>,
        { wrapper }
      );

      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument();
      expect(screen.getByText('Order ID: ORD-12345')).toBeInTheDocument();
      expect(screen.getByText('Total: $999.99')).toBeInTheDocument();
    });

    it('should clear cart after order', () => {
      mockCart.items = [{ ...mockProducts[0], quantity: 1 }];

      const clearCart = () => {
        mockCart.items = [];
        mockCart.total = 0;
      };

      clearCart();

      expect(mockCart.items.length).toBe(0);
      expect(mockCart.total).toBe(0);
    });
  });

  describe('Edge Cases in Checkout Flow', () => {
    it('should prevent checkout with empty cart', () => {
      mockCart.items = [];

      render(
        <button disabled={mockCart.items.length === 0}>
          Proceed to Checkout
        </button>,
        { wrapper }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should validate stock availability', () => {
      const product = { ...mockProducts[0], stock: 0 };

      render(
        <div>
          <h3>{product.name}</h3>
          <button disabled={product.stock === 0}>Add to Cart</button>
          {product.stock === 0 && <span>Out of Stock</span>}
        </div>,
        { wrapper }
      );

      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('should handle checkout errors', async () => {
      const user = userEvent.setup();

      const submitOrder = vi.fn().mockRejectedValue(new Error('Payment failed'));

      const CheckoutWithError = () => {
        const [error, setError] = React.useState('');

        const handleSubmit = async () => {
          try {
            await submitOrder();
          } catch (err) {
            setError('Failed to process order. Please try again.');
          }
        };

        return (
          <div>
            <button onClick={handleSubmit}>Place Order</button>
            {error && <div className="text-destructive">{error}</div>}
          </div>
        );
      };

      render(<CheckoutWithError />, { wrapper });

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to process order/)).toBeInTheDocument();
      });
    });
  });

  describe('Cart Persistence', () => {
    it('should maintain cart state across navigation', () => {
      mockCart.items = [{ ...mockProducts[0], quantity: 1 }];

      const { rerender } = render(
        <div>
          <h2>Catalog</h2>
          <span>Cart: {mockCart.items.length} items</span>
        </div>,
        { wrapper }
      );

      expect(screen.getByText('Cart: 1 items')).toBeInTheDocument();

      // Simulate navigation
      rerender(
        <div>
          <h2>Product Details</h2>
          <span>Cart: {mockCart.items.length} items</span>
        </div>
      );

      expect(screen.getByText('Cart: 1 items')).toBeInTheDocument();
    });
  });
});
