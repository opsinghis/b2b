/**
 * Customer Shopping Flow E2E Test
 *
 * Tests the complete customer journey:
 * 1. Login
 * 2. Browse catalog
 * 3. Add items to cart
 * 4. Create order (checkout)
 * 5. View order details
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database';
import { TenantFactory, UserFactory, MasterProductFactory } from '../factories';

describe('Customer Shopping Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantFactory: TenantFactory;
  let userFactory: UserFactory;
  let productFactory: MasterProductFactory;

  let testTenant: any;
  let testUser: any;
  let authToken: string;
  let testProducts: any[] = [];

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
    testTenant = await tenantFactory.create({ slug: `e2e-shop-${Date.now()}` });
    testUser = await userFactory.create(testTenant.id, { email: `e2e-customer-${Date.now()}@test.com` });

    // Create test products
    for (let i = 0; i < 3; i++) {
      const product = await productFactory.createWithTenantAccess(testTenant.id, {
        name: `E2E Product ${i + 1}`,
        sku: `E2E-SKU-${Date.now()}-${i}`,
      });
      testProducts.push(product);
    }
  });

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.cartItem.deleteMany({ where: { cart: { tenantId: testTenant.id } } });
      await prisma.cart.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.orderItem.deleteMany({ where: { order: { tenantId: testTenant.id } } });
      await prisma.order.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.tenantProductAccess.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.masterProduct.deleteMany({ where: { id: { in: testProducts.map(p => p.id) } } });
      await prisma.user.deleteMany({ where: { tenantId: testTenant.id } });
      await prisma.tenant.delete({ where: { id: testTenant.id } });
    } catch (e) {
      // Ignore cleanup errors
    }
    await app.close();
  });

  describe('Complete Shopping Journey', () => {
    it('Step 1: Customer logs in', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-id', testTenant.id)
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);

      authToken = response.body.accessToken;
    });

    it('Step 2: Customer browses the catalog', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/products')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('Step 3: Customer views product details', async () => {
      const productId = testProducts[0].id;

      const response = await request(app.getHttpServer())
        .get(`/catalog/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('id', productId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('sku');
    });

    it('Step 4: Customer adds items to cart', async () => {
      // Add first product
      const response1 = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({
          masterProductId: testProducts[0].id,
          quantity: 2,
        })
        .expect(201);

      expect(response1.body).toHaveProperty('items');
      expect(response1.body.items.length).toBe(1);
      expect(response1.body.items[0].quantity).toBe(2);

      // Add second product
      const response2 = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({
          masterProductId: testProducts[1].id,
          quantity: 1,
        })
        .expect(201);

      expect(response2.body.items.length).toBe(2);
    });

    it('Step 5: Customer views cart', async () => {
      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBe(2);
      expect(response.body).toHaveProperty('subtotal');
    });

    it('Step 6: Customer updates cart item quantity', async () => {
      // Get current cart to find item ID
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id);

      const itemId = cartResponse.body.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .send({ quantity: 3 })
        .expect(200);

      const updatedItem = response.body.items.find((i: any) => i.id === itemId);
      expect(updatedItem.quantity).toBe(3);
    });

    let orderId: string;

    it('Step 7: Customer creates order (checkout)', async () => {
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
      expect(response.body.items.length).toBe(2);

      orderId = response.body.id;
    });

    it('Step 8: Customer views order list', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('Step 9: Customer views order details', async () => {
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

    it('Step 10: Cart is empty after checkout', async () => {
      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant.id)
        .expect(200);

      expect(response.body.items.length).toBe(0);
    });
  });
});
