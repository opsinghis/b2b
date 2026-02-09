import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

export interface TestTokens {
  accessToken: string;
  refreshToken?: string;
}

export class AuthHelper {
  constructor(private app: INestApplication) {}

  async getTokensForUser(user: User): Promise<TestTokens> {
    const jwtService = this.app.get(JwtService);

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = jwtService.sign(payload, {
      expiresIn: '15m',
    });

    return {
      accessToken,
    };
  }

  async login(email: string, password: string, tenantId: string): Promise<TestTokens> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', tenantId)
      .send({ email, password })
      .expect(200);

    return {
      accessToken: response.body.accessToken,
      refreshToken: response.body.refreshToken,
    };
  }

  authenticatedRequest(method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string) {
    return (token: string) => {
      const req = request(this.app.getHttpServer())[method](url);
      return req.set('Authorization', `Bearer ${token}`);
    };
  }
}

export function createAuthHelper(app: INestApplication): AuthHelper {
  return new AuthHelper(app);
}
