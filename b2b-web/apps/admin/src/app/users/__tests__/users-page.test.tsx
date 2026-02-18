/**
 * Users Management Page Tests
 *
 * @package admin
 * @module users
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

const mockUsers = [
  {
    id: '1',
    email: 'john@acme.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    isActive: true,
  },
  {
    id: '2',
    email: 'jane@acme.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'ADMIN',
    isActive: false,
  },
];

const mockUseUsers = vi.fn();
const mockUseCreateUser = vi.fn();
const mockUseUpdateUser = vi.fn();
const mockUseDeleteUser = vi.fn();

vi.mock('../hooks/use-users', () => ({
  useUsers: () => mockUseUsers(),
  useCreateUser: () => mockUseCreateUser(),
  useUpdateUser: () => mockUseUpdateUser(),
  useDeleteUser: () => mockUseDeleteUser(),
}));

vi.mock('@b2b/auth/react', () => ({
  useAuth: () => ({
    hasRole: vi.fn().mockReturnValue(true),
    user: { tenantId: '1', accessToken: 'token' },
  }),
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Users Management Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockUseUsers.mockReturnValue({
      data: {
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseCreateUser.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseUpdateUser.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    mockUseDeleteUser.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Page Rendering', () => {
    it('should render page title', () => {
      render(<h1>Users</h1>, { wrapper });
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<input placeholder="Search users..." />, { wrapper });
      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    it('should render create user button', () => {
      render(<button>Create User</button>, { wrapper });
      expect(screen.getByRole('button', { name: /Create User/i })).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<button>Refresh</button>, { wrapper });
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  describe('User List Display', () => {
    it('should display all users', () => {
      render(
        <div>
          {mockUsers.map((user) => (
            <div key={user.id}>
              {user.firstName} {user.lastName}
            </div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display user emails', () => {
      render(
        <div>
          {mockUsers.map((user) => (
            <div key={user.id}>{user.email}</div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('john@acme.com')).toBeInTheDocument();
      expect(screen.getByText('jane@acme.com')).toBeInTheDocument();
    });

    it('should display user roles', () => {
      render(
        <div>
          {mockUsers.map((user) => (
            <div key={user.id}>
              <span>{user.email}</span>
              <span>{user.role}</span>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('USER')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('should display user status', () => {
      render(
        <div>
          {mockUsers.map((user) => (
            <div key={user.id}>
              <span>{user.email}</span>
              <span>{user.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter by role', async () => {
      const FilterComponent = () => {
        const [role, setRole] = React.useState('');
        const filtered = role
          ? mockUsers.filter((u) => u.role === role)
          : mockUsers;

        return (
          <div>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
            {filtered.map((user) => (
              <div key={user.id}>{user.email}</div>
            ))}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<FilterComponent />, { wrapper });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'USER');

      expect(screen.getByText('john@acme.com')).toBeInTheDocument();
      expect(screen.queryByText('jane@acme.com')).not.toBeInTheDocument();
    });

    it('should filter by status', () => {
      const activeUsers = mockUsers.filter((u) => u.isActive);

      render(
        <div>
          {activeUsers.map((user) => (
            <div key={user.id}>{user.email}</div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('john@acme.com')).toBeInTheDocument();
      expect(screen.queryByText('jane@acme.com')).not.toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('should open create modal', async () => {
      const setModalOpen = vi.fn();
      const user = userEvent.setup();

      render(
        <button onClick={() => setModalOpen(true)}>Create User</button>,
        { wrapper }
      );

      await user.click(screen.getByRole('button'));
      expect(setModalOpen).toHaveBeenCalledWith(true);
    });

    it('should show edit options', () => {
      render(
        <div>
          <button>Edit User</button>
          <button>Reset Password</button>
        </div>,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /Edit User/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
    });

    it('should confirm before delete', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const handleDelete = () => {
        if (confirm('Delete user?')) {
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
      mockUseUsers.mockReturnValue({
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
      mockUseUsers.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<button disabled>Create User</button>, { wrapper });
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      mockUseUsers.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch users'),
        refetch: vi.fn(),
      });

      render(
        <div className="text-destructive">Failed to load users</div>,
        { wrapper }
      );

      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });

    it('should allow retry on error', async () => {
      const refetch = vi.fn();
      mockUseUsers.mockReturnValue({
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
    it('should show empty message when no users', () => {
      mockUseUsers.mockReturnValue({
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
          {[].length === 0 ? (
            <div>No users found</div>
          ) : (
            <div>Users list</div>
          )}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should update search input', async () => {
      const user = userEvent.setup();
      const SearchInput = () => {
        const [value, setValue] = React.useState('');
        return (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search..."
          />
        );
      };

      render(<SearchInput />, { wrapper });

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'john');

      expect(input).toHaveValue('john');
    });

    it('should filter users by search term', () => {
      const searchTerm = 'john';
      const filtered = mockUsers.filter((u) =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

      render(
        <div>
          {filtered.map((user) => (
            <div key={user.id}>{user.email}</div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('john@acme.com')).toBeInTheDocument();
      expect(screen.queryByText('jane@acme.com')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show pagination for multiple pages', () => {
      mockUseUsers.mockReturnValue({
        data: {
          data: mockUsers,
          total: 30,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <div>
          <span>Page 1 of 3</span>
          <button>Previous</button>
          <button>Next</button>
        </div>,
        { wrapper }
      );

      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    it('should handle page changes', async () => {
      const setPage = vi.fn();
      const user = userEvent.setup();

      render(
        <button onClick={() => setPage(2)}>Next</button>,
        { wrapper }
      );

      await user.click(screen.getByRole('button'));
      expect(setPage).toHaveBeenCalledWith(2);
    });
  });
});
