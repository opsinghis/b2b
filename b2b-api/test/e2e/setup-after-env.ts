import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Note: E2E tests run sequential flows that depend on data from previous tests.
// We do NOT truncate tables between tests - each test file manages its own cleanup in afterAll.
// This differs from integration tests which isolate each test case.

export { prisma };
