import { PrismaClient, Tenant, Prisma } from '@prisma/client';

export class TenantFactory {
  constructor(private prisma: PrismaClient) {}

  private counter = 0;

  private generateDefaults(): Prisma.TenantCreateInput {
    this.counter++;
    return {
      name: `Test Tenant ${this.counter}`,
      slug: `test-tenant-${this.counter}-${Date.now()}`,
      config: {
        features: {
          quotes: true,
          contracts: true,
        },
      },
      isActive: true,
    };
  }

  async create(overrides: Partial<Prisma.TenantCreateInput> = {}): Promise<Tenant> {
    return this.prisma.tenant.create({
      data: {
        ...this.generateDefaults(),
        ...overrides,
      },
    });
  }

  async createMany(
    count: number,
    overrides: Partial<Prisma.TenantCreateInput> = {},
  ): Promise<Tenant[]> {
    const tenants: Tenant[] = [];
    for (let i = 0; i < count; i++) {
      tenants.push(await this.create(overrides));
    }
    return tenants;
  }
}
