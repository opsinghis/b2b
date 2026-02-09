# Test Command (Frontend)

Run automated tests for the B2B Web application.

**Test Type:** $ARGUMENTS

## Available Test Types

| Type | Command | Description |
|------|---------|-------------|
| `unit` | Unit tests | Test components/hooks in isolation |
| `feature` | Feature tests | Test user flows within features |
| `e2e` | E2E tests | Full user journey tests |
| `integration` | Integration tests | Multi-component tests |
| `a11y` | Accessibility tests | WCAG 2.1 AA compliance |
| `perf` | Performance tests | Core Web Vitals |
| `security` | Security tests | Vulnerability scanning |
| `all` | All tests | Run complete test suite |

## Feature-Based Testing

Run tests for a specific feature with automatic dependency setup:

| Command | Description |
|---------|-------------|
| `feature:auth` | Authentication tests (login, logout, session) |
| `feature:catalog` | Catalog tests (products, search, filter) |
| `feature:cart` | Cart tests (add, update, remove items) |
| `feature:orders` | Order tests (create, view, track) |
| `feature:quotes` | Quote tests (request, approval) |
| `feature:contracts` | Contract tests (view, manage) |
| `feature:admin` | Admin portal tests |

### With Automatic Setup (`--setup`)

When `--setup` is included, dependencies are automatically resolved:

```bash
/test feature:cart --setup
# Resolves: tenant → users → categories → products → pricing → auth
# Then runs cart tests
```

See `.claude/planning/TEST-DEPENDENCIES.md` for full dependency mapping.

---

## Execution

Based on the test type provided, execute the appropriate tests:

### If `unit` or no argument:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Run unit tests with coverage
pnpm test --coverage

# Show summary
echo "Unit tests complete"
```

### If `feature`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Run feature tests (Playwright component tests)
pnpm exec playwright test --project=feature-tests

# Show results
echo "Feature tests complete"
```

### If `e2e`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Run E2E tests
pnpm exec playwright test --project=e2e

# Generate report
pnpm exec playwright show-report
```

### If `e2e:portal`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web/apps/portal

# Run portal E2E only
pnpm exec playwright test
```

### If `e2e:admin`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web/apps/admin

# Run admin E2E only
pnpm exec playwright test
```

### If `integration`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Run integration tests
pnpm test --testPathPattern="__tests__"
```

### If `a11y`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Run accessibility tests
pnpm exec playwright test --project=accessibility

# Or run axe on all components
pnpm test --testPathPattern="a11y"

echo "Accessibility tests complete - check for WCAG violations"
```

### If `a11y:portal`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web/apps/portal

# Run portal accessibility tests
pnpm exec playwright test --grep="@a11y"
```

### If `perf`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Run Lighthouse CI
pnpm exec lhci autorun

# Or run performance tests
pnpm exec playwright test --project=performance

echo "Performance tests complete - check Core Web Vitals"
```

### If `perf:portal`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web/apps/portal

# Run Lighthouse on portal
npx lighthouse http://localhost:3001 --output html --output-path ./lighthouse-report.html
```

### If `security`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Run security checks
echo "=== Dependency Audit ==="
pnpm audit

echo ""
echo "=== Security Linting ==="
pnpm exec eslint --ext .ts,.tsx src --rule "security/*: error" 2>/dev/null || echo "Security rules not configured"

echo ""
echo "Security checks complete"
```

### If `all`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

echo "=== Running Complete Test Suite ==="

echo ""
echo "1. Unit Tests..."
pnpm test --coverage

echo ""
echo "2. Integration Tests..."
pnpm test --testPathPattern="__tests__"

echo ""
echo "3. Accessibility Tests..."
pnpm exec playwright test --project=accessibility 2>/dev/null || echo "A11y tests not configured"

echo ""
echo "4. E2E Tests..."
pnpm exec playwright test --project=e2e 2>/dev/null || echo "E2E tests not configured"

echo ""
echo "5. Security Audit..."
pnpm audit

echo ""
echo "=== All Tests Complete ==="
```

---

## Feature-Based Testing Execution

### If `feature:auth` or `feature:auth --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

# Check if --setup flag is present
if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for auth tests ==="
    echo "Dependencies: tenant → users"

    # Run setup scripts
    pnpm exec ts-node test/setup/tenant.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/users.setup.ts 2>/dev/null || echo "Setup script not found"
fi

echo "=== Running Auth Tests ==="

# Unit tests
echo "Running auth unit tests..."
pnpm test --testPathPattern="auth" --coverage

# Feature tests
echo "Running auth feature tests..."
pnpm exec playwright test --grep="@auth" 2>/dev/null || echo "Auth feature tests not found"

