import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient, UserRole, Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../../src/app.module';
import { TenantFactory, UserFactory, MasterProductFactory } from '../../factories';

describe('Cart Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  let tenantFactory: TenantFactory;
  let userFactory: UserFactory;
  let productFactory: MasterProductFactory;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = new PrismaClient();
    await prisma.$connect();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    tenantFactory = new TenantFactory(prisma);
    userFactory = new UserFactory(prisma);
    productFactory = new MasterProductFactory(prisma);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database between tests
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.tenantProductAccess.deleteMany();
    await prisma.masterProduct.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  });

  function getAuthToken(user: { id: string; email: string; tenantId: string; role: UserRole }) {
    return jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
      { expiresIn: '15m' },
    );
  }

  describe('GET /cart', () => {
    it('should create and return empty cart for new user', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        subtotal: '0',
        discount: '0',
        tax: '0',
        total: '0',
        couponCode: null,
        couponDiscount: '0',
        items: [],
      });
    });

    it('should return existing cart with items', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const product = await productFactory.createWithTenantAccess(tenant.id);
      const token = getAuthToken(user);

      // Create cart with item
      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          subtotal: new Prisma.Decimal(100),
          total: new Prisma.Decimal(100),
        },
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          masterProductId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 2,
          unitPrice: new Prisma.Decimal(50),
          total: new Prisma.Decimal(100),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        productName: product.name,
        quantity: 2,
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/cart').expect(401);
    });
  });

  describe('POST /cart/items', () => {
    it('should add item from catalog to cart', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const product = await productFactory.createWithTenantAccess(tenant.id, {
        listPrice: new Prisma.Decimal(50),
      });
      const token = getAuthToken(user);

      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({
          masterProductId: product.id,
          quantity: 3,
        })
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        productName: product.name,
        productSku: product.sku,
        quantity: 3,
      });
      expect(parseFloat(response.body.subtotal)).toBe(150);
    });

    it('should add manual item to cart', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({
          productName: 'Custom Product',
          productSku: 'CUSTOM-001',
          quantity: 2,
          unitPrice: 25.5,
        })
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        productName: 'Custom Product',
        productSku: 'CUSTOM-001',
        quantity: 2,
      });
      expect(parseFloat(response.body.subtotal)).toBe(51);
    });

    it('should increase quantity when adding existing product', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const product = await productFactory.createWithTenantAccess(tenant.id, {
        listPrice: new Prisma.Decimal(25),
      });
      const token = getAuthToken(user);

      // Add first time
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({
          masterProductId: product.id,
          quantity: 2,
        })
        .expect(201);

      // Add again
      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({
          masterProductId: product.id,
          quantity: 3,
        })
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(5);
      expect(parseFloat(response.body.subtotal)).toBe(125);
    });

    it('should return 403 when tenant lacks product access', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const product = await productFactory.create(); // No tenant access
      const token = getAuthToken(user);

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({
          masterProductId: product.id,
          quantity: 1,
        })
        .expect(403);
    });

    it('should return 400 when missing required fields for manual item', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({
          quantity: 2,
        })
        .expect(400);
    });
  });

  describe('PATCH /cart/items/:id', () => {
    it('should update item quantity', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      // Create cart with item
      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });

      const item = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productName: 'Test Product',
          quantity: 2,
          unitPrice: new Prisma.Decimal(50),
          total: new Prisma.Decimal(100),
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/cart/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.items[0].quantity).toBe(5);
      expect(parseFloat(response.body.subtotal)).toBe(250);
    });

    it('should update item with discount', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });

      const item = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productName: 'Test Product',
          quantity: 2,
          unitPrice: new Prisma.Decimal(50),
          total: new Prisma.Decimal(100),
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/cart/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({ quantity: 2, discount: 10 })
        .expect(200);

      expect(parseFloat(response.body.items[0].discount)).toBe(10);
    });

    it('should return 404 for non-existent item', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      // Create empty cart
      await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });

      await request(app.getHttpServer())
        .patch('/cart/items/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({ quantity: 5 })
        .expect(404);
    });
  });

  describe('DELETE /cart/items/:id', () => {
    it('should remove item from cart', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });

      const item = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productName: 'Test Product',
          quantity: 2,
          unitPrice: new Prisma.Decimal(50),
          total: new Prisma.Decimal(100),
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/cart/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(parseFloat(response.body.subtotal)).toBe(0);
    });

    it('should return 404 for non-existent item', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });

      await request(app.getHttpServer())
        .delete('/cart/items/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .expect(404);
    });
  });

  describe('DELETE /cart', () => {
    it('should clear all items from cart', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          couponCode: 'SAVE10',
        },
      });

      await prisma.cartItem.createMany({
        data: [
          {
            cartId: cart.id,
            productName: 'Product 1',
            quantity: 2,
            unitPrice: new Prisma.Decimal(50),
            total: new Prisma.Decimal(100),
          },
          {
            cartId: cart.id,
            productName: 'Product 2',
            quantity: 1,
            unitPrice: new Prisma.Decimal(75),
            total: new Prisma.Decimal(75),
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.couponCode).toBeNull();
      expect(parseFloat(response.body.subtotal)).toBe(0);
    });
  });

  describe('POST /cart/apply-coupon', () => {
    it('should apply percentage coupon', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          subtotal: new Prisma.Decimal(200),
          total: new Prisma.Decimal(200),
        },
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productName: 'Test Product',
          quantity: 2,
          unitPrice: new Prisma.Decimal(100),
          total: new Prisma.Decimal(200),
        },
      });

      const response = await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({ couponCode: 'SAVE10' })
        .expect(200);

      expect(response.body.couponCode).toBe('SAVE10');
      expect(parseFloat(response.body.couponDiscount)).toBe(20); // 10% of 200
      expect(parseFloat(response.body.total)).toBe(180);
    });

    it('should apply fixed coupon', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          subtotal: new Prisma.Decimal(200),
          total: new Prisma.Decimal(200),
        },
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productName: 'Test Product',
          quantity: 2,
          unitPrice: new Prisma.Decimal(100),
          total: new Prisma.Decimal(200),
        },
      });

      const response = await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({ couponCode: 'FLAT50' })
        .expect(200);

      expect(response.body.couponCode).toBe('FLAT50');
      expect(parseFloat(response.body.couponDiscount)).toBe(50);
      expect(parseFloat(response.body.total)).toBe(150);
    });

    it('should return 400 for empty cart', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({ couponCode: 'SAVE10' })
        .expect(400);
    });

    it('should return 400 for invalid coupon', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productName: 'Test Product',
          quantity: 1,
          unitPrice: new Prisma.Decimal(100),
          total: new Prisma.Decimal(100),
        },
      });

      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .send({ couponCode: 'INVALID_COUPON' })
        .expect(400);
    });
  });

  describe('DELETE /cart/coupon', () => {
    it('should remove coupon from cart', async () => {
      const tenant = await tenantFactory.create();
      const user = await userFactory.create(tenant.id);
      const token = getAuthToken(user);

      const cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          subtotal: new Prisma.Decimal(100),
          total: new Prisma.Decimal(90),
          couponCode: 'SAVE10',
          couponDiscount: new Prisma.Decimal(10),
        },
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productName: 'Test Product',
          quantity: 1,
          unitPrice: new Prisma.Decimal(100),
          total: new Prisma.Decimal(100),
        },
      });

      const response = await request(app.getHttpServer())
        .delete('/cart/coupon')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);

      expect(response.body.couponCode).toBeNull();
      expect(parseFloat(response.body.couponDiscount)).toBe(0);
      expect(parseFloat(response.body.total)).toBe(100);
    });
  });

  describe('Cart isolation', () => {
    it('should isolate carts between users in same tenant', async () => {
      const tenant = await tenantFactory.create();
      const user1 = await userFactory.create(tenant.id);
      const user2 = await userFactory.create(tenant.id);
      const token1 = getAuthToken(user1);
      const token2 = getAuthToken(user2);

      // User 1 adds item
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenant.id)
        .send({
          productName: 'User 1 Product',
          quantity: 1,
          unitPrice: 100,
        })
        .expect(201);

      // User 2 adds different item
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token2}`)
        .set('x-tenant-id', tenant.id)
        .send({
          productName: 'User 2 Product',
          quantity: 2,
          unitPrice: 50,
        })
        .expect(201);

      // Verify carts are isolated
      const user1Cart = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);

      const user2Cart = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${token2}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);

      expect(user1Cart.body.items).toHaveLength(1);
      expect(user1Cart.body.items[0].productName).toBe('User 1 Product');
      expect(user2Cart.body.items).toHaveLength(1);
      expect(user2Cart.body.items[0].productName).toBe('User 2 Product');
    });

    it('should isolate carts between tenants', async () => {
      const tenant1 = await tenantFactory.create();
      const tenant2 = await tenantFactory.create();
      const user1 = await userFactory.create(tenant1.id);
      const user2 = await userFactory.create(tenant2.id);
      const token1 = getAuthToken(user1);
      const token2 = getAuthToken(user2);

      // User 1 in tenant 1 adds item
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenant1.id)
        .send({
          productName: 'Tenant 1 Product',
          quantity: 1,
          unitPrice: 100,
        })
        .expect(201);

      // User 2 in tenant 2 should have empty cart
      const user2Cart = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${token2}`)
        .set('x-tenant-id', tenant2.id)
        .expect(200);

      expect(user2Cart.body.items).toHaveLength(0);
    });
  });
});
