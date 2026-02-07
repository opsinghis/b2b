const baseConfig = require('../../jest.config');
const path = require('path');

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, '../..'),
  testRegex: '.*\\.integration\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup-after-env.ts'],
  globalSetup: '<rootDir>/test/integration/setup-global.ts',
  globalTeardown: '<rootDir>/test/integration/teardown-global.ts',
  testTimeout: 60000,
  maxWorkers: 1,
};
