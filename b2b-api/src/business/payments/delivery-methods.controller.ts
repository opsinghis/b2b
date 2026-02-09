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
import { DeliveryMethodsService } from './delivery-methods.service';
import {
  CreateDeliveryMethodDto,
  UpdateDeliveryMethodDto,
  ListDeliveryMethodsQueryDto,
  DeliveryMethodResponseDto,
} from './dto';
import { JwtAuthGuard, Roles, RolesGuard } from '@core/auth';
import { AuthorizationGuard, CanManage, CanRead } from '@core/authorization';
import { TenantContext } from '@core/tenants';

@ApiTags('Delivery Methods')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('delivery-methods')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class DeliveryMethodsController {
  constructor(private readonly deliveryMethodsService: DeliveryMethodsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanRead('DeliveryMethod')
  @ApiOperation({ summary: 'Get available delivery methods' })
  @ApiResponse({
    status: 200,
    description: 'List of available delivery methods',
    type: [DeliveryMethodResponseDto],
  })
  async findAvailable(@TenantContext() tenantId: string): Promise<DeliveryMethodResponseDto[]> {
    const methods = await this.deliveryMethodsService.findAvailable(tenantId);
    return methods.map(DeliveryMethodResponseDto.fromEntity);
  }
}

@ApiTags('Admin - Delivery Methods')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('admin/delivery-methods')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class AdminDeliveryMethodsController {
  constructor(private readonly deliveryMethodsService: DeliveryMethodsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @CanManage('DeliveryMethod')
  @ApiOperation({ summary: 'List all delivery methods (admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of delivery methods',
    type: [DeliveryMethodResponseDto],
  })
  async findAll(
    @Query() query: ListDeliveryMethodsQueryDto,
    @TenantContext() tenantId: string,
  ): Promise<DeliveryMethodResponseDto[]> {
    const methods = await this.deliveryMethodsService.findAll(tenantId, query);
    return methods.map(DeliveryMethodResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @CanManage('DeliveryMethod')
  @ApiOperation({ summary: 'Get delivery method by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Delivery method ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery method details',
    type: DeliveryMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Delivery method not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<DeliveryMethodResponseDto> {
    const method = await this.deliveryMethodsService.findOne(id, tenantId);
    return DeliveryMethodResponseDto.fromEntity(method);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @CanManage('DeliveryMethod')
  @ApiOperation({ summary: 'Create delivery method (admin)' })
  @ApiResponse({
    status: 201,
    description: 'Delivery method created',
    type: DeliveryMethodResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Delivery method code already exists' })
  async create(
    @Body() dto: CreateDeliveryMethodDto,
    @TenantContext() tenantId: string,
  ): Promise<DeliveryMethodResponseDto> {
    const method = await this.deliveryMethodsService.create(dto, tenantId);
    return DeliveryMethodResponseDto.fromEntity(method);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @CanManage('DeliveryMethod')
  @ApiOperation({ summary: 'Update delivery method (admin)' })
  @ApiParam({ name: 'id', description: 'Delivery method ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery method updated',
    type: DeliveryMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Delivery method not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryMethodDto,
    @TenantContext() tenantId: string,
  ): Promise<DeliveryMethodResponseDto> {
    const method = await this.deliveryMethodsService.update(id, dto, tenantId);
    return DeliveryMethodResponseDto.fromEntity(method);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @CanManage('DeliveryMethod')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete delivery method (admin)' })
  @ApiParam({ name: 'id', description: 'Delivery method ID' })
  @ApiResponse({ status: 204, description: 'Delivery method deleted' })
  @ApiResponse({ status: 404, description: 'Delivery method not found' })
  async delete(@Param('id') id: string, @TenantContext() tenantId: string): Promise<void> {
    await this.deliveryMethodsService.delete(id, tenantId);
  }
}
