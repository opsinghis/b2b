# Enhancement Command

You are implementing an enhancement using the LISA/RALPH methodology. The user has provided:

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

   # Search for related features this enhances
   grep -r -i "[keywords]" .claude/planning/backlog/features/ 2>/dev/null

   # Search execution PRD for the feature being enhanced
   grep -i "[keywords]" .claude/execution/prd.json 2>/dev/null
   ```

2. **Search Codebase**: Identify the existing module/feature to enhance
   ```bash
   # Find relevant files
   grep -r -l "[keywords]" apps/portal/src/ packages/ 2>/dev/null | head -20

   # Check for existing implementation
   grep -r "[function/component name]" apps/portal/src/ 2>/dev/null
   ```

3. **Check PRD Items**: Read `.claude/execution/prd.json` to find the PRD item being enhanced
   - Extract the PRD-XXX ID of the original feature
   - Understand what was originally built
   - Note current behavior

4. **Decision Logic**:
   - If **duplicate enhancement exists**: Output `<duplicate>ENH-XXX already covers this</duplicate>` and STOP
   - If **this is a NEW feature** (not enhancing existing): Output `<redirect>This is a new feature, use /feature command instead</redirect>` and STOP
   - If **related to existing PRD item**: Note the PRD-XXX in the enhancement PRD
   - If **enhances existing code without PRD**: Proceed but note "legacy enhancement"

Output: `<context-check-complete>Enhancing: [PRD-XXX: Feature Name] or [legacy code in module X]</context-check-complete>`

---

### Phase 1: Create Enhancement PRD (Markdown)

1. Determine the next enhancement number by checking `.claude/planning/backlog/enhancements/` for existing ENH-XXX files
2. Parse the enhancement description to extract:
   - Short description (for filename)
   - Affected module (from context detection)
   - Priority (P1=critical, P2=high, P3=medium, P4=low)
   - **Original PRD** (from Phase 0)
3. Create a new enhancement PRD file: `.claude/planning/backlog/enhancements/ENH-XXX-short-description.md`

Use this template:
```markdown
# ENH-XXX: [Title]

## Summary
[Brief description of the enhancement]

## Priority
**P[1-4]** - [Reason]

## Affected Module
`[module path]`

## Original PRD
[PRD-XXX: Original Feature Name] or [Legacy code - no PRD]

## Type
Enhancement

---

## LISA Analysis

### Current Behavior
[What the system does now - be specific]

### Improved Behavior
[What the system should do after enhancement - be specific]

### Files to Modify
- `[file1]` - [what changes]
- `[file2]` - [what changes]
...

### Implementation Approach
1. [Step 1]
2. [Step 2]
...

### Backward Compatibility
- [Breaking changes: none/list them]
- [Migration needed: yes/no]
- [Existing tests affected: yes/no]

### Risks Identified
- Risk 1: [description] → Mitigation: [solution]
- Risk 2: [description] → Mitigation: [solution]

### Test Strategy
- Unit: [test approach]
- Integration: [test approach]
- Regression: [what existing tests to run]

---

## Completion Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] No breaking changes introduced
- [ ] Build passes
- [ ] All existing tests still pass
- [ ] New tests added for enhancement
...

## Testing Requirements
- [ ] **Unit tests** for new/changed functionality (REQUIRED)
- [ ] **Feature tests** for enhanced user flows (REQUIRED)
- [ ] **Integration tests** if API hook/client affected
- [ ] **E2E tests** if user flow affected
- [ ] **Accessibility tests** if UI enhanced (REQUIRED for UI)
- [ ] **Visual regression tests** if styling changed
- [ ] **Performance tests** if performance-related
- [ ] **Security tests** if auth/input handling enhanced
- [ ] **Regression tests** - all existing tests pass (REQUIRED)
- [ ] Update existing tests if behavior changed

## Dependencies
[None or list dependencies]

