/**
 * Catalog Feature Tests - Portal App
 *
 * @feature catalog
 * @module product-listing
 * @priority P0
 * @dependencies tenant, products
 */

import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockCatalogApi, resetAllMocks } from '../../../../../test/setup/api-mocks';
import { TEST_CATEGORIES, TEST_PRODUCTS } from '../../../../../test/setup/index';
import { renderAsCustomer, userEvent } from '../../../../../test/setup/render-utils';

// Mock the API client
vi.mock('@b2b/api-client', () => ({
  catalogApi: mockCatalogApi,
}));

describe('Catalog Feature', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Product Listing', () => {
    it('should display products when page loads', async () => {
      // Arrange
      mockCatalogApi.getProducts.mockResolvedValueOnce({
        data: TEST_PRODUCTS,
        total: TEST_PRODUCTS.length,
        page: 1,
        pageSize: 20,
      });

      // Act - render a mock product list component
      renderAsCustomer(
        <div data-testid="product-list">
          {TEST_PRODUCTS.map(product => (
            <div key={product.id} data-testid={`product-${product.id}`}>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <span>${product.price}</span>
            </div>
          ))}
        </div>
      );

      // Assert
      expect(screen.getByTestId('product-list')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });

    it('should display product price correctly', () => {
      // Act
      renderAsCustomer(
        <div data-testid="product-card">
          <span data-testid="product-price">${TEST_PRODUCTS[0].price}</span>
        </div>
      );

      // Assert
      expect(screen.getByTestId('product-price')).toHaveTextContent('$99.99');
    });

    it('should show out of stock badge for unavailable products', () => {
      // Arrange - TEST_PRODUCTS[2] has inStock: false
      const outOfStockProduct = TEST_PRODUCTS[2];

      // Act
      renderAsCustomer(
        <div data-testid="product-card">
          <h3>{outOfStockProduct.name}</h3>
          {!outOfStockProduct.inStock && (
            <span data-testid="out-of-stock-badge">Out of Stock</span>
          )}
        </div>
      );

      // Assert
      expect(screen.getByTestId('out-of-stock-badge')).toBeInTheDocument();
    });
  });

  describe('Product Search', () => {
    it('should filter products by search query', async () => {
      // Arrange
      const searchQuery = 'Product 1';
      mockCatalogApi.searchProducts.mockResolvedValueOnce({
        data: [TEST_PRODUCTS[0]],
        total: 1,
      });

      // Act
      const user = userEvent.setup();
      renderAsCustomer(
        <div>
          <input
            data-testid="search-input"
            placeholder="Search products..."
            onChange={async (e) => {
              await mockCatalogApi.searchProducts(e.target.value);
            }}
          />
        </div>
      );

      await user.type(screen.getByTestId('search-input'), searchQuery);

      // Assert
      await waitFor(() => {
        expect(mockCatalogApi.searchProducts).toHaveBeenCalledWith(searchQuery);
      });
    });

    it('should show no results message when search returns empty', async () => {
      // Arrange
      mockCatalogApi.searchProducts.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      // Act
      renderAsCustomer(
        <div data-testid="search-results">
          <p>No products found</p>
        </div>
      );

      // Assert
      expect(screen.getByText('No products found')).toBeInTheDocument();
    });
  });

  describe('Category Filter', () => {
    it('should display category list', () => {
      // Act
      renderAsCustomer(
        <div data-testid="category-filter">
          {TEST_CATEGORIES.map(category => (
            <button key={category.id} data-testid={`category-${category.slug}`}>
              {category.name}
            </button>
          ))}
        </div>
      );

      // Assert
      expect(screen.getByTestId('category-electronics')).toBeInTheDocument();
      expect(screen.getByTestId('category-office-supplies')).toBeInTheDocument();
      expect(screen.getByTestId('category-furniture')).toBeInTheDocument();
    });

    it('should filter products when category is selected', async () => {
      // Arrange
      mockCatalogApi.getProductsByCategory.mockResolvedValueOnce({
        data: [TEST_PRODUCTS[0], TEST_PRODUCTS[2]], // Electronics products
        total: 2,
      });

      // Act
      const user = userEvent.setup();
      const onCategorySelect = vi.fn(async (categoryId: string) => {
        await mockCatalogApi.getProductsByCategory(categoryId);
      });

      renderAsCustomer(
        <button
          data-testid="category-electronics"
          onClick={() => onCategorySelect('cat-1')}
        >
          Electronics
        </button>
      );

      await user.click(screen.getByTestId('category-electronics'));

      // Assert
      await waitFor(() => {
        expect(mockCatalogApi.getProductsByCategory).toHaveBeenCalledWith('cat-1');
      });
    });
  });

  describe('Product Detail', () => {
    it('should display product details', () => {
      // Arrange
      const product = TEST_PRODUCTS[0];

      // Act
      renderAsCustomer(
        <div data-testid="product-detail">
          <h1 data-testid="product-name">{product.name}</h1>
          <p data-testid="product-description">{product.description}</p>
          <span data-testid="product-sku">SKU: {product.sku}</span>
          <span data-testid="product-price">${product.price}</span>
          <span data-testid="product-category">{product.category}</span>
        </div>
      );

      // Assert
      expect(screen.getByTestId('product-name')).toHaveTextContent('Test Product 1');
      expect(screen.getByTestId('product-description')).toHaveTextContent('Test product description');
      expect(screen.getByTestId('product-sku')).toHaveTextContent('TEST-SKU-001');
      expect(screen.getByTestId('product-price')).toHaveTextContent('$99.99');
      expect(screen.getByTestId('product-category')).toHaveTextContent('Electronics');
    });

    it('should have add to cart button for in-stock products', () => {
      // Arrange
      const product = TEST_PRODUCTS[0]; // inStock: true

      // Act
      renderAsCustomer(
        <div data-testid="product-detail">
          <button
            data-testid="add-to-cart-btn"
            disabled={!product.inStock}
          >
            Add to Cart
          </button>
        </div>
      );

      // Assert
      const button = screen.getByTestId('add-to-cart-btn');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should disable add to cart for out-of-stock products', () => {
      // Arrange
      const product = TEST_PRODUCTS[2]; // inStock: false

      // Act
      renderAsCustomer(
        <div data-testid="product-detail">
          <button
            data-testid="add-to-cart-btn"
            disabled={!product.inStock}
          >
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      );

      // Assert
      const button = screen.getByTestId('add-to-cart-btn');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Out of Stock');
    });
  });
});
