import { SetMetadata } from '@nestjs/common';
import { Actions, Subjects } from './ability.factory';

export interface RequiredAbility {
  action: Actions;
  subject: Subjects;
}

export const CHECK_ABILITY_KEY = 'check_ability';

export const CheckAbility = (...requirements: RequiredAbility[]) =>
  SetMetadata(CHECK_ABILITY_KEY, requirements);

// Convenience decorators for common patterns
export const CanRead = (subject: Subjects) => CheckAbility({ action: 'read', subject });
export const CanCreate = (subject: Subjects) => CheckAbility({ action: 'create', subject });
export const CanUpdate = (subject: Subjects) => CheckAbility({ action: 'update', subject });
export const CanDelete = (subject: Subjects) => CheckAbility({ action: 'delete', subject });
export const CanManage = (subject: Subjects) => CheckAbility({ action: 'manage', subject });
export const CanSubmit = (subject: Subjects) => CheckAbility({ action: 'submit', subject });
export const CanApprove = (subject: Subjects) => CheckAbility({ action: 'approve', subject });
