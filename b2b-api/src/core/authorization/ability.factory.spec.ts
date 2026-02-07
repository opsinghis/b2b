import { AbilityFactory } from './ability.factory';
import { User, UserRole } from '@prisma/client';

describe('AbilityFactory', () => {
  let factory: AbilityFactory;

  const createMockUser = (role: UserRole, overrides: Partial<User> = {}): User => ({
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'User',
    role,
    tenantId: 'tenant-123',
    organizationId: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    factory = new AbilityFactory();
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('SUPER_ADMIN', () => {
    it('should be able to manage all', () => {
      const user = createMockUser(UserRole.SUPER_ADMIN);
      const ability = factory.createForUser(user);

      expect(ability.can('manage', 'all')).toBe(true);
      expect(ability.can('create', 'User')).toBe(true);
      expect(ability.can('delete', 'Tenant')).toBe(true);
    });
  });

  describe('ADMIN', () => {
    it('should be able to manage users in their tenant', () => {
      const user = createMockUser(UserRole.ADMIN);
      const ability = factory.createForUser(user);

      expect(ability.can('manage', 'User')).toBe(true);
      expect(ability.can('manage', 'Organization')).toBe(true);
      expect(ability.can('manage', 'Contract')).toBe(true);
      expect(ability.can('manage', 'Quote')).toBe(true);
    });

    it('should be able to read audit logs', () => {
      const user = createMockUser(UserRole.ADMIN);
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'AuditLog')).toBe(true);
    });

    it('should be able to read master products', () => {
      const user = createMockUser(UserRole.ADMIN);
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'MasterProduct')).toBe(true);
    });
  });

  describe('MANAGER', () => {
    it('should be able to manage contracts and quotes', () => {
      const user = createMockUser(UserRole.MANAGER);
      const ability = factory.createForUser(user);

      expect(ability.can('manage', 'Contract')).toBe(true);
      expect(ability.can('manage', 'Quote')).toBe(true);
      expect(ability.can('approve', 'Quote')).toBe(true);
      expect(ability.can('approve', 'Contract')).toBe(true);
    });

    it('should be able to read users and organizations', () => {
      const user = createMockUser(UserRole.MANAGER);
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('read', 'Organization')).toBe(true);
    });

    it('should not be able to manage users', () => {
      const user = createMockUser(UserRole.MANAGER);
      const ability = factory.createForUser(user);

      expect(ability.can('create', 'User')).toBe(false);
      expect(ability.can('delete', 'User')).toBe(false);
    });
  });

  describe('USER', () => {
    it('should be able to create and manage own quotes', () => {
      const user = createMockUser(UserRole.USER);
      const ability = factory.createForUser(user);

      expect(ability.can('create', 'Quote')).toBe(true);
      expect(ability.can('read', 'Quote')).toBe(true);
      expect(ability.can('update', 'Quote')).toBe(true);
      expect(ability.can('submit', 'Quote')).toBe(true);
    });

    it('should be able to read contracts but not create', () => {
      const user = createMockUser(UserRole.USER);
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'Contract')).toBe(true);
      expect(ability.can('create', 'Contract')).toBe(false);
    });

    it('should be able to update own profile', () => {
      const user = createMockUser(UserRole.USER);
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('update', 'User')).toBe(true);
    });
  });

  describe('VIEWER', () => {
    it('should only be able to read', () => {
      const user = createMockUser(UserRole.VIEWER);
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('read', 'Organization')).toBe(true);
      expect(ability.can('read', 'Contract')).toBe(true);
      expect(ability.can('read', 'Quote')).toBe(true);
      expect(ability.can('read', 'MasterProduct')).toBe(true);

      expect(ability.can('create', 'Quote')).toBe(false);
      expect(ability.can('update', 'Contract')).toBe(false);
      expect(ability.can('delete', 'User')).toBe(false);
    });
  });
});
