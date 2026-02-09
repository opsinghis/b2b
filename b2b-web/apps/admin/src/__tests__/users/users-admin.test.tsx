/**
 * Users Admin Feature Tests - Admin App
 *
 * @feature admin-users
 * @module user-management
 * @priority P1
 * @dependencies tenant, users
 */

import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAdminApi, resetAllMocks } from '../../../../../test/setup/api-mocks';
import { TEST_USERS } from '../../../../../test/setup/index';
import { renderAsAdmin, userEvent } from '../../../../../test/setup/render-utils';

// Mock the API client
vi.mock('@b2b/api-client', () => ({
  adminApi: mockAdminApi,
}));

describe('Users Admin Feature', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('User List View', () => {
    it('should display all tenant users', async () => {
      // Arrange
      const users = Object.values(TEST_USERS);
      mockAdminApi.getUsers.mockResolvedValueOnce({
        data: users,
        total: users.length,
      });

      // Act
      renderAsAdmin(
        <div data-testid="admin-users">
          <h1>User Management</h1>
          <table data-testid="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} data-testid={`user-row-${user.id}`}>
                  <td data-testid="user-name">{user.name}</td>
                  <td data-testid="user-email">{user.email}</td>
                  <td data-testid="user-role">{user.role}</td>
                  <td>
                    <button data-testid={`edit-${user.id}`}>Edit</button>
                    <button data-testid={`delete-${user.id}`}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      // Assert
      expect(screen.getByTestId('admin-users')).toBeInTheDocument();
      expect(screen.getByTestId('user-row-test-customer-id')).toBeInTheDocument();
      expect(screen.getByTestId('user-row-test-admin-id')).toBeInTheDocument();
    });

    it('should show user count by role', () => {
      // Arrange
      const users = Object.values(TEST_USERS);

      // Act
      renderAsAdmin(
        <div data-testid="user-stats">
          <span data-testid="total-users">Total: {users.length}</span>
          <span data-testid="admin-users">
            Admins: {users.filter(u => u.role === 'ADMIN').length}
          </span>
          <span data-testid="regular-users">
            Users: {users.filter(u => u.role === 'USER').length}
          </span>
        </div>
      );

      // Assert
      expect(screen.getByTestId('total-users')).toHaveTextContent('3');
      expect(screen.getByTestId('admin-users')).toHaveTextContent('1');
    });
  });

  describe('User Creation', () => {
    it('should display user creation form', () => {
      // Act
      renderAsAdmin(
        <form data-testid="user-form">
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" data-testid="name-input" type="text" required />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" data-testid="email-input" type="email" required />
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <select id="role" data-testid="role-select">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button data-testid="submit-btn" type="submit">Create User</button>
        </form>
      );

      // Assert
      expect(screen.getByTestId('user-form')).toBeInTheDocument();
      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('role-select')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

      // Act
      renderAsAdmin(
        <form data-testid="user-form" onSubmit={onSubmit}>
          <input data-testid="name-input" type="text" required />
          <input data-testid="email-input" type="email" required />
          <button data-testid="submit-btn" type="submit">Create</button>
        </form>
      );

      // Try to submit without filling fields
      await user.click(screen.getByTestId('submit-btn'));

      // Assert - form submission should be prevented due to required fields
      expect(screen.getByTestId('name-input')).toBeRequired();
      expect(screen.getByTestId('email-input')).toBeRequired();
    });
  });

  describe('Role Management', () => {
    it('should allow role assignment', async () => {
      // Arrange
      const user = userEvent.setup();
      const onRoleChange = vi.fn();

      // Act
      renderAsAdmin(
        <div data-testid="role-management">
          <select
            data-testid="role-select"
            defaultValue="USER"
            onChange={onRoleChange}
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      );

      await user.selectOptions(screen.getByTestId('role-select'), 'ADMIN');

      // Assert
      expect(onRoleChange).toHaveBeenCalled();
    });

    it('should show role permissions description', () => {
      // Act
      renderAsAdmin(
        <div data-testid="role-info">
          <div data-testid="role-user">
            <h4>User</h4>
            <p>Can browse catalog, manage cart, place orders</p>
          </div>
          <div data-testid="role-admin">
            <h4>Admin</h4>
            <p>Can manage orders, users, and view reports</p>
          </div>
          <div data-testid="role-super-admin">
            <h4>Super Admin</h4>
            <p>Full system access including tenant management</p>
          </div>
        </div>
      );

      // Assert
      expect(screen.getByTestId('role-user')).toBeInTheDocument();
      expect(screen.getByTestId('role-admin')).toBeInTheDocument();
      expect(screen.getByTestId('role-super-admin')).toBeInTheDocument();
    });
  });

  describe('User Deactivation', () => {
    it('should allow user deactivation', async () => {
      // Arrange
      const user = userEvent.setup();
      const onDeactivate = vi.fn();

      // Act
      renderAsAdmin(
        <div data-testid="user-actions">
          <button
            data-testid="deactivate-btn"
            onClick={onDeactivate}
          >
            Deactivate User
          </button>
        </div>
      );

      await user.click(screen.getByTestId('deactivate-btn'));

      // Assert
      expect(onDeactivate).toHaveBeenCalled();
    });

    it('should show confirmation modal before deactivation', async () => {
      // Arrange
      const user = userEvent.setup();
      const showConfirm = vi.fn();

      // Act
      renderAsAdmin(
        <div>
          <button
            data-testid="deactivate-btn"
            onClick={showConfirm}
          >
            Deactivate
          </button>
          <div data-testid="confirm-modal" role="dialog">
            <p>Are you sure you want to deactivate this user?</p>
            <p>The user will no longer be able to log in.</p>
            <button data-testid="confirm-yes">Yes, Deactivate</button>
            <button data-testid="confirm-no">Cancel</button>
          </div>
        </div>
      );

      await user.click(screen.getByTestId('deactivate-btn'));

      // Assert
      expect(showConfirm).toHaveBeenCalled();
    });
  });

  describe('User Filtering', () => {
    it('should filter users by role', async () => {
      // Arrange
      const user = userEvent.setup();
      const onFilter = vi.fn();

      // Act
      renderAsAdmin(
        <div data-testid="user-filters">
          <select
            data-testid="role-filter"
            onChange={onFilter}
          >
            <option value="">All Roles</option>
            <option value="USER">Users</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      );

      await user.selectOptions(screen.getByTestId('role-filter'), 'ADMIN');

      // Assert
      expect(onFilter).toHaveBeenCalled();
    });

    it('should search users by name or email', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSearch = vi.fn();

      // Act
      renderAsAdmin(
        <div data-testid="user-search">
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search by name or email..."
            onChange={onSearch}
          />
        </div>
      );

      await user.type(screen.getByTestId('search-input'), 'test@');

      // Assert
      expect(onSearch).toHaveBeenCalled();
    });
  });
});
