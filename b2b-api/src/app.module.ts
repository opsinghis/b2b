import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { GlobalExceptionFilter } from './common/filters';
import { CorrelationIdMiddleware } from './common/middleware';
import { LoggingInterceptor } from './common/interceptors';
import { DatabaseModule } from './infrastructure/database';
import { TenantsModule, TenantMiddleware } from './core/tenants';
import { AuthModule, JwtAuthGuard } from './core/auth';
import { AuthorizationModule } from './core/authorization';
import { AuditModule } from './core/audit';
import { OrganizationsModule } from './core/organizations';
import { UsersModule } from './core/users';
import { ContractsModule } from './business/contracts';
import { QuotesModule } from './business/quotes';
import { MasterCatalogModule } from './business/master-catalog';
import { TenantCatalogModule } from './business/tenant-catalog';
import { ApprovalsModule } from './business/approvals';
import { CartModule } from './business/cart';
import { OrdersModule } from './business/orders';
import { PaymentsModule } from './business/payments';
import { SalaryDeductionModule } from './business/salary-deduction';
import { DiscountsModule } from './business/discounts';
import { PromotionsModule } from './business/promotions';
import { PartnersModule } from './business/partners';
import { NotificationsModule } from './platform/notifications';
import { FilesModule } from './platform/files';
import { DashboardModule } from './platform/dashboard';
import { ToolsModule } from './agentic/tools';
import { OrchestratorModule } from './agentic/orchestrator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    TenantsModule,
    AuthModule,
    AuthorizationModule,
    AuditModule,
    OrganizationsModule,
    UsersModule,
    ContractsModule,
    QuotesModule,
    MasterCatalogModule,
    TenantCatalogModule,
    ApprovalsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    SalaryDeductionModule,
    DiscountsModule,
    PromotionsModule,
    PartnersModule,
    NotificationsModule,
    FilesModule,
    DashboardModule,
    ToolsModule,
    OrchestratorModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer
      .apply(TenantMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
