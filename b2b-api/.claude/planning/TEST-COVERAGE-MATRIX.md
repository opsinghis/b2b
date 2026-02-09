# Backend API Test Coverage Matrix

> **Team:** Backend API
> **Last Updated:** 2024-01-20
> **Owner:** Backend Team Lead

## Philosophy: API Contract & Behavior Coverage

We measure coverage at multiple levels:
- Every API endpoint has integration test coverage
- Every service has unit test coverage
- Every critical business flow has E2E coverage
- Every security concern is tested
- Every edge case is documented and tested

---

## How to Add New Test Coverage

### Adding Coverage for a New API Endpoint

1. **Define the Endpoint** in the table below with:
   - Endpoint path and method
   - Required test types (Unit, Integration, E2E)
   - Security requirements
   - Performance requirements

2. **Create Test Files** following naming convention:
   ```
   src/[domain]/[module]/[module].service.spec.ts       # Unit test
   test/integration/[module]/[module].integration.spec.ts  # Integration test
   test/e2e/[module]/[module].e2e.spec.ts              # E2E test
   ```

3. **Add Module Tag** for test filtering:
   ```typescript
   /**
    * @module [module-name]
    * @feature [feature-name]
    */
   describe('[Module] Tests', () => { ... });
   ```

4. **Update this Matrix** with coverage status

### Adding Coverage for a New Module

1. **Create unit tests** for all service methods
2. **Create integration tests** for controller endpoints
3. **Update API Endpoint Coverage Matrix** below
4. **Add security test cases** if applicable

---

## API Endpoint Coverage Matrix

### Authentication API (`/api/v1/auth`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /auth/login | POST | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /auth/register | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /auth/refresh | POST | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /auth/logout | POST | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /auth/me | GET | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |

### Catalog API (`/api/v1/catalog`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /catalog/products | GET | ✅ | ✅ | ⬜ | ✅ | ✅ | @backend |
| /catalog/products/:id | GET | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /catalog/categories | GET | ✅ | ✅ | ⬜ | ⬜ | ⬜ | @backend |
| /catalog/search | GET | ✅ | ⬜ | ⬜ | ⬜ | ✅ | @backend |

### Master Catalog API (`/api/v1/master-catalog`) - Admin

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /master-catalog/products | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /master-catalog/products | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /master-catalog/products/:id | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /master-catalog/products/:id | PATCH | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /master-catalog/products/:id | DELETE | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |

### Cart API (`/api/v1/cart`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /cart | GET | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /cart/items | POST | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /cart/items/:id | PATCH | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /cart/items/:id | DELETE | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /cart/clear | DELETE | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |

### Orders API (`/api/v1/orders`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /orders | GET | ✅ | ✅ | ⬜ | ✅ | ✅ | @backend |
| /orders | POST | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /orders/:id | GET | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /orders/:id/status | PATCH | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /orders/:id/cancel | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |

### Quotes API (`/api/v1/quotes`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /quotes | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /quotes | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /quotes/:id | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /quotes/:id/submit | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /quotes/:id/approve | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |

### Contracts API (`/api/v1/contracts`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /contracts | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /contracts | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /contracts/:id | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /contracts/:id | PATCH | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |

### Users API (`/api/v1/users`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /users | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /users | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /users/:id | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /users/:id | PATCH | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /users/:id | DELETE | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |

### Tenants API (`/api/v1/tenants`) - Super Admin

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /tenants | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /tenants | POST | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /tenants/:id | GET | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |
| /tenants/:id | PATCH | ✅ | ⬜ | ⬜ | ✅ | ⬜ | @backend |

### Dashboard API (`/api/v1/dashboard`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /dashboard/kpis | GET | ✅ | ⬜ | ⬜ | ✅ | ✅ | @backend |
| /dashboard/sales | GET | ✅ | ⬜ | ⬜ | ✅ | ✅ | @backend |
| /dashboard/trends | GET | ✅ | ⬜ | ⬜ | ✅ | ✅ | @backend |

