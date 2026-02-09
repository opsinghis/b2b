# Enhancement Command (API)

You are implementing an enhancement to the B2B API using the LISA/RALPH methodology. The user has provided:

**Enhancement:** $ARGUMENTS

## Your Task

Execute the COMPLETE enhancement workflow automatically without asking for permission between phases.

---

### Phase 0: Context Detection (MANDATORY)

**Before creating any PRD, check if this enhancement relates to existing work.**

1. **Search Existing PRDs**: Check all backlog folders for related items
   ```bash
   # Search for related enhancements (check for duplicates)
   grep -r -i "[keywords from description]" .claude/planning/backlog/enhancements/ 2>/dev/null

   # Search execution PRD for the feature being enhanced
   grep -i "[keywords]" .claude/execution/prd.json 2>/dev/null
   ```

2. **Search Codebase**: Identify the existing module/feature to enhance
   ```bash
   # Find relevant files
   grep -r -l "[keywords]" src/business/ src/core/ 2>/dev/null | head -20
   ```

3. **Check PRD Items**: Read `.claude/execution/prd.json` to find the PRD item being enhanced
   - Extract the PRD-XXX ID of the original feature
   - Understand what was originally built

4. **Decision Logic**:
   - If **duplicate enhancement exists**: Output `<duplicate>ENH-XXX already covers this</duplicate>` and STOP
   - If **this is a NEW feature** (not enhancing existing): Output `<redirect>This is a new feature, use /feature command instead</redirect>` and STOP
   - If **related to existing PRD item**: Note the PRD-XXX in the enhancement PRD
   - If **enhances existing code without PRD**: Proceed with "legacy enhancement" note

Output: `<context-check-complete>Enhancing: [PRD-XXX: Feature Name] or [legacy code in module X]</context-check-complete>`

---

### Phase 1: Create Enhancement PRD (Markdown)

1. Determine the next enhancement number by checking `.claude/planning/backlog/enhancements/` for existing ENH-XXX files
2. Create: `.claude/planning/backlog/enhancements/ENH-XXX-short-description.md`

Use this template:
```markdown
# ENH-XXX: [Title]

## Summary
[Brief description of the enhancement]

## Priority
**P[1-4]** - [Reason]

## Affected Module
`src/business/[module]` or `src/core/[module]`

## Original PRD
[PRD-XXX: Original Feature Name] or [Legacy code - no PRD]

## Type
Enhancement

## API Impact Assessment
- **Endpoints Affected**: [list endpoints]
- **New Endpoints**: [list any new endpoints]
- **Response Schema Changed**: Yes/No
- **Request Schema Changed**: Yes/No
- **Breaking Change**: Yes/No
- **Consumer Impact**: [None/Low/Medium/High]

---

## LISA Analysis

### Current Behavior
[What the API does now - be specific about request/response]

### Improved Behavior
[What the API should do after enhancement]

### Files to Modify
- `[file1]` - [what changes]
- `[file2]` - [what changes]
...

### API Contract Changes
| Endpoint | Method | Change Type | Breaking? |
|----------|--------|-------------|-----------|
| /api/v1/... | GET | Response field added | No |
| /api/v1/... | POST | Request field added | No |

### Backward Compatibility
- [Breaking changes: none/list them]
- [Deprecation needed: yes/no]
- [Migration path: describe if needed]

### Risks Identified
- Risk 1: [description] → Mitigation: [solution]

### Test Strategy
- Unit: [test approach]
- Integration: [test approach]
- API Contract: [test approach]

---

## Completion Criteria
- [ ] Enhancement implemented
- [ ] Build passes
- [ ] Unit tests pass (433+ tests)
- [ ] Integration tests pass
- [ ] API contract documented
- [ ] No breaking changes (or documented + mitigated)

## Testing Requirements
- [ ] **Unit tests** for enhanced functionality (REQUIRED)
- [ ] **Integration tests** for affected endpoints (REQUIRED)
- [ ] **E2E tests** if API flow enhanced
- [ ] **API contract validation** (REQUIRED)
- [ ] **Performance tests** if performance-related enhancement
- [ ] **Security tests** if auth/data handling enhanced
- [ ] **Chaos tests** if reliability enhanced
- [ ] **Regression tests** - all 433+ tests pass (REQUIRED)

## Dependencies
[None or list dependencies]

## Max Iterations
5
```

Output: `<phase-1-complete>ENH-XXX created (enhancing PRD-XXX)</phase-1-complete>`

---

### Phase 2: LISA Analysis (Investigation)

**Do NOT write any code yet.** Only investigate.

1. **Read Current Implementation**: Check services, controllers, DTOs
2. **Understand Current API Contract**:
   ```bash
   # Get current OpenAPI spec for affected endpoints
   curl -s http://localhost:3000/docs-json | jq '.paths["/api/v1/[endpoint]"]'
   ```
