/**
 * Test Seed Utility
 *
 * Supports scoped seeding for feature-based testing.
 * Usage: npx ts-node test/seed/test-seed.ts --scope=cart
 */

import { PrismaClient, UserRole, MasterProductStatus, OrderStatus, QuoteStatus, ContractStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Test data constants
const TEST_PASSWORD = 'TestPassword123!';
const DEFAULT_TENANT_SLUG = 'test-tenant';

interface SeedResult {
  tenant?: any;
  users?: any[];
  products?: any[];
  categories?: any[];
  orders?: any[];
  quotes?: any[];
  contracts?: any[];
}

// Parse command line arguments
function getScope(): string | undefined {
  const args = process.argv.slice(2);
  const scopeArg = args.find(arg => arg.startsWith('--scope='));
  return scopeArg?.split('=')[1];
}

// Core seed functions
async function seedTenant() {
  console.log('🏢 Seeding tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: {},
    create: {
      name: 'Test Tenant',
      slug: DEFAULT_TENANT_SLUG,
      config: {
        features: {
          quotes: true,
          contracts: true,
          approvals: true,
          notifications: true,
        },
        branding: {
          primaryColor: '#1976d2',
          logo: null,
        },
      },
    },
  });
  console.log(`✅ Tenant created: ${tenant.id}`);
  return tenant;
}

async function seedUsers(tenantId: string) {
  console.log('👥 Seeding users...');
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const users = await Promise.all([
    // Admin user
    prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: 'admin@test.local' } },
      update: {},
      create: {
        email: 'admin@test.local',
        passwordHash,
        firstName: 'Test',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        tenantId,
      },
    }),
    // Customer user
    prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: 'customer@test.local' } },
      update: {},
      create: {
        email: 'customer@test.local',
        passwordHash,
        firstName: 'Test',
        lastName: 'Customer',
        role: UserRole.USER,
        tenantId,
      },
    }),
    // Manager user
    prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: 'manager@test.local' } },
      update: {},
      create: {
        email: 'manager@test.local',
        passwordHash,
        firstName: 'Test',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        tenantId,
      },
    }),
    // Super admin user
    prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: 'superadmin@test.local' } },
      update: {},
      create: {
        email: 'superadmin@test.local',
        passwordHash,
        firstName: 'Test',
        lastName: 'SuperAdmin',
        role: UserRole.SUPER_ADMIN,
        tenantId,
      },
    }),
  ]);

  console.log(`✅ Users created: ${users.length}`);
  return users;
}

