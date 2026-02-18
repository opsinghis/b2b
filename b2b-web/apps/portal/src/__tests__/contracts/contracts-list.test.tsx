/**
 * Contracts List Page Tests
 *
 * Tests for the Contracts list page component that displays
 * paginated contracts with search, filtering, and navigation.
 *
 * Feature: Contract Management (Phase 1)
 * Component: apps/portal/src/app/contracts/page.tsx
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

import ContractsPage from '../../app/contracts/page';
import type {
  ContractsResponse,
  ContractDto,
  ContractStatus,
} from '../../app/contracts/hooks';

// =============================================================================
// Mocks
// =============================================================================

// Mock Auth
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  tenantId: 'test-tenant-id',
  accessToken: 'mock-access-token',
};

vi.mock('@b2b/auth/react', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  }),
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock contracts hook
const mockUseContracts = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../../app/contracts/hooks', async () => {
  const actual = await vi.importActual('../../app/contracts/hooks');
  return {
    ...actual,
    useContracts: (params: any) => mockUseContracts(params),
  };
});

// Mock components (we're testing the page, not the child components)
vi.mock('../../app/contracts/components', () => ({
  ContractsTable: ({ contracts }: { contracts: ContractDto[] }) => (
    <div data-testid="contracts-table">
      {contracts.map((contract) => (
        <div key={contract.id} data-testid={`contract-${contract.id}`}>
          {contract.contractNumber} - {contract.title}
        </div>
      ))}
    </div>
  ),
  ContractsFilters: ({
    statusFilter,
    startDate,
    endDate,
    onStatusChange,
    onStartDateChange,
    onEndDateChange,
    onClearFilters,
  }: any) => (
    <div data-testid="contracts-filters">
      <button
        onClick={() => onStatusChange('ACTIVE')}
        data-testid="filter-status-active"
      >
        Filter ACTIVE
      </button>
      <button
        onClick={() => onStartDateChange(new Date('2024-01-01'))}
        data-testid="filter-start-date"
      >
        Set Start Date
      </button>
      <button
        onClick={() => onEndDateChange(new Date('2024-12-31'))}
        data-testid="filter-end-date"
      >
        Set End Date
      </button>
      <button onClick={onClearFilters} data-testid="clear-filters">
        Clear Filters
      </button>
      <div data-testid="current-status-filter">{statusFilter || 'none'}</div>
      <div data-testid="current-start-date">
        {startDate ? startDate.toISOString() : 'none'}
      </div>
      <div data-testid="current-end-date">
        {endDate ? endDate.toISOString() : 'none'}
      </div>
    </div>
  ),
  Pagination: ({ currentPage, totalPages, onPageChange }: any) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(1)} data-testid="page-1">
        Page 1
      </button>
      <button onClick={() => onPageChange(2)} data-testid="page-2">
        Page 2
      </button>
      <span data-testid="current-page">{currentPage}</span>
      <span data-testid="total-pages">{totalPages}</span>
    </div>
  ),
}));

// =============================================================================
// Test Data
// =============================================================================

const createMockContract = (
  id: string,
  overrides?: Partial<ContractDto>
): ContractDto => ({
  id,
  contractNumber: `CON-${id}`,
  title: `Test Contract ${id}`,
  description: `Description for contract ${id}`,
  status: 'ACTIVE' as ContractStatus,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  totalValue: '100000',
  currency: 'USD',
  organizationId: 'org-123',
  organizationName: 'Test Organization',
  createdById: 'user-123',
  createdByName: 'John Doe',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  version: 1,
  ...overrides,
});

const mockContractsResponse: ContractsResponse = {
  data: [
    createMockContract('001'),
    createMockContract('002', { status: 'DRAFT' }),
    createMockContract('003', { status: 'PENDING_APPROVAL' }),
  ],
  total: 3,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const mockEmptyResponse: ContractsResponse = {
  data: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

const mockPaginatedResponse: ContractsResponse = {
  data: [createMockContract('001'), createMockContract('002')],
  total: 25,
  page: 1,
  limit: 10,
  totalPages: 3,
};

// =============================================================================
// Tests
// =============================================================================

describe('ContractsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Page Rendering
  // ===========================================================================

  describe('Page Rendering', () => {
    it('should render page header with title and description', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.getByText('My Contracts')).toBeInTheDocument();
      expect(
        screen.getByText('View and manage your contracts')
      ).toBeInTheDocument();
    });

    it('should render Create Contract button', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const createButton = screen.getByRole('link', { name: /Create Contract/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveAttribute('href', '/contracts/new');
    });

    it('should render Back to Dashboard button', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const backButton = screen.getByRole('link', { name: /Back to Dashboard/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('href', '/');
    });

    it('should render search input', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const searchInput = screen.getByPlaceholderText('Search contracts...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const refreshButton = screen.getByRole('button', { name: '' });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('should display loading spinner when fetching contracts', () => {
      mockUseContracts.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<ContractsPage />);

      // Should show loading spinner (RefreshCw icon with animate-spin)
      // The loading state shows a spinner in the center
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not display loading spinner when data is loaded', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.getByTestId('contracts-table')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe('Error State', () => {
    it('should display error message when fetching fails', () => {
      mockUseContracts.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch contracts'),
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(
        screen.getByText('Failed to load contracts. Please try again.')
      ).toBeInTheDocument();
    });

    it('should not display error message when data loads successfully', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(
        screen.queryByText('Failed to load contracts. Please try again.')
      ).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Contracts Display
  // ===========================================================================

  describe('Contracts Display', () => {
    it('should display contracts table when data is loaded', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.getByTestId('contracts-table')).toBeInTheDocument();
      expect(screen.getByTestId('contract-001')).toBeInTheDocument();
      expect(screen.getByTestId('contract-002')).toBeInTheDocument();
      expect(screen.getByTestId('contract-003')).toBeInTheDocument();
    });

    it('should pass contracts data to ContractsTable component', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const table = screen.getByTestId('contracts-table');
      expect(within(table).getByText(/CON-001 - Test Contract 001/)).toBeInTheDocument();
      expect(within(table).getByText(/CON-002 - Test Contract 002/)).toBeInTheDocument();
      expect(within(table).getByText(/CON-003 - Test Contract 003/)).toBeInTheDocument();
    });

    it('should not display contracts table when loading', () => {
      mockUseContracts.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.queryByTestId('contracts-table')).not.toBeInTheDocument();
    });

    it('should not display contracts table when error occurs', () => {
      mockUseContracts.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.queryByTestId('contracts-table')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Search Functionality
  // ===========================================================================

  describe('Search Functionality', () => {
    it('should update search input value when typing', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const searchInput = screen.getByPlaceholderText('Search contracts...');
      await user.type(searchInput, 'test search');

      expect(searchInput).toHaveValue('test search');
    });

    it('should debounce search input with 300ms delay', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const searchInput = screen.getByPlaceholderText('Search contracts...');

      // Type into search
      await user.type(searchInput, 'test');

      // Wait for debounce to complete (300ms + buffer)
      await waitFor(
        () => {
          expect(mockUseContracts).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'test' })
          );
        },
        { timeout: 1000 }
      );
    });

    it('should reset page to 1 when searching', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockPaginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const searchInput = screen.getByPlaceholderText('Search contracts...');
      await user.type(searchInput, 'test');

      // Wait for debounce to complete
      await waitFor(
        () => {
          expect(mockUseContracts).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, search: 'test' })
          );
        },
        { timeout: 1000 }
      );
    });

    it('should clear search when filters are cleared', async () => {
      const user = userEvent.setup({ delay: null });
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const searchInput = screen.getByPlaceholderText('Search contracts...');
      await user.type(searchInput, 'test search');

      const clearButton = screen.getByTestId('clear-filters');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });
  });

  // ===========================================================================
  // Filters
  // ===========================================================================

  describe('Filters', () => {
    it('should render ContractsFilters component', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.getByTestId('contracts-filters')).toBeInTheDocument();
    });

    it('should update status filter when selected', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const filterButton = screen.getByTestId('filter-status-active');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-status-filter')).toHaveTextContent('ACTIVE');
      });
    });

    it('should pass status filter to useContracts hook', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const filterButton = screen.getByTestId('filter-status-active');
      await user.click(filterButton);

      await waitFor(() => {
        expect(mockUseContracts).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'ACTIVE' })
        );
      });
    });

    it('should update start date filter when selected', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const startDateButton = screen.getByTestId('filter-start-date');
      await user.click(startDateButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-start-date')).toHaveTextContent('2024-01-01');
      });
    });

    it('should format start date for API when passed to useContracts', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const startDateButton = screen.getByTestId('filter-start-date');
      await user.click(startDateButton);

      await waitFor(() => {
        expect(mockUseContracts).toHaveBeenCalledWith(
          expect.objectContaining({ startDate: '2024-01-01' })
        );
      });
    });

    it('should update end date filter when selected', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const endDateButton = screen.getByTestId('filter-end-date');
      await user.click(endDateButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-end-date')).toHaveTextContent('2024-12-31');
      });
    });

    it('should format end date for API when passed to useContracts', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const endDateButton = screen.getByTestId('filter-end-date');
      await user.click(endDateButton);

      await waitFor(() => {
        expect(mockUseContracts).toHaveBeenCalledWith(
          expect.objectContaining({ endDate: '2024-12-31' })
        );
      });
    });

    it('should reset page to 1 when filters change', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockPaginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      // Change to page 2 first
      const page2Button = screen.getByTestId('page-2');
      await user.click(page2Button);

      // Then apply a filter
      const filterButton = screen.getByTestId('filter-status-active');
      await user.click(filterButton);

      await waitFor(() => {
        expect(mockUseContracts).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1, status: 'ACTIVE' })
        );
      });
    });

    it('should clear all filters when clear filters is clicked', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      // Apply filters
      await user.click(screen.getByTestId('filter-status-active'));
      await user.click(screen.getByTestId('filter-start-date'));
      await user.click(screen.getByTestId('filter-end-date'));

      // Clear filters
      const clearButton = screen.getByTestId('clear-filters');
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-status-filter')).toHaveTextContent('none');
        expect(screen.getByTestId('current-start-date')).toHaveTextContent('none');
        expect(screen.getByTestId('current-end-date')).toHaveTextContent('none');
      });
    });
  });

  // ===========================================================================
  // Pagination
  // ===========================================================================

  describe('Pagination', () => {
    it('should display pagination when total pages > 1', () => {
      mockUseContracts.mockReturnValue({
        data: mockPaginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('should not display pagination when total pages = 1', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });

    it('should change page when pagination is clicked', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockPaginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const page2Button = screen.getByTestId('page-2');
      await user.click(page2Button);

      await waitFor(() => {
        expect(mockUseContracts).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('should pass correct pagination data to Pagination component', () => {
      mockUseContracts.mockReturnValue({
        data: mockPaginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      expect(screen.getByTestId('total-pages')).toHaveTextContent('3');
    });
  });

  // ===========================================================================
  // Refresh Functionality
  // ===========================================================================

  describe('Refresh Functionality', () => {
    it('should call refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const refreshButton = screen.getByRole('button', { name: '' });
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button when loading', () => {
      mockUseContracts.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const refreshButton = screen.getByRole('button', { name: '' });
      expect(refreshButton).toBeDisabled();
    });

    it('should not disable refresh button when not loading', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const refreshButton = screen.getByRole('button', { name: '' });
      expect(refreshButton).not.toBeDisabled();
    });
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('Empty State', () => {
    it('should display empty contracts table when no contracts exist', () => {
      mockUseContracts.mockReturnValue({
        data: mockEmptyResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const table = screen.getByTestId('contracts-table');
      expect(table).toBeInTheDocument();
      expect(within(table).queryByTestId(/^contract-/)).not.toBeInTheDocument();
    });

    it('should still show search and filters in empty state', () => {
      mockUseContracts.mockReturnValue({
        data: mockEmptyResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(screen.getByPlaceholderText('Search contracts...')).toBeInTheDocument();
      expect(screen.getByTestId('contracts-filters')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Query Parameters
  // ===========================================================================

  describe('Query Parameters', () => {
    it('should call useContracts with default parameters', () => {
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      expect(mockUseContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          status: undefined,
          startDate: undefined,
          endDate: undefined,
          search: undefined,
        })
      );
    });

    it('should pass all active filters to useContracts', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockContractsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      // Apply all filters
      await user.click(screen.getByTestId('filter-status-active'));
      await user.click(screen.getByTestId('filter-start-date'));
      await user.click(screen.getByTestId('filter-end-date'));

      await waitFor(() => {
        expect(mockUseContracts).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'ACTIVE',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          })
        );
      });
    });

    it('should maintain page limit of 10 items', async () => {
      const user = userEvent.setup();
      mockUseContracts.mockReturnValue({
        data: mockPaginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ContractsPage />);

      const page2Button = screen.getByTestId('page-2');
      await user.click(page2Button);

      await waitFor(() => {
        expect(mockUseContracts).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
          })
        );
      });
    });
  });
});
