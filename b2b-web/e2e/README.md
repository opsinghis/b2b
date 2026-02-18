# E2E and Performance Testing

Comprehensive end-to-end and performance testing suite for B2B Web applications.

## Overview

- **E2E Tests**: Full user journey testing with Playwright
- **Performance Tests**: Page load, API response times, Web Vitals
- **Lighthouse Audits**: Performance, Accessibility, Best Practices, SEO scores

## Test Structure

```
e2e/
├── portal/
│   ├── auth.e2e.spec.ts                    # Portal authentication flow
│   ├── shopping-flow.e2e.spec.ts           # Catalog browsing & cart
│   ├── checkout-complete.e2e.spec.ts       # Complete checkout journey (NEW)
│   └── quotes.e2e.spec.ts                  # Quote management
├── admin/
│   ├── auth.e2e.spec.ts                    # Admin authentication
│   ├── order-management.e2e.spec.ts        # Order processing
│   └── user-management-complete.e2e.spec.ts # User CRUD operations (NEW)
├── performance/
│   ├── portal-performance.spec.ts          # Portal performance metrics (NEW)
│   ├── admin-performance.spec.ts           # Admin performance metrics (NEW)
│   └── lighthouse.spec.ts                  # Lighthouse audits (NEW)
└── a11y/
    ├── portal/portal.a11y.spec.ts          # Portal accessibility
    └── admin/admin.a11y.spec.ts            # Admin accessibility
```

## Running Tests

### All E2E Tests
```bash
pnpm test:e2e
```

### Portal E2E Tests Only
```bash
pnpm test:e2e:portal
```

### Admin E2E Tests Only
```bash
pnpm test:e2e:admin
```

### Performance Tests
```bash
# Portal performance
pnpm test:performance:portal

# Admin performance
pnpm test:performance:admin

# All performance tests
pnpm test:performance

# Lighthouse audits (requires additional setup - see below)
pnpm test:lighthouse
```

### Accessibility Tests
```bash
pnpm test:a11y
```

### Run Everything
```bash
pnpm test:all
```

## Test Credentials

### Portal (Customer)
- Email: `customer@b2b.local`
- Password: `Admin123!`

### Admin
- Email: `admin@b2b.local`
- Password: `Admin123!`

## New E2E Tests Added

### Portal Checkout Flow (8 tests)
- ✅ Complete checkout journey from catalog to confirmation
- ✅ Empty cart prevention
- ✅ Checkout form validation
- ✅ Update cart quantities
- ✅ Remove items from cart
- ✅ Cart persistence across navigation
- ✅ Pricing consistency throughout checkout
- ✅ Stock validation

### Admin User Management (13 tests)
- ✅ Display users list page
- ✅ Search and filter users
- ✅ Open create user modal
- ✅ Validate create user form
- ✅ Create new user successfully
- ✅ View user details
- ✅ Update user role
- ✅ Toggle user status (activate/deactivate)
- ✅ Delete user with confirmation
- ✅ Paginate through users list
- ✅ Handle duplicate email error
- ✅ Display loading states
- ✅ Error handling

### Performance Tests (16 tests)

#### Portal Performance (8 tests)
- ✅ Dashboard load time (< 3s)
- ✅ Catalog page efficiency
- ✅ Cart operations latency
- ✅ Search performance
- ✅ Bundle size tracking
- ✅ Time to Interactive (TTI)
- ✅ Render-blocking resources check
- ✅ API response times

#### Admin Performance (8 tests)
- ✅ Admin dashboard load time
- ✅ Users table render efficiency
- ✅ Large data set handling
- ✅ Search filtering speed
- ✅ Modal rendering performance
- ✅ Memory usage during navigation
- ✅ Form submission performance
- ✅ Pagination performance

### Lighthouse Audits (5 tests)
- ✅ Portal dashboard audit
- ✅ Portal catalog audit
- ✅ Admin dashboard audit
- ✅ Admin users page audit
- ✅ Web Vitals monitoring

## Performance Thresholds

### Page Load Times
- **Dashboard**: < 3000ms
- **Data Pages**: < 4000ms (adjusted for admin pages with heavy data)
- **Table Render**: < 2000ms

### Web Vitals
- **LCP** (Largest Contentful Paint): < 2500ms
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1800ms
- **TTI** (Time to Interactive): < 5000ms

### Lighthouse Scores (out of 100)
- **Performance**: ≥ 80
- **Accessibility**: ≥ 90
- **Best Practices**: ≥ 80
- **SEO**: ≥ 80

## What's Measured

### Performance Metrics
- Page load times
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Total Blocking Time (TBT)
- Bundle sizes and download times
- API response times
- Memory usage
- Render-blocking resources

### User Flows Tested
- **Portal**: Authentication → Browse Catalog → Add to Cart → Checkout → Order Confirmation
- **Admin**: Authentication → View Users → Create User → Edit User → Delete User

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- ARIA attributes
- Color contrast
- Focus management

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries on failure
- Video recording on failure
- Screenshots on failure
- HTML report generation

## Troubleshooting

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check if applications are running on correct ports
- Verify network connectivity

### Performance Tests Failing
- Ensure no other processes consuming resources
- Run tests on same environment for consistency
- Check backend API response times

### Lighthouse Tests (Optional)
Lighthouse tests are currently skipped by default. To enable them:

1. Install dependencies:
   ```bash
   pnpm add -D -w lighthouse playwright-lighthouse
   ```

2. Edit `e2e/performance/lighthouse.spec.ts`:
   - Uncomment the import statements for `playAudit` and `lighthouse`
   - Remove `.skip` from `test.describe.skip()` calls

3. Run the tests:
   ```bash
   pnpm test:lighthouse
   ```

**Note**: Ensure Chrome DevTools Protocol ports (9222-9225) are available and run tests sequentially.

## Reports

After running tests:
- **HTML Report**: `playwright-report/index.html`
- **Videos**: `test-results/*/video.webm` (on failure)
- **Screenshots**: `test-results/*/screenshot.png` (on failure)

## Example Output

```
Portal Performance:
  ✅ Dashboard load: 1847ms (threshold: 3000ms)
  ✅ Catalog load: 2123ms (threshold: 3000ms)
  ✅ Search: 456ms (threshold: 1500ms)

Web Vitals:
  ✅ LCP: 1950ms (threshold: 2500ms)
  ✅ FID: 78ms (threshold: 100ms)
  ✅ CLS: 0.05 (threshold: 0.1)

Lighthouse Scores:
  ✅ Performance: 87/100 (threshold: 80)
  ✅ Accessibility: 95/100 (threshold: 90)
  ✅ Best Practices: 92/100 (threshold: 80)
```

## Best Practices

1. **Always run with apps running**: E2E tests require local servers
2. **Run performance tests in consistent environment**: CPU/memory affects results
3. **Check lighthouse tests in headless mode**: More realistic performance
4. **Review test videos on failure**: Helps debug flaky tests
5. **Monitor performance trends over time**: Track degradation

## Next Steps

- [ ] Add visual regression tests with Percy/Chromatic
- [ ] Add load testing with k6
- [ ] Set up CI/CD pipeline for automated testing
- [ ] Add performance monitoring in production
- [ ] Create performance dashboard
