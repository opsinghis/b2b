import { Test, TestingModule } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';

export interface MockFactory<T> {
  create: (overrides?: Partial<T>) => T;
  createMany: (count: number, overrides?: Partial<T>) => T[];
}

export function createMockFactory<T>(defaults: T): MockFactory<T> {
  return {
    create: (overrides?: Partial<T>): T => ({
      ...defaults,
      ...overrides,
    }),
    createMany: (count: number, overrides?: Partial<T>): T[] =>
      Array.from({ length: count }, () => ({
        ...defaults,
        ...overrides,
      })),
  };
}

export async function createTestingModule(metadata: ModuleMetadata): Promise<TestingModule> {
  return Test.createTestingModule(metadata).compile();
}

export function createMockService<T extends object>(
  methods: (keyof T)[],
): Record<keyof T, jest.Mock> {
  const mock: Partial<Record<keyof T, jest.Mock>> = {};
  for (const method of methods) {
    mock[method] = jest.fn();
  }
  return mock as Record<keyof T, jest.Mock>;
}

export function createMockRepository() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    })),
  };
}

export const mockDate = new Date('2024-01-01T00:00:00.000Z');
export const mockUuid = 'test-uuid-1234-5678-9012-345678901234';
