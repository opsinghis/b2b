import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import {
  ProcessPaymentDto,
  PaymentResponseDto,
  PaymentHistoryResponseDto,
} from './dto';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '@core/auth';
import { AuthorizationGuard, CanManage } from '@core/authorization';
import { TenantContext } from '@core/tenants';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

@ApiTags('Payments')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:id/pay')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payment for an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment processed',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment or order state' })
  @ApiResponse({ status: 403, description: 'Payment method not allowed for user' })
  @ApiResponse({ status: 404, description: 'Order or payment method not found' })
  async processPayment(
    @Param('id') orderId: string,
    @Body() dto: ProcessPaymentDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.processPayment(
      orderId,
      dto,
      tenantId,
      user.userId,
      user.role,
    );
    return PaymentResponseDto.fromEntity(payment);
  }

  @Get('users/me/payment-history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Payment')
  @ApiOperation({ summary: 'Get payment history for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Payment history',
    type: PaymentHistoryResponseDto,
  })
  async getPaymentHistory(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaymentHistoryResponseDto> {
    const { payments, total } = await this.paymentsService.getPaymentHistory(
      tenantId,
      user.userId,
      page || 1,
      limit || 20,
    );
    return PaymentHistoryResponseDto.fromEntities(payments, total, page || 1, limit || 20);
  }

  @Get('orders/:id/payments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Payment')
  @ApiOperation({ summary: 'Get payments for an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order payments',
    type: [PaymentResponseDto],
  })
  async getOrderPayments(
    @Param('id') orderId: string,
    @TenantContext() tenantId: string,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentsService.findByOrder(orderId, tenantId);
    return payments.map(PaymentResponseDto.fromEntity);
  }
}
