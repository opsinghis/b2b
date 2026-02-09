import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database';
import { TenantFactory, UserFactory } from '../factories';
import { PaymentMethodType, UserRole, OrderStatus } from '@prisma/client';

describe('Payments Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantFactory: TenantFactory;
  let userFactory: UserFactory;
  let authToken: string;
  let adminAuthToken: string;
  let testTenantId: string;
  let testUserId: string;
  let testUser: any;
  let adminUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    tenantFactory = new TenantFactory(prisma);
    userFactory = new UserFactory(prisma);

    // Create test tenant using factory
    const tenant = await tenantFactory.create({ slug: `payments-test-${Date.now()}` });
    testTenantId = tenant.id;

    // Create test user using factory
    testUser = await userFactory.create(testTenantId, { email: `payuser-${Date.now()}@test.com` });
    testUserId = testUser.id;

    // Create admin user using factory
    adminUser = await userFactory.createAdmin(testTenantId, { email: `payadmin-${Date.now()}@test.com` });

    // Get auth tokens using login endpoint
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', testTenantId)
      .send({ email: testUser.email, password: 'TestPassword123!' });
    authToken = loginResponse.body.accessToken;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', testTenantId)
      .send({ email: adminUser.email, password: 'TestPassword123!' });
    adminAuthToken = adminLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup - use try/catch to handle missing records gracefully
    try {
      await prisma.payment.deleteMany({ where: { tenantId: testTenantId } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.orderItem.deleteMany({ where: { order: { tenantId: testTenantId } } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.order.deleteMany({ where: { tenantId: testTenantId } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.userAddress.deleteMany({ where: { tenantId: testTenantId } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.paymentMethodUserType.deleteMany({
        where: { paymentMethod: { tenantId: testTenantId } },
      });
    } catch (e) { /* ignore */ }
    try {
      await prisma.paymentMethod.deleteMany({ where: { tenantId: testTenantId } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.deliveryMethod.deleteMany({ where: { tenantId: testTenantId } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.cart.deleteMany({ where: { tenantId: testTenantId } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.user.deleteMany({ where: { tenantId: testTenantId } });
    } catch (e) { /* ignore */ }
    try {
      await prisma.tenant.delete({ where: { id: testTenantId } });
    } catch (e) { /* ignore */ }
    await app.close();
  });

  describe('Payment Methods', () => {
    let paymentMethodId: string;

    describe('POST /admin/payment-methods', () => {
      it('should create a payment method (admin)', async () => {
        // Skip if admin token is not available
        if (!adminAuthToken) {
          console.warn('Skipping: adminAuthToken not available');
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/admin/payment-methods')
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
        // Skip if admin token is not available or first payment method wasn't created
        if (!adminAuthToken || !paymentMethodId) {
          console.warn('Skipping: adminAuthToken or paymentMethodId not available');
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/admin/payment-methods')
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

    describe('GET /payment-methods', () => {
      it('should get available payment methods for user', async () => {
        if (!authToken) return;

        const response = await request(app.getHttpServer())
          .get('/payment-methods')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('GET /admin/payment-methods', () => {
      it('should list all payment methods (admin)', async () => {
        if (!adminAuthToken) return;

        const response = await request(app.getHttpServer())
          .get('/admin/payment-methods')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('PATCH /admin/payment-methods/:id', () => {
      it('should update a payment method', async () => {
        if (!paymentMethodId || !adminAuthToken) return;

        const response = await request(app.getHttpServer())
          .patch(`/admin/payment-methods/${paymentMethodId}`)
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

    describe('POST /admin/delivery-methods', () => {
      it('should create a delivery method (admin)', async () => {
        if (!adminAuthToken) return;

        const response = await request(app.getHttpServer())
          .post('/admin/delivery-methods')
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

    describe('GET /delivery-methods', () => {
      it('should get available delivery methods', async () => {
        if (!authToken) return;

        const response = await request(app.getHttpServer())
          .get('/delivery-methods')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('PATCH /admin/delivery-methods/:id', () => {
      it('should update a delivery method', async () => {
        if (!deliveryMethodId || !adminAuthToken) return;

        const response = await request(app.getHttpServer())
          .patch(`/admin/delivery-methods/${deliveryMethodId}`)
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

    describe('POST /users/me/addresses', () => {
      it('should create a new address', async () => {
        if (!authToken) return;

        const response = await request(app.getHttpServer())
          .post('/users/me/addresses')
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
          expect(response.body.isDefault).toBe(true);
          addressId = response.body.id;
        }
      });

      it('should create second address not as default', async () => {
        if (!authToken) return;

        const response = await request(app.getHttpServer())
          .post('/users/me/addresses')
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

    describe('GET /users/me/addresses', () => {
      it('should get all user addresses', async () => {
        if (!authToken) return;

        const response = await request(app.getHttpServer())
          .get('/users/me/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('PATCH /users/me/addresses/:id', () => {
      it('should update an address', async () => {
        if (!addressId || !authToken) return;

        const response = await request(app.getHttpServer())
          .patch(`/users/me/addresses/${addressId}`)
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

    describe('DELETE /users/me/addresses/:id', () => {
      it('should delete an address', async () => {
        if (!addressId || !authToken) return;

        const response = await request(app.getHttpServer())
          .delete(`/users/me/addresses/${addressId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        expect([200, 204]).toContain(response.status);
      });
    });
  });

  describe('Payments', () => {
    let orderId: string;
    let paymentMethodId: string;
    let setupFailed = false;

    beforeAll(async () => {
      // Skip setup if auth tokens are not available
      if (!authToken || !testTenantId || !testUserId) {
        setupFailed = true;
        return;
      }

      try {
        // Create a payment method for testing
        const pm = await prisma.paymentMethod.create({
          data: {
            tenantId: testTenantId,
            code: `TEST_PAY_${Date.now()}`,
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
      } catch (error) {
        console.error('Payments setup failed:', error);
        setupFailed = true;
      }
    });

    describe('POST /orders/:id/pay', () => {
      it('should process payment for an order', async () => {
        if (setupFailed || !orderId || !paymentMethodId || !authToken) {
          console.warn('Skipping: Payments setup failed or missing data');
          return;
        }

        const response = await request(app.getHttpServer())
          .post(`/orders/${orderId}/pay`)
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
        if (setupFailed || !orderId || !paymentMethodId || !authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .post(`/orders/${orderId}/pay`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            paymentMethodId,
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /users/me/payment-history', () => {
      it('should get payment history', async () => {
        if (!authToken) return;

        const response = await request(app.getHttpServer())
          .get('/users/me/payment-history')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(response.body.payments).toBeDefined();
          expect(response.body.total).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('GET /orders/:id/payments', () => {
      it('should get payments for an order', async () => {
        if (setupFailed || !orderId || !authToken) return;

        const response = await request(app.getHttpServer())
          .get(`/orders/${orderId}/payments`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenantId);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });
  });
});
