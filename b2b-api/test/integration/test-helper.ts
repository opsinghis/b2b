/**
 * Shared Test Helper for Integration Tests
 *
 * Provides common utilities for setting up the test app and making requests
 * with proper configuration (API prefix, versioning, tenant headers).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database';
import { TenantFactory, UserFactory, MasterProductFactory } from '../factories';

// API Configuration - matches main.ts
export const API_PREFIX = 'api';
export const API_VERSION = '1';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  tenantFactory: TenantFactory;
  userFactory: UserFactory;
  productFactory: MasterProductFactory;
}

/**
 * Creates and configures a NestJS test application with the same
 * settings as production (global prefix, versioning, validation).
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Configure app same as main.ts
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  return {
    app,
    prisma,
    tenantFactory: new TenantFactory(prisma),
    userFactory: new UserFactory(prisma),
    productFactory: new MasterProductFactory(prisma),
  };
}

/**
 * Helper class for making authenticated requests with proper headers
 */
export class TestClient {
  private accessToken?: string;
  private tenantId?: string;

  constructor(private app: INestApplication) {}

  setAuth(accessToken: string, tenantId: string) {
    this.accessToken = accessToken;
    this.tenantId = tenantId;
  }

  clearAuth() {
    this.accessToken = undefined;
    this.tenantId = undefined;
  }

  /**
   * Login and set auth context
   */
  async login(email: string, password: string, tenantId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.post('/auth/login', { email, password }, tenantId);

    if (response.status === 200) {
      this.accessToken = response.body.accessToken;
      this.tenantId = tenantId;
    }

    return response.body;
  }

  /**
   * Make GET request with auth headers
   */
  get(path: string, tenantIdOverride?: string) {
    const req = request(this.app.getHttpServer())
      .get(`/${API_PREFIX}/v${API_VERSION}${path}`);

    return this.applyHeaders(req, tenantIdOverride);
  }

  /**
   * Make POST request with auth headers
   */
  post(path: string, body?: object, tenantIdOverride?: string) {
    const req = request(this.app.getHttpServer())
      .post(`/${API_PREFIX}/v${API_VERSION}${path}`)
      .send(body || {});

    return this.applyHeaders(req, tenantIdOverride);
  }

  /**
   * Make PATCH request with auth headers
   */
  patch(path: string, body?: object, tenantIdOverride?: string) {
    const req = request(this.app.getHttpServer())
      .patch(`/${API_PREFIX}/v${API_VERSION}${path}`)
      .send(body || {});

    return this.applyHeaders(req, tenantIdOverride);
  }

  /**
   * Make DELETE request with auth headers
   */
  delete(path: string, tenantIdOverride?: string) {
    const req = request(this.app.getHttpServer())
      .delete(`/${API_PREFIX}/v${API_VERSION}${path}`);

    return this.applyHeaders(req, tenantIdOverride);
  }

  /**
   * Make request without versioning (for non-versioned endpoints)
   */
  rawGet(path: string) {
    const req = request(this.app.getHttpServer()).get(path);
    return this.applyHeaders(req);
  }

  rawPost(path: string, body?: object, tenantIdOverride?: string) {
    const req = request(this.app.getHttpServer())
      .post(path)
      .send(body || {});
    return this.applyHeaders(req, tenantIdOverride);
  }

  private applyHeaders(req: request.Test, tenantIdOverride?: string): request.Test {
    const tenantId = tenantIdOverride || this.tenantId;

    if (tenantId) {
      req.set('x-tenant-id', tenantId);
    }

    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }

    return req;
  }
}

/**
 * Create a test client for making requests
 */
export function createTestClient(app: INestApplication): TestClient {
  return new TestClient(app);
}
