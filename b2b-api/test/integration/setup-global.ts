import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;

export default async function globalSetup() {
  // eslint-disable-next-line no-console
  console.log('\n🐳 Starting PostgreSQL container...');

  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('b2b_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  const databaseUrl = container.getConnectionUri();

  // Set environment variable for Prisma
  process.env.DATABASE_URL = databaseUrl;

  // Store container info for teardown
  (global as Record<string, unknown>).__POSTGRES_CONTAINER__ = container;

  // eslint-disable-next-line no-console
  console.log(`✅ PostgreSQL container started: ${databaseUrl}`);

  // Run migrations
  // eslint-disable-next-line no-console
  console.log('🔄 Running database migrations...');
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  // eslint-disable-next-line no-console
  console.log('✅ Database migrations complete\n');
}
