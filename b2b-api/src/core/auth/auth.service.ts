import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto, LoginDto, AuthResponseDto, AuthUserDto } from './dto';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds: number;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  async register(tenantId: string, dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.USER,
        tenantId,
      },
    });

    this.logger.log(`User registered: ${user.email} in tenant ${tenantId}`);

    return this.generateAuthResponse(user);
  }

  async login(tenantId: string, dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email.toLowerCase(),
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.email}`);

    return this.generateAuthResponse(user);
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Token refreshed for user: ${storedToken.user.email}`);

    return this.generateAuthResponse(storedToken.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific token
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          token: refreshToken,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all tokens
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = uuidv4();
    const refreshExpiresAt = this.calculateRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    const authUser: AuthUserDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiresInSeconds(),
      user: authUser,
    };
  }

  private calculateRefreshExpiry(): Date {
    const match = this.refreshExpiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }

  private getExpiresInSeconds(): number {
    const match = this.jwtExpiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return value * multipliers[unit];
  }
}
