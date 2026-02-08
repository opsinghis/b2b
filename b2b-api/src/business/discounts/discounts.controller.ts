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
import { DiscountsService } from './discounts.service';
import {
  CreateDiscountTierDto,
  UpdateDiscountTierDto,
  AssignDiscountTierDto,
  QueryDiscountTiersDto,
  DiscountTierResponseDto,
  UserDiscountTierResponseDto,
  UserSavingsResponseDto,
  DiscountTiersListResponseDto,
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

@ApiTags('Discount Tiers')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('api/v1/users/me')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class UserDiscountTierController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get('discount-tier')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('DiscountTier')
  @ApiOperation({ summary: 'Get current user discount tier' })
  @ApiResponse({
    status: 200,
    description: 'User discount tier',
    type: UserDiscountTierResponseDto,
  })
  async getMyTier(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserDiscountTierResponseDto | null> {
    return this.discountsService.getUserTier(tenantId, user.userId);
  }

  @Get('savings')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('DiscountTier')
  @ApiOperation({ summary: 'Get current user savings stats' })
  @ApiResponse({ status: 200, description: 'User savings stats', type: UserSavingsResponseDto })
  async getMySavings(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserSavingsResponseDto> {
    return this.discountsService.getUserSavings(tenantId, user.userId);
  }
}

// ============================================
// Admin Controller
// ============================================

@ApiTags('Admin - Discount Tiers')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('api/v1/admin/discount-tiers')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class AdminDiscountTierController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('DiscountTier')
  @ApiOperation({ summary: 'List all discount tiers' })
  @ApiResponse({
    status: 200,
    description: 'List of discount tiers',
    type: DiscountTiersListResponseDto,
  })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryDiscountTiersDto,
  ): Promise<DiscountTiersListResponseDto> {
    return this.discountsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('DiscountTier')
  @ApiOperation({ summary: 'Get discount tier by ID' })
  @ApiParam({ name: 'id', description: 'Discount tier ID' })
  @ApiResponse({ status: 200, description: 'Discount tier', type: DiscountTierResponseDto })
  @ApiResponse({ status: 404, description: 'Discount tier not found' })
  async findOne(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ): Promise<DiscountTierResponseDto> {
    return this.discountsService.findOne(tenantId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @CanCreate('DiscountTier')
  @ApiOperation({ summary: 'Create a new discount tier' })
  @ApiResponse({ status: 201, description: 'Discount tier created', type: DiscountTierResponseDto })
  @ApiResponse({ status: 409, description: 'Discount tier with code already exists' })
  async create(
    @TenantContext() tenantId: string,
    @Body() dto: CreateDiscountTierDto,
  ): Promise<DiscountTierResponseDto> {
    return this.discountsService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @CanUpdate('DiscountTier')
  @ApiOperation({ summary: 'Update a discount tier' })
  @ApiParam({ name: 'id', description: 'Discount tier ID' })
  @ApiResponse({ status: 200, description: 'Discount tier updated', type: DiscountTierResponseDto })
  @ApiResponse({ status: 404, description: 'Discount tier not found' })
  async update(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDiscountTierDto,
  ): Promise<DiscountTierResponseDto> {
    return this.discountsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @CanDelete('DiscountTier')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a discount tier' })
  @ApiParam({ name: 'id', description: 'Discount tier ID' })
  @ApiResponse({ status: 204, description: 'Discount tier deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete tier with active assignments' })
  @ApiResponse({ status: 404, description: 'Discount tier not found' })
  async delete(@TenantContext() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.discountsService.delete(tenantId, id);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  @CanManage('DiscountTier')
  @ApiOperation({ summary: 'Assign tier to a user' })
  @ApiParam({ name: 'id', description: 'Discount tier ID' })
  @ApiResponse({ status: 201, description: 'Tier assigned', type: UserDiscountTierResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot assign inactive tier' })
  @ApiResponse({ status: 404, description: 'Discount tier or user not found' })
  async assignTier(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignDiscountTierDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserDiscountTierResponseDto> {
    return this.discountsService.assignTier(tenantId, id, dto, user.userId);
  }

  @Delete(':id/assign/:userId')
  @Roles(UserRole.ADMIN)
  @CanManage('DiscountTier')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign tier from a user' })
  @ApiParam({ name: 'id', description: 'Discount tier ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Tier unassigned' })
  @ApiResponse({ status: 404, description: 'User tier assignment not found' })
  async unassignTier(
    @TenantContext() tenantId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.discountsService.unassignTier(tenantId, userId);
  }

  @Get(':id/assignments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('DiscountTier')
  @ApiOperation({ summary: 'Get users assigned to a tier' })
  @ApiParam({ name: 'id', description: 'Discount tier ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Tier assignments' })
  @ApiResponse({ status: 404, description: 'Discount tier not found' })
  async getTierAssignments(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ assignments: UserDiscountTierResponseDto[]; total: number }> {
    return this.discountsService.getTierAssignments(
      tenantId,
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
