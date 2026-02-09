import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for B2B Web
 *
 * Projects:
 * - e2e: End-to-end tests for user journeys
 * - accessibility: WCAG 2.1 AA compliance testing with axe-core
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // E2E Tests - Portal
    {
      name: 'e2e-portal',
      testDir: './e2e/portal',
      testMatch: '**/*.e2e.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3003',
      },
    },

    // E2E Tests - Admin
    {
      name: 'e2e-admin',
      testDir: './e2e/admin',
      testMatch: '**/*.e2e.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
      },
    },

    // Accessibility Tests - Portal
    {
      name: 'a11y-portal',
      testDir: './e2e/a11y/portal',
      testMatch: '**/*.a11y.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3003',
      },
    },

    // Accessibility Tests - Admin
    {
      name: 'a11y-admin',
      testDir: './e2e/a11y/admin',
      testMatch: '**/*.a11y.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
      },
    },

    // Combined E2E project
    {
      name: 'e2e',
      testDir: './e2e',
      testMatch: '**/*.e2e.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Combined Accessibility project
    {
      name: 'accessibility',
      testDir: './e2e/a11y',
      testMatch: '**/*.a11y.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Local dev server configuration
  webServer: [
    {
      command: 'pnpm dev:portal',
      url: 'http://localhost:3003',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'pnpm dev:admin',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