async function seedCategories() {
  console.log('📂 Seeding categories...');
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'office-supplies' },
      update: {},
      create: {
        name: 'Office Supplies',
        slug: 'office-supplies',
        description: 'Office equipment and supplies',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'furniture' },
      update: {},
      create: {
        name: 'Furniture',
        slug: 'furniture',
        description: 'Office and home furniture',
        isActive: true,
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ Categories created: ${categories.length}`);
  return categories;
}

async function seedProducts(categories: any[]) {
  console.log('📦 Seeding products...');
  const products = await Promise.all([
    prisma.masterProduct.upsert({
      where: { sku: 'TEST-PROD-001' },
      update: {},
      create: {
        sku: 'TEST-PROD-001',
        name: 'Test Laptop',
        description: 'High-performance business laptop',
        category: 'Electronics',
        categoryId: categories.find(c => c.slug === 'electronics')?.id,
        subcategory: 'Computers',
        brand: 'TestBrand',
        manufacturer: 'TestManufacturer',
        uom: 'EA',
        listPrice: 999.99,
        currency: 'USD',
        status: MasterProductStatus.ACTIVE,
        attributes: { color: 'Silver', warranty: '2 years' },
      },
    }),
    prisma.masterProduct.upsert({
      where: { sku: 'TEST-PROD-002' },
      update: {},
      create: {
        sku: 'TEST-PROD-002',
        name: 'Test Monitor',
        description: '27-inch 4K monitor',
        category: 'Electronics',
        categoryId: categories.find(c => c.slug === 'electronics')?.id,
        subcategory: 'Displays',
        brand: 'TestBrand',
        manufacturer: 'TestManufacturer',
        uom: 'EA',
        listPrice: 499.99,
        currency: 'USD',
        status: MasterProductStatus.ACTIVE,
        attributes: { resolution: '4K', size: '27 inch' },
      },
    }),
    prisma.masterProduct.upsert({
      where: { sku: 'TEST-PROD-003' },
      update: {},
      create: {
        sku: 'TEST-PROD-003',
        name: 'Office Desk',
        description: 'Standing desk with adjustable height',
        category: 'Furniture',
        categoryId: categories.find(c => c.slug === 'furniture')?.id,
        subcategory: 'Desks',
        brand: 'TestBrand',
        manufacturer: 'TestManufacturer',
        uom: 'EA',
        listPrice: 599.99,
        currency: 'USD',
        status: MasterProductStatus.ACTIVE,
        attributes: { material: 'Wood', adjustable: true },
      },
    }),
    prisma.masterProduct.upsert({
      where: { sku: 'TEST-PROD-004' },
      update: {},
      create: {
        sku: 'TEST-PROD-004',
        name: 'Printer Paper',
        description: 'Premium white printer paper - 500 sheets',
        category: 'Office Supplies',
        categoryId: categories.find(c => c.slug === 'office-supplies')?.id,
        subcategory: 'Paper',
        brand: 'TestBrand',
        manufacturer: 'TestManufacturer',
        uom: 'PACK',
        listPrice: 24.99,
        currency: 'USD',
        status: MasterProductStatus.ACTIVE,
        attributes: { sheets: 500, size: 'A4' },
      },
    }),
  ]);

  console.log(`✅ Products created: ${products.length}`);
  return products;
}

async function seedTenantProductAccess(tenantId: string, products: any[]) {
  console.log('🔗 Granting tenant product access...');
  const access = await prisma.tenantProductAccess.createMany({
    data: products.map(p => ({
      tenantId,
      masterProductId: p.id,
      isActive: true,
    })),
    skipDuplicates: true,
  });
  console.log(`✅ Product access granted: ${access.count}`);
  return access;
}

async function seedOrders(tenantId: string, userId: string, products: any[], count = 5) {
  console.log(`📋 Seeding ${count} orders...`);
  const orders = [];

  for (let i = 0; i < count; i++) {
    const product = products[i % products.length];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const unitPrice = Number(product.listPrice);
    const subtotal = unitPrice * quantity;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}-${i}`,
        tenantId,
        userId,
        status: i === 0 ? OrderStatus.PENDING : OrderStatus.CONFIRMED,
        subtotal,
        tax,
        total,
        currency: 'USD',
        items: {
          create: {
            masterProductId: product.id,
            sku: product.sku,
            name: product.name,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
          },
        },
      },
    });
    orders.push(order);
  }

  console.log(`✅ Orders created: ${orders.length}`);
  return orders;
}

async function seedQuotes(tenantId: string, userId: string, products: any[], count = 3) {
  console.log(`💬 Seeding ${count} quotes...`);
  const quotes = [];

  for (let i = 0; i < count; i++) {
    const product = products[i % products.length];
    const quantity = Math.floor(Math.random() * 10) + 1;
    const unitPrice = Number(product.listPrice);
    const subtotal = unitPrice * quantity;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: `TEST-QT-${Date.now()}-${i}`,
        tenantId,
        userId,
        status: i === 0 ? QuoteStatus.DRAFT : QuoteStatus.SUBMITTED,
        subtotal,
        total: subtotal,
        currency: 'USD',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        items: {
          create: {
            masterProductId: product.id,
            sku: product.sku,
            name: product.name,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
          },
        },
      },
    });
    quotes.push(quote);
  }

  console.log(`✅ Quotes created: ${quotes.length}`);
  return quotes;
}

async function seedPartner(tenantId: string) {
  console.log('🤝 Seeding partner...');
  const partner = await prisma.partner.upsert({
    where: {
      tenantId_code: {
        tenantId,
        code: 'TEST-PARTNER-001',
      },
    },
    update: {},
    create: {
      code: 'TEST-PARTNER-001',
      name: 'Test Partner Company',
      contactEmail: 'partner@testpartner.com',
      contactPhone: '+1-555-0123',
      tenantId,
      isActive: true,
    },
  });
  console.log(`✅ Partner created: ${partner.id}`);
  return partner;
}