### Payments API (`/api/v1/payments`)

| Endpoint | Method | Unit | Integration | E2E | Security | Perf | Owner |
|----------|--------|------|-------------|-----|----------|------|-------|
| /payments | GET | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /payments | POST | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |
| /payments/:id | GET | ✅ | ✅ | ⬜ | ✅ | ⬜ | @backend |

---

## Module Unit Test Coverage

| Module | Service | Controller | Total Tests | Coverage | Owner |
|--------|---------|------------|-------------|----------|-------|
| **Business** |
| approvals | ✅ | ✅ | 1 | TBD | @backend |
| cart | ✅ | ✅ | 1 | TBD | @backend |
| contracts | ✅ | ✅ | 1 | TBD | @backend |
| discounts | ✅ | ✅ | 1 | TBD | @backend |
| integrations | ✅ | ✅ | 74 | TBD | @backend |
| master-catalog | ✅ | ✅ | 1 | TBD | @backend |
| orders | ✅ | ✅ | 1 | TBD | @backend |
| partners | ✅ | ✅ | 1 | TBD | @backend |
| payments | ✅ | ✅ | 4 | TBD | @backend |
| promotions | ✅ | ✅ | 1 | TBD | @backend |
| quotes | ✅ | ✅ | 1 | TBD | @backend |
| salary-deduction | ✅ | ✅ | 1 | TBD | @backend |
| tenant-catalog | ✅ | ✅ | 2 | TBD | @backend |
| **Core** |
| audit | ✅ | ✅ | 1 | TBD | @backend |
| auth | ✅ | ✅ | 1 | TBD | @backend |
| authorization | ✅ | - | 1 | TBD | @backend |
| organizations | ✅ | ✅ | 1 | TBD | @backend |
| tenants | ✅ | ✅ | 3 | TBD | @backend |
| users | ✅ | ✅ | 1 | TBD | @backend |
| **Platform** |
| dashboard | ✅ | ✅ | 1 | TBD | @backend |
| files | ✅ | ✅ | 1 | TBD | @backend |
| notifications | ✅ | ✅ | 1 | TBD | @backend |
| **Agentic** |
| orchestrator | ✅ | ✅ | 1 | TBD | @backend |
| tools | ✅ | ✅ | 1 | TBD | @backend |

**Total Unit Tests: 107**

---

## Security Test Coverage

### OWASP Top 10 Coverage

| Vulnerability | Test Approach | Coverage | Owner |
|---------------|---------------|----------|-------|
| A01: Broken Access Control | Tenant isolation tests | ✅ | @backend |
| A02: Cryptographic Failures | JWT security tests | ✅ | @backend |
| A03: Injection | SQL/NoSQL injection tests | ⬜ | @backend |
| A04: Insecure Design | Code review + static analysis | Partial | @backend |
| A05: Security Misconfiguration | Header checks, CORS tests | ⬜ | @backend |
| A06: Vulnerable Components | npm audit | ✅ | @backend |
| A07: Auth Failures | Brute force, session tests | ⬜ | @backend |
| A08: Data Integrity Failures | CSRF, signature tests | ⬜ | @backend |
| A09: Logging Failures | Audit log tests | ⬜ | @backend |
| A10: SSRF | URL validation tests | ⬜ | @backend |

### Multi-Tenant Security

| Scenario | Test | Coverage | Owner |
|----------|------|----------|-------|
| User A cannot see User B's data | Integration | ✅ | @backend |
| Tenant A cannot access Tenant B's products | Integration | ✅ | @backend |
| Admin cannot access other tenant's data | Integration | ✅ | @backend |
| API key isolation | Unit | ⬜ | @backend |
| JWT tenant claim validation | Unit | ✅ | @backend |

### Authentication Security

