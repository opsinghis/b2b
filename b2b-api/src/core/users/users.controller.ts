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
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserResponseDto,
  UserListQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard, CanManage, CanRead, CanUpdate } from '../authorization';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID or slug' })
@Controller('users')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @CanManage('User')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async create(
    @CurrentUser() currentUser: User,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(currentUser.tenantId, dto);
    return UserResponseDto.fromEntity(user);
  }

  @Get()
  @CanRead('User')
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
  })
  async findAll(@CurrentUser() currentUser: User, @Query() query: UserListQueryDto) {
    const result = await this.usersService.findAll(currentUser.tenantId, query);
    return {
      ...result,
      data: result.data.map(UserResponseDto.fromEntity),
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  async getMe(@CurrentUser() currentUser: User): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(currentUser.tenantId, currentUser.id);
    return UserResponseDto.fromEntity(user);
  }

  @Patch('me')
  @CanUpdate('User')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  async updateMe(
    @CurrentUser() currentUser: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateProfile(currentUser.id, dto);
    return UserResponseDto.fromEntity(user);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() currentUser: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(currentUser.id, dto);
  }

  @Get(':id')
  @CanRead('User')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @CurrentUser() currentUser: User,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(currentUser.tenantId, id);
    return UserResponseDto.fromEntity(user);
  }

  @Get('email/:email')
  @CanRead('User')
  @ApiOperation({ summary: 'Get a user by email' })
  @ApiParam({ name: 'email', description: 'User email' })
  @ApiResponse({
    status: 200,
    description: 'User details',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByEmail(
    @CurrentUser() currentUser: User,
    @Param('email') email: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findByEmail(currentUser.tenantId, email);
    return UserResponseDto.fromEntity(user);
  }

  @Patch(':id')
  @CanManage('User')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User or organization not found' })
  async update(
    @CurrentUser() currentUser: User,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(currentUser.tenantId, id, dto);
    return UserResponseDto.fromEntity(user);
  }

  @Delete(':id')
  @CanManage('User')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@CurrentUser() currentUser: User, @Param('id') id: string): Promise<void> {
    await this.usersService.remove(currentUser.tenantId, id);
  }

  @Post(':id/restore')
  @CanManage('User')
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is not deleted' })
  async restore(
    @CurrentUser() currentUser: User,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.restore(currentUser.tenantId, id);
    return UserResponseDto.fromEntity(user);
  }
}
