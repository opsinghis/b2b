# Fix Bug Command (API)

You are fixing a bug in the B2B API using the LISA/RALPH methodology. The user has provided this bug description:

**Bug:** $ARGUMENTS

## Your Task

Execute the COMPLETE bug fix workflow automatically without asking for permission between phases.

---

### Phase 0: Context Detection (MANDATORY)

**Before creating any PRD, check if this bug relates to existing work.**

1. **Search Existing PRDs**: Check all backlog folders for related items
   ```bash
   # Search for related bugs
   grep -r -i "[keywords from description]" .claude/planning/backlog/bugs/ 2>/dev/null

   # Search execution PRD for related items
   grep -i "[keywords]" .claude/execution/prd.json 2>/dev/null
   ```

2. **Search Codebase**: Identify which module/feature this bug belongs to
   ```bash
   # Find relevant files
   grep -r -l "[keywords]" src/business/ src/core/ 2>/dev/null | head -20
   ```

3. **Check PRD Items**: Read `.claude/execution/prd.json` to find the PRD item this relates to
   - Extract the PRD-XXX ID if this bug is in a feature that was built
   - Note the module name for context

4. **Decision Logic**:
   - If **duplicate bug exists**: Output `<duplicate>BUG-XXX already covers this issue</duplicate>` and STOP
   - If **related to existing PRD item**: Note the PRD-XXX in the bug PRD for context
   - If **new/unrelated**: Proceed normally

Output: `<context-check-complete>Related to: [PRD-XXX or "new issue"]</context-check-complete>`

---

### Phase 1: Create Bug PRD (Markdown)

1. Determine the next bug number by checking `.claude/planning/backlog/bugs/` for existing BUG-XXX files
2. Parse the bug description to extract:
   - Short description (for filename)
   - Affected module (from context detection)
   - Priority (P1=critical, P2=high, P3=medium, P4=low)
   - **Related PRD** (from Phase 0)
3. Create a new bug PRD file: `.claude/planning/backlog/bugs/BUG-XXX-short-description.md`

Use this template:
```markdown
# BUG-XXX: [Title]

## Summary
[Brief description of the bug]

## Priority
**P[1-4]** - [Reason]

## Affected Module
`src/business/[module]` or `src/core/[module]`

## Related PRD
[PRD-XXX: Feature Name] or [None - new functionality]

## Type
Bug Fix

## API Impact Assessment
- **Endpoints Affected**: [list endpoints]
- **Response Schema Changed**: Yes/No
- **Breaking Change**: Yes/No
- **Consumer Impact**: [None/Low/Medium/High]

---

## LISA Analysis

### Root Cause Investigation
1. [Investigation step 1]
2. [Investigation step 2]
...

### Files to Investigate
- `[file1]` - [reason]
- `[file2]` - [reason]
...

### API Contract Analysis
- Current Response: [describe]
- Expected Response: [describe]
- Schema Changes: [none/describe changes]

### Risks Identified
- Risk 1: [description] → Mitigation: [solution]

### Test Strategy
- Unit: [test approach]
- Integration: [test approach]
- API Contract: [test approach]

---

## Completion Criteria
- [ ] Bug fixed
- [ ] Build passes
- [ ] Unit tests pass (433+ tests)
- [ ] Integration tests pass
- [ ] API contract unchanged (or documented if changed)

## Testing Requirements
- [ ] **Unit test** for the specific fix (REQUIRED)
- [ ] **Integration test** for affected endpoints (REQUIRED for API)
- [ ] **E2E test** if critical API path affected
- [ ] **API contract validation** (REQUIRED)
- [ ] **Performance test** if performance-related bug
- [ ] **Security test** if security-related bug
- [ ] **Chaos test** if reliability-related bug
- [ ] **Regression** - all 433+ tests pass (REQUIRED)

## Dependencies
[None or list dependencies]

## Max Iterations
5
```

Output: `<phase-1-complete>BUG-XXX created (related to PRD-XXX)</phase-1-complete>`

---

### Phase 2: LISA Analysis (Investigation)

