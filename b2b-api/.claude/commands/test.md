# Test Command (Backend API)

Run automated tests for the B2B API application.

**Test Type:** $ARGUMENTS

## Available Test Types

| Type | Command | Description |
|------|---------|-------------|
| `unit` | Unit tests | Test services/modules in isolation |
| `integration` | Integration tests | Test with real database |
| `e2e` | E2E tests | Full API flow tests |
| `perf` | Performance tests | Load/stress testing |
| `security` | Security tests | Vulnerability scanning |
| `chaos` | Chaos tests | Failure resilience tests |
| `all` | All tests | Run complete test suite |

## Feature-Based Testing

Run tests for a specific feature module with automatic dependency setup:

| Command | Description |
|---------|-------------|
| `feature:auth` | Authentication tests (login, register, JWT) |
| `feature:catalog` | Catalog tests (products, categories, search) |
| `feature:cart` | Cart tests (CRUD operations, pricing) |
| `feature:orders` | Order tests (create, status, history) |
| `feature:quotes` | Quote tests (request, approval workflow) |
| `feature:contracts` | Contract tests (management, pricing) |
| `feature:tenants` | Tenant tests (multi-tenancy isolation) |
| `feature:dashboard` | Dashboard tests (KPIs, analytics) |

### With Automatic Setup (`--setup`)

When `--setup` is included, database is seeded with required test data:

```bash
/test feature:cart --setup
# Seeds: tenant → users → categories → products → pricing
# Then runs cart unit + integration tests
```

### Dependency Hierarchy

```
Platform → Tenant → Users → Categories → Products → Pricing → Cart → Orders
                  ↓
                Partner → Contracts
```

---

## Execution

Based on the test type provided, execute the appropriate tests:

### If `unit` or no argument:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run unit tests with coverage
npm run test -- --coverage

# Show summary
echo "Unit tests complete - 433+ tests expected"
```

### If `unit:watch`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run unit tests in watch mode
npm run test:watch
```

### If `unit:module` (e.g., unit:cart, unit:orders):
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Extract module name from argument
MODULE="[extract from $ARGUMENTS after colon]"

# Run tests for specific module
npm run test -- --testPathPattern="$MODULE" --coverage
```

### If `integration`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

echo "Starting integration tests (requires Docker for PostgreSQL)..."

# Run integration tests with real database
npm run test:integration

echo "Integration tests complete"
```

### If `integration:module`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

MODULE="[extract from $ARGUMENTS]"

# Run integration tests for specific module
npm run test:integration -- --testPathPattern="$MODULE"
```

### If `e2e`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

echo "Starting E2E tests..."

# Run E2E tests
npm run test:e2e

echo "E2E tests complete"
```

### If `e2e:auth`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run auth E2E tests only
npm run test:e2e -- --testPathPattern="auth"
```

### If `e2e:catalog`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run catalog E2E tests only
npm run test:e2e -- --testPathPattern="catalog"
```

### If `perf`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

echo "=== Performance Tests ==="

# Check if k6 is installed
if command -v k6 &> /dev/null; then
    echo "Running load tests with k6..."
    k6 run test/performance/load.js
else
    echo "k6 not installed. Install with: brew install k6"
    echo "Running basic performance check instead..."

    # Basic performance check with curl
    echo "Testing API response times..."
    for i in {1..10}; do
        curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/health
    done
fi
```

### If `perf:load`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run load test (normal traffic simulation)
k6 run --vus 50 --duration 30s test/performance/scenarios/load.js
```

### If `perf:stress`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run stress test (find breaking point)
k6 run --vus 100 --duration 60s test/performance/scenarios/stress.js
```

### If `perf:spike`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run spike test (sudden traffic surge)
k6 run test/performance/scenarios/spike.js
```

### If `security`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

echo "=== Security Tests ==="

echo ""
echo "1. Dependency Audit..."
npm audit

echo ""
echo "2. Running security test suite..."
npm run test -- --testPathPattern="security" 2>/dev/null || echo "Security tests not found"

echo ""
echo "3. Checking for hardcoded secrets..."
grep -r "password\s*=" src/ --include="*.ts" | grep -v ".spec.ts" | grep -v "password:" || echo "No hardcoded passwords found"

echo ""
echo "4. JWT Security Check..."
grep -r "expiresIn" src/ --include="*.ts" | head -5

echo ""
echo "Security checks complete"
```

### If `security:scan`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run OWASP ZAP scan (if available)
if command -v zap-cli &> /dev/null; then
    echo "Running OWASP ZAP scan..."
    zap-cli quick-scan http://localhost:3000
else
    echo "OWASP ZAP not installed"
    echo "Install with: brew install zaproxy"
fi
```

### If `chaos`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

echo "=== Chaos Tests ==="
echo "Testing system resilience under failure conditions..."

# Run chaos tests
npm run test -- --testPathPattern="chaos" 2>/dev/null || echo "Chaos tests not configured"

echo ""
echo "Chaos tests complete"
```

### If `chaos:db`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Test database failure scenarios
npm run test -- --testPathPattern="chaos/database"
```

