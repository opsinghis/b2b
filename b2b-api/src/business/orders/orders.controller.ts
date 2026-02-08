import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  ListOrdersQueryDto,
  AdminListOrdersQueryDto,
  CancelOrderDto,
  RefundOrderDto,
  OrderResponseDto,
  OrderListResponseDto,
  TrackingResponseDto,
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

@ApiTags('Orders')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Order')
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cart is empty or invalid input' })
  async create(
    @Body() dto: CreateOrderDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.createFromCart(dto, tenantId, user.userId);
    return OrderResponseDto.fromEntity(order);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Order')
  @ApiOperation({ summary: 'List user orders' })
  @ApiResponse({
    status: 200,
    description: 'List of orders',
    type: OrderListResponseDto,
  })
  async findAll(
    @Query() query: ListOrdersQueryDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderListResponseDto> {
    const { orders, total } = await this.ordersService.findAll(query, tenantId, user.userId);
    return OrderListResponseDto.fromEntities(orders, total, query.page || 1, query.limit || 20);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Order')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order details',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findOne(id, tenantId, user.userId);
    return OrderResponseDto.fromEntity(order);
  }

  @Get(':id/tracking')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Order')
  @ApiOperation({ summary: 'Get order tracking information' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Tracking information',
    type: TrackingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getTracking(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrackingResponseDto> {
    const tracking = await this.ordersService.getTracking(id, tenantId, user.userId);
    return {
      trackingNumber: tracking.trackingNumber || undefined,
      trackingUrl: tracking.trackingUrl || undefined,
      carrier: tracking.carrier || undefined,
      estimatedDelivery: tracking.estimatedDelivery?.toISOString() || undefined,
      status: tracking.status,
      shippedAt: tracking.shippedAt?.toISOString() || undefined,
      deliveredAt: tracking.deliveredAt?.toISOString() || undefined,
    };
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.cancel(id, dto, tenantId, user.userId);
    return OrderResponseDto.fromEntity(order);
  }

  @Get(':id/invoice')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Order')
  @ApiOperation({ summary: 'Download order invoice' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Invoice PDF' })
  @ApiResponse({ status: 400, description: 'Invoice not available for this order status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getInvoice(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    // Get order data (validates access and status)
    const order = await this.ordersService.findOne(id, tenantId, user.userId);

    // For now, return JSON invoice data
    // In production, this would generate a PDF
    const invoiceData = {
      invoiceNumber: `INV-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      status: order.status,
      items: order.items.map((item) => ({
        lineNumber: item.lineNumber,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        discount: item.discount.toString(),
        total: item.total.toString(),
      })),
      subtotal: order.subtotal.toString(),
      discount: order.discount.toString(),
      couponCode: order.couponCode,
      couponDiscount: order.couponDiscount.toString(),
      tax: order.tax.toString(),
      total: order.total.toString(),
      currency: order.currency,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${order.orderNumber}.json"`,
    );
    res.json(invoiceData);
  }

  @Post(':id/reorder')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder - add order items to cart' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Items added to cart' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async reorder(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.ordersService.reorder(id, tenantId, user.userId);
    return { message: 'Order items added to cart' };
  }
}

// Admin Controller for order management
@ApiTags('Admin - Orders')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Order')
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of all orders',
    type: OrderListResponseDto,
  })
  async findAll(
    @Query() query: AdminListOrdersQueryDto,
    @TenantContext() tenantId: string,
  ): Promise<OrderListResponseDto> {
    const { orders, total } = await this.ordersService.findAllAdmin(query, tenantId);
    return OrderListResponseDto.fromEntities(orders, total, query.page || 1, query.limit || 20);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Order')
  @ApiOperation({ summary: 'Get order details (admin)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order details',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findOneAdmin(id, tenantId);
    return OrderResponseDto.fromEntity(order);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Order')
  @ApiOperation({ summary: 'Update order (admin)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order updated',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.updateAdmin(
      id,
      {
        status: dto.status,
        trackingNumber: dto.trackingNumber,
        trackingUrl: dto.trackingUrl,
        carrier: dto.carrier,
        estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : undefined,
        notes: dto.notes,
      },
      tenantId,
      user.userId,
    );
    return OrderResponseDto.fromEntity(order);
  }

  @Post(':id/refund')
  @Roles(UserRole.ADMIN)
  @CanManage('Order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund order (admin)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order refunded',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Order cannot be refunded' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async refund(
    @Param('id') id: string,
    @Body() dto: RefundOrderDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.refund(id, dto.reason, tenantId, user.userId);
    return OrderResponseDto.fromEntity(order);
  }
}