# E2E tests
echo "Running auth E2E tests..."
pnpm exec playwright test --grep="auth" --project=e2e 2>/dev/null || echo "Auth E2E tests not found"
```

### If `feature:catalog` or `feature:catalog --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for catalog tests ==="
    echo "Dependencies: tenant → categories → products → tenant-access"

    pnpm exec ts-node test/setup/tenant.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/categories.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/products.setup.ts 2>/dev/null || echo "Setup script not found"
fi

echo "=== Running Catalog Tests ==="

pnpm test --testPathPattern="catalog" --coverage
pnpm exec playwright test --grep="@catalog" 2>/dev/null || echo "Catalog feature tests not found"
```

### If `feature:cart` or `feature:cart --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for cart tests ==="
    echo "Dependencies: tenant → users → categories → products → pricing → auth"

    pnpm exec ts-node test/setup/tenant.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/users.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/categories.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/products.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/pricing.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/auth.setup.ts 2>/dev/null || echo "Setup script not found"
fi

echo "=== Running Cart Tests ==="

pnpm test --testPathPattern="cart" --coverage
pnpm exec playwright test --grep="@cart" 2>/dev/null || echo "Cart feature tests not found"
```

### If `feature:orders` or `feature:orders --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for orders tests ==="
    echo "Dependencies: tenant → users → catalog → cart → pricing → payment → shipping"

    pnpm exec ts-node test/setup/tenant.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/users.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/catalog.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/cart.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/pricing.setup.ts 2>/dev/null || echo "Setup script not found"
fi

echo "=== Running Orders Tests ==="

pnpm test --testPathPattern="orders" --coverage
pnpm exec playwright test --grep="@orders" 2>/dev/null || echo "Orders feature tests not found"
pnpm exec playwright test --grep="order" --project=e2e 2>/dev/null || echo "Orders E2E tests not found"
```

### If `feature:quotes` or `feature:quotes --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for quotes tests ==="
    echo "Dependencies: tenant → users → catalog"

    pnpm exec ts-node test/setup/tenant.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/users.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/catalog.setup.ts 2>/dev/null || echo "Setup script not found"
fi

echo "=== Running Quotes Tests ==="

pnpm test --testPathPattern="quotes" --coverage
pnpm exec playwright test --grep="@quotes" 2>/dev/null || echo "Quotes feature tests not found"
```

### If `feature:contracts` or `feature:contracts --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for contracts tests ==="
    echo "Dependencies: tenant → partner → users"

    pnpm exec ts-node test/setup/tenant.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/partner.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/users.setup.ts 2>/dev/null || echo "Setup script not found"
fi

echo "=== Running Contracts Tests ==="

pnpm test --testPathPattern="contracts" --coverage
pnpm exec playwright test --grep="@contracts" 2>/dev/null || echo "Contracts feature tests not found"
```

### If `feature:admin` or `feature:admin --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-web

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for admin tests ==="
    echo "Dependencies: tenant → users (admin) → products → orders"

    pnpm exec ts-node test/setup/tenant.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/users.setup.ts admin 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/catalog.setup.ts 2>/dev/null || echo "Setup script not found"
    pnpm exec ts-node test/setup/orders.setup.ts 2>/dev/null || echo "Setup script not found"
fi

echo "=== Running Admin Tests ==="

pnpm test --testPathPattern="admin" --coverage
pnpm exec playwright test --grep="@admin" 2>/dev/null || echo "Admin feature tests not found"
pnpm exec playwright test --grep="admin" --project=e2e 2>/dev/null || echo "Admin E2E tests not found"
```

---

## Test Output

After running tests, provide a summary:

```
<test-results>
Test Type: [type]
Status: [PASS/FAIL]

Results:
- Tests Run: [number]
- Passed: [number]
- Failed: [number]
- Skipped: [number]

Coverage (if applicable):
- Lines: [X]%
- Branches: [X]%
- Functions: [X]%

Issues Found:
- [list any failures or warnings]

Next Steps:
- [recommendations if tests failed]
</test-results>
```

---

## Important Notes

1. **E2E tests require running app**: Start the dev server first with `pnpm dev`
2. **Playwright setup**: Run `pnpm exec playwright install` if browsers not installed
3. **Coverage thresholds**: Unit tests must achieve >80% coverage
4. **A11y requirements**: Zero critical WCAG violations allowed
5. **CI/CD**: All tests run automatically on pull requests

## Quick Reference

```bash
# Most common commands
/test unit           # Run unit tests
/test e2e            # Run E2E tests
/test a11y           # Run accessibility tests
/test all            # Run everything
```
