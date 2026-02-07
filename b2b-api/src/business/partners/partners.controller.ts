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
import { UserRole, PartnerCommissionStatus } from '@prisma/client';
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
import { PartnersService } from './partners.service';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  AddTeamMemberDto,
  CreateResourceDto,
  QueryPartnersDto,
  QueryCommissionsDto,
  CreateOrderOnBehalfDto,
  PartnerResponseDto,
  TeamMemberResponseDto,
  CommissionResponseDto,
  ResourceResponseDto,
  CommissionSummaryResponseDto,
  PartnersListResponseDto,
  CommissionsListResponseDto,
} from './dto';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

// ============================================
// Partner User Controller
// ============================================

@ApiTags('Partners')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('api/v1/partners')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'Get my partner profile' })
  @ApiResponse({ status: 200, description: 'Partner profile', type: PartnerResponseDto })
  @ApiResponse({ status: 404, description: 'Partner profile not found' })
  async getMyProfile(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartnerResponseDto | null> {
    return this.partnersService.getMyProfile(tenantId, user.userId);
  }

  @Get('me/commission')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'Get my commission summary' })
  @ApiResponse({ status: 200, description: 'Commission summary', type: CommissionSummaryResponseDto })
  @ApiResponse({ status: 404, description: 'Partner profile not found' })
  async getCommissionSummary(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommissionSummaryResponseDto> {
    return this.partnersService.getCommissionSummary(tenantId, user.userId);
  }

  @Get('me/commissions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'Get my commission history' })
  @ApiResponse({ status: 200, description: 'Commissions list', type: CommissionsListResponseDto })
  @ApiResponse({ status: 404, description: 'Partner profile not found' })
  async getMyCommissions(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCommissionsDto,
  ): Promise<CommissionsListResponseDto> {
    return this.partnersService.getMyCommissions(tenantId, user.userId, query);
  }

  @Get('me/team')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'Get my team members' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Team members list' })
  @ApiResponse({ status: 404, description: 'Partner profile not found' })
  async getTeamMembers(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ members: TeamMemberResponseDto[]; total: number }> {
    return this.partnersService.getTeamMembers(
      tenantId,
      user.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post('me/team')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Partner')
  @ApiOperation({ summary: 'Add team member' })
  @ApiResponse({ status: 201, description: 'Team member added', type: TeamMemberResponseDto })
  @ApiResponse({ status: 404, description: 'Partner or user not found' })
  @ApiResponse({ status: 409, description: 'User is already a team member' })
  async addTeamMember(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    return this.partnersService.addTeamMember(tenantId, user.userId, dto);
  }

  @Delete('me/team/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Partner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove team member' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 204, description: 'Team member removed' })
  @ApiResponse({ status: 404, description: 'Partner or team member not found' })
  async removeTeamMember(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') memberUserId: string,
  ): Promise<void> {
    return this.partnersService.removeTeamMember(tenantId, user.userId, memberUserId);
  }

  @Get('me/resources')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'Get partner resources and documents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Resources list' })
  @ApiResponse({ status: 404, description: 'Partner profile not found' })
  async getResources(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ resources: ResourceResponseDto[]; total: number }> {
    return this.partnersService.getResources(
      tenantId,
      user.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post('orders/on-behalf')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Partner')
  @ApiOperation({ summary: 'Create order on behalf of team member' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Partner or team member not found' })
  async createOrderOnBehalf(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderOnBehalfDto,
  ): Promise<{ orderId: string; commissionAmount: number }> {
    return this.partnersService.createOrderOnBehalf(tenantId, user.userId, dto);
  }
}

// ============================================
// Admin Partner Controller
// ============================================

@ApiTags('Admin - Partners')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('api/v1/admin/partners')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class AdminPartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'List all partners' })
  @ApiResponse({ status: 200, description: 'List of partners', type: PartnersListResponseDto })
  async findAll(
    @TenantContext() tenantId: string,
    @Query() query: QueryPartnersDto,
  ): Promise<PartnersListResponseDto> {
    return this.partnersService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner', type: PartnerResponseDto })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ): Promise<PartnerResponseDto> {
    return this.partnersService.findOne(tenantId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @CanCreate('Partner')
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created', type: PartnerResponseDto })
  @ApiResponse({ status: 409, description: 'Partner with code already exists' })
  async create(
    @TenantContext() tenantId: string,
    @Body() dto: CreatePartnerDto,
  ): Promise<PartnerResponseDto> {
    return this.partnersService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @CanUpdate('Partner')
  @ApiOperation({ summary: 'Update a partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner updated', type: PartnerResponseDto })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ): Promise<PartnerResponseDto> {
    return this.partnersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @CanDelete('Partner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 204, description: 'Partner deleted' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async delete(@TenantContext() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.partnersService.delete(tenantId, id);
  }

  @Get(':id/commissions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanRead('Partner')
  @ApiOperation({ summary: 'Get partner commissions' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Commissions list', type: CommissionsListResponseDto })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getPartnerCommissions(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Query() query: QueryCommissionsDto,
  ): Promise<CommissionsListResponseDto> {
    return this.partnersService.getPartnerCommissions(tenantId, id, query);
  }

  @Patch('commissions/:id/status')
  @Roles(UserRole.ADMIN)
  @CanManage('Partner')
  @ApiOperation({ summary: 'Update commission status' })
  @ApiParam({ name: 'id', description: 'Commission ID' })
  @ApiQuery({ name: 'status', enum: PartnerCommissionStatus })
  @ApiResponse({ status: 200, description: 'Commission updated', type: CommissionResponseDto })
  @ApiResponse({ status: 404, description: 'Commission not found' })
  async updateCommissionStatus(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Query('status') status: PartnerCommissionStatus,
  ): Promise<CommissionResponseDto> {
    return this.partnersService.updateCommissionStatus(tenantId, id, status);
  }

  @Post('resources')
  @Roles(UserRole.ADMIN)
  @CanCreate('Partner')
  @ApiOperation({ summary: 'Create a partner resource' })
  @ApiQuery({ name: 'partnerId', required: false, description: 'Partner ID (optional for public resources)' })
  @ApiResponse({ status: 201, description: 'Resource created', type: ResourceResponseDto })
  async createResource(
    @TenantContext() tenantId: string,
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('partnerId') partnerId?: string,
  ): Promise<ResourceResponseDto> {
    return this.partnersService.createResource(tenantId, dto, user.userId, partnerId);
  }

  @Delete('resources/:id')
  @Roles(UserRole.ADMIN)
  @CanDelete('Partner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a partner resource' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({ status: 204, description: 'Resource deleted' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async deleteResource(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.partnersService.deleteResource(tenantId, id);
  }
}
