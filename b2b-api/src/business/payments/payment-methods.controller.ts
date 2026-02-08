import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiSecurity,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PaymentMethodsService } from './payment-methods.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  ListPaymentMethodsQueryDto,
  PaymentMethodResponseDto,
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

@ApiTags('Payment Methods')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('PaymentMethod')
  @ApiOperation({ summary: 'Get available payment methods for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of available payment methods',
    type: [PaymentMethodResponseDto],
  })
  async findAvailable(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('orderAmount') orderAmount?: number,
  ): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.paymentMethodsService.findAvailable(
      tenantId,
      user.role,
      orderAmount,
    );
    return methods.map(PaymentMethodResponseDto.fromEntity);
  }
}

@ApiTags('Admin - Payment Methods')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('admin/payment-methods')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class AdminPaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @CanManage('PaymentMethod')
  @ApiOperation({ summary: 'List all payment methods (admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of payment methods',
    type: [PaymentMethodResponseDto],
  })
  async findAll(
    @Query() query: ListPaymentMethodsQueryDto,
    @TenantContext() tenantId: string,
  ): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.paymentMethodsService.findAll(tenantId, query);
    return methods.map(PaymentMethodResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @CanManage('PaymentMethod')
  @ApiOperation({ summary: 'Get payment method by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment method details',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<PaymentMethodResponseDto> {
    const method = await this.paymentMethodsService.findOne(id, tenantId);
    return PaymentMethodResponseDto.fromEntity(method);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @CanManage('PaymentMethod')
  @ApiOperation({ summary: 'Create payment method (admin)' })
  @ApiResponse({
    status: 201,
    description: 'Payment method created',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Payment method code already exists' })
  async create(
    @Body() dto: CreatePaymentMethodDto,
    @TenantContext() tenantId: string,
  ): Promise<PaymentMethodResponseDto> {
    const method = await this.paymentMethodsService.create(dto, tenantId);
    return PaymentMethodResponseDto.fromEntity(method);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @CanManage('PaymentMethod')
  @ApiOperation({ summary: 'Update payment method (admin)' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment method updated',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @TenantContext() tenantId: string,
  ): Promise<PaymentMethodResponseDto> {
    const method = await this.paymentMethodsService.update(id, dto, tenantId);
    return PaymentMethodResponseDto.fromEntity(method);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @CanManage('PaymentMethod')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete payment method (admin)' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({ status: 204, description: 'Payment method deleted' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  @ApiResponse({ status: 409, description: 'Payment method has been used' })
  async delete(@Param('id') id: string, @TenantContext() tenantId: string): Promise<void> {
    await this.paymentMethodsService.delete(id, tenantId);
  }
}