3. **Test Current Behavior**:
   ```bash
   TOKEN=$(jq -r .accessToken /tmp/auth.json)
   curl -s "http://localhost:3000/api/v1/[endpoint]" -H "Authorization: Bearer $TOKEN" | jq
   ```
4. **Identify Touch Points**: List all files that need modification
5. **Review Existing Tests**: Identify tests that may need updating

Update the Enhancement PRD with your findings.

Output: `<lisa-complete>Approach: [brief description]</lisa-complete>`

---

### Phase 3: API Contract Analysis (MANDATORY)

**Before implementing, analyze ALL API contract changes.**

1. **Capture Current API Spec**:
   ```bash
   curl -s http://localhost:3000/docs-json > /tmp/api-spec-before.json
   ```

2. **Document ALL Changes**:
   For each affected endpoint, document:
   - Request body changes (new fields, changed types, required/optional)
   - Response body changes (new fields, changed types, removed fields)
   - Query parameter changes
   - Header changes
   - Status code changes

3. **Breaking Change Detection**:

   **BREAKING CHANGES** (require consumer updates):
   - ❌ Removing a response field
   - ❌ Changing a field type (string → number)
   - ❌ Making an optional field required
   - ❌ Removing an endpoint
   - ❌ Changing an endpoint path
   - ❌ Removing query parameters

   **NON-BREAKING CHANGES** (safe):
   - ✅ Adding a new response field
   - ✅ Adding a new optional request field
   - ✅ Adding a new endpoint
   - ✅ Adding a new query parameter

4. **Consumer Impact Assessment**:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │                   CONSUMER IMPACT REPORT                     │
   ├─────────────────────────────────────────────────────────────┤
   │ Endpoint: [endpoint]                                         │
   │ Method: [GET/POST/PUT/DELETE]                               │
   │                                                              │
   │ Changes:                                                     │
   │ - [describe each change]                                    │
   │                                                              │
   │ Consumers:                                                   │
   │ - b2b-web (portal frontend)                                 │
   │   Impact: [None/Update Required/Breaking]                   │
   │   Files affected: [list frontend files if known]            │
   │                                                              │
   │ Migration Required: [Yes/No]                                │
   │ Suggested Timeline: [Immediate/Coordinated Release]         │
   └─────────────────────────────────────────────────────────────┘
   ```

5. **Decision**:
   - If **NO breaking change**: Proceed to Phase 4
   - If **BREAKING CHANGE detected**:
     ```
     <breaking-change-warning>
     ⚠️ BREAKING CHANGE DETECTED

     Endpoint: [endpoint]
     Change: [describe the breaking change]

     Affected Consumers:
     - b2b-web:
       - Files: [list affected frontend files]
       - Required changes: [describe what frontend needs to change]

     Mitigation Options:
     1. API Versioning: Create /api/v2/[endpoint] with new behavior
     2. Backward Compatible: Add new field, keep old field (deprecate later)
     3. Coordinated Release: Update both API and frontend simultaneously
     4. Feature Flag: Gate behind feature flag for gradual rollout

     Recommendation: [your recommendation with justification]
     </breaking-change-warning>
     ```
     STOP and await user decision.

Output: `<api-contract-check>Breaking: [Yes/No], Impact: [None/Low/Medium/High], Changes: [summary]</api-contract-check>`

---

### Phase 4: RALPH Execution (Implementation)

Now implement the enhancement:

1. **DTO Layer First**: Update request/response DTOs
   - Add proper Swagger decorators for documentation
   - Ensure types match API contract

2. **Service Layer Second**: Implement business logic changes

3. **Controller Layer Third**: Update route handlers

4. **Output Checkpoints**:
   ```
   <checkpoint>[file]: [what was enhanced]</checkpoint>
   ```

5. **Maintain Backward Compatibility**: If non-breaking, ensure old behavior still works

Output: `<ralph-complete>Enhanced [N] files</ralph-complete>`

---

### Phase 5: Testing (MANDATORY)

**All enhancements MUST include comprehensive tests across ALL applicable test types.**

#### 5.1 Unit Tests (REQUIRED)
```bash
npm run test -- --testPathPattern="[module-name]" --coverage
```
- Test enhanced functionality
- Test edge cases
- Ensure >80% coverage on changed code
- **Location**: `src/[domain]/[module]/[module].service.spec.ts`

#### 5.2 Integration Tests (REQUIRED)
```bash
npm run test:integration -- --testPathPattern="[module-name]"
```
- Test enhanced API endpoints
- Test request/response validation
- Test error handling
- Test backward compatibility
- **Location**: `test/integration/[module]/[module].integration.spec.ts`

#### 5.3 E2E Tests (if API flow enhanced)
```bash
npm run test:e2e -- --testPathPattern="[flow]"
```
- Test complete enhanced flow works
- **Location**: `test/e2e/[flow].e2e.spec.ts`

#### 5.4 API Contract Verification (REQUIRED)
```bash
curl -s http://localhost:3000/docs-json > /tmp/api-spec-after.json

