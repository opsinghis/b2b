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

  // Seed master catalog if data file exists
  const catalogPath = path.join(__dirname, '../.claude/planning/data/cleaned_products.json');
  if (fs.existsSync(catalogPath)) {
    // eslint-disable-next-line no-console
    console.log('📦 Found master catalog data, importing...');
    const rawData = fs.readFileSync(catalogPath, 'utf-8');
    const products: RawProductData[] = JSON.parse(rawData);

    // eslint-disable-next-line no-console
    console.log(`📦 Found ${products.length} products to import`);

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
