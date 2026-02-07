import { PrismaClient, MasterProduct, MasterProductStatus, Prisma } from '@prisma/client';

export class MasterProductFactory {
  constructor(private prisma: PrismaClient) {}

  private counter = 0;

  private generateDefaults(): Prisma.MasterProductCreateInput {
    this.counter++;
    return {
      sku: `SKU-${this.counter}-${Date.now()}`,
      name: `Test Product ${this.counter}`,
      description: `Test product description ${this.counter}`,
      category: 'Electronics',
      subcategory: 'Accessories',
      brand: 'TestBrand',
      manufacturer: 'TestManufacturer',
      uom: 'EA',
      listPrice: new Prisma.Decimal(99.99),
      currency: 'USD',
      status: MasterProductStatus.ACTIVE,
      attributes: {},
    };
  }

  async create(overrides: Partial<Prisma.MasterProductCreateInput> = {}): Promise<MasterProduct> {
    return this.prisma.masterProduct.create({
      data: {
        ...this.generateDefaults(),
        ...overrides,
      },
    });
  }

  async createMany(
    count: number,
    overrides: Partial<Prisma.MasterProductCreateInput> = {},
  ): Promise<MasterProduct[]> {
    const products: MasterProduct[] = [];
    for (let i = 0; i < count; i++) {
      products.push(await this.create(overrides));
    }
    return products;
  }

  async createWithTenantAccess(
    tenantId: string,
    productOverrides: Partial<Prisma.MasterProductCreateInput> = {},
    accessOverrides: Partial<Prisma.TenantProductAccessUncheckedCreateInput> = {},
  ): Promise<MasterProduct> {
    const product = await this.create(productOverrides);

    await this.prisma.tenantProductAccess.create({
      data: {
        tenantId,
        masterProductId: product.id,
        isActive: true,
        ...accessOverrides,
      },
    });

    return product;
  }
}