## Max Iterations
5
```

Output: `<phase-1-complete>ENH-XXX created (enhancing PRD-XXX)</phase-1-complete>`

---

### Phase 2: LISA Analysis (Investigation)

**Do NOT write any code yet.** Only investigate.

1. **Read Current Implementation**: Check relevant services, controllers, components
2. **Understand Data Flow**: Trace how data moves through the system
3. **Identify Touch Points**: List all files that need modification
4. **Check for Side Effects**: Look for code that depends on current behavior
5. **Review Existing Tests**: Identify tests that may need updating
6. **Document Current vs Improved**: Clearly describe the delta

Update the Enhancement PRD with your findings in the "LISA Analysis" section.

Output: `<lisa-complete>Approach: [brief description of implementation plan]</lisa-complete>`

---

### Phase 3: RALPH Execution (Implementation)

Now implement the enhancement. Follow these rules:

1. **Minimal Changes**: Only modify what's necessary for the enhancement
2. **Follow Patterns**: Match existing code style and patterns
3. **No Breaking Changes**: Ensure backward compatibility unless explicitly required
4. **Output Checkpoints**: After each significant change:
   ```
   <checkpoint>[file]: [what was enhanced]</checkpoint>
   ```

Implementation order:
1. Backend changes (if any) - services, controllers, DTOs
2. Frontend changes - components, hooks, pages
3. Configuration changes (if any)

Output: `<ralph-complete>Enhanced [N] files</ralph-complete>`

---

### Phase 4: Testing (MANDATORY)

**All enhancements MUST include comprehensive tests across ALL applicable test types.**

#### 4.1 Unit Tests (REQUIRED)
```bash
cd /Users/omsingh0/code/b2b/b2b-web
pnpm test -- --testPathPattern="[component-name]" --coverage
```
- Write new unit tests for enhanced functionality
- Update existing tests if behavior changed
- Ensure >80% coverage on changed code
- **Location**: Co-located `[component].test.tsx` or `packages/[pkg]/src/__tests__/`

#### 4.2 Feature Tests (REQUIRED)
```bash
pnpm test -- --testPathPattern="[feature]"
```
- Test enhanced feature behavior end-to-end
- Update existing feature tests for new behavior
- Test new edge cases introduced by enhancement
- **Location**: `apps/[app]/src/__tests__/[feature]/[feature].test.tsx`

#### 4.3 Regression Tests (REQUIRED)
```bash
pnpm test  # Run all tests
```
- Verify ALL existing tests still pass
- No regression in related functionality
- No decrease in overall coverage

#### 4.4 Integration Tests (if API hook/client affected)
```bash
pnpm test -- --testPathPattern="[api-hook]"
```
- Test enhanced API integration
- Verify backward compatibility
- Test new API response handling

#### 4.5 E2E Tests (REQUIRED if user flow affected)
```bash
pnpm test:e2e -- --spec="[related-spec]"
```
- Test complete user journey with enhancement
- Update existing E2E tests for new behavior
- **Location**: `apps/[app]/src/e2e/specs/[flow].e2e.spec.ts`

#### 4.6 Accessibility Tests (REQUIRED if UI enhanced)
```bash
pnpm test:a11y -- --spec="[page]"
```
- Run axe-core on enhanced components
- Verify enhancement doesn't break a11y
- Test keyboard navigation if enhanced
- Test screen reader compatibility
- **Location**: `a11y/[page].a11y.spec.ts`

#### 4.7 Visual Regression Tests (if UI enhanced)
- Update Storybook stories for enhanced components
- Add new stories for new states/variants
- **Location**: `packages/ui/src/components/[component].stories.tsx`

#### 4.8 Performance Tests (if performance-related enhancement)
```bash
pnpm lighthouse -- --url="[affected-page]"
```
- Verify enhancement improves (or doesn't degrade) performance
- Check bundle size impact
- Monitor Core Web Vitals:
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

#### 4.9 Security Tests (if security-related enhancement)
- Test for XSS if adding user input handling
- Test for auth bypass if enhancing protected features
- Verify no sensitive data exposure

**Test Coverage Requirements**:
- Changed code must have >80% coverage
- No decrease in overall coverage
- All existing tests must continue to pass
- New tests must cover all enhancement scenarios

**Test Checklist** (update in PRD):
```markdown
### Tests Added/Updated
- [ ] Unit test: `[file]` - Tests [enhanced functionality]
- [ ] Feature test: `[file]` - Tests [user flow]
- [ ] E2E test: `[file]` - Tests [critical path]
- [ ] A11y test: Verified no regressions
- [ ] Visual test: Stories updated
- [ ] Performance: Verified no degradation
- [ ] Security: [describe test] (if applicable)
- [ ] Regression: All [X] existing tests pass
```

Output: `<testing-complete>Unit: [X tests, Y% cov], Feature: [pass/fail], Regression: [X tests pass], E2E: [pass/fail/N/A], A11y: [pass/fail/N/A], Perf: [pass/fail/N/A], Security: [pass/fail/N/A]</testing-complete>`

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

3. **Functional Verification** (test the enhancement):
   ```bash
   TOKEN=$(jq -r .accessToken /tmp/auth.json)
   curl -s "http://localhost:3000/api/v1/[endpoint]" -H "Authorization: Bearer $TOKEN" | jq
   ```

4. **Regression Check**: Verify existing functionality still works

All builds and tests must pass. If they fail, go back to Phase 3/4 and fix.

Output: `<verification-complete>All builds and tests pass</verification-complete>`

---

### Phase 6: Completion

1. **Update Enhancement PRD**: Add resolution section at the end:
   ```markdown
   ---

   ## Resolution ([date])

   ### Implementation Summary
   [What was actually implemented]

   ### Changes Made
   1. **[Component]** (`[file path]`):
      - [What was changed]

   2. **[Component]** (`[file path]`):
      - [What was changed]

   ### Tests Added/Updated
   | Test Type | File | Description |
   |-----------|------|-------------|
   | Unit | `[file]` | [enhanced functionality] |
   | Feature | `[file]` | [user flow tests] |
   | E2E | `[file]` | [critical path tests] |
   | A11y | `[file]` | [accessibility tests] |
   | Visual | `[file]` | [Storybook stories] |
   | Performance | N/A | [verified/not applicable] |
   | Security | N/A | [verified/not applicable] |

   ### Test Results
   - Unit Tests: PASS ([X] tests, [Y]% coverage)
   - Feature Tests: PASS ([X] tests)
   - Regression Tests: PASS ([X] existing tests)
   - E2E Tests: PASS/N/A
   - Accessibility: PASS/N/A (0 violations)
   - Performance: PASS/N/A (LCP/FID/CLS within limits)
   - Security: PASS/N/A

   ### Backward Compatibility
   - [Confirmed: no breaking changes / List any breaking changes]

   ### Verification
   - [How it was verified]
   - Status: **COMPLETE**
   ```

2. **Check off Completion Criteria**: Mark all criteria as `[x]` in the PRD

3. **Final Summary**: Output a summary of what was enhanced

Output:
```
<enhancement-complete>
ENH-XXX: [Title]
Original PRD: [PRD-XXX or Legacy]
Summary: [Brief description]
Files Modified:
- [file1]
- [file2]
Tests Added/Updated:
- [test1]
- [test2]
Backward Compatible: Yes/No
Status: COMPLETE
</enhancement-complete>
```

---

## Important Rules

- **Do NOT skip Context Detection** - always check this enhances existing code
- **Do NOT create new features** - if this is new functionality, redirect to /feature
- **Do NOT ask for permission between phases** - run the entire workflow automatically
- **Do NOT skip LISA phase** - always understand current behavior before changing
- **Do NOT skip Testing phase** - all enhancements MUST have tests
- **Do NOT break existing functionality** - enhancements should be additive
- **Use TodoWrite** to track progress through phases
- **If blocked**, output: `<blocked>[reason]</blocked>` and stop

## Begin

Start Phase 0: Context Detection - verify this enhances existing functionality.
