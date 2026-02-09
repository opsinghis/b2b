# Fix Bug Command

You are fixing a bug using the LISA/RALPH methodology. The user has provided this bug description:

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

   # Search for related features this might affect
   grep -r -i "[keywords]" .claude/planning/backlog/features/ 2>/dev/null

   # Search execution PRD for related items
   grep -i "[keywords]" .claude/execution/prd.json 2>/dev/null
   ```

2. **Search Codebase**: Identify which module/feature this bug belongs to
   ```bash
   # Find relevant files
   grep -r -l "[keywords]" apps/portal/src/ packages/ 2>/dev/null | head -20
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
`[module path]`

## Related PRD
[PRD-XXX: Feature Name] or [None - new functionality]

## Type
Bug Fix

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

### Patterns to Follow
- [Pattern 1]
- [Pattern 2]
...

### Risks Identified
- Risk 1: [description] → Mitigation: [solution]
- Risk 2: [description] → Mitigation: [solution]

### Test Strategy
- Unit: [test approach]
- Integration: [test approach]
- Visual: [test approach]

---

## Completion Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] Build passes
- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] No regression in related functionality
...

## Testing Requirements
- [ ] **Unit test** for the specific fix (REQUIRED)
- [ ] **Feature test** if user flow affected
- [ ] **Integration test** if API hook/client affected
- [ ] **E2E test** if critical user path affected
- [ ] **Accessibility test** if UI changed
- [ ] **Visual test** if styling changed
- [ ] **Performance test** if performance-related bug
- [ ] **Security test** if security-related bug
- [ ] Update existing tests if behavior changed

## Dependencies
[None or list dependencies]

