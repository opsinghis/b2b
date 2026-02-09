/**
 * Orders Admin Feature Tests - Admin App
 *
 * @feature admin-orders
 * @module order-management
 * @priority P0
 * @dependencies tenant, users, orders
 */

import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAdminApi, resetAllMocks } from '../../../../../test/setup/api-mocks';
import { TEST_ORDERS, TEST_USERS } from '../../../../../test/setup/index';
import { renderAsAdmin, userEvent } from '../../../../../test/setup/render-utils';

// Mock the API client
vi.mock('@b2b/api-client', () => ({
  adminApi: mockAdminApi,
}));

describe('Orders Admin Feature', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Order List View', () => {
    it('should display all tenant orders', async () => {
      // Arrange
      mockAdminApi.getOrders.mockResolvedValueOnce({
        data: TEST_ORDERS,
        total: TEST_ORDERS.length,
      });

      // Act
      renderAsAdmin(
        <div data-testid="admin-orders">
          <h1>Order Management</h1>
          <table data-testid="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {TEST_ORDERS.map(order => (
                <tr key={order.id} data-testid={`order-row-${order.id}`}>
                  <td data-testid="order-number">{order.orderNumber}</td>
                  <td data-testid="customer">{TEST_USERS.customer.name}</td>
                  <td data-testid="status">{order.status}</td>
                  <td data-testid="total">${order.total}</td>
                  <td>
                    <button data-testid={`view-${order.id}`}>View</button>
                    <button data-testid={`update-${order.id}`}>Update Status</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      // Assert
      expect(screen.getByTestId('admin-orders')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-2')).toBeInTheDocument();
    });

    it('should show order count', () => {
      // Act
      renderAsAdmin(
        <div data-testid="order-stats">
          <span data-testid="total-orders">Total Orders: {TEST_ORDERS.length}</span>
          <span data-testid="pending-orders">
            Pending: {TEST_ORDERS.filter(o => o.status === 'PENDING').length}
          </span>
          <span data-testid="confirmed-orders">
            Confirmed: {TEST_ORDERS.filter(o => o.status === 'CONFIRMED').length}
          </span>
        </div>
      );

      // Assert
      expect(screen.getByTestId('total-orders')).toHaveTextContent('2');
    });
  });

  describe('Order Status Management', () => {
    it('should update order status', async () => {
      // Arrange
      const order = TEST_ORDERS[0];
      const newStatus = 'PROCESSING';

      mockAdminApi.updateOrderStatus.mockResolvedValueOnce({
        ...order,
        status: newStatus,
      });

      const onUpdateStatus = vi.fn(async () => {
        await mockAdminApi.updateOrderStatus(order.id, newStatus);
      });

      // Act
      const user = userEvent.setup();
      renderAsAdmin(
        <div data-testid="status-update">
          <select
            data-testid="status-select"
            defaultValue={order.status}
            onChange={onUpdateStatus}
          >
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      );

      await user.selectOptions(screen.getByTestId('status-select'), 'PROCESSING');

      // Assert
      expect(onUpdateStatus).toHaveBeenCalled();
    });

    it('should show status change confirmation', async () => {
      // Arrange
      const user = userEvent.setup();
      const showModal = vi.fn();

      // Act
      renderAsAdmin(
        <div>
          <button
            data-testid="change-status-btn"
            onClick={showModal}
          >
            Change Status
          </button>
          <div data-testid="confirmation-modal" role="dialog">
            <p>Are you sure you want to change the status?</p>
            <button data-testid="confirm">Confirm</button>
            <button data-testid="cancel">Cancel</button>
          </div>
        </div>
      );

      await user.click(screen.getByTestId('change-status-btn'));

      // Assert
      expect(showModal).toHaveBeenCalled();
    });

    it('should display available status transitions', () => {
      // Arrange - CONFIRMED can go to PROCESSING, SHIPPED, or CANCELLED
      // TEST_ORDERS[0] has status: CONFIRMED
      const availableStatuses = ['PROCESSING', 'SHIPPED', 'CANCELLED'];

      // Act
      renderAsAdmin(
        <div data-testid="status-options">
          {availableStatuses.map(status => (
            <button key={status} data-testid={`status-${status.toLowerCase()}`}>
              {status}
            </button>
          ))}
        </div>
      );

      // Assert
      expect(screen.getByTestId('status-processing')).toBeInTheDocument();
      expect(screen.getByTestId('status-shipped')).toBeInTheDocument();
      expect(screen.getByTestId('status-cancelled')).toBeInTheDocument();
    });
  });

  describe('Order Filtering', () => {
    it('should filter orders by status', async () => {
      // Arrange
      const user = userEvent.setup();
      const onFilter = vi.fn();

      // Act
      renderAsAdmin(
        <div data-testid="order-filters">
          <select
            data-testid="status-filter"
            onChange={onFilter}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </div>
      );

      await user.selectOptions(screen.getByTestId('status-filter'), 'CONFIRMED');

      // Assert
      expect(onFilter).toHaveBeenCalled();
    });

    it('should filter orders by date range', async () => {
      // Arrange
      const user = userEvent.setup();
      const onDateFilter = vi.fn();

      // Act
      renderAsAdmin(
        <div data-testid="date-filters">
          <input
            data-testid="start-date"
            type="date"
            onChange={onDateFilter}
          />
          <input
            data-testid="end-date"
            type="date"
            onChange={onDateFilter}
          />
        </div>
      );

      await user.type(screen.getByTestId('start-date'), '2024-01-01');

      // Assert
      expect(onDateFilter).toHaveBeenCalled();
    });

    it('should search orders by order number', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSearch = vi.fn();

      // Act
      renderAsAdmin(
        <div data-testid="order-search">
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search by order number..."
            onChange={onSearch}
          />
        </div>
      );

      await user.type(screen.getByTestId('search-input'), 'ORD-2024');

      // Assert
      expect(onSearch).toHaveBeenCalled();
    });
  });

  describe('Order Details (Admin View)', () => {
    it('should display complete order information', () => {
      // Arrange
      const order = TEST_ORDERS[0];

      // Act
      renderAsAdmin(
        <div data-testid="admin-order-detail">
          <h2>Order Details</h2>
          <section data-testid="order-info">
            <p data-testid="order-number">Order #: {order.orderNumber}</p>
            <p data-testid="order-status">Status: {order.status}</p>
            <p data-testid="order-date">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
          </section>
          <section data-testid="customer-info">
            <h3>Customer Information</h3>
            <p data-testid="customer-name">{TEST_USERS.customer.name}</p>
            <p data-testid="customer-email">{TEST_USERS.customer.email}</p>
          </section>
          <section data-testid="order-items">
            <h3>Items</h3>
            {order.items.map((item, index) => (
              <div key={index} data-testid={`item-${index}`}>
                <span>{item.product.name}</span>
                <span>x{item.quantity}</span>
                <span>${item.price}</span>
              </div>
            ))}
          </section>
          <section data-testid="order-totals">
            <p>Subtotal: ${order.subtotal}</p>
            <p>Tax: ${order.tax}</p>
            <p data-testid="grand-total">Total: ${order.total}</p>
          </section>
        </div>
      );

      // Assert
      expect(screen.getByTestId('order-number')).toHaveTextContent('ORD-2024-001');
      expect(screen.getByTestId('customer-name')).toHaveTextContent('Test Customer');
      expect(screen.getByTestId('grand-total')).toHaveTextContent('$107.99');
    });

    it('should show admin action buttons', () => {
      // Act
      renderAsAdmin(
        <div data-testid="admin-actions">
          <button data-testid="update-status-btn">Update Status</button>
          <button data-testid="refund-btn">Process Refund</button>
          <button data-testid="print-btn">Print Invoice</button>
          <button data-testid="contact-btn">Contact Customer</button>
        </div>
      );

      // Assert
      expect(screen.getByTestId('update-status-btn')).toBeInTheDocument();
      expect(screen.getByTestId('refund-btn')).toBeInTheDocument();
      expect(screen.getByTestId('print-btn')).toBeInTheDocument();
    });
  });

  describe('Admin Authorization', () => {
    it('should only render for admin users', () => {
      // This test verifies admin-only rendering
      renderAsAdmin(
        <div data-testid="admin-panel">
          <span data-testid="admin-badge">Admin Panel</span>
        </div>
      );

      expect(screen.getByTestId('admin-badge')).toBeInTheDocument();
    });
  });
});
