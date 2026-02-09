/**
 * Catalog Integration Tests
 *
 * @feature catalog
 * @module master-catalog, tenant-catalog
 * @dependencies tenant, categories, products
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/infrastructure/database';
import { TenantFactory, UserFactory, MasterProductFactory } from '../../factories';

describe('Catalog Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantFactory: TenantFactory;
  let userFactory: UserFactory;
  let productFactory: MasterProductFactory;
  let authToken: string;
  let testTenant: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    tenantFactory = new TenantFactory(prisma);
    userFactory = new UserFactory(prisma);
    productFactory = new MasterProductFactory(prisma);
  });

  beforeEach(async () => {
    // Create test tenant and user
    testTenant = await tenantFactory.create();
    const user = await userFactory.create(testTenant.id);

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', testTenant.id)
      .send({ email: user.email, password: 'TestPassword123!' });

    authToken = loginResponse.body.accessToken;

    // Create test products with tenant access
    await productFactory.createWithTenantAccess(testTenant.id);
    await productFactory.createWithTenantAccess(testTenant.id);
    await productFactory.createWithTenantAccess(testTenant.id);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /catalog/products', () => {
    it('should return list of products for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/products')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Pagination info is at root level (page, limit, total, totalPages)
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/products?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      // Check response has data array
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      // Pagination info at root level
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
    });

    it('should support search by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/products?search=test')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/catalog/products')
        .set('x-tenant-id', testTenant.id)
        .expect(401);
    });
  });

  describe('GET /catalog/products/:id', () => {
    it('should return product details', async () => {
      // First get a product from the list
      const listResponse = await request(app.getHttpServer())
        .get('/catalog/products?limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      const productId = listResponse.body.data[0]?.id;
      if (!productId) return;

      const response = await request(app.getHttpServer())
        .get(`/catalog/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('id', productId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('sku');
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/catalog/products/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(404);
    });
  });

  describe('GET /catalog/categories', () => {
    it('should return list of categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      // Response might be array or object with data array
      const categories = Array.isArray(response.body) ? response.body : response.body.data;
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return products accessible to the tenant', async () => {
      // Create a different tenant and product
      const otherTenant = await tenantFactory.create({ slug: 'other-tenant' });
      await productFactory.createWithTenantAccess(otherTenant.id);

      // Request with original tenant's token
      const response = await request(app.getHttpServer())
        .get('/catalog/products')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      // Should not include the other tenant's product
      const productTenants = response.body.data.map((p: any) => p.tenantAccess?.tenantId);
      expect(productTenants.every((t: string) => t !== otherTenant.id)).toBe(true);
    });
  });
});
