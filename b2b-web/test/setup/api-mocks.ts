/**
 * API Mock Utilities
 *
 * Mock functions for API calls in tests.
 */

import { vi } from 'vitest';
import {
  TEST_PRODUCTS,
  TEST_CATEGORIES,
  TEST_CART,
  TEST_ORDERS,
  TEST_USERS,
  TEST_TENANT,
} from './index';

// Auth API mocks
export const mockAuthApi = {
  login: vi.fn().mockResolvedValue({
    user: TEST_USERS.customer,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
  logout: vi.fn().mockResolvedValue({ success: true }),
  refreshToken: vi.fn().mockResolvedValue({
    accessToken: 'new-mock-access-token',
    refreshToken: 'new-mock-refresh-token',
  }),
  getCurrentUser: vi.fn().mockResolvedValue(TEST_USERS.customer),
};

// Catalog API mocks
export const mockCatalogApi = {
  getProducts: vi.fn().mockResolvedValue({
    data: TEST_PRODUCTS,
    total: TEST_PRODUCTS.length,
    page: 1,
    pageSize: 20,
  }),
  getProduct: vi.fn().mockImplementation((id: string) => {
    const product = TEST_PRODUCTS.find(p => p.id === id);
    return Promise.resolve(product || null);
  }),
  searchProducts: vi.fn().mockImplementation((query: string) => {
    const results = TEST_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );
    return Promise.resolve({ data: results, total: results.length });
  }),
  getCategories: vi.fn().mockResolvedValue(TEST_CATEGORIES),
  getProductsByCategory: vi.fn().mockImplementation((categoryId: string) => {
    const category = TEST_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return Promise.resolve({ data: [], total: 0 });
    const products = TEST_PRODUCTS.filter(p => p.category === category.name);
    return Promise.resolve({ data: products, total: products.length });
  }),
};

// Cart API mocks
export const mockCartApi = {
  getCart: vi.fn().mockResolvedValue(TEST_CART),
  addToCart: vi.fn().mockImplementation((productId: string, quantity: number) => {
    const product = TEST_PRODUCTS.find(p => p.id === productId);
    if (!product) return Promise.reject(new Error('Product not found'));
    return Promise.resolve({
      ...TEST_CART,
      items: [
        ...TEST_CART.items,
        {
          id: `cart-item-${Date.now()}`,
          productId,
          product,
          quantity,
          price: product.price,
        },
      ],
    });
  }),
  updateCartItem: vi.fn().mockImplementation((itemId: string, quantity: number) => {
    return Promise.resolve({
      ...TEST_CART,
      items: TEST_CART.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    });
  }),
  removeFromCart: vi.fn().mockImplementation((itemId: string) => {
    return Promise.resolve({
      ...TEST_CART,
      items: TEST_CART.items.filter(item => item.id !== itemId),
    });
  }),
  clearCart: vi.fn().mockResolvedValue({ ...TEST_CART, items: [] }),
};

// Orders API mocks
export const mockOrdersApi = {
  getOrders: vi.fn().mockResolvedValue({
    data: TEST_ORDERS,
    total: TEST_ORDERS.length,
    page: 1,
    pageSize: 20,
  }),
  getOrder: vi.fn().mockImplementation((id: string) => {
    const order = TEST_ORDERS.find(o => o.id === id);
    return Promise.resolve(order || null);
  }),
  createOrder: vi.fn().mockResolvedValue({
    id: `order-${Date.now()}`,
    orderNumber: `ORD-2024-${Date.now()}`,
    status: 'PENDING',
    items: TEST_CART.items,
    subtotal: TEST_CART.subtotal,
    tax: TEST_CART.tax,
    total: TEST_CART.total,
    createdAt: new Date().toISOString(),
  }),
  cancelOrder: vi.fn().mockImplementation((id: string) => {
    const order = TEST_ORDERS.find(o => o.id === id);
    if (!order) return Promise.reject(new Error('Order not found'));
    return Promise.resolve({ ...order, status: 'CANCELLED' });
  }),
};

// Quotes API mocks
export const mockQuotesApi = {
  getQuotes: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getQuote: vi.fn().mockResolvedValue(null),
  createQuote: vi.fn().mockResolvedValue({
    id: `quote-${Date.now()}`,
    status: 'DRAFT',
    items: [],
    createdAt: new Date().toISOString(),
  }),
  submitQuote: vi.fn().mockResolvedValue({ status: 'SUBMITTED' }),
};

// Contracts API mocks
export const mockContractsApi = {
  getContracts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getContract: vi.fn().mockResolvedValue(null),
};

// Admin API mocks
export const mockAdminApi = {
  getTenants: vi.fn().mockResolvedValue({ data: [TEST_TENANT], total: 1 }),
  getUsers: vi.fn().mockResolvedValue({
    data: Object.values(TEST_USERS),
    total: Object.values(TEST_USERS).length,
  }),
  getOrders: vi.fn().mockResolvedValue({
    data: TEST_ORDERS,
    total: TEST_ORDERS.length,
  }),
  updateOrderStatus: vi.fn().mockImplementation((id: string, status: string) => {
    const order = TEST_ORDERS.find(o => o.id === id);
    if (!order) return Promise.reject(new Error('Order not found'));
    return Promise.resolve({ ...order, status });
  }),
};

// Combined API mock
export const mockApi = {
  auth: mockAuthApi,
  catalog: mockCatalogApi,
  cart: mockCartApi,
  orders: mockOrdersApi,
  quotes: mockQuotesApi,
  contracts: mockContractsApi,
  admin: mockAdminApi,
};

// Reset all mocks
export function resetAllMocks() {
  Object.values(mockAuthApi).forEach(fn => fn.mockClear());
  Object.values(mockCatalogApi).forEach(fn => fn.mockClear());
  Object.values(mockCartApi).forEach(fn => fn.mockClear());
  Object.values(mockOrdersApi).forEach(fn => fn.mockClear());
  Object.values(mockQuotesApi).forEach(fn => fn.mockClear());
  Object.values(mockContractsApi).forEach(fn => fn.mockClear());
  Object.values(mockAdminApi).forEach(fn => fn.mockClear());
}
