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
  ApiHeader,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationListQueryDto,
  OrganizationHierarchyResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard, CanManage, CanRead } from '../authorization';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID or slug' })
@Controller('organizations')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @CanManage('Organization')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Organization with this code already exists' })
  @ApiResponse({ status: 404, description: 'Parent organization not found' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.create(user.tenantId, dto);
    return OrganizationResponseDto.fromEntity(organization);
  }

  @Get()
  @CanRead('Organization')
  @ApiOperation({ summary: 'List all organizations' })
  @ApiResponse({
    status: 200,
    description: 'List of organizations',
  })
  async findAll(@CurrentUser() user: User, @Query() query: OrganizationListQueryDto) {
    const result = await this.organizationsService.findAll(user.tenantId, query);
    return {
      ...result,
      data: result.data.map(OrganizationResponseDto.fromEntity),
    };
  }

  @Get('hierarchy')
  @CanRead('Organization')
  @ApiOperation({ summary: 'Get organization hierarchy tree' })
  @ApiResponse({
    status: 200,
    description: 'Organization hierarchy tree',
    type: [OrganizationHierarchyResponseDto],
  })
  async getHierarchy(
    @CurrentUser() user: User,
    @Query('rootId') rootId?: string,
  ): Promise<OrganizationHierarchyResponseDto[]> {
    return this.organizationsService.getHierarchy(user.tenantId, rootId);
  }

  @Get(':id')
  @CanRead('Organization')
  @ApiOperation({ summary: 'Get an organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.findOne(user.tenantId, id);
    return OrganizationResponseDto.fromEntity(organization);
  }

  @Get('code/:code')
  @CanRead('Organization')
  @ApiOperation({ summary: 'Get an organization by code' })
  @ApiParam({ name: 'code', description: 'Organization code' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findByCode(
    @CurrentUser() user: User,
    @Param('code') code: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.findByCode(user.tenantId, code);
    return OrganizationResponseDto.fromEntity(organization);
  }

  @Get(':id/hierarchy')
  @CanRead('Organization')
  @ApiOperation({ summary: 'Get hierarchy tree starting from this organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization hierarchy tree',
    type: [OrganizationHierarchyResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationHierarchy(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<OrganizationHierarchyResponseDto[]> {
    return this.organizationsService.getHierarchy(user.tenantId, id);
  }

  @Patch(':id')
  @CanManage('Organization')
  @ApiOperation({ summary: 'Update an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Organization with this code already exists' })
  @ApiResponse({ status: 400, description: 'Invalid parent (circular reference)' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.update(user.tenantId, id, dto);
    return OrganizationResponseDto.fromEntity(organization);
  }

  @Delete(':id')
  @CanManage('Organization')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 204, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete organization with children' })
  async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.organizationsService.remove(user.tenantId, id);
  }

  @Post(':id/restore')
  @CanManage('Organization')
  @ApiOperation({ summary: 'Restore a soft-deleted organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization restored successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Organization is not deleted' })
  async restore(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.restore(user.tenantId, id);
    return OrganizationResponseDto.fromEntity(organization);
  }
}
