/**
 * Admin Order Management Flow E2E Test
 *
 * Tests the complete admin order management journey:
 * 1. Admin login
 * 2. View all orders
 * 3. View order details
 * 4. Update order status (PENDING -> CONFIRMED -> PROCESSING -> SHIPPED)
 * 5. Verify order status history
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database';
import { TenantFactory, UserFactory, MasterProductFactory } from '../factories';
import { OrderStatus } from '@prisma/client';

describe('Admin Order Management Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantFactory: TenantFactory;
  let userFactory: UserFactory;
  let productFactory: MasterProductFactory;

  let testTenant: any;
  let adminUser: any;
  let customerUser: any;
  let adminToken: string;
  let customerToken: string;
  let testProduct: any;
  let orderId: string;

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

    // Setup test data
    testTenant = await tenantFactory.create({ slug: `e2e-admin-${Date.now()}` });
    adminUser = await userFactory.createAdmin(testTenant.id, { email: `e2e-admin-${Date.now()}@test.com` });
    customerUser = await userFactory.create(testTenant.id, { email: `e2e-customer-${Date.now()}@test.com` });
    testProduct = await productFactory.createWithTenantAccess(testTenant.id, {
      name: `E2E Admin Product`,
      sku: `E2E-ADMIN-SKU-${Date.now()}`,
    });

    // Get tokens
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', testTenant.id)
      .send({ email: adminUser.email, password: 'TestPassword123!' });
    adminToken = adminLoginResponse.body.accessToken;

    const customerLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', testTenant.id)
      .send({ email: customerUser.email, password: 'TestPassword123!' });
    customerToken = customerLoginResponse.body.accessToken;

    // Create an order as customer
    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('x-tenant-id', testTenant.id)
      .send({ masterProductId: testProduct.id, quantity: 2 });

    const orderResponse = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('x-tenant-id', testTenant.id)
      .send({});

    orderId = orderResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.cartItem.deleteMany({ where: { cart: { tenantId: testTenant.id } } });
      await prisma.cart.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.orderItem.deleteMany({ where: { order: { tenantId: testTenant.id } } });
      await prisma.order.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.tenantProductAccess.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.masterProduct.deleteMany({ where: { id: testProduct.id } });
      await prisma.user.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.tenant.delete({ where: { id: testTenant.id } });
    } catch (e) {
      // Ignore cleanup errors
    }
    await app.close();
  });

  describe('Admin Order Management Journey', () => {
    it('Step 1: Admin views all orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('Step 2: Admin views specific order details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('items');
    });

    it('Step 3: Admin confirms the order', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'CONFIRMED');
    });

    it('Step 4: Admin moves order to processing', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({ status: OrderStatus.PROCESSING })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'PROCESSING');
    });

    it('Step 5: Admin ships the order with tracking', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({
          status: OrderStatus.SHIPPED,
          trackingNumber: 'TRACK123456',
          carrier: 'FedEx',
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'SHIPPED');
      expect(response.body).toHaveProperty('trackingNumber', 'TRACK123456');
      expect(response.body).toHaveProperty('carrier', 'FedEx');
    });

    it('Step 6: Customer can see updated order status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'SHIPPED');
      expect(response.body).toHaveProperty('trackingNumber', 'TRACK123456');
    });

    it('Step 7: Regular user cannot update order status', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({ status: OrderStatus.DELIVERED })
        .expect(403);
    });

    it('Step 8: Admin completes the order', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({ status: OrderStatus.DELIVERED })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'DELIVERED');
    });

    it('Step 9: Admin can filter orders by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/orders?status=DELIVERED')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body.data.every((o: any) => o.status === 'DELIVERED')).toBe(true);
    });
  });
});
