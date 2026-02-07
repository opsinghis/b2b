import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalTeardown() {
  const container = (global as Record<string, unknown>)
    .__POSTGRES_CONTAINER__ as StartedPostgreSqlContainer;

  if (container) {
    // eslint-disable-next-line no-console
    console.log('\n🛑 Stopping PostgreSQL container...');
    await container.stop();
    // eslint-disable-next-line no-console
    console.log('✅ PostgreSQL container stopped\n');
  }
}
