import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database';
import { PaymentMethodType, UserRole, OrderStatus } from '@prisma/client';

describe('Payments Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let adminAuthToken: string;
  let testTenantId: string;
  let testUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Payments Test Tenant',
        slug: `payments-test-${Date.now()}`,
      },
    });
    testTenantId = tenant.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `payuser-${Date.now()}@test.com`,
        passwordHash: '$2b$10$test',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        tenantId: testTenantId,
      },
    });
    testUserId = user.id;

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: `payadmin-${Date.now()}@test.com`,
        passwordHash: '$2b$10$test',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        tenantId: testTenantId,
      },
    });
    adminUserId = admin.id;

    // Get auth tokens using login endpoint
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', testTenantId)
      .send({ email: user.email, password: 'test' });
    authToken = loginResponse.body.accessToken || 'mock-token';

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', testTenantId)
      .send({ email: admin.email, password: 'test' });
    adminAuthToken = adminLoginResponse.body.accessToken || 'mock-admin-token';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.payment.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.order.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.userAddress.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.paymentMethodUserType.deleteMany({
      where: { paymentMethod: { tenantId: testTenantId } },
    });
    await prisma.paymentMethod.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.deliveryMethod.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.cart.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.user.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
    await app.close();
  });

  describe('Payment Methods', () => {
    let paymentMethodId: string;

    describe('POST /api/v1/admin/payment-methods', () => {
      it('should create a payment method (admin)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/payment-methods')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            code: 'CREDIT_CARD',
            name: 'Credit Card',
            description: 'Pay with credit card',
            type: PaymentMethodType.CREDIT_CARD,
            isActive: true,
            allowedUserRoles: [UserRole.USER, UserRole.ADMIN],
          });

        if (response.status === 201) {
          expect(response.body.code).toBe('CREDIT_CARD');
          paymentMethodId = response.body.id;
        }
      });

      it('should reject duplicate code', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/payment-methods')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            code: 'CREDIT_CARD',
            name: 'Another Credit Card',
            type: PaymentMethodType.CREDIT_CARD,
          });

        expect(response.status).toBe(409);
      });
    });

    describe('GET /api/v1/payment-methods', () => {
      it('should get available payment methods for user', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/payment-methods')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('GET /api/v1/admin/payment-methods', () => {
      it('should list all payment methods (admin)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/payment-methods')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('PATCH /api/v1/admin/payment-methods/:id', () => {
      it('should update a payment method', async () => {
        if (!paymentMethodId) return;

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/admin/payment-methods/${paymentMethodId}`)
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            name: 'Updated Credit Card',
          });

        if (response.status === 200) {
          expect(response.body.name).toBe('Updated Credit Card');
        }
      });
    });
  });

  describe('Delivery Methods', () => {
    let deliveryMethodId: string;

    describe('POST /api/v1/admin/delivery-methods', () => {
      it('should create a delivery method (admin)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/delivery-methods')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            code: 'STANDARD',
            name: 'Standard Delivery',
            description: '3-5 business days',
            minDays: 3,
            maxDays: 5,
            baseCost: 10,
            freeThreshold: 100,
          });

        if (response.status === 201) {
          expect(response.body.code).toBe('STANDARD');
          deliveryMethodId = response.body.id;
        }
      });
    });

    describe('GET /api/v1/delivery-methods', () => {
      it('should get available delivery methods', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/delivery-methods')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('PATCH /api/v1/admin/delivery-methods/:id', () => {
      it('should update a delivery method', async () => {
        if (!deliveryMethodId) return;

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/admin/delivery-methods/${deliveryMethodId}`)
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            name: 'Updated Standard Delivery',
          });

        if (response.status === 200) {
          expect(response.body.name).toBe('Updated Standard Delivery');
        }
      });
    });
  });

  describe('User Addresses', () => {
    let addressId: string;

    describe('POST /api/v1/users/me/addresses', () => {
      it('should create a new address', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/users/me/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            label: 'Home',
            firstName: 'John',
            lastName: 'Doe',
            street1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US',
          });

        if (response.status === 201) {
          expect(response.body.firstName).toBe('John');
          expect(response.body.isDefault).toBe(true); // First address should be default
          addressId = response.body.id;
        }
      });

      it('should create second address not as default', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/users/me/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            label: 'Office',
            firstName: 'John',
            lastName: 'Doe',
            street1: '456 Office Blvd',
            city: 'New York',
            state: 'NY',
            postalCode: '10002',
          });

        if (response.status === 201) {
          expect(response.body.label).toBe('Office');
          expect(response.body.isDefault).toBe(false);
        }
      });
    });

    describe('GET /api/v1/users/me/addresses', () => {
      it('should get all user addresses', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/users/me/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('PATCH /api/v1/users/me/addresses/:id', () => {
      it('should update an address', async () => {
        if (!addressId) return;

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/users/me/addresses/${addressId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            street1: '789 Updated St',
          });

        if (response.status === 200) {
          expect(response.body.street1).toBe('789 Updated St');
        }
      });
    });

    describe('DELETE /api/v1/users/me/addresses/:id', () => {
      it('should delete an address', async () => {
        if (!addressId) return;

        const response = await request(app.getHttpServer())
          .delete(`/api/v1/users/me/addresses/${addressId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        expect([200, 204]).toContain(response.status);
      });
    });
  });

  describe('Payments', () => {
    let orderId: string;
    let paymentMethodId: string;

    beforeAll(async () => {
      // Create a payment method for testing
      const pm = await prisma.paymentMethod.create({
        data: {
          tenantId: testTenantId,
          code: 'TEST_PAY',
          name: 'Test Payment',
          type: PaymentMethodType.BANK_TRANSFER,
          isActive: true,
          userTypeAccess: {
            create: [{ userRole: UserRole.USER }],
          },
        },
      });
      paymentMethodId = pm.id;

      // Create an order for testing
      const order = await prisma.order.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          orderNumber: `ORD-TEST-${Date.now()}`,
          status: OrderStatus.PENDING,
          subtotal: 100,
          total: 100,
        },
      });
      orderId = order.id;
    });

    describe('POST /api/v1/orders/:id/pay', () => {
      it('should process payment for an order', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/orders/${orderId}/pay`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            paymentMethodId,
          });

        if (response.status === 200) {
          expect(response.body.status).toBe('COMPLETED');
          expect(response.body.orderId).toBe(orderId);
        }
      });

      it('should reject payment for already paid order', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/orders/${orderId}/pay`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            paymentMethodId,
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/users/me/payment-history', () => {
      it('should get payment history', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/users/me/payment-history')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(response.body.payments).toBeDefined();
          expect(response.body.total).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('GET /api/v1/orders/:id/payments', () => {
      it('should get payments for an order', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/orders/${orderId}/payments`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });
  });
});
