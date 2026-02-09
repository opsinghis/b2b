import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { UserAddressesService } from './user-addresses.service';
import { CreateUserAddressDto, UpdateUserAddressDto, UserAddressResponseDto } from './dto';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '@core/auth';
import { AuthorizationGuard, CanManage } from '@core/authorization';
import { TenantContext } from '@core/tenants';

interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

@ApiTags('User Addresses')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('users/me/addresses')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('UserAddress')
  @ApiOperation({ summary: 'Get all addresses for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user addresses',
    type: [UserAddressResponseDto],
  })
  async findAll(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserAddressResponseDto[]> {
    const addresses = await this.userAddressesService.findAll(tenantId, user.id);
    return addresses.map(UserAddressResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('UserAddress')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address details',
    type: UserAddressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserAddressResponseDto> {
    const address = await this.userAddressesService.findOne(id, tenantId, user.id);
    return UserAddressResponseDto.fromEntity(address);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('UserAddress')
  @ApiOperation({ summary: 'Create new address' })
  @ApiResponse({
    status: 201,
    description: 'Address created',
    type: UserAddressResponseDto,
  })
  async create(
    @Body() dto: CreateUserAddressDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserAddressResponseDto> {
    const address = await this.userAddressesService.create(dto, tenantId, user.id);
    return UserAddressResponseDto.fromEntity(address);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('UserAddress')
  @ApiOperation({ summary: 'Update address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address updated',
    type: UserAddressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserAddressDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserAddressResponseDto> {
    const address = await this.userAddressesService.update(id, dto, tenantId, user.id);
    return UserAddressResponseDto.fromEntity(address);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('UserAddress')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async delete(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.userAddressesService.delete(id, tenantId, user.id);
  }
}
