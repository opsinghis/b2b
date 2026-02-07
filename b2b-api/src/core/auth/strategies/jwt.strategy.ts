import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      const errorMessage = `
╔══════════════════════════════════════════════════════════════════╗
║  CONFIGURATION ERROR: JWT_SECRET environment variable is missing ║
╠══════════════════════════════════════════════════════════════════╣
║  To fix this:                                                    ║
║  1. Copy .env.example to .env:  cp .env.example .env             ║
║  2. Or set JWT_SECRET in your environment                        ║
║  3. Restart the application                                      ║
╚══════════════════════════════════════════════════════════════════╝`;
      console.error(errorMessage);
      throw new Error(
        'JWT_SECRET is required. Copy .env.example to .env or set JWT_SECRET environment variable.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
