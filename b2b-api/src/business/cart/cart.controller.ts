import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto, ApplyCouponDto, CartResponseDto } from './dto';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '@core/auth';
import { AuthorizationGuard, CanManage } from '@core/authorization';
import { TenantContext } from '@core/tenants';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

@ApiTags('Cart')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Cart')
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({
    status: 200,
    description: 'User cart with items',
    type: CartResponseDto,
  })
  async getCart(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    const cart = await this.cartService.getCart(tenantId, user.userId);
    return CartResponseDto.fromEntity(cart);
  }

  @Post('items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Cart')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Product access denied' })
  async addItem(
    @Body() dto: AddCartItemDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    const cart = await this.cartService.addItem(dto, tenantId, user.userId);
    return CartResponseDto.fromEntity(cart);
  }

  @Patch('items/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Cart')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    const cart = await this.cartService.updateItem(id, dto, tenantId, user.userId);
    return CartResponseDto.fromEntity(cart);
  }

  @Delete('items/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Cart')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItem(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    const cart = await this.cartService.removeItem(id, tenantId, user.userId);
    return CartResponseDto.fromEntity(cart);
  }

  @Delete()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Cart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared',
    type: CartResponseDto,
  })
  async clearCart(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    const cart = await this.cartService.clearCart(tenantId, user.userId);
    return CartResponseDto.fromEntity(cart);
  }

  @Post('apply-coupon')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Cart')
  @ApiOperation({ summary: 'Apply coupon code to cart' })
  @ApiResponse({
    status: 200,
    description: 'Coupon applied successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid coupon code or empty cart' })
  async applyCoupon(
    @Body() dto: ApplyCouponDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    const cart = await this.cartService.applyCoupon(dto, tenantId, user.userId);
    return CartResponseDto.fromEntity(cart);
  }

  @Delete('coupon')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Cart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove coupon from cart' })
  @ApiResponse({
    status: 200,
    description: 'Coupon removed',
    type: CartResponseDto,
  })
  async removeCoupon(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    const cart = await this.cartService.removeCoupon(tenantId, user.userId);
    return CartResponseDto.fromEntity(cart);
  }
}