async function seedContracts(tenantId: string, partnerId: string, count = 2) {
  console.log(`📄 Seeding ${count} contracts...`);
  const contracts = [];

  for (let i = 0; i < count; i++) {
    const contract = await prisma.contract.create({
      data: {
        contractNumber: `TEST-CON-${Date.now()}-${i}`,
        name: `Test Contract ${i + 1}`,
        tenantId,
        partnerId,
        status: i === 0 ? ContractStatus.DRAFT : ContractStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        terms: { paymentTerms: 'Net 30', discountRate: 0.1 },
      },
    });
    contracts.push(contract);
  }

  console.log(`✅ Contracts created: ${contracts.length}`);
  return contracts;
}

// Scoped seed functions
async function seedForAuth(): Promise<SeedResult> {
  const tenant = await seedTenant();
  const users = await seedUsers(tenant.id);
  return { tenant, users };
}

async function seedForCatalog(): Promise<SeedResult> {
  const tenant = await seedTenant();
  const categories = await seedCategories();
  const products = await seedProducts(categories);
  await seedTenantProductAccess(tenant.id, products);
  return { tenant, categories, products };
}

async function seedForCart(): Promise<SeedResult> {
  const { tenant, categories, products } = await seedForCatalog();
  const users = await seedUsers(tenant!.id);
  return { tenant, users, categories, products };
}

async function seedForOrders(): Promise<SeedResult> {
  const { tenant, users, categories, products } = await seedForCart();
  const customerUser = users!.find(u => u.role === UserRole.USER);
  const orders = await seedOrders(tenant!.id, customerUser!.id, products!, 5);
  return { tenant, users, categories, products, orders };
}

async function seedForQuotes(): Promise<SeedResult> {
  const { tenant, categories, products } = await seedForCatalog();
  const users = await seedUsers(tenant!.id);
  const customerUser = users.find(u => u.role === UserRole.USER);
  const quotes = await seedQuotes(tenant!.id, customerUser!.id, products!, 3);
  return { tenant, users, categories, products, quotes };
}

async function seedForContracts(): Promise<SeedResult> {
  const tenant = await seedTenant();
  const users = await seedUsers(tenant.id);
  const partner = await seedPartner(tenant.id);
  const contracts = await seedContracts(tenant.id, partner.id, 2);
  return { tenant, users, contracts };
}

async function seedForDashboard(): Promise<SeedResult> {
  const { tenant, users, categories, products, orders } = await seedForOrders();
  // Create more orders for meaningful KPIs
  const customerUser = users!.find(u => u.role === UserRole.USER);
  const additionalOrders = await seedOrders(tenant!.id, customerUser!.id, products!, 20);
  return { tenant, users, categories, products, orders: [...orders!, ...additionalOrders] };
}

async function seedAll(): Promise<SeedResult> {
  const tenant = await seedTenant();
  const users = await seedUsers(tenant.id);
  const categories = await seedCategories();
  const products = await seedProducts(categories);
  await seedTenantProductAccess(tenant.id, products);
  const customerUser = users.find(u => u.role === UserRole.USER);
  const orders = await seedOrders(tenant.id, customerUser!.id, products, 5);
  const quotes = await seedQuotes(tenant.id, customerUser!.id, products, 3);
  const partner = await seedPartner(tenant.id);
  const contracts = await seedContracts(tenant.id, partner.id, 2);
  return { tenant, users, categories, products, orders, quotes, contracts };
}

// Main execution
async function main() {
  const scope = getScope();
  console.log(`🌱 Starting test seed (scope: ${scope || 'all'})...`);

  let result: SeedResult;

  switch (scope) {
    case 'auth':
    case 'users':
      result = await seedForAuth();
      break;
    case 'catalog':
    case 'categories':
    case 'products':
      result = await seedForCatalog();
      break;
    case 'cart':
    case 'pricing':
      result = await seedForCart();
      break;
    case 'orders':
      result = await seedForOrders();
      break;
    case 'quotes':
      result = await seedForQuotes();
      break;
    case 'contracts':
      result = await seedForContracts();
      break;
    case 'dashboard':
      result = await seedForDashboard();
      break;
    case 'tenants':
      const tenant = await seedTenant();
      result = { tenant };
      break;
    default:
      result = await seedAll();
  }

  console.log('🎉 Test seed completed!');
  console.log('Seeded data:', Object.keys(result).filter(k => result[k as keyof SeedResult]));
}

main()
  .catch((e) => {
    console.error('❌ Test seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
