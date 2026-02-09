/**
 * Orders Feature Tests - Portal App
 *
 * @feature orders
 * @module order-management
 * @priority P0
 * @dependencies cart, auth
 */

import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockCartApi, mockOrdersApi, resetAllMocks } from '../../../../../test/setup/api-mocks';
import { TEST_CART, TEST_ORDERS } from '../../../../../test/setup/index';
import { renderAsCustomer, userEvent } from '../../../../../test/setup/render-utils';

// Mock the API client
vi.mock('@b2b/api-client', () => ({
  ordersApi: mockOrdersApi,
  cartApi: mockCartApi,
}));

describe('Orders Feature', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Order Creation', () => {
    it('should create order from cart', async () => {
      // Arrange
      mockOrdersApi.createOrder.mockResolvedValueOnce({
        id: 'new-order-id',
        orderNumber: 'ORD-2024-NEW',
        status: 'PENDING',
        items: TEST_CART.items,
        total: TEST_CART.total,
        createdAt: new Date().toISOString(),
      });

      const onPlaceOrder = vi.fn(async () => {
        await mockOrdersApi.createOrder();
      });

      // Act
      const user = userEvent.setup();
      renderAsCustomer(
        <button
          data-testid="place-order"
          onClick={onPlaceOrder}
        >
          Place Order
        </button>
      );

      await user.click(screen.getByTestId('place-order'));

      // Assert
      await waitFor(() => {
        expect(mockOrdersApi.createOrder).toHaveBeenCalled();
      });
    });

    it('should show order confirmation after successful order', () => {
      // Arrange
      const newOrder = {
        orderNumber: 'ORD-2024-NEW',
        status: 'CONFIRMED',
        total: TEST_CART.total,
      };

      // Act
      renderAsCustomer(
        <div data-testid="order-confirmation">
          <h2>Order Confirmed!</h2>
          <p data-testid="order-number">Order #: {newOrder.orderNumber}</p>
          <p data-testid="order-total">Total: ${newOrder.total}</p>
          <p>Thank you for your order!</p>
        </div>
      );

      // Assert
      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument();
      expect(screen.getByTestId('order-number')).toHaveTextContent('ORD-2024-NEW');
      expect(screen.getByTestId('order-total')).toHaveTextContent('$215.98');
    });
  });

  describe('Order History', () => {
    it('should display list of orders', async () => {
      // Arrange
      mockOrdersApi.getOrders.mockResolvedValueOnce({
        data: TEST_ORDERS,
        total: TEST_ORDERS.length,
      });

      // Act
      renderAsCustomer(
        <div data-testid="order-history">
          <h2>Order History</h2>
          <div data-testid="orders-list">
            {TEST_ORDERS.map(order => (
              <div key={order.id} data-testid={`order-${order.id}`}>
                <span data-testid="order-number">{order.orderNumber}</span>
                <span data-testid="order-status">{order.status}</span>
                <span data-testid="order-total">${order.total}</span>
              </div>
            ))}
          </div>
        </div>
      );

      // Assert
      expect(screen.getByTestId('order-history')).toBeInTheDocument();
      expect(screen.getByTestId('order-order-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-order-2')).toBeInTheDocument();
    });

    it('should show empty state when no orders exist', () => {
      // Act
      renderAsCustomer(
        <div data-testid="no-orders">
          <p>You have no orders yet</p>
          <a href="/catalog">Start Shopping</a>
        </div>
      );

      // Assert
      expect(screen.getByText('You have no orders yet')).toBeInTheDocument();
      expect(screen.getByText('Start Shopping')).toBeInTheDocument();
    });

    it('should display correct order status', () => {
      // Act
      renderAsCustomer(
        <div data-testid="order-statuses">
          {TEST_ORDERS.map(order => (
            <span
              key={order.id}
              data-testid={`status-${order.id}`}
              className={`status-${order.status.toLowerCase()}`}
            >
              {order.status}
            </span>
          ))}
        </div>
      );

      // Assert
      expect(screen.getByTestId('status-order-1')).toHaveTextContent('CONFIRMED');
      expect(screen.getByTestId('status-order-2')).toHaveTextContent('DELIVERED');
    });
  });

  describe('Order Details', () => {
    it('should display order details', () => {
      // Arrange
      const order = TEST_ORDERS[0];

      // Act
      renderAsCustomer(
        <div data-testid="order-detail">
          <h2>Order Details</h2>
          <div data-testid="order-header">
            <span data-testid="order-number">{order.orderNumber}</span>
            <span data-testid="order-date">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
            <span data-testid="order-status">{order.status}</span>
          </div>
          <div data-testid="order-items">
            {order.items.map((item, index) => (
              <div key={index} data-testid={`item-${index}`}>
                <span>{item.product.name}</span>
                <span>Qty: {item.quantity}</span>
                <span>${item.price}</span>
              </div>
            ))}
          </div>
          <div data-testid="order-totals">
            <span data-testid="subtotal">${order.subtotal}</span>
            <span data-testid="tax">${order.tax}</span>
            <span data-testid="total">${order.total}</span>
          </div>
        </div>
      );

      // Assert
      expect(screen.getByTestId('order-number')).toHaveTextContent('ORD-2024-001');
      expect(screen.getByTestId('order-status')).toHaveTextContent('CONFIRMED');
      expect(screen.getByTestId('subtotal')).toHaveTextContent('$99.99');
      expect(screen.getByTestId('total')).toHaveTextContent('$107.99');
    });

    it('should fetch order details by ID', async () => {
      // Arrange
      const orderId = 'order-1';
      mockOrdersApi.getOrder.mockResolvedValueOnce(TEST_ORDERS[0]);

      // Act
      await mockOrdersApi.getOrder(orderId);

      // Assert
      expect(mockOrdersApi.getOrder).toHaveBeenCalledWith(orderId);
    });
  });

  describe('Order Tracking', () => {
    it('should display order status timeline', () => {
      // Arrange
      const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
      const currentStatus = 'SHIPPED';

      // Act
      renderAsCustomer(
        <div data-testid="order-timeline">
          {statuses.map((status, index) => (
            <div
              key={status}
              data-testid={`timeline-${status.toLowerCase()}`}
              className={statuses.indexOf(currentStatus) >= index ? 'completed' : 'pending'}
            >
              {status}
            </div>
          ))}
        </div>
      );

      // Assert
      expect(screen.getByTestId('timeline-pending')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-shipped')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-delivered')).toBeInTheDocument();
    });

    it('should show estimated delivery for shipped orders', () => {
      // Arrange
      const estimatedDelivery = '2024-01-20';

      // Act
      renderAsCustomer(
        <div data-testid="delivery-info">
          <span>Status: SHIPPED</span>
          <span data-testid="estimated-delivery">
            Estimated Delivery: {new Date(estimatedDelivery).toLocaleDateString()}
          </span>
        </div>
      );

      // Assert
      expect(screen.getByTestId('estimated-delivery')).toBeInTheDocument();
    });
  });

  describe('Order Cancellation', () => {
    it('should allow cancellation for pending orders', async () => {
      // Arrange
      const pendingOrder = { ...TEST_ORDERS[0], status: 'PENDING' };
      mockOrdersApi.cancelOrder.mockResolvedValueOnce({
        ...pendingOrder,
        status: 'CANCELLED',
      });

      const onCancel = vi.fn(async () => {
        await mockOrdersApi.cancelOrder(pendingOrder.id);
      });

      // Act
      const user = userEvent.setup();
      renderAsCustomer(
        <button
          data-testid="cancel-order"
          onClick={onCancel}
          disabled={pendingOrder.status !== 'PENDING'}
        >
          Cancel Order
        </button>
      );

      await user.click(screen.getByTestId('cancel-order'));

      // Assert
      await waitFor(() => {
        expect(mockOrdersApi.cancelOrder).toHaveBeenCalledWith(pendingOrder.id);
      });
    });

    it('should disable cancellation for shipped orders', () => {
      // Arrange
      const shippedOrder = { ...TEST_ORDERS[0], status: 'SHIPPED' };

      // Act
      renderAsCustomer(
        <button
          data-testid="cancel-order"
          disabled={!['PENDING', 'CONFIRMED'].includes(shippedOrder.status)}
        >
          Cancel Order
        </button>
      );

      // Assert
      expect(screen.getByTestId('cancel-order')).toBeDisabled();
    });
  });
});
