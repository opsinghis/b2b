import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  TenantListQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard, CanManage } from '../authorization';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
@Roles(UserRole.SUPER_ADMIN)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @CanManage('Tenant')
  @ApiOperation({ summary: 'Create a new tenant (SUPER_ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Tenant with this slug already exists' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.create(dto);
    return TenantResponseDto.fromEntity(tenant);
  }

  @Get()
  @CanManage('Tenant')
  @ApiOperation({ summary: 'List all tenants (SUPER_ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'List of tenants',
  })
  async findAll(@Query() query: TenantListQueryDto) {
    const result = await this.tenantsService.findAll(query);
    return {
      ...result,
      data: result.data.map(TenantResponseDto.fromEntity),
    };
  }

  @Get(':id')
  @CanManage('Tenant')
  @ApiOperation({ summary: 'Get a tenant by ID (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant details',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id') id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.findOne(id);
    return TenantResponseDto.fromEntity(tenant);
  }

  @Get('slug/:slug')
  @CanManage('Tenant')
  @ApiOperation({ summary: 'Get a tenant by slug (SUPER_ADMIN only)' })
  @ApiParam({ name: 'slug', description: 'Tenant slug' })
  @ApiResponse({
    status: 200,
    description: 'Tenant details',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findBySlug(@Param('slug') slug: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.findBySlug(slug);
    return TenantResponseDto.fromEntity(tenant);
  }

  @Patch(':id')
  @CanManage('Tenant')
  @ApiOperation({ summary: 'Update a tenant (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant with this slug already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.update(id, dto);
    return TenantResponseDto.fromEntity(tenant);
  }

  @Delete(':id')
  @CanManage('Tenant')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a tenant (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 204, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.tenantsService.remove(id);
  }

  @Post(':id/restore')
  @CanManage('Tenant')
  @ApiOperation({ summary: 'Restore a soft-deleted tenant (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant restored successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant is not deleted' })
  async restore(@Param('id') id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.restore(id);
    return TenantResponseDto.fromEntity(tenant);
  }
}
