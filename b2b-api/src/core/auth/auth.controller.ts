import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantGuard, CurrentTenantId } from '../tenants';

@ApiTags('Authentication')
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID or slug' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @CurrentTenantId() tenantId: string,
    @Body() dto: RegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(tenantId, dto);
  }

  @Post('login')
  @Public()
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @CurrentTenantId() tenantId: string,
    @Body() dto: LoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(tenantId, dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: User,
    @Body() dto?: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(user.id, dto?.refreshToken);
  }
}