### If `chaos:cache`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Test cache failure scenarios
npm run test -- --testPathPattern="chaos/cache"
```

### If `all`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

echo "=== Running Complete Test Suite ==="

echo ""
echo "1. Unit Tests..."
npm run test -- --coverage

echo ""
echo "2. Integration Tests..."
npm run test:integration

echo ""
echo "3. E2E Tests..."
npm run test:e2e 2>/dev/null || echo "E2E tests not configured"

echo ""
echo "4. Security Audit..."
npm audit

echo ""
echo "=== All Tests Complete ==="
```

---

## Feature-Based Testing Execution

### If `feature:auth` or `feature:auth --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for auth tests ==="
    echo "Dependencies: tenant → users"

    # Run database seed for auth testing
    npx prisma db seed -- --scope=auth 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=auth 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Auth Module Tests ==="

# Unit tests
echo "Running auth unit tests..."
npm run test -- --testPathPattern="auth" --coverage

# Integration tests
echo "Running auth integration tests..."
npm run test:integration -- --testPathPattern="auth"
```

### If `feature:catalog` or `feature:catalog --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for catalog tests ==="
    echo "Dependencies: tenant → categories → products"

    npx prisma db seed -- --scope=catalog 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=catalog 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Catalog Module Tests ==="

npm run test -- --testPathPattern="catalog|master-catalog|tenant-catalog" --coverage
npm run test:integration -- --testPathPattern="catalog"
```

### If `feature:cart` or `feature:cart --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for cart tests ==="
    echo "Dependencies: tenant → users → catalog → pricing"

    npx prisma db seed -- --scope=cart 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=cart 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Cart Module Tests ==="

npm run test -- --testPathPattern="cart" --coverage
npm run test:integration -- --testPathPattern="cart"
```

### If `feature:orders` or `feature:orders --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for orders tests ==="
    echo "Dependencies: tenant → users → catalog → cart → pricing"

    npx prisma db seed -- --scope=orders 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=orders 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Orders Module Tests ==="

npm run test -- --testPathPattern="orders" --coverage
npm run test:integration -- --testPathPattern="orders"
```

### If `feature:quotes` or `feature:quotes --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for quotes tests ==="
    echo "Dependencies: tenant → users → catalog"

    npx prisma db seed -- --scope=quotes 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=quotes 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Quotes Module Tests ==="

npm run test -- --testPathPattern="quotes" --coverage
npm run test:integration -- --testPathPattern="quotes"
```

### If `feature:contracts` or `feature:contracts --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for contracts tests ==="
    echo "Dependencies: tenant → partner → users"

    npx prisma db seed -- --scope=contracts 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=contracts 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Contracts Module Tests ==="

npm run test -- --testPathPattern="contracts" --coverage
npm run test:integration -- --testPathPattern="contracts"
```

### If `feature:tenants` or `feature:tenants --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for tenant tests ==="
    echo "Dependencies: platform only"

    npx prisma db seed -- --scope=tenants 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=tenants 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Tenant Module Tests ==="

npm run test -- --testPathPattern="tenant" --coverage
npm run test:integration -- --testPathPattern="tenant"
```

### If `feature:dashboard` or `feature:dashboard --setup`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

if [[ "$ARGUMENTS" == *"--setup"* ]]; then
    echo "=== Setting up dependencies for dashboard tests ==="
    echo "Dependencies: tenant → users → orders (historical data)"

    npx prisma db seed -- --scope=dashboard 2>/dev/null || \
    npx ts-node prisma/seed.ts --scope=dashboard 2>/dev/null || \
    echo "Seed script not configured for scope"
fi

echo "=== Running Dashboard Module Tests ==="

npm run test -- --testPathPattern="dashboard" --coverage
npm run test:integration -- --testPathPattern="dashboard"
```

### If `coverage`:
```bash
cd /Users/omsingh0/code/b2b/b2b-api

# Run tests with detailed coverage report
npm run test:cov

echo ""
echo "Coverage report generated at: coverage/lcov-report/index.html"
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
- Statements: [X]%

Performance (if applicable):
- p50: [X]ms
- p95: [X]ms
- p99: [X]ms
- Error Rate: [X]%

Security (if applicable):
- Vulnerabilities: [number]
- Critical: [number]
- High: [number]

Issues Found:
- [list any failures or warnings]

Next Steps:
- [recommendations if tests failed]
</test-results>
```

---

## API Contract Verification

When running tests, also verify API contracts haven't changed unexpectedly:

```bash
# Capture current API spec
curl -s http://localhost:3000/docs-json > /tmp/api-spec-current.json

# Compare with baseline (if exists)
if [ -f ".claude/execution/.api-spec-baseline.json" ]; then
    diff .claude/execution/.api-spec-baseline.json /tmp/api-spec-current.json || echo "API spec has changed!"
fi
```

---

## Important Notes

1. **Integration tests require Docker**: PostgreSQL runs in testcontainers
2. **E2E tests require running server**: Start with `npm run start:dev`
3. **Performance tests require k6**: Install with `brew install k6`
4. **Coverage threshold**: 80% minimum for unit tests
5. **CI/CD**: All tests run automatically on pull requests

## Quick Reference

```bash
# Most common commands
/test unit                # Run unit tests
/test integration         # Run integration tests
/test e2e                 # Run E2E tests
/test perf                # Run performance tests
/test security            # Run security tests
/test chaos               # Run chaos tests
/test all                 # Run everything

# Module-specific
/test unit:cart           # Test cart module only
/test integration:orders  # Integration test orders
```
