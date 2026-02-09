/**
 * Orders Integration Tests
 *
 * @feature orders
 * @module orders
 * @dependencies tenant, users, catalog, cart
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/infrastructure/database';
import { TenantFactory, UserFactory, MasterProductFactory } from '../../factories';

describe('Orders Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantFactory: TenantFactory;
  let userFactory: UserFactory;
  let productFactory: MasterProductFactory;
  let authToken: string;
  let testTenant: any;
  let testUser: any;
  let testProduct: any;

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
    // Create test data
    testTenant = await tenantFactory.create();
    testUser = await userFactory.create(testTenant.id);
    testProduct = await productFactory.createWithTenantAccess(testTenant.id);

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', testTenant.id)
      .send({ email: testUser.email, password: 'TestPassword123!' });

    authToken = loginResponse.body.accessToken;

    // Add product to cart first (orders are created from cart)
    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', testTenant.id)
      .send({ masterProductId: testProduct.id, quantity: 2 });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create order from cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('x-tenant-id', testTenant.id)
        .send({})
        .expect(401);
    });
  });

  describe('GET /orders', () => {
    beforeEach(async () => {
      // Create an order
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({});
    });

    it('should return list of user orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      // Pagination info at root level (same as catalog)
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 5);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body.data.every((o: any) => o.status === 'PENDING')).toBe(true);
    });
  });

  describe('GET /orders/:id', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create an order
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({});
      orderId = orderResponse.body.id;
    });

    it('should return order details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('total');
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/orders/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(404);
    });
  });

  describe('PATCH /admin/orders/:id', () => {
    let orderId: string;
    let adminToken: string;

    beforeEach(async () => {
      // Create admin user
      const adminUser = await userFactory.createAdmin(testTenant.id);
      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-id', testTenant.id)
        .send({ email: adminUser.email, password: 'TestPassword123!' });
      adminToken = adminLogin.body.accessToken;

      // Create an order
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({});
      orderId = orderResponse.body.id;
    });

    it('should allow admin to update order status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'CONFIRMED');
    });

    it('should not allow regular user to update status', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({ status: 'CONFIRMED' })
        .expect(403);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow access to other tenant orders', async () => {
      // Create another tenant with an order
      const otherTenant = await tenantFactory.create({ slug: 'other-tenant' });
      const otherUser = await userFactory.create(otherTenant.id, {
        email: 'other@test.local',
      });
      const otherProduct = await productFactory.createWithTenantAccess(otherTenant.id);

      // Login as other user and create order
      const otherLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-id', otherTenant.id)
        .send({ email: otherUser.email, password: 'TestPassword123!' });
      const otherToken = otherLogin.body.accessToken;

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${otherToken}`)
        .set('x-tenant-id', otherTenant.id)
        .send({ masterProductId: otherProduct.id, quantity: 1 });

      const otherOrder = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${otherToken}`)
        .set('x-tenant-id', otherTenant.id)
        .send({});

      // Try to access other tenant's order with original token
      await request(app.getHttpServer())
        .get(`/orders/${otherOrder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(404); // Should not find it due to tenant isolation
    });
  });
});
