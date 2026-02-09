# Feature Command (API)

You are implementing a new API feature using the LISA/RALPH methodology. The user has provided:

**Feature:** $ARGUMENTS

## Your Task

Execute the COMPLETE feature implementation workflow automatically without asking for permission between phases.

---

### Phase 0: Deduplication & Context Detection (MANDATORY)

**Before creating any PRD, check if this feature already exists or is actually an enhancement.**

1. **Search Existing Features**: Check for duplicate or similar features
   ```bash
   # Search existing feature PRDs
   grep -r -i "[keywords from description]" .claude/planning/backlog/features/ 2>/dev/null

   # Search execution PRD for already-built features
   grep -i "[keywords]" .claude/execution/prd.json 2>/dev/null

   # Search for enhancements that might cover this
   grep -r -i "[keywords]" .claude/planning/backlog/enhancements/ 2>/dev/null
   ```

2. **Search Codebase**: Check if similar functionality exists
   ```bash
   # Find relevant files
   grep -r -l "[keywords]" src/business/ src/core/ 2>/dev/null | head -20

   # Check for similar modules
   ls -la src/business/
   ```

3. **Analyze PRD Items**: Read `.claude/execution/prd.json` thoroughly
   - List all existing PRD items and their descriptions
   - Identify if this feature overlaps with any existing PRD item

4. **Decision Logic**:
   - If **duplicate feature exists**:
     ```
     <duplicate>
     PRD-XXX already implements this feature.
     Existing: [feature name and description]
     Requested: [user's description]
     Recommendation: [use existing / file bug / file enhancement]
     </duplicate>
     ```
     STOP and inform user.

   - If **similar feature exists** (related but different):
     ```
     <similar-exists>
     Related feature found: PRD-XXX [name]
     This request appears to be an ENHANCEMENT to existing functionality.
     Recommendation: Use /enhance command instead.
     </similar-exists>
     ```
     STOP and redirect to /enhance.

   - If **truly new feature**: Proceed to Phase 1.

Output: `<context-check-complete>Status: [new feature / duplicate / enhancement]</context-check-complete>`

---

### Phase 1: Create Feature PRD (Markdown)

1. Determine the next feature number by checking `.claude/planning/backlog/features/`
2. Create: `.claude/planning/backlog/features/FE-XXX-short-description.md`

Use this template:
```markdown
# FE-XXX: [Title]

## Summary
[Brief description of the feature]

## Priority
**P[1-4]** - [Reason]

## Module
`src/business/[new-module]`

## Type
Feature

## Context Check
- Duplicate Check: PASSED (no existing feature)
- Enhancement Check: PASSED (this is new functionality)
- Related PRDs: [list any related PRD items or "None"]

---

## API Specification

### New Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/... | [description] |
| POST | /api/v1/... | [description] |

### Request/Response Schemas
[Document expected request bodies and response formats]

### Authentication
- Required: Yes/No
- Roles: [list allowed roles]

### Error Responses
| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | [when] |
| 401 | UNAUTHORIZED | [when] |
| 404 | NOT_FOUND | [when] |

---

## Consumer Impact Assessment

### New API Consumers
- b2b-web: [How frontend will use this API]
  - Pages affected: [list]
  - Components needed: [list]

### Integration Requirements
- Frontend changes required: [Yes/No]
- Documentation needed: [Yes/No]
- Postman collection update: [Yes/No]

---

## LISA Analysis

### Requirements
1. [Functional requirement 1]
2. [Functional requirement 2]
...

### Files to Create
- `src/business/[module]/[module].module.ts` - NestJS module
- `src/business/[module]/[module].controller.ts` - REST controller
- `src/business/[module]/[module].service.ts` - Business logic
- `src/business/[module]/dto/` - Request/Response DTOs
...

### Files to Modify
- `src/app.module.ts` - Import new module
- `prisma/schema.prisma` - Add new models (if needed)
...

### Database Schema
[Describe any new tables/columns needed]

### Implementation Approach
1. [Step 1]
2. [Step 2]
...

### Risks Identified
- Risk 1: [description] → Mitigation: [solution]

### Test Strategy
- Unit: [test approach for each service]
- Integration: [API endpoint tests]
- E2E: [full flow tests]

---

## Completion Criteria
- [ ] All endpoints implemented
- [ ] OpenAPI/Swagger documentation complete
- [ ] Build passes
- [ ] Unit tests pass (maintain 433+ tests)
- [ ] Integration tests pass
- [ ] New tests added (>80% coverage)
- [ ] Postman collection updated

## Testing Requirements
- [ ] **Unit tests** for ALL services (REQUIRED, >80% coverage)
- [ ] **Integration tests** for ALL endpoints (REQUIRED)
- [ ] **E2E tests** for user flows (REQUIRED)
- [ ] **API contract** - Swagger documentation (REQUIRED)
- [ ] **Performance tests** for high-traffic endpoints (REQUIRED)
- [ ] **Security tests** - OWASP Top 10 coverage (REQUIRED)
- [ ] **Chaos tests** for critical features (REQUIRED)
- [ ] **Regression tests** - all 433+ tests pass (REQUIRED)
- [ ] Error handling tests
- [ ] Authentication/Authorization tests
- [ ] Input validation tests
- [ ] Tenant isolation tests

## Dependencies
[None or list dependencies]

## Max Iterations
10
```

