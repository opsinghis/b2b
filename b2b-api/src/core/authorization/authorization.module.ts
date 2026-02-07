import { Module } from '@nestjs/common';
import { AbilityFactory } from './ability.factory';
import { AuthorizationGuard } from './authorization.guard';

@Module({
  providers: [AbilityFactory, AuthorizationGuard],
  exports: [AbilityFactory, AuthorizationGuard],
})
export class AuthorizationModule {}
