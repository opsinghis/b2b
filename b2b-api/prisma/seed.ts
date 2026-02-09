import { PrismaClient, UserRole, MasterProductStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Interface matching the actual cleaned_products.json structure
interface RawProductData {
  product_id: string;
  product_name: string;
  price: number | string;
  description?: string;
  material?: string;
  primary_category?: string;
  images?: string[];
  category?: string[];
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Starting seed...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default',
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

  // eslint-disable-next-line no-console
  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@b2b.local',
      },
    },
    update: {},
    create: {
      email: 'admin@b2b.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SUPER_ADMIN,
      tenantId: tenant.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Admin user created: ${adminUser.email} (${adminUser.id})`);

  // Create manager user
  const managerUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'manager@b2b.local',
      },
    },
    update: {},
    create: {
      email: 'manager@b2b.local',
      passwordHash,
      firstName: 'Manager',
      lastName: 'User',
      role: UserRole.MANAGER,
      tenantId: tenant.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Manager user created: ${managerUser.email} (${managerUser.id})`);

  // Create regular customer user
  const customerUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'customer@b2b.local',
      },
    },
    update: {},
    create: {
      email: 'customer@b2b.local',
      passwordHash,
      firstName: 'Customer',
      lastName: 'User',
      role: UserRole.USER,
      tenantId: tenant.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Customer user created: ${customerUser.email} (${customerUser.id})`);

  // Create partner user
  const partnerUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'partner@b2b.local',
      },
    },
    update: {},
    create: {
      email: 'partner@b2b.local',
      passwordHash,
      firstName: 'Partner',
      lastName: 'User',
      role: UserRole.USER,
      tenantId: tenant.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Partner user created: ${partnerUser.email} (${partnerUser.id})`);

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'DEMO-001',
      },
    },
    update: {},
    create: {
      name: 'Demo Organization',
      code: 'DEMO-001',
      description: 'Default demo organization',
      tenantId: tenant.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Organization created: ${demoOrg.name} (${demoOrg.id})`);

  // Create delivery methods
  const deliveryMethods = [
    {
      code: 'STANDARD',
      name: 'Standard Shipping',
      description: 'Delivery in 5-7 business days',
      isActive: true,
      sortOrder: 1,
      minDays: 5,
      maxDays: 7,
      baseCost: 9.99,
      freeThreshold: 100.00,
    },
    {
      code: 'EXPRESS',
      name: 'Express Shipping',
      description: 'Delivery in 2-3 business days',
      isActive: true,
      sortOrder: 2,
      minDays: 2,
      maxDays: 3,
      baseCost: 19.99,
      freeThreshold: 200.00,
    },
    {
      code: 'OVERNIGHT',
      name: 'Overnight Shipping',
      description: 'Next business day delivery',
      isActive: true,
      sortOrder: 3,
      minDays: 1,
      maxDays: 1,
      baseCost: 39.99,
      freeThreshold: null,
    },
    {
      code: 'PICKUP',
      name: 'Store Pickup',
      description: 'Pick up at your nearest location',
      isActive: true,
      sortOrder: 4,
      minDays: 0,
      maxDays: 0,
      baseCost: 0,
      freeThreshold: null,
    },
  ];

  for (const method of deliveryMethods) {
    await prisma.deliveryMethod.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: method.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...method,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Delivery methods created: ${deliveryMethods.length}`);

  // Create payment methods
  const paymentMethods = [
    {
      code: 'CREDIT_CARD',
      name: 'Credit Card',
      description: 'Pay with Visa, Mastercard, or American Express',
      type: 'CREDIT_CARD' as const,
      isActive: true,
      sortOrder: 1,
      minAmount: null,
      maxAmount: null,
      processingFee: 0,
      processingFeePercent: 2.9,
    },
    {
      code: 'DEBIT_CARD',
      name: 'Debit Card',
      description: 'Pay directly from your bank account',
      type: 'DEBIT_CARD' as const,
      isActive: true,
      sortOrder: 2,
      minAmount: null,
      maxAmount: null,
      processingFee: 0,
      processingFeePercent: 1.5,
    },
    {
      code: 'BANK_TRANSFER',
      name: 'Bank Transfer',
      description: 'Wire transfer or ACH payment',
      type: 'BANK_TRANSFER' as const,
      isActive: true,
      sortOrder: 3,
      minAmount: 100,
      maxAmount: null,
      processingFee: 5.00,
      processingFeePercent: 0,
    },
    {
      code: 'INVOICE',
      name: 'Invoice (Net 30)',
      description: 'Pay by invoice within 30 days',
      type: 'INVOICE' as const,
      isActive: true,
      sortOrder: 4,
      minAmount: 500,
      maxAmount: null,
      processingFee: 0,
      processingFeePercent: 0,
    },
    {
      code: 'SALARY_DEDUCTION',
      name: 'Salary Deduction',
      description: 'Deduct from your monthly salary',
      type: 'SALARY_DEDUCTION' as const,
      isActive: true,
      sortOrder: 5,
      minAmount: null,
      maxAmount: 5000,
      processingFee: 0,
      processingFeePercent: 0,
    },
  ];

  // All user roles that can access payment methods
  const allUserRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER];

  for (const method of paymentMethods) {
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: method.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...method,
      },
    });

    // Grant access to all user roles for each payment method
    for (const role of allUserRoles) {
      await prisma.paymentMethodUserType.upsert({
        where: {
          paymentMethodId_userRole: {
            paymentMethodId: paymentMethod.id,
            userRole: role,
          },
        },
        update: {},
        create: {
          paymentMethodId: paymentMethod.id,
          userRole: role,
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Payment methods created: ${paymentMethods.length} (with role access)`);

  // Seed master catalog if data file exists
  const catalogPath = path.join(__dirname, '../.claude/planning/data/cleaned_products.json');
  if (fs.existsSync(catalogPath)) {
    // eslint-disable-next-line no-console
    console.log('📦 Found master catalog data, importing...');
    const rawData = fs.readFileSync(catalogPath, 'utf-8');
    const products: RawProductData[] = JSON.parse(rawData);

    // eslint-disable-next-line no-console
    console.log(`📦 Found ${products.length} products to import`);

    // Step 1: Extract unique categories and create Category entities
    const uniqueCategories = [...new Set(products.map((p) => p.primary_category).filter(Boolean))] as string[];
    // eslint-disable-next-line no-console
    console.log(`📂 Found ${uniqueCategories.length} unique categories`);

    const categoryMap = new Map<string, string>(); // category name -> category id
    for (const categoryName of uniqueCategories) {
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const category = await prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          name: categoryName,
          slug,
          description: `Products in the ${categoryName} category`,
          isActive: true,
          sortOrder: 0,
        },
      });
      categoryMap.set(categoryName, category.id);
    }
    // eslint-disable-next-line no-console
    console.log(`✅ Categories created: ${categoryMap.size}`);

    // Step 2: Import products with category links
    const batchSize = 500;
    let imported = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const result = await prisma.masterProduct.createMany({
        data: batch.map((p) => {
          // Parse price - handle empty string, null, or number
          let listPrice = 0;
          if (typeof p.price === 'number' && !isNaN(p.price)) {
            listPrice = p.price;
          } else if (typeof p.price === 'string' && p.price.trim() !== '') {
            const parsed = parseFloat(p.price);
            if (!isNaN(parsed)) {
              listPrice = parsed;
            }
          }

          return {
            sku: p.product_id,
            name: p.product_name,
            description: p.description || null,
            category: p.primary_category || null,
            categoryId: p.primary_category ? categoryMap.get(p.primary_category) || null : null,
            subcategory: null,
            brand: null,
            manufacturer: null,
            uom: 'EA',
            listPrice: listPrice,
            currency: 'GBP',
            status: MasterProductStatus.ACTIVE,
            attributes: {
              material: p.material || null,
              images: p.images || [],
              categories: p.category || [],
            } as Prisma.InputJsonValue,
          };
        }),
        skipDuplicates: true,
      });
      imported += result.count;

      // Progress logging
      // eslint-disable-next-line no-console
      console.log(`📦 Imported batch ${Math.floor(i / batchSize) + 1}: ${imported} products so far`);
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Master catalog imported: ${imported} products`);

    // Step 3: Grant all products to the default tenant
    // eslint-disable-next-line no-console
    console.log('🔗 Granting products to default tenant...');
    const allProducts = await prisma.masterProduct.findMany({ select: { id: true } });

    let accessGranted = 0;
    const accessBatchSize = 1000;
    for (let i = 0; i < allProducts.length; i += accessBatchSize) {
      const batch = allProducts.slice(i, i + accessBatchSize);
      const result = await prisma.tenantProductAccess.createMany({
        data: batch.map((p) => ({
          tenantId: tenant.id,
          masterProductId: p.id,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      accessGranted += result.count;
      // eslint-disable-next-line no-console
      console.log(`🔗 Granted access batch ${Math.floor(i / accessBatchSize) + 1}: ${accessGranted} products`);
    }
    // eslint-disable-next-line no-console
    console.log(`✅ Tenant product access granted: ${accessGranted} products`);
  } else {
    // Create sample products
    const sampleProducts = [
      {
        sku: 'PROD-001',
        name: 'Enterprise Software License',
        description: 'Annual enterprise software license',
        category: 'Software',
        subcategory: 'Licenses',
        listPrice: 9999.99,
      },
      {
        sku: 'PROD-002',
        name: 'Cloud Storage (1TB)',
        description: 'Cloud storage subscription - 1TB',
        category: 'Cloud Services',
        subcategory: 'Storage',
        listPrice: 99.99,
      },
      {
        sku: 'PROD-003',
        name: 'Premium Support Package',
        description: '24/7 premium support package',
        category: 'Services',
        subcategory: 'Support',
        listPrice: 2499.99,
      },
    ];

    for (const product of sampleProducts) {
      await prisma.masterProduct.upsert({
        where: { sku: product.sku },
        update: {},
        create: {
          ...product,
          uom: 'EA',
          currency: 'USD',
          status: MasterProductStatus.ACTIVE,
          attributes: {},
        },
      });
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Sample products created: ${sampleProducts.length}`);
  }

  // eslint-disable-next-line no-console
  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