## Max Iterations
5
```

Output: `<phase-1-complete>BUG-XXX created (related to PRD-XXX)</phase-1-complete>`

---

### Phase 2: LISA Analysis (Investigation)

**Do NOT write any code yet.** Only investigate.

1. **Read API/Backend Code**: Check relevant services, controllers, DTOs
2. **Read Frontend Code**: Check components, pages, API calls
3. **Test API Responses**: Use curl to verify actual API behavior
   ```bash
   # Get fresh auth token
   curl -s http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" \
     -d '{"email":"customer@b2b.local","password":"password123"}' > /tmp/auth.json

   # Test relevant endpoints
   TOKEN=$(jq -r .accessToken /tmp/auth.json)
   curl -s "http://localhost:3000/api/v1/[endpoint]" -H "Authorization: Bearer $TOKEN" | jq
   ```
4. **Compare Expected vs Actual**: Document the discrepancy
5. **Identify Root Cause**: Pinpoint exactly what code is wrong and why
6. **Identify Test Gaps**: Note which tests should have caught this bug

Update the Bug PRD with your findings in the "Root Cause Investigation" section.

Output: `<lisa-complete>Root cause: [brief description]</lisa-complete>`

---

### Phase 3: RALPH Execution (Implementation)

Now implement the fix. Follow these rules:

1. **Backend First**: If the bug involves API data, fix backend first
   - Check service layer for data transformation issues
   - Check if data exists in DB but isn't being returned correctly
   - Verify database schema vs code expectations

2. **Frontend Second**: Fix UI components after backend is confirmed working
   - Check if components handle the data correctly
   - Verify configuration (e.g., next.config.js for images)
   - Test with mock data if needed

3. **Output Checkpoints**: After each significant change:
   ```
   <checkpoint>[file]: [what was fixed]</checkpoint>
   ```

4. **Keep Changes Minimal**: Only fix what's broken, don't refactor

Output: `<ralph-complete>Fixed [N] files</ralph-complete>`

---

### Phase 4: Testing (MANDATORY)

**All bug fixes MUST include appropriate tests across ALL applicable test types.**

#### 4.1 Unit Tests (REQUIRED)
```bash
cd /Users/omsingh0/code/b2b/b2b-web
pnpm test -- --testPathPattern="[component-name]" --coverage
```
- Write/update unit test for the specific fix
- Test the edge case that caused the bug
- Ensure test would have caught the bug before
- **Location**: Co-located `[component].test.tsx` or `__tests__/[feature]/`

#### 4.2 Feature Tests (REQUIRED if user flow affected)
```bash
pnpm test -- --testPathPattern="[feature]"
```
- Test complete feature behavior after fix
- Include mock API responses
- Test error states and edge cases
- **Location**: `apps/[app]/src/__tests__/[feature]/[feature].test.tsx`

#### 4.3 Integration Tests (if API integration affected)
```bash
# If fix involves API client/hooks
pnpm test -- --testPathPattern="[api-hook]"
```
- Test API hook correctly handles fixed scenario
- Test error handling for edge cases

#### 4.4 E2E Tests (REQUIRED if critical user path)
```bash
pnpm test:e2e -- --spec="[related-spec]"
```
- Test complete user journey works after fix
- **Location**: `apps/[app]/src/e2e/specs/[flow].e2e.spec.ts`
- **Create new E2E test if bug was in critical path**

#### 4.5 Accessibility Tests (if UI affected)
```bash
pnpm test:a11y -- --spec="[page]"
```
- Verify fix doesn't introduce a11y regressions
- Run axe-core on affected components
- **Location**: `a11y/[page].a11y.spec.ts`

#### 4.6 Visual Regression Tests (if styling affected)
- Update/create Storybook story for affected component
- Verify visual appearance is correct
- **Location**: `packages/ui/src/components/[component].stories.tsx`

#### 4.7 Performance Tests (if performance-related bug)
```bash
# Run Lighthouse on affected page
pnpm lighthouse -- --url="[affected-page]"
```
- Verify fix doesn't degrade Core Web Vitals
- Check bundle size impact

#### 4.8 Security Tests (if security-related bug)
- Verify fix addresses security vulnerability
- Test for XSS, injection, or auth bypass
- Document security test case

**Test Coverage Requirements**:
- New/changed code must have >80% coverage
- Bug fix MUST have specific test case that would have caught the bug
- All existing tests must continue to pass

**Test Checklist** (update in PRD):
```markdown
### Tests Added/Updated
- [ ] Unit test: `[file]` - Tests [specific fix scenario]
- [ ] Feature test: `[file]` - Tests [user flow]
- [ ] E2E test: `[file]` - Tests [critical path] (if applicable)
- [ ] A11y test: Verified no regressions (if UI affected)
- [ ] Performance: Verified no degradation (if applicable)
- [ ] Security: [describe test] (if security fix)
```

Output: `<testing-complete>Unit: [pass/fail], Feature: [pass/fail/N/A], E2E: [pass/fail/N/A], A11y: [pass/fail/N/A], Perf: [pass/fail/N/A], Security: [pass/fail/N/A]</testing-complete>`

---

### Phase 5: Verification

Run all verification steps:

1. **Backend Build & Tests**:
   ```bash
   cd /Users/omsingh0/code/b2b/b2b-api && npm run build && npm run test
   ```

2. **Frontend Build & Tests**:
   ```bash
   cd /Users/omsingh0/code/b2b/b2b-web && pnpm build && pnpm test
   ```

3. **API Verification** (test the fix):
   ```bash
   TOKEN=$(jq -r .accessToken /tmp/auth.json)
   curl -s "http://localhost:3000/api/v1/[endpoint]" -H "Authorization: Bearer $TOKEN" | jq
   ```

4. **Lint Check**:
   ```bash
   npm run lint:check  # or pnpm lint
   ```

All builds and tests must pass. If they fail, go back to Phase 3/4 and fix.

Output: `<verification-complete>All builds and tests pass</verification-complete>`

---

### Phase 6: Completion

1. **Update Bug PRD**: Add resolution section at the end:
   ```markdown
   ---

   ## Resolution ([date])

   ### Root Cause
   [What was actually wrong]

   ### Fixes Applied
   1. **[Component]** (`[file path]`):
      - [What was changed]

   2. **[Component]** (`[file path]`):
      - [What was changed]

   ### Tests Added/Updated
   | Test Type | File | Description |
   |-----------|------|-------------|
   | Unit | `[file]` | [what was tested] |
   | Feature | `[file]` | [what was tested] |
   | E2E | `[file]` | [what was tested] |
   | A11y | `[file]` | [what was tested] |
   | Performance | N/A | [verified/not applicable] |
   | Security | N/A | [verified/not applicable] |

   ### Test Results
   - Unit Tests: PASS ([X] tests, [Y]% coverage)
   - Feature Tests: PASS/N/A
   - E2E Tests: PASS/N/A
   - Accessibility: PASS/N/A
   - Performance: PASS/N/A
   - Security: PASS/N/A

   ### Verification
   - [How it was verified]
   - Status: **COMPLETE**
   ```

2. **Check off Completion Criteria**: Mark all criteria as `[x]` in the PRD

3. **Final Summary**: Output a summary of what was fixed

Output:
```
<bug-fix-complete>
BUG-XXX: [Title]
Related PRD: [PRD-XXX or None]
Root Cause: [Brief description]
Files Modified:
- [file1]
- [file2]
Tests Added:
- [test1]
- [test2]
Status: COMPLETE
</bug-fix-complete>
```

---

## Important Rules

- **Do NOT skip Context Detection** - always check for duplicates and related PRDs
- **Do NOT ask for permission between phases** - run the entire workflow automatically
- **Do NOT skip LISA phase** - always investigate before implementing
- **Do NOT skip Testing phase** - all bug fixes MUST have tests
- **Do NOT guess** - use curl/grep/read to verify assumptions
- **Use TodoWrite** to track progress through phases
- **If blocked**, output: `<blocked>[reason]</blocked>` and stop

## Begin

Start Phase 0: Context Detection - search for related existing work.
