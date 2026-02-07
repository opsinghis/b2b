import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@prisma/client';
import { AbilityFactory } from './ability.factory';
import { CHECK_ABILITY_KEY, RequiredAbility } from './check-ability.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements =
      this.reflector.getAllAndOverride<RequiredAbility[]>(CHECK_ABILITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requirements.length === 0) {
      // No ability requirements, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const ability = this.abilityFactory.createForUser(user);

    const hasAllRequiredAbilities = requirements.every((requirement) =>
      ability.can(requirement.action, requirement.subject),
    );

    if (!hasAllRequiredAbilities) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Attach ability to request for use in controllers/services
    request.ability = ability;

    return true;
  }
}
