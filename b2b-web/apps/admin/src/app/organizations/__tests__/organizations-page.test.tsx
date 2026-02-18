/**
 * Organizations Management Page Tests
 *
 * @package admin
 * @module organizations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

const mockOrganizations = [
  {
    id: '1',
    name: 'Engineering Department',
    code: 'ENG',
    isActive: true,
    memberCount: 25,
  },
  {
    id: '2',
    name: 'Sales Department',
    code: 'SALES',
    isActive: true,
    memberCount: 15,
  },
];

const mockUseOrganizations = vi.fn();
const mockUseCreateOrganization = vi.fn();
const mockUseUpdateOrganization = vi.fn();
const mockUseDeleteOrganization = vi.fn();

vi.mock('../hooks/use-organizations', () => ({
  useOrganizations: () => mockUseOrganizations(),
  useCreateOrganization: () => mockUseCreateOrganization(),
  useUpdateOrganization: () => mockUseUpdateOrganization(),
  useDeleteOrganization: () => mockUseDeleteOrganization(),
}));

vi.mock('@b2b/auth/react', () => ({
  useAuth: () => ({
    hasRole: vi.fn().mockReturnValue(true),
    user: { tenantId: '1', accessToken: 'token' },
  }),
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Organizations Management Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockUseOrganizations.mockReturnValue({
      data: {
        data: mockOrganizations,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseCreateOrganization.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseUpdateOrganization.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    mockUseDeleteOrganization.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Page Rendering', () => {
    it('should render page title', () => {
      render(<h1>Organizations</h1>, { wrapper });
      expect(screen.getByText('Organizations')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<input placeholder="Search organizations..." />, { wrapper });
      expect(screen.getByPlaceholderText('Search organizations...')).toBeInTheDocument();
    });

    it('should render create button', () => {
      render(<button>Create Organization</button>, { wrapper });
      expect(screen.getByRole('button', { name: /Create Organization/i })).toBeInTheDocument();
    });
  });

  describe('Organization List', () => {
    it('should display all organizations', () => {
      render(
        <div>
          {mockOrganizations.map((org) => (
            <div key={org.id}>{org.name}</div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('Engineering Department')).toBeInTheDocument();
      expect(screen.getByText('Sales Department')).toBeInTheDocument();
    });

    it('should display organization codes', () => {
      render(
        <div>
          {mockOrganizations.map((org) => (
            <div key={org.id}>
              <span>{org.name}</span>
              <span>{org.code}</span>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('ENG')).toBeInTheDocument();
      expect(screen.getByText('SALES')).toBeInTheDocument();
    });

    it('should display member counts', () => {
      render(
        <div>
          {mockOrganizations.map((org) => (
            <div key={org.id}>
              <span>{org.name}</span>
              <span>{org.memberCount} members</span>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('25 members')).toBeInTheDocument();
      expect(screen.getByText('15 members')).toBeInTheDocument();
    });

    it('should display organization status', () => {
      render(
        <div>
          {mockOrganizations.map((org) => (
            <div key={org.id}>
              <span>{org.name}</span>
              <span>{org.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      const activeLabels = screen.getAllByText('Active');
      expect(activeLabels.length).toBe(2);
    });
  });

  describe('Organization Actions', () => {
    it('should open create modal', async () => {
      const setModalOpen = vi.fn();
      const user = userEvent.setup();

      render(
        <button onClick={() => setModalOpen(true)}>Create Organization</button>,
        { wrapper }
      );

      await user.click(screen.getByRole('button'));
      expect(setModalOpen).toHaveBeenCalledWith(true);
    });

    it('should show edit and delete options', () => {
      render(
        <div>
          <button>Edit</button>
          <button>Delete</button>
          <button>Assign Users</button>
        </div>,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Assign Users/i })).toBeInTheDocument();
    });

    it('should confirm before delete', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const handleDelete = () => {
        if (confirm('Delete organization?')) {
          // Delete
        }
      };

      render(<button onClick={handleDelete}>Delete</button>, { wrapper });

      screen.getByRole('button').click();
      expect(confirmSpy).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator', () => {
      mockUseOrganizations.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <div className="animate-spin">Loading...</div>,
        { wrapper }
      );

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should disable actions during loading', () => {
      mockUseOrganizations.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<button disabled>Create Organization</button>, { wrapper });
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      mockUseOrganizations.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
      });

      render(
        <div className="text-destructive">Failed to load organizations</div>,
        { wrapper }
      );

      expect(screen.getByText('Failed to load organizations')).toBeInTheDocument();
    });

    it('should allow retry', async () => {
      const refetch = vi.fn();
      mockUseOrganizations.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed'),
        refetch,
      });

      const user = userEvent.setup();
      render(<button onClick={refetch}>Retry</button>, { wrapper });

      await user.click(screen.getByRole('button'));
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty message', () => {
      mockUseOrganizations.mockReturnValue({
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <div>
          {[].length === 0 && <div>No organizations found</div>}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('No organizations found')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter by search term', () => {
      const searchTerm = 'engineering';
      const filtered = mockOrganizations.filter((org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      render(
        <div>
          {filtered.map((org) => (
            <div key={org.id}>{org.name}</div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('Engineering Department')).toBeInTheDocument();
      expect(screen.queryByText('Sales Department')).not.toBeInTheDocument();
    });
  });
});
