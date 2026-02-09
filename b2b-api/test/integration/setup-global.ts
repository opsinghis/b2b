import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer | null = null;

export default async function globalSetup() {
  // Check if we should use the existing database (faster, no Docker issues)
  const useExistingDb = process.env.USE_EXISTING_DB === 'true';

  if (useExistingDb) {
    // Use the existing running database
    // eslint-disable-next-line no-console
    console.log('\n📦 Using existing database for integration tests...');

    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/b2b_test';
    process.env.DATABASE_URL = databaseUrl;

    // eslint-disable-next-line no-console
    console.log(`✅ Database URL: ${databaseUrl}\n`);
    return;
  }

  // Try to use Testcontainers
  try {
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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('\n⚠️  Testcontainers failed. Falling back to existing database...');
    // eslint-disable-next-line no-console
    console.log('   Tip: Set USE_EXISTING_DB=true to skip Testcontainers\n');

    // Fall back to existing database
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/b2b_test';
    process.env.DATABASE_URL = databaseUrl;

    // eslint-disable-next-line no-console
    console.log(`📦 Using existing database: ${databaseUrl}\n`);
  }
}