Output: `<phase-1-complete>FE-XXX created</phase-1-complete>`

---

### Phase 2: Database Schema Design (if needed)

If the feature requires database changes:

1. **Design Schema**:
   ```bash
   # Check existing schema
   cat prisma/schema.prisma | grep -A 20 "model [RelatedModel]"
   ```

2. **Create Migration Plan**:
   - New tables needed
   - New columns on existing tables
   - Indexes required
   - Relations to existing models

3. **Schema Impact**:
   - Will this affect existing data? (migration needed)
   - Will this affect existing queries? (check services)

Output: `<schema-design-complete>Tables: [list], Migrations: [yes/no]</schema-design-complete>`

---

### Phase 3: LISA Analysis (Investigation & Planning)

**Do NOT write any code yet.** Only investigate and plan.

1. **Study Existing Patterns**: Look at similar modules in the codebase
   ```bash
   # Check existing module structure
   ls -la src/business/[similar-module]/
   cat src/business/[similar-module]/[similar-module].module.ts
   ```

2. **Understand Authentication/Authorization**:
   - Check how other endpoints handle auth
   - Identify required guards and decorators

3. **Plan API Contract**:
   - Define all request DTOs with validation
   - Define all response DTOs with Swagger decorators
   - Define error responses

4. **Document Implementation Plan**: Update PRD with detailed approach

Output: `<lisa-complete>Plan: [brief description]</lisa-complete>`

---

### Phase 4: API Contract Definition (MANDATORY)

**Before implementing, define the complete API contract.**

1. **Capture Current API Spec Baseline**:
   ```bash
   curl -s http://localhost:3000/docs-json > /tmp/api-spec-before.json
   echo "Current endpoints: $(jq '.paths | keys | length' /tmp/api-spec-before.json)"
   ```

2. **Define New Endpoints** (document in PRD):

   For each endpoint:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ ENDPOINT: POST /api/v1/[resource]                           │
   ├─────────────────────────────────────────────────────────────┤
   │ Description: [what it does]                                  │
   │ Authentication: Required (JWT)                               │
   │ Roles: [ADMIN, USER, etc.]                                  │
   │                                                              │
   │ Request Body:                                                │
   │ {                                                            │
   │   "field1": "string (required)",                            │
   │   "field2": "number (optional)"                             │
   │ }                                                            │
   │                                                              │
   │ Response (201):                                              │
   │ {                                                            │
   │   "id": "string",                                           │
   │   "field1": "string",                                       │
   │   "createdAt": "ISO date"                                   │
   │ }                                                            │
   │                                                              │
   │ Errors:                                                      │
   │ - 400: Invalid request body                                 │
   │ - 401: Not authenticated                                    │
   │ - 403: Not authorized                                       │
   └─────────────────────────────────────────────────────────────┘
   ```

3. **Consumer Integration Plan**:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │              CONSUMER INTEGRATION PLAN                       │
   ├─────────────────────────────────────────────────────────────┤
   │ Consumer: b2b-web (portal frontend)                         │
   │                                                              │
   │ New API Hooks Needed:                                        │
   │ - use[Resource]Query()                                      │
   │ - use[Resource]Mutation()                                   │
   │                                                              │
   │ New Pages/Components:                                        │
   │ - apps/portal/src/app/[resource]/page.tsx                   │
   │ - apps/portal/src/app/[resource]/components/                │
   │                                                              │
   │ Integration Timeline:                                        │
   │ - API ready: [when]                                         │
   │ - Frontend integration: [when/who]                          │
   └─────────────────────────────────────────────────────────────┘
   ```

Output: `<api-contract-defined>Endpoints: [N], Consumer integration planned</api-contract-defined>`

---

### Phase 5: RALPH Execution (Implementation)

Now implement the feature:

1. **Database Layer First** (if needed):
   - Update `prisma/schema.prisma`
   - Create migration: `npx prisma migrate dev --name [feature-name]`
   - Generate client: `npx prisma generate`

2. **DTO Layer Second**:
   - Create request DTOs with class-validator decorators
   - Create response DTOs with @ApiProperty decorators
   - Ensure proper Swagger documentation

3. **Service Layer Third**:
   - Implement business logic
   - Add proper error handling
   - Add logging

