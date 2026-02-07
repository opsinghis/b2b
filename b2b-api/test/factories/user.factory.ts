import { PrismaClient, User, UserRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  private counter = 0;

  private async generateDefaults(tenantId: string): Promise<Prisma.UserCreateInput> {
    this.counter++;
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    return {
      email: `test-user-${this.counter}-${Date.now()}@test.local`,
      passwordHash,
      firstName: `Test`,
      lastName: `User ${this.counter}`,
      role: UserRole.USER,
      isActive: true,
      tenant: {
        connect: { id: tenantId },
      },
    };
  }

  async create(tenantId: string, overrides: Partial<Prisma.UserCreateInput> = {}): Promise<User> {
    const defaults = await this.generateDefaults(tenantId);
    return this.prisma.user.create({
      data: {
        ...defaults,
        ...overrides,
        tenant: {
          connect: { id: tenantId },
        },
      },
    });
  }

  async createMany(
    tenantId: string,
    count: number,
    overrides: Partial<Prisma.UserCreateInput> = {},
  ): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(tenantId, overrides));
    }
    return users;
  }

  async createAdmin(
    tenantId: string,
    overrides: Partial<Prisma.UserCreateInput> = {},
  ): Promise<User> {
    return this.create(tenantId, { ...overrides, role: UserRole.ADMIN });
  }

  async createSuperAdmin(
    tenantId: string,
    overrides: Partial<Prisma.UserCreateInput> = {},
  ): Promise<User> {
    return this.create(tenantId, { ...overrides, role: UserRole.SUPER_ADMIN });
  }
}
