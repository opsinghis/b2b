import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';

export type Subjects =
  | 'User'
  | 'Tenant'
  | 'Organization'
  | 'Contract'
  | 'Quote'
  | 'MasterProduct'
  | 'ApprovalChain'
  | 'Approval'
  | 'AuditLog'
  | 'Notification'
  | 'File'
  | 'Cart'
  | 'Order'
  | 'PaymentMethod'
  | 'DeliveryMethod'
  | 'UserAddress'
  | 'Payment'
  | 'SalaryDeduction'
  | 'DiscountTier'
  | 'Promotion'
  | 'Partner'
  | 'all';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'approve' | 'submit';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class AbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        // Super admin can do everything
        can('manage', 'all');
        break;

      case UserRole.ADMIN:
        // Admin can manage most things within their tenant
        can('manage', 'User');
        can('manage', 'Organization');
        can('manage', 'Contract');
        can('manage', 'Quote');
        can('manage', 'ApprovalChain');
        can('manage', 'Approval');
        can('manage', 'Notification');
        can('manage', 'File');
        can('manage', 'Cart');
        can('manage', 'Order');
        can('manage', 'PaymentMethod');
        can('manage', 'DeliveryMethod');
        can('manage', 'UserAddress');
        can('manage', 'Payment');
        can('manage', 'SalaryDeduction');
        can('manage', 'DiscountTier');
        can('manage', 'Promotion');
        can('manage', 'Partner');
        can('read', 'AuditLog');
        can('read', 'MasterProduct');
        break;

      case UserRole.MANAGER:
        // Manager can manage contracts and quotes, read users/orgs
        can('read', 'User');
        can('read', 'Organization');
        can('manage', 'Contract');
        can('manage', 'Quote');
        can('approve', 'Quote');
        can('approve', 'Contract');
        can('read', 'ApprovalChain');
        can('manage', 'Approval');
        can('manage', 'File');
        can('manage', 'Cart');
        can('manage', 'Order');
        can('read', 'PaymentMethod');
        can('read', 'DeliveryMethod');
        can('manage', 'UserAddress');
        can('manage', 'Payment');
        can('manage', 'SalaryDeduction');
        can('read', 'DiscountTier');
        can('read', 'Promotion');
        can('read', 'Partner');
        can('read', 'MasterProduct');
        break;

      case UserRole.USER:
        // Regular user can create/read/update own quotes, read contracts
        can('read', 'User');
        can('update', 'User');
        can('read', 'Organization');
        can('read', 'Contract');
        can('create', 'Quote');
        can('read', 'Quote');
        can('update', 'Quote');
        can('submit', 'Quote');
        can('read', 'Approval');
        can('create', 'File');
        can('read', 'File');
        can('delete', 'File');
        can('manage', 'Cart');
        can('manage', 'Order');
        can('read', 'PaymentMethod');
        can('read', 'DeliveryMethod');
        can('manage', 'UserAddress');
        can('manage', 'Payment');
        can('manage', 'SalaryDeduction');
        can('read', 'DiscountTier');
        can('read', 'Promotion');
        can('manage', 'Partner');
        can('read', 'MasterProduct');
        break;

      case UserRole.VIEWER:
        // Viewer can only read
        can('read', 'User');
        can('read', 'Organization');
        can('read', 'Contract');
        can('read', 'Quote');
        can('read', 'File');
        can('read', 'MasterProduct');
        break;

      default:
        // No permissions by default
        break;
    }

    return build();
  }

  // Helper method to check if user has a specific role
  hasRole(user: User, roles: UserRole[]): boolean {
    return roles.includes(user.role);
  }

  // Helper method to check tenant ownership
  isOwnTenant(user: User, tenantId: string): boolean {
    return user.tenantId === tenantId;
  }
}