4. **Controller Layer Fourth**:
   - Create REST endpoints
   - Add Swagger decorators (@ApiTags, @ApiOperation, @ApiResponse)
   - Add authentication guards
   - Add validation pipes

5. **Module Registration Fifth**:
   - Create module file
   - Import in app.module.ts

6. **Output Checkpoints**:
   ```
   <checkpoint>[file]: [what was created]</checkpoint>
   ```

Output: `<ralph-complete>Created [N] files, modified [M] files</ralph-complete>`

---

### Phase 6: Testing (MANDATORY)

**All new features MUST have comprehensive tests across ALL applicable test types.**

#### 6.1 Unit Tests (REQUIRED for ALL new code)
```bash
npm run test -- --testPathPattern="[module-name]" --coverage
```
Requirements:
- Unit test for EVERY service method
- Test error cases and edge cases
- Minimum 80% code coverage
- **Location**: `src/[domain]/[module]/[module].service.spec.ts`

Create test following pattern:
```typescript
describe('[ModuleName]Service', () => {
  let service: [ModuleName]Service;
  let prisma: PrismaService;

  const mockPrisma = {
    [model]: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        [ModuleName]Service,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<[ModuleName]Service>([ModuleName]Service);
  });

  // Test each method...
});
```

#### 6.2 Integration Tests (REQUIRED)
```bash
npm run test:integration -- --testPathPattern="[module-name]"
```
Requirements:
- Test ALL new endpoints
- Test authentication/authorization
- Test request validation
- Test error responses
- Test success scenarios
- Test tenant isolation
- **Location**: `test/integration/[module]/[module].integration.spec.ts`

Create test following pattern:
```typescript
/**
 * @module [module-name]
 * @feature [feature-name]
 * @dependencies tenant, users
 */
describe('[ModuleName] Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // Setup test app with real database (Testcontainers)
  });

  describe('POST /api/v1/[resource]', () => {
    it('should create resource', async () => {
      // Test implementation
    });

    it('should reject invalid request', async () => {
      // Test validation
    });

    it('should require authentication', async () => {
      // Test auth
    });
  });
});
```

#### 6.3 E2E Tests (REQUIRED for user-facing features)
```bash
npm run test:e2e -- --testPathPattern="[flow]"
```
Requirements:
- Test complete API flow
- Test authentication flows
- Test error scenarios
- **Location**: `test/e2e/[flow].e2e.spec.ts`

#### 6.4 API Contract Verification (REQUIRED)
```bash
curl -s http://localhost:3000/docs-json > /tmp/api-spec-after.json

# Verify new endpoints appear
jq '.paths | keys[]' /tmp/api-spec-after.json | grep "[new-endpoint]"

# Verify schema is valid
npm run generate:postman:check 2>/dev/null || echo "Manual check needed"

# Update Postman collection
npm run generate:postman
```
- All endpoints documented in Swagger
- Request/Response schemas complete
- Error responses documented

#### 6.5 Performance Tests (REQUIRED for high-traffic endpoints)
```bash
k6 run test/performance/scenarios/[feature].perf.ts
```
Requirements:
- Test under expected load
- Test under peak load
- Document performance baselines
- **Thresholds**:
  - p(95) response time < 500ms
  - p(99) response time < 1000ms
  - Error rate < 1%
  - Throughput > 100 rps (adjust per endpoint)
- **Location**: `test/performance/scenarios/[feature].perf.ts`

Example k6 script:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/v1/[endpoint]');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

#### 6.6 Security Tests (REQUIRED)
```bash
npm run test:security -- --testPathPattern="[module]"
```
Requirements:
- Test authentication on ALL endpoints
- Test authorization (role-based access)
- Test input validation (SQL injection, XSS)
- Test rate limiting
- Test tenant isolation
- **Location**: `test/security/[module].security.spec.ts`

**OWASP Top 10 coverage**:
- [ ] A01:2021 – Broken Access Control (test RBAC, IDOR)
- [ ] A02:2021 – Cryptographic Failures (passwords hashed, no secrets exposed)
- [ ] A03:2021 – Injection (SQL, NoSQL, command injection)
- [ ] A04:2021 – Insecure Design (rate limiting, input validation)
- [ ] A05:2021 – Security Misconfiguration (error messages, debug info)
- [ ] A07:2021 – Authentication Failures (JWT validation, session management)

#### 6.7 Chaos Tests (REQUIRED for critical features)
```bash
npm run test:chaos -- --testPathPattern="[scenario]"
```
Requirements:
- Test database connection failure
- Test Redis/cache failure
- Test external service failure
- Test network partition
- Verify graceful degradation
- **Location**: `test/chaos/[feature].chaos.spec.ts`

