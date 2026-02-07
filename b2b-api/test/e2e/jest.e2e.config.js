const baseConfig = require('../../jest.config');

module.exports = {
  ...baseConfig,
  testRegex: '.*\\.e2e-spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/test/e2e/setup-after-env.ts'],
  globalSetup: '<rootDir>/test/integration/setup-global.ts',
  globalTeardown: '<rootDir>/test/integration/teardown-global.ts',
  testTimeout: 60000,
  maxWorkers: 1,
};