**Do NOT write any code yet.** Only investigate.

1. **Read Service/Controller Code**: Check relevant services, controllers, DTOs
2. **Check Database Layer**: Verify Prisma schema and queries
3. **Test API Response**: Use curl to verify actual API behavior
   ```bash
   # Get fresh auth token
   curl -s http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" \
     -d '{"email":"customer@b2b.local","password":"password123"}' > /tmp/auth.json

   # Test affected endpoint
   TOKEN=$(jq -r .accessToken /tmp/auth.json)
   curl -s "http://localhost:3000/api/v1/[endpoint]" -H "Authorization: Bearer $TOKEN" | jq
   ```
4. **Identify Root Cause**: Pinpoint exactly what code is wrong and why
5. **Check API Contract**: Will fix change response schema?

Update the Bug PRD with your findings.

Output: `<lisa-complete>Root cause: [brief description]</lisa-complete>`

---

### Phase 3: API Contract Analysis (MANDATORY)

**Before implementing, analyze if the fix changes the API contract.**

1. **Capture Current API Spec**:
   ```bash
   curl -s http://localhost:3000/docs-json > /tmp/api-spec-before.json
   ```

2. **Analyze Response Schema Changes**:
   - Will any field be added? (usually safe)
   - Will any field be removed? (BREAKING CHANGE)
   - Will any field type change? (BREAKING CHANGE)
   - Will any field become nullable/required? (BREAKING CHANGE)

3. **Consumer Impact Assessment**:
   ```
   Consumers of this API:
   - b2b-web (portal frontend)

   Impact Level: [None/Low/Medium/High/Critical]
   ```

4. **Decision**:
   - If **NO breaking change**: Proceed to Phase 4
   - If **BREAKING CHANGE detected**:
     ```
     <breaking-change-warning>
     ⚠️ BREAKING CHANGE DETECTED

     Endpoint: [endpoint]
     Change: [describe the breaking change]

     Affected Consumers:
     - b2b-web: [impact description]

     Options:
     1. Version the endpoint (e.g., /api/v2/...)
     2. Add new field, deprecate old (backward compatible)
     3. Coordinate with frontend team for simultaneous release

     Recommendation: [your recommendation]
     </breaking-change-warning>
     ```
     STOP and await user decision.

Output: `<api-contract-check>Breaking: [Yes/No], Impact: [None/Low/Medium/High]</api-contract-check>`

---

### Phase 4: RALPH Execution (Implementation)

Now implement the fix:

1. **Service Layer First**: Fix business logic in services
2. **Controller Layer Second**: Fix request/response handling
3. **Output Checkpoints**: After each change:
   ```
   <checkpoint>[file]: [what was fixed]</checkpoint>
   ```
4. **Keep Changes Minimal**: Only fix what's broken

Output: `<ralph-complete>Fixed [N] files</ralph-complete>`

---

### Phase 5: Testing (MANDATORY)

**All bug fixes MUST include comprehensive tests across ALL applicable test types.**

#### 5.1 Unit Tests (REQUIRED)
```bash
npm run test -- --testPathPattern="[module-name]" --coverage
```
- Write/update unit test for the specific fix
- Test the edge case that caused the bug
- Ensure >80% coverage on changed code
- **Location**: `src/[domain]/[module]/[module].service.spec.ts`

#### 5.2 Integration Tests (REQUIRED for API bugs)
```bash
npm run test:integration -- --testPathPattern="[module-name]"
```
- Test API endpoint returns correct data after fix
- Test error handling
- Test with real database (Testcontainers)
- **Location**: `test/integration/[module]/[module].integration.spec.ts`

#### 5.3 E2E Tests (if critical API path)
```bash
npm run test:e2e -- --testPathPattern="[flow]"
```
- Test complete API flow works after fix
- **Location**: `test/e2e/[flow].e2e.spec.ts`

#### 5.4 API Contract Verification (REQUIRED)
```bash
# Compare API spec before/after
curl -s http://localhost:3000/docs-json > /tmp/api-spec-after.json
diff /tmp/api-spec-before.json /tmp/api-spec-after.json || echo "API spec changed"

# Verify Postman collection
npm run generate:postman:check 2>/dev/null || echo "Manual check needed"
```
- Verify fix doesn't break API contract
- Document any intentional changes

