import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TenantContext } from '@core/tenants';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@core/auth';
import {
  AuthorizationGuard,
  CanRead,
  CanCreate,
  CanUpdate,
  CanDelete,
  CanManage,
} from '@core/authorization';
import { PromotionsService } from './promotions.service';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  GenerateCouponsDto,
  QueryPromotionsDto,
  ApplyCouponDto,
  PromotionResponseDto,
  CouponResponseDto,
  PromotionAnalyticsResponseDto,
  ApplyCouponResponseDto,
  PromotionsListResponseDto,
} from './dto';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

// ============================================
// User Controller
// ============================================

@ApiTags('Promotions')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('api/v1/promotions')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('available')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('Promotion')
  @ApiOperation({ summary: 'Get available promotions for current user' })
  @ApiResponse({ status: 200, description: 'Available promotions', type: [PromotionResponseDto] })
  async getAvailable(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PromotionResponseDto[]> {
    return this.promotionsService.getAvailablePromotions(tenantId, user.userId, user.role);
  }

  @Post('validate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('Promotion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon/promotion code' })
  @ApiResponse({ status: 200, description: 'Validation result', type: ApplyCouponResponseDto })
  async validateCoupon(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyCouponDto,
  ): Promise<ApplyCouponResponseDto> {
    return this.promotionsService.validateCoupon(
      tenantId,
      user.userId,
      user.role,
      dto.code,
      dto.orderAmount,
    );
  }
}

// ============================================
// Admin Controller
// ============================================

@ApiTags('Admin - Promotions')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('api/v1/admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('Promotion')
  @ApiOperation({ summary: 'List all promotions' })
  @ApiResponse({ status: 200, description: 'List of promotions', type: PromotionsListResponseDto })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryPromotionsDto,
  ): Promise<PromotionsListResponseDto> {
    return this.promotionsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('Promotion')
  @ApiOperation({ summary: 'Get promotion by ID' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({ status: 200, description: 'Promotion', type: PromotionResponseDto })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async findOne(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.findOne(tenantId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @CanCreate('Promotion')
  @ApiOperation({ summary: 'Create a new promotion' })
  @ApiResponse({ status: 201, description: 'Promotion created', type: PromotionResponseDto })
  @ApiResponse({ status: 409, description: 'Promotion with code already exists' })
  async create(
    @TenantContext() tenantId: string,
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.create(tenantId, dto, user.userId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @CanUpdate('Promotion')
  @ApiOperation({ summary: 'Update a promotion' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({ status: 200, description: 'Promotion updated', type: PromotionResponseDto })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async update(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @CanDelete('Promotion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a promotion' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({ status: 204, description: 'Promotion deleted' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async delete(@TenantContext() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.promotionsService.delete(tenantId, id);
  }

  @Get(':id/analytics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('Promotion')
  @ApiOperation({ summary: 'Get promotion analytics' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({
    status: 200,
    description: 'Promotion analytics',
    type: PromotionAnalyticsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async getAnalytics(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ): Promise<PromotionAnalyticsResponseDto> {
    return this.promotionsService.getAnalytics(tenantId, id);
  }

  @Get(':id/coupons')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('Promotion')
  @ApiOperation({ summary: 'Get coupons for a promotion' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Coupons list' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async getCoupons(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ coupons: CouponResponseDto[]; total: number }> {
    return this.promotionsService.getCoupons(
      tenantId,
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post(':id/coupons/generate')
  @Roles(UserRole.ADMIN)
  @CanManage('Promotion')
  @ApiOperation({ summary: 'Generate coupons for a promotion' })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({ status: 201, description: 'Coupons generated', type: [CouponResponseDto] })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async generateCoupons(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() dto: GenerateCouponsDto,
  ): Promise<CouponResponseDto[]> {
    return this.promotionsService.generateCoupons(tenantId, id, dto);
  }
}