# Check for unexpected changes
diff /tmp/api-spec-before.json /tmp/api-spec-after.json

# Verify schema is valid
npm run generate:postman:check 2>/dev/null || echo "Manual check needed"
```
- Document ALL contract changes
- Verify backward compatibility

#### 5.5 Performance Tests (if performance-related enhancement)
```bash
k6 run test/performance/scenarios/[endpoint].perf.ts
```
- Verify enhancement improves performance (if goal)
- Verify enhancement doesn't degrade performance
- Test under load
- **Thresholds**:
  - p(95) response time < 500ms
  - Error rate < 1%
- **Location**: `test/performance/scenarios/[scenario].perf.ts`

#### 5.6 Security Tests (if auth/data handling enhanced)
```bash
npm run test:security -- --testPathPattern="[module]"
```
- Test for injection vulnerabilities
- Test authentication/authorization
- Test input validation
- **Location**: `test/security/[module].security.spec.ts`

**OWASP Top 10 checks if applicable**:
- [ ] A01:2021 – Broken Access Control
- [ ] A02:2021 – Cryptographic Failures
- [ ] A03:2021 – Injection
- [ ] A04:2021 – Insecure Design

#### 5.7 Chaos Tests (if reliability enhanced)
```bash
npm run test:chaos -- --testPathPattern="[scenario]"
```
- Test enhanced behavior under failure conditions
- Test graceful degradation
- **Location**: `test/chaos/[scenario].chaos.spec.ts`

#### 5.8 Regression Tests (REQUIRED)
```bash
npm run test  # All 433+ tests must pass
```
- Verify ALL existing tests still pass
- No regression in related functionality

**Test Coverage Requirements**:
- Changed code must have >80% coverage
- All 433+ existing tests must pass
- API contract changes documented

**Test Checklist** (update in PRD):
```markdown
### Tests Added/Updated
| Test Type | File | Description |
|-----------|------|-------------|
| Unit | `[file]` | Tests enhanced functionality |
| Integration | `[file]` | Tests API endpoints |
| E2E | `[file]` | Tests flow (if applicable) |
| Performance | `[file]` | Load test (if applicable) |
| Security | `[file]` | Security test (if applicable) |
| Chaos | `[file]` | Failure test (if applicable) |
```

Output: `<testing-complete>Unit: [X tests, Y% cov], Integration: [pass/fail], E2E: [pass/fail/N/A], Contract: [as expected], Performance: [pass/fail/N/A], Security: [pass/fail/N/A], Chaos: [pass/fail/N/A], Regression: [433+ tests pass]</testing-complete>`

---

### Phase 6: Verification

Run all verification steps:

1. **Build**: `npm run build`
2. **All Tests**: `npm run test && npm run test:integration`
3. **Lint**: `npm run lint:check`
4. **API Documentation**: Verify Swagger shows correct schema
   ```bash
   curl -s http://localhost:3000/docs-json | jq '.paths["/api/v1/[endpoint]"]'
   ```

All must pass. If they fail, go back and fix.

Output: `<verification-complete>All builds and tests pass</verification-complete>`

---

### Phase 7: Completion

1. **Update Enhancement PRD** with resolution section:
   ```markdown
   ---

   ## Resolution ([date])

   ### Implementation Summary
   [What was actually implemented]

   ### Changes Made
   1. **[Component]** (`[file path]`):
      - [What was changed]

   ### API Contract Changes
   | Endpoint | Change | Breaking? |
   |----------|--------|-----------|
   | ... | ... | ... |

   ### Consumer Impact
   - b2b-web: [None/Requires update - describe]

   ### Tests Added/Updated
   1. `[test file]` - [what was tested]

   ### Test Results
   - Unit Tests: PASS ([X] tests, [Y]% coverage)
   - Integration Tests: PASS
   - Regression Tests: PASS (433+ tests)

   ### Verification
   - Status: **COMPLETE**
   ```

2. **Final Summary**:
```
<enhancement-complete>
ENH-XXX: [Title]
Original PRD: [PRD-XXX or Legacy]
Summary: [Brief description]
Files Modified:
- [file1]
- [file2]
API Contract Changes:
- [endpoint]: [change description]
Breaking Change: No
Consumer Impact: [None/Low/Medium/High]
Tests Added:
- [test1]
Status: COMPLETE
</enhancement-complete>
```

---

## Important Rules

- **Do NOT skip Context Detection** - always verify this enhances existing code
- **Do NOT skip API Contract Analysis** - ALL API changes must be documented
- **Do NOT make breaking changes without warning** - output `<breaking-change-warning>`
- **Do NOT create new features** - redirect to /feature if appropriate
- **Do NOT ask for permission between phases** - run automatically
- **Do NOT skip Testing phase** - all enhancements MUST have tests
- **If blocked**, output: `<blocked>[reason]</blocked>` and stop

## Begin

Start Phase 0: Context Detection - verify this enhances existing functionality.