#### 5.5 Performance Tests (if performance-related bug)
```bash
# Run k6 load test on affected endpoint
k6 run test/performance/scenarios/[endpoint].perf.ts
```
- Verify fix improves/doesn't degrade performance
- Test response time under load
- **Thresholds**:
  - p(95) response time < 500ms
  - Error rate < 1%
- **Location**: `test/performance/scenarios/[scenario].perf.ts`

#### 5.6 Security Tests (if security-related bug)
```bash
npm run test:security -- --testPathPattern="[module]"
```
- Test SQL injection if database query fix
- Test XSS if response handling fix
- Test auth bypass if authentication fix
- Test IDOR if authorization fix
- **Location**: `test/security/[vulnerability].security.spec.ts`

**OWASP Top 10 checks if applicable**:
- [ ] A01:2021 – Broken Access Control
- [ ] A02:2021 – Cryptographic Failures
- [ ] A03:2021 – Injection
- [ ] A07:2021 – Identification and Authentication Failures

#### 5.7 Chaos Tests (if reliability-related bug)
```bash
npm run test:chaos -- --testPathPattern="[scenario]"
```
- Test behavior under failure conditions
- Test database connection failures
- Test cache failures
- Test external service failures
- **Location**: `test/chaos/[scenario].chaos.spec.ts`

#### 5.8 Regression Tests (REQUIRED)
```bash
npm run test  # All 433+ tests must pass
```
- Verify ALL existing tests still pass
- No regression in related functionality

**Test Coverage Requirements**:
- Changed code must have >80% coverage
- Bug fix MUST have specific test case that would have caught the bug
- All 433+ existing tests must pass

**Test Checklist** (update in PRD):
```markdown
### Tests Added/Updated
| Test Type | File | Description |
|-----------|------|-------------|
| Unit | `[file]` | Tests specific fix |
| Integration | `[file]` | Tests API endpoint |
| E2E | `[file]` | Tests flow (if applicable) |
| Performance | `[file]` | Load test (if applicable) |
| Security | `[file]` | Security test (if applicable) |
| Chaos | `[file]` | Failure test (if applicable) |
```

Output: `<testing-complete>Unit: [pass/fail, X% cov], Integration: [pass/fail], E2E: [pass/fail/N/A], Contract: [unchanged/changed], Performance: [pass/fail/N/A], Security: [pass/fail/N/A], Chaos: [pass/fail/N/A], Regression: [433+ tests pass]</testing-complete>`

---

### Phase 6: Verification

Run all verification steps:

1. **Build**: `npm run build`
2. **All Tests**: `npm run test && npm run test:integration`
3. **Lint**: `npm run lint:check`
4. **API Verification**: Test the fixed endpoint

All must pass. If they fail, go back and fix.

Output: `<verification-complete>All builds and tests pass</verification-complete>`

---

### Phase 7: Completion

1. **Update Bug PRD** with resolution section including:
   - Root Cause
   - Fixes Applied
   - API Contract Status
   - Tests Added/Updated
   - Test Results

2. **Final Summary**:
```
<bug-fix-complete>
BUG-XXX: [Title]
Related PRD: [PRD-XXX or None]
Root Cause: [Brief description]
Files Modified:
- [file1]
- [file2]
API Contract: [Unchanged/Changed - describe]
Consumer Impact: [None/Low/Medium/High]
Tests Added:
- [test1]
Status: COMPLETE
</bug-fix-complete>
```

---

## Important Rules

- **Do NOT skip API Contract Analysis** - all API changes must be analyzed
- **Do NOT make breaking changes without warning** - output `<breaking-change-warning>`
- **Do NOT ask for permission between phases** - run automatically
- **Do NOT skip Testing phase** - all fixes MUST have tests
- **If blocked**, output: `<blocked>[reason]</blocked>` and stop

## Begin

Start Phase 0: Context Detection.