Example scenarios:
- Database unavailable → Returns 503, logs error
- Cache unavailable → Falls back to database
- External API timeout → Returns cached data or graceful error

#### 6.8 Regression Tests (REQUIRED)
```bash
npm run test  # All 433+ tests must pass
```
- Verify ALL existing tests still pass
- No regression in related functionality

**Test Coverage Requirements**:
- New code: >80% coverage
- Critical paths: 100% coverage
- All 433+ existing tests must pass

**Test Checklist** (update in PRD):
```markdown
### Tests Created
| Test Type | File | Count | Coverage |
|-----------|------|-------|----------|
| Unit | `src/[module]/*.spec.ts` | [X] tests | [Y]% |
| Integration | `test/integration/[module]/` | [X] tests | - |
| E2E | `test/e2e/[flow].spec.ts` | [X] tests | - |
| Performance | `test/performance/[feat].ts` | [X] scenarios | p95<500ms |
| Security | `test/security/[module].ts` | [X] tests | OWASP covered |
| Chaos | `test/chaos/[feat].ts` | [X] scenarios | - |
```

Output: `<testing-complete>Unit: [X tests, Y% cov], Integration: [X tests], E2E: [X tests], Performance: [p95=Xms], Security: [OWASP covered], Chaos: [X scenarios], Regression: [433+ tests pass]</testing-complete>`

---

### Phase 7: Verification

Run all verification steps:

1. **Build**: `npm run build`
2. **All Tests**: `npm run test && npm run test:integration`
3. **Lint**: `npm run lint:check`
4. **API Documentation**:
   ```bash
   # Verify Swagger shows new endpoints
   curl -s http://localhost:3000/docs-json | jq '.paths | keys[]' | grep "[new-endpoint]"

   # Test new endpoints
   TOKEN=$(jq -r .accessToken /tmp/auth.json)
   curl -s "http://localhost:3000/api/v1/[new-endpoint]" -H "Authorization: Bearer $TOKEN" | jq
   ```

All must pass. If they fail, go back and fix.

Output: `<verification-complete>All builds and tests pass, API documented</verification-complete>`

---

### Phase 8: Completion

1. **Update Feature PRD** with resolution section:
   ```markdown
   ---

   ## Resolution ([date])

   ### Implementation Summary
   [What was actually implemented]

   ### Files Created
   1. `[file path]` - [purpose]
   2. `[file path]` - [purpose]

   ### Files Modified
   1. `[file path]` - [what changed]

   ### Database Changes
   - Tables created: [list]
   - Migrations: [migration name]

   ### API Endpoints Created
   | Method | Endpoint | Description |
   |--------|----------|-------------|
   | ... | ... | ... |

   ### Consumer Integration Status
   - b2b-web: [Ready for integration / Integrated / N/A]
   - Documentation: [Updated / Pending]

   ### Tests Created
   1. `[test file]` - [what was tested]

   ### Test Results
   - Unit Tests: PASS ([X] tests, [Y]% coverage)
   - Integration Tests: PASS ([X] tests)
   - Regression Tests: PASS (433+ tests)

   ### Verification
   - Status: **COMPLETE**
   ```

2. **Update Postman Collection** (if applicable):
   ```bash
   npm run generate:postman 2>/dev/null || echo "Manual update needed"
   ```

3. **Final Summary**:
```
<feature-complete>
FE-XXX: [Title]
Summary: [Brief description]

New Endpoints:
- [METHOD] /api/v1/[endpoint] - [description]
- [METHOD] /api/v1/[endpoint] - [description]

Files Created:
- src/business/[module]/...

Database Changes:
- [tables/columns created]

Consumer Integration:
- b2b-web: Ready for integration
- Documentation: Updated in Swagger

Tests:
- Unit: [X] tests ([Y]% coverage)
- Integration: [X] tests

Status: COMPLETE
</feature-complete>
```

---

## Important Rules

- **Do NOT skip Deduplication Check** - always verify this is a NEW feature
- **Do NOT implement enhancements as features** - redirect to /enhance
- **Do NOT skip API Contract Definition** - document all endpoints before implementing
- **Do NOT skip Testing phase** - all features MUST have comprehensive tests
- **Do NOT ask for permission between phases** - run automatically
- **Document consumer impact** - note what frontend changes will be needed
- **Update Swagger** - all endpoints must be properly documented
- **If blocked**, output: `<blocked>[reason]</blocked>` and stop

## Common Blockers

- **Duplicate Feature**: Feature already exists → Inform user and stop
- **Enhancement Not Feature**: This improves existing functionality → Redirect to /enhance
- **Database Dependency**: Need schema changes first → Document and proceed
- **Build/Test Failure**: Code doesn't compile or tests fail → Fix before continuing

## Begin

Start Phase 0: Deduplication & Context Detection - verify this is a new feature.
