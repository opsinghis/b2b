/**
 * Lighthouse Performance Audit Tests
 *
 * @feature performance, accessibility, seo, best-practices
 * @priority P1
 *
 * Runs Lighthouse audits on critical pages
 * Measures:
 * - Performance score
 * - Accessibility score
 * - Best Practices score
 * - SEO score
 * - Web Vitals (LCP, FID, CLS)
 */

import { test, expect } from '@playwright/test';
// Note: Lighthouse tests require: pnpm add -D -w playwright-lighthouse lighthouse
// Uncomment the imports below after installing the dependencies
// import { playAudit } from 'playwright-lighthouse';
// import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

// Lighthouse thresholds
const THRESHOLDS = {
  performance: 80,
  accessibility: 90,
  'best-practices': 80,
  seo: 80,
  pwa: 30, // Lower threshold for PWA as it's optional
};

const TEST_CUSTOMER = {
  email: 'customer@b2b.local',
  password: 'Admin123!',
};

const TEST_ADMIN = {
  email: 'admin@b2b.local',
  password: 'Admin123!',
};

// TODO: Install lighthouse dependencies before running these tests:
// pnpm add -D -w playwright-lighthouse lighthouse
test.describe.skip('Lighthouse Audits - Portal', () => {
  test('should pass Lighthouse audit on portal dashboard', async () => {
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9222'],
    });

    const page = await browser.newPage();

    try {
      // Login first
      await page.goto('http://localhost:3003/login');
      await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
      await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Run Lighthouse audit on dashboard
      const auditResults = await playAudit({
        page,
        thresholds: THRESHOLDS,
        port: 9222,
        opts: {
          logLevel: 'info',
        },
      });

      console.log('Portal Dashboard Lighthouse Scores:', {
        performance: auditResults.lhr.categories.performance.score * 100,
        accessibility: auditResults.lhr.categories.accessibility.score * 100,
        bestPractices: auditResults.lhr.categories['best-practices'].score * 100,
        seo: auditResults.lhr.categories.seo.score * 100,
      });

      // Extract Web Vitals
      const audits = auditResults.lhr.audits;
      console.log('Web Vitals:', {
        LCP: audits['largest-contentful-paint']?.displayValue,
        FID: audits['max-potential-fid']?.displayValue,
        CLS: audits['cumulative-layout-shift']?.displayValue,
        FCP: audits['first-contentful-paint']?.displayValue,
        TBT: audits['total-blocking-time']?.displayValue,
      });

      // Assertions
      expect(auditResults.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(THRESHOLDS.performance);
      expect(auditResults.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(THRESHOLDS.accessibility);

    } finally {
      await browser.close();
    }
  });

  test('should pass Lighthouse audit on portal catalog', async () => {
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9223'],
    });

    const page = await browser.newPage();

    try {
      await page.goto('http://localhost:3003/login');
      await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
      await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(2000);

      await page.goto('http://localhost:3003/catalog');
      await page.waitForLoadState('networkidle');

      const auditResults = await playAudit({
        page,
        thresholds: {
          ...THRESHOLDS,
          performance: 75, // Slightly lower for data-heavy page
        },
        port: 9223,
      });

      console.log('Portal Catalog Lighthouse Scores:', {
        performance: auditResults.lhr.categories.performance.score * 100,
        accessibility: auditResults.lhr.categories.accessibility.score * 100,
      });

      expect(auditResults.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(75);
      expect(auditResults.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(THRESHOLDS.accessibility);

    } finally {
      await browser.close();
    }
  });
});

test.describe.skip('Lighthouse Audits - Admin', () => {
  test('should pass Lighthouse audit on admin dashboard', async () => {
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9224'],
    });

    const page = await browser.newPage();

    try {
      await page.goto('http://localhost:3002/login');
      await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
      await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });

      const auditResults = await playAudit({
        page,
        thresholds: THRESHOLDS,
        port: 9224,
      });

      console.log('Admin Dashboard Lighthouse Scores:', {
        performance: auditResults.lhr.categories.performance.score * 100,
        accessibility: auditResults.lhr.categories.accessibility.score * 100,
        bestPractices: auditResults.lhr.categories['best-practices'].score * 100,
      });

      expect(auditResults.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(THRESHOLDS.performance);
      expect(auditResults.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(THRESHOLDS.accessibility);

    } finally {
      await browser.close();
    }
  });

  test('should pass Lighthouse audit on admin users page', async () => {
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9225'],
    });

    const page = await browser.newPage();

    try {
      await page.goto('http://localhost:3002/login');
      await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
      await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(2000);

      await page.goto('http://localhost:3002/users');
      await page.waitForLoadState('networkidle');

      const auditResults = await playAudit({
        page,
        thresholds: {
          ...THRESHOLDS,
          performance: 75, // Data-heavy admin page
        },
        port: 9225,
      });

      console.log('Admin Users Page Lighthouse Scores:', {
        performance: auditResults.lhr.categories.performance.score * 100,
        accessibility: auditResults.lhr.categories.accessibility.score * 100,
      });

      expect(auditResults.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(THRESHOLDS.accessibility);

    } finally {
      await browser.close();
    }
  });
});

// Alternative: Manual Lighthouse integration (if playwright-lighthouse doesn't work)
test.describe.skip('Manual Lighthouse Audits', () => {
  test('should run manual Lighthouse audit', async ({ page }) => {
    await page.goto('http://localhost:3003');

    // Get the Chrome Devtools Protocol session
    const client = await page.context().newCDPSession(page);

    // Run Lighthouse programmatically
    const result = await lighthouse('http://localhost:3003', {
      port: 9222,
      output: 'json',
      onlyCategories: ['performance', 'accessibility'],
    });

    const scores = result.lhr.categories;

    console.log('Manual Lighthouse Scores:', {
      performance: scores.performance.score * 100,
      accessibility: scores.accessibility.score * 100,
    });

    expect(scores.performance.score * 100).toBeGreaterThanOrEqual(THRESHOLDS.performance);
  });
});

// Web Vitals specific tests
// This test doesn't require lighthouse dependencies
test.describe('Web Vitals Monitoring', () => {
  test('should collect and validate Web Vitals metrics', async ({ page }) => {
    await page.goto('http://localhost:3003/login');
    await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
    await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\//, { timeout: 10000 });

    await page.goto('http://localhost:3003/dashboard');
    await page.waitForLoadState('networkidle');

    // Collect Web Vitals using Performance Observer
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        let count = 0;
        const target = 3; // LCP, FID, CLS

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
              count++;
            }

            if (entry.entryType === 'first-input') {
              vitals.fid = (entry as any).processingStart - entry.startTime;
              count++;
            }

            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              vitals.cls = (vitals.cls || 0) + (entry as any).value;
            }
          }

          if (count >= 2) { // Wait for at least LCP and one other
            resolve(vitals);
          }
        });

        observer.observe({
          entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'],
        });

        // Timeout after 5 seconds
        setTimeout(() => resolve(vitals), 5000);
      });
    });

    console.log('Collected Web Vitals:', webVitals);

    // Validate Web Vitals thresholds
    if (webVitals.lcp) {
      expect(webVitals.lcp).toBeLessThan(2500); // LCP should be < 2.5s
    }

    if (webVitals.fid) {
      expect(webVitals.fid).toBeLessThan(100); // FID should be < 100ms
    }

    if (webVitals.cls) {
      expect(webVitals.cls).toBeLessThan(0.1); // CLS should be < 0.1
    }
  });
});
