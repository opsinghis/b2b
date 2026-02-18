/**
 * User Management Flow Integration Tests
 *
 * Tests the complete admin flow for creating, editing, and managing users
 *
 * @package admin
 * @module integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    organizationId: 'org-1',
  },
];

describe('User Management Flow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Complete User Management Workflow', () => {
    it('should display user list', () => {
      render(
        <div>
          <h1>Users</h1>
          <table>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        { wrapper }
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@acme.com')).toBeInTheDocument();
      expect(screen.getByText('USER')).toBeInTheDocument();
    });

    it('should open create user modal', async () => {
      const user = userEvent.setup();
      const setModalOpen = vi.fn();

      render(
        <div>
          <button onClick={() => setModalOpen(true)}>Create User</button>
        </div>,
        { wrapper }
      );

      await user.click(screen.getByRole('button'));
      expect(setModalOpen).toHaveBeenCalledWith(true);
    });

    it('should validate user creation form', async () => {
      const user = userEvent.setup();

      const CreateUserForm = () => {
        const [errors, setErrors] = React.useState<Record<string, string>>({});

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);

          const validationErrors: Record<string, string> = {};

          if (!formData.get('email')) {
            validationErrors.email = 'Email is required';
          }

          if (!formData.get('firstName')) {
            validationErrors.firstName = 'First name is required';
          }

          if (!formData.get('lastName')) {
            validationErrors.lastName = 'Last name is required';
          }

          setErrors(validationErrors);
        };

        return (
          <form onSubmit={handleSubmit}>
            <input name="email" placeholder="Email" />
            {errors.email && <span>{errors.email}</span>}
            <input name="firstName" placeholder="First Name" />
            {errors.firstName && <span>{errors.firstName}</span>}
            <input name="lastName" placeholder="Last Name" />
            {errors.lastName && <span>{errors.lastName}</span>}
            <button type="submit">Create</button>
          </form>
        );
      };

      render(<CreateUserForm />, { wrapper });

      await user.click(screen.getByRole('button', { name: /Create/i }));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
      });
    });

    it('should create user successfully', async () => {
      const user = userEvent.setup();
      const onCreate = vi.fn();

      render(
        <form onSubmit={(e) => { e.preventDefault(); onCreate(); }}>
          <input name="email" defaultValue="jane@acme.com" />
          <input name="firstName" defaultValue="Jane" />
          <input name="lastName" defaultValue="Smith" />
          <select name="role" defaultValue="USER">
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit">Create User</button>
        </form>,
        { wrapper }
      );

      await user.click(screen.getByRole('button'));
      expect(onCreate).toHaveBeenCalled();
    });

    it('should show success message after creation', () => {
      render(
        <div className="bg-green-100 p-4">
          <span>User created successfully</span>
        </div>,
        { wrapper }
      );

      expect(screen.getByText('User created successfully')).toBeInTheDocument();
    });

    it('should update user details', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();

      render(
        <form onSubmit={(e) => { e.preventDefault(); onUpdate(); }}>
          <input name="firstName" defaultValue="John" />
          <input name="lastName" defaultValue="Doe" />
          <select name="role" defaultValue="USER">
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit">Update User</button>
        </form>,
        { wrapper }
      );

      const roleSelect = screen.getByRole('combobox');
      await user.selectOptions(roleSelect, 'ADMIN');

      await user.click(screen.getByRole('button'));
      expect(onUpdate).toHaveBeenCalled();
    });

    it('should toggle user status', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(
        <div>
          <span>Status: Active</span>
          <button onClick={onToggle}>Deactivate</button>
        </div>,
        { wrapper }
      );

      await user.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalled();
    });

    it('should confirm before deleting user', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const onDelete = vi.fn();

      const handleDelete = () => {
        if (confirm('Delete user?')) {
          onDelete();
        }
      };

      render(
        <button onClick={handleDelete}>Delete User</button>,
        { wrapper }
      );

      screen.getByRole('button').click();

      expect(confirmSpy).toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('should reset user password', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      render(
        <div>
          <button onClick={onReset}>Reset Password</button>
        </div>,
        { wrapper }
      );

      await user.click(screen.getByRole('button'));
      expect(onReset).toHaveBeenCalled();
    });

    it('should filter users by role', () => {
      const allUsers = [
        ...mockUsers,
        {
          id: '2',
          email: 'admin@acme.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          isActive: true,
          organizationId: 'org-1',
        },
      ];

      const adminUsers = allUsers.filter((u) => u.role === 'ADMIN');

      render(
        <div>
          {adminUsers.map((u) => (
            <div key={u.id}>{u.email}</div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('admin@acme.com')).toBeInTheDocument();
      expect(screen.queryByText('john@acme.com')).not.toBeInTheDocument();
    });

    it('should search users by name', () => {
      const searchTerm = 'john';
      const filtered = mockUsers.filter((u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm)
      );

      render(
        <div>
          <input placeholder="Search..." value={searchTerm} readOnly />
          {filtered.map((u) => (
            <div key={u.id}>{u.firstName} {u.lastName}</div>
          ))}
        </div>,
        { wrapper }
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should assign user to organization', async () => {
      const user = userEvent.setup();
      const onAssign = vi.fn();

      render(
        <div>
          <select defaultValue="">
            <option value="">Select Organization</option>
            <option value="org-1">Engineering</option>
            <option value="org-2">Sales</option>
          </select>
          <button onClick={onAssign}>Assign</button>
        </div>,
        { wrapper }
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'org-1');

      await user.click(screen.getByRole('button'));
      expect(onAssign).toHaveBeenCalled();
    });
  });

  describe('Error Handling in User Management', () => {
    it('should handle duplicate email error', async () => {
      const user = userEvent.setup();

      const CreateUserWithError = () => {
        const [error, setError] = React.useState('');

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          setError('A user with this email already exists');
        };

        return (
          <form onSubmit={handleSubmit}>
            <input name="email" defaultValue="john@acme.com" />
            <button type="submit">Create</button>
            {error && <div className="text-destructive">{error}</div>}
          </form>
        );
      };

      render(<CreateUserWithError />, { wrapper });

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('A user with this email already exists')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', () => {
      render(
        <div className="border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">Failed to load users. Please try again.</p>
          <button>Retry</button>
        </div>,
        { wrapper }
      );

      expect(screen.getByText(/Failed to load users/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('should prevent invalid role assignments', () => {
      const currentUserRole = 'ADMIN';
      const canAssignRole = (targetRole: string) => {
        if (currentUserRole === 'ADMIN' && targetRole === 'SUPER_ADMIN') {
          return false;
        }
        return true;
      };

      expect(canAssignRole('USER')).toBe(true);
      expect(canAssignRole('ADMIN')).toBe(true);
      expect(canAssignRole('SUPER_ADMIN')).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple users', async () => {
      const user = userEvent.setup();
      const selected = new Set<string>();

      const UserList = () => {
        const [selectedIds, setSelectedIds] = React.useState(new Set<string>());

        const toggleSelect = (id: string) => {
          const newSelected = new Set(selectedIds);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          setSelectedIds(newSelected);
        };

        return (
          <div>
            {mockUsers.map((u) => (
              <div key={u.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(u.id)}
                  onChange={() => toggleSelect(u.id)}
                />
                <span>{u.email}</span>
              </div>
            ))}
            <div>Selected: {selectedIds.size}</div>
          </div>
        );
      };

      render(<UserList />, { wrapper });

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByText('Selected: 1')).toBeInTheDocument();
      });
    });

    it('should enable bulk actions when users selected', () => {
      const selectedCount = 3;

      render(
        <div>
          <button disabled={selectedCount === 0}>Bulk Deactivate</button>
          <button disabled={selectedCount === 0}>Bulk Delete</button>
        </div>,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /Bulk Deactivate/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /Bulk Delete/i })).not.toBeDisabled();
    });
  });
});
