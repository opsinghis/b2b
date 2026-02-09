/**
 * Test Setup Utilities for B2B Web Platform
 *
 * This module provides setup functions for test data initialization.
 * Used by feature-based test commands to prepare test prerequisites.
 */

import { vi } from 'vitest';

// Mock API client for tests
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

// Test data constants
export const TEST_TENANT = {
  id: 'test-tenant-id',
  name: 'Test Tenant',
  slug: 'test-tenant',
  settings: {
    currency: 'USD',
    locale: 'en-US',
    features: {
      quotes: true,
      contracts: true,
      salaryDeduction: false,
    },
  },
};

export const TEST_USERS = {
  customer: {
    id: 'test-customer-id',
    email: 'customer@test.local',
    name: 'Test Customer',
    role: 'USER',
    tenantId: TEST_TENANT.id,
  },
  admin: {
    id: 'test-admin-id',
    email: 'admin@test.local',
    name: 'Test Admin',
    role: 'ADMIN',
    tenantId: TEST_TENANT.id,
  },
  superAdmin: {
    id: 'test-super-admin-id',
    email: 'superadmin@test.local',
    name: 'Test Super Admin',
    role: 'SUPER_ADMIN',
    tenantId: TEST_TENANT.id,
  },
};

export const TEST_PRODUCTS = [
  {
    id: 'product-1',
    sku: 'TEST-SKU-001',
    name: 'Test Product 1',
    description: 'Test product description',
    price: 99.99,
    category: 'Electronics',
    imageUrl: '/images/product1.jpg',
    inStock: true,
    quantity: 100,
  },
  {
    id: 'product-2',
    sku: 'TEST-SKU-002',
    name: 'Test Product 2',
    description: 'Another test product',
    price: 149.99,
    category: 'Office Supplies',
    imageUrl: '/images/product2.jpg',
    inStock: true,
    quantity: 50,
  },
  {
    id: 'product-3',
    sku: 'TEST-SKU-003',
    name: 'Test Product 3',
    description: 'Third test product',
    price: 29.99,
    category: 'Electronics',
    imageUrl: '/images/product3.jpg',
    inStock: false,
    quantity: 0,
  },
];

export const TEST_CATEGORIES = [
  { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
  { id: 'cat-2', name: 'Office Supplies', slug: 'office-supplies' },
  { id: 'cat-3', name: 'Furniture', slug: 'furniture' },
];

export const TEST_CART = {
  id: 'test-cart-id',
  userId: TEST_USERS.customer.id,
  items: [
    {
      id: 'cart-item-1',
      productId: TEST_PRODUCTS[0].id,
      product: TEST_PRODUCTS[0],
      quantity: 2,
      price: TEST_PRODUCTS[0].price,
    },
  ],
  subtotal: 199.98,
  tax: 16.00,
  total: 215.98,
};

export const TEST_ORDERS = [
  {
    id: 'order-1',
    orderNumber: 'ORD-2024-001',
    userId: TEST_USERS.customer.id,
    status: 'CONFIRMED',
    items: [
      {
        productId: TEST_PRODUCTS[0].id,
        product: TEST_PRODUCTS[0],
        quantity: 1,
        price: TEST_PRODUCTS[0].price,
      },
    ],
    subtotal: 99.99,
    tax: 8.00,
    total: 107.99,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'order-2',
    orderNumber: 'ORD-2024-002',
    userId: TEST_USERS.customer.id,
    status: 'DELIVERED',
    items: [
      {
        productId: TEST_PRODUCTS[1].id,
        product: TEST_PRODUCTS[1],
        quantity: 2,
        price: TEST_PRODUCTS[1].price,
      },
    ],
    subtotal: 299.98,
    tax: 24.00,
    total: 323.98,
    createdAt: '2024-01-10T10:00:00Z',
  },
];

export const TEST_QUOTES = [
  {
    id: 'quote-1',
    quoteNumber: 'QT-2024-001',
    title: 'Q4 Enterprise Deal',
    description: 'Annual software licensing quote',
    status: 'DRAFT',
    customerId: TEST_USERS.customer.id,
    customerName: TEST_USERS.customer.name,
    customerEmail: TEST_USERS.customer.email,
    lineItems: [
      {
        id: 'line-item-1',
        productId: TEST_PRODUCTS[0].id,
        productName: TEST_PRODUCTS[0].name,
        productSku: TEST_PRODUCTS[0].sku,
        quantity: 5,
        unitPrice: '99.99',
        originalPrice: '99.99',
        priceOverride: false,
        totalPrice: '499.95',
      },
    ],
    subtotal: '499.95',
    discountAmount: '0',
    discountPercent: '0',
    taxAmount: '40.00',
    totalAmount: '539.95',
    currency: 'USD',
    validUntil: '2024-03-31',
    notes: 'Terms and conditions apply',
    createdById: TEST_USERS.customer.id,
    createdByName: TEST_USERS.customer.name,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'quote-2',
    quoteNumber: 'QT-2024-002',
    title: 'Office Supplies Bulk Order',
    description: 'Monthly office supplies',
    status: 'PENDING_APPROVAL',
    customerId: TEST_USERS.customer.id,
    customerName: TEST_USERS.customer.name,
    customerEmail: TEST_USERS.customer.email,
    lineItems: [
      {
        id: 'line-item-2',
        productId: TEST_PRODUCTS[1].id,
        productName: TEST_PRODUCTS[1].name,
        productSku: TEST_PRODUCTS[1].sku,
        quantity: 10,
        unitPrice: '149.99',
        originalPrice: '149.99',
        priceOverride: false,
        totalPrice: '1499.90',
      },
    ],
    subtotal: '1499.90',
    discountAmount: '149.99',
    discountPercent: '10',
    taxAmount: '108.00',
    totalAmount: '1457.91',
    currency: 'USD',
    validUntil: '2024-02-28',
    notes: 'Bulk discount applied',
    createdById: TEST_USERS.customer.id,
    createdByName: TEST_USERS.customer.name,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-12T10:00:00Z',
    submittedAt: '2024-01-12T10:00:00Z',
  },
];

// Setup functions
export async function setupTenant() {
  return TEST_TENANT;
}

export async function setupUsers(roles: ('customer' | 'admin' | 'superAdmin')[] = ['customer']) {
  return roles.map(role => TEST_USERS[role]);
}

export async function setupCategories(count = 3) {
  return TEST_CATEGORIES.slice(0, count);
}

export async function setupProducts(count = 3) {
  return TEST_PRODUCTS.slice(0, count);
}

export async function setupCart() {
  return TEST_CART;
}

export async function setupOrders(count = 2) {
  return TEST_ORDERS.slice(0, count);
}

// Convenience setup functions
export async function setupCatalog() {
  const tenant = await setupTenant();
  const categories = await setupCategories();
  const products = await setupProducts();
  return { tenant, categories, products };
}

export async function setupCartWithProducts() {
  const { tenant, categories, products } = await setupCatalog();
  const users = await setupUsers(['customer']);
  const cart = await setupCart();
  return { tenant, categories, products, users, cart };
}

export async function setupOrderHistory() {
  const cartSetup = await setupCartWithProducts();
  const orders = await setupOrders();
  return { ...cartSetup, orders };
}