| Scenario | Test | Coverage | Owner |
|----------|------|----------|-------|
| Invalid credentials rejected | Integration | ✅ | @backend |
| Expired token rejected | Integration | ✅ | @backend |
| Invalid token format rejected | Integration | ✅ | @backend |
| Rate limiting on login | Integration | ⬜ | @backend |
| Password complexity enforced | Unit | ⬜ | @backend |

---

## Performance Benchmarks

### API Response Time Targets

| Metric | Target | Warning | Fail | Current |
|--------|--------|---------|------|---------|
| p50 Response | < 100ms | < 200ms | > 500ms | TBD |
| p95 Response | < 300ms | < 500ms | > 1000ms | TBD |
| p99 Response | < 500ms | < 1000ms | > 2000ms | TBD |
| Error Rate | < 0.1% | < 1% | > 5% | TBD |
| RPS (normal) | > 100 | > 50 | < 25 | TBD |

### Critical Endpoint Performance

| Endpoint | p50 Target | p95 Target | Load Test | Owner |
|----------|------------|------------|-----------|-------|
| GET /catalog/products | < 100ms | < 300ms | ⬜ | @backend |
| POST /orders | < 200ms | < 500ms | ⬜ | @backend |
| GET /orders | < 100ms | < 300ms | ⬜ | @backend |
| GET /dashboard/kpis | < 200ms | < 500ms | ⬜ | @backend |

---

## Chaos Engineering Scenarios

### Database Failures

| Scenario | Expected Behavior | Test | Owner |
|----------|-------------------|------|-------|
| DB connection lost | Graceful error, retry | ⬜ | @backend |
| DB slow (5s latency) | Timeout, fallback | ⬜ | @backend |
| DB returns errors | Error handling, no crash | ⬜ | @backend |

### Cache Failures

| Scenario | Expected Behavior | Test | Owner |
|----------|-------------------|------|-------|
| Redis unavailable | Fallback to DB | ⬜ | @backend |
| Cache corruption | Invalidate and refresh | ⬜ | @backend |

### External Service Failures

| Scenario | Expected Behavior | Test | Owner |
|----------|-------------------|------|-------|
| Payment gateway timeout | Retry with backoff | ⬜ | @backend |
| File storage unavailable | Graceful degradation | ⬜ | @backend |
| Email service down | Queue for retry | ⬜ | @backend |

---

## Coverage Thresholds

| Metric | Tool | Target | Current |
|--------|------|--------|---------|
| Line Coverage | Jest | > 80% | TBD |
| Branch Coverage | Jest | > 75% | TBD |
| Function Coverage | Jest | > 85% | TBD |
| API Endpoint Coverage | Manual | 100% | See tables above |
| Security Test Coverage | Manual | 100% critical | See tables above |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented and passing |
| ⬜ | Not yet implemented |
| 🔄 | In progress |
| ❌ | Failing/blocked |

---

## Extending This Matrix

### To Add a New API Endpoint:

1. Add row to appropriate API section with format:
   ```
   | /path | METHOD | Unit | Integration | E2E | Security | Perf | Owner |
   ```
2. Set initial coverage status to ⬜
3. Assign owner
4. Create corresponding test files:
   - Unit test in `src/[module]/[module].service.spec.ts`
   - Integration test in `test/integration/[module]/`
5. Add security test cases if endpoint handles sensitive data
6. Add performance test if high-traffic endpoint

### To Add a New Module:

1. Add row to Module Unit Test Coverage table
2. Create unit tests for service and controller
3. Add all endpoints to API Endpoint Coverage Matrix
4. Consider integration tests for critical flows
5. Add security tests for authorization

### To Add a Security Test:

1. Identify the vulnerability category (OWASP Top 10)
2. Add row to appropriate security section
3. Create test file in `test/security/`
4. Update coverage status when implemented

### To Add a Performance Test:

1. Add row to Critical Endpoint Performance table
2. Create k6 script in `test/performance/scenarios/`
3. Define thresholds for p50, p95
4. Add to CI/CD pipeline for regular execution
