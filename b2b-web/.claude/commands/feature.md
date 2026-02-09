# Feature Command

You are implementing a new feature using the LISA/RALPH methodology. The user has provided:

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
   grep -r -l "[keywords]" apps/portal/src/ packages/ 2>/dev/null | head -20

   # Check for similar components/pages
   ls -la apps/portal/src/app/[related-path]/ 2>/dev/null
   ```

3. **Analyze PRD Items**: Read `.claude/execution/prd.json` thoroughly
   - List all existing PRD items and their descriptions
   - Identify if this feature overlaps with any existing PRD item
   - Check completion status of related items

4. **Decision Logic**:
   - If **duplicate feature exists** (same functionality):
     ```
     <duplicate>
     FE-XXX or PRD-XXX already implements this feature.
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

1. Determine the next feature number by checking `.claude/planning/backlog/features/` for existing FE-XXX files
2. Parse the feature description to extract:
   - Short description (for filename)
   - Target module (new or existing)
   - Priority (P1=critical, P2=high, P3=medium, P4=low)
3. Create a new feature PRD file: `.claude/planning/backlog/features/FE-XXX-short-description.md`

Use this template:
```markdown
# FE-XXX: [Title]

## Summary
[Brief description of the feature]

## Priority
**P[1-4]** - [Reason]

## Module
`[module path - new or existing]`

## Type
Feature

## Context Check
- Duplicate Check: PASSED (no existing feature)
- Enhancement Check: PASSED (this is new functionality)
- Related PRDs: [list any related PRD items or "None"]

---

## API Dependencies

### Required Endpoints
| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | /api/v1/... | Exists/Missing | |
| POST | /api/v1/... | Exists/Missing | |

### API Blockers
[None or list missing endpoints that must be created first]

---

## LISA Analysis

### Requirements
1. [Functional requirement 1]
2. [Functional requirement 2]
...

### User Stories
- As a [user], I want to [action] so that [benefit]
...

### Files to Create
- `[file1]` - [purpose]
- `[file2]` - [purpose]
...

### Files to Modify
- `[file1]` - [what changes]
- `[file2]` - [what changes]
...

### UI Components
- [Component 1]: [purpose]
- [Component 2]: [purpose]
...

### State Management
- [How state will be managed - React Query, Context, etc.]
- [What data needs to be cached]

### Implementation Approach
1. [Step 1]
2. [Step 2]
...

### Risks Identified
- Risk 1: [description] → Mitigation: [solution]
- Risk 2: [description] → Mitigation: [solution]

### Test Strategy
- Unit: [test approach for each component/service]
- Integration: [API integration tests]
- E2E: [user flow tests]

---

## Completion Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] All API endpoints working
- [ ] UI renders correctly
- [ ] Build passes
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] E2E tests pass
...

## Testing Requirements
- [ ] **Unit tests** for ALL new components (REQUIRED)
- [ ] **Unit tests** for ALL new services/hooks (REQUIRED)
- [ ] **Feature tests** for ALL user stories (REQUIRED)
- [ ] **Integration tests** for API hooks (REQUIRED if API)
- [ ] **E2E tests** for ALL user flows (REQUIRED)
- [ ] **Accessibility tests** for ALL new pages (REQUIRED)
- [ ] **Visual tests** - Storybook stories for components (REQUIRED)
- [ ] **Performance tests** - Lighthouse for new pages (REQUIRED)
- [ ] **Security tests** if auth/input handling (REQUIRED if applicable)
- [ ] **Regression tests** - no existing tests break (REQUIRED)

## Dependencies
[None or list dependencies]

## Max Iterations
10
```

Output: `<phase-1-complete>FE-XXX created</phase-1-complete>`

---

### Phase 2: Check API Dependencies

Before proceeding, verify all required APIs exist:

1. **List Required Endpoints**: Identify all API calls the feature needs
2. **Test Each Endpoint**: Use curl to verify they exist and work
   ```bash
   # Get fresh auth token
   curl -s http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" \
     -d '{"email":"customer@b2b.local","password":"password123"}' > /tmp/auth.json

   # Test endpoints
   TOKEN=$(jq -r .accessToken /tmp/auth.json)
   curl -s "http://localhost:3000/api/v1/[endpoint]" -H "Authorization: Bearer $TOKEN" | jq
   ```
3. **Check Swagger**: Verify endpoint exists in API documentation
   ```bash
   curl -s http://localhost:3000/docs-json | jq '.paths["/api/v1/endpoint"]'
   ```

If any required API is missing:
- Create blocker file: `.claude/planning/backlog/api-blockers/API-XXX-description.md`
- Output: `<blocked>API missing: [endpoint] - [what's needed]</blocked>`
- Stop execution

If all APIs exist, continue to Phase 3.

Output: `<api-check-complete>All [N] required endpoints available</api-check-complete>`

---

### Phase 3: LISA Analysis (Investigation & Planning)

**Do NOT write any code yet.** Only investigate and plan.

1. **Study Existing Patterns**: Look at similar features in the codebase
   - Check how other pages are structured
   - Check how API calls are made (React Query hooks)
   - Check component patterns (forms, lists, cards)

2. **Map the Data Flow**:
   - API response → React Query → Component → UI

3. **Plan Component Hierarchy**:
   ```
   Page
   ├── Header
   ├── MainContent
   │   ├── Component1
   │   └── Component2
   └── Footer
   ```

4. **Identify Reusable Components**: Check `@b2b/ui` for existing components

5. **Plan Test Strategy**: Identify all tests needed
   - Unit tests for each component
   - Integration tests for API hooks
   - E2E tests for user flows

6. **Document Implementation Plan**: Update PRD with detailed approach

Update the Feature PRD with your findings in the "LISA Analysis" section.

Output: `<lisa-complete>Plan: [brief description of implementation approach]</lisa-complete>`

---

### Phase 4: RALPH Execution (Implementation)

Now implement the feature. Follow these rules:

1. **API Layer First** (if creating new hooks):
   - Create React Query hooks in appropriate location
   - Define TypeScript types/interfaces
   - Handle loading, error, success states

2. **Components Second**:
   - Create reusable components if needed
   - Follow existing component patterns
   - Use Tailwind CSS for styling
   - Use components from `@b2b/ui` where possible

3. **Page/Route Third**:
   - Create page component
   - Wire up state management
   - Handle navigation

4. **Output Checkpoints**: After each significant piece:
   ```
   <checkpoint>[file]: [what was created/modified]</checkpoint>
   ```

5. **Follow Project Patterns**:
   - Next.js App Router conventions
   - TypeScript strict mode
   - React Query for server state
   - Tailwind CSS for styling

Output: `<ralph-complete>Created [N] files, modified [M] files</ralph-complete>`

---

### Phase 5: Testing (MANDATORY)

**All new features MUST have comprehensive tests across ALL applicable test types.**

#### 5.1 Unit Tests (REQUIRED for ALL new code)
```bash
cd /Users/omsingh0/code/b2b/b2b-web
pnpm test -- --testPathPattern="[feature-name]" --coverage
```
Requirements:
- Unit test for EVERY new component
- Unit test for EVERY new hook/service
- Test error states and edge cases
- Minimum 80% code coverage
- **Location**: Co-located `[component].test.tsx`

#### 5.2 Feature Tests (REQUIRED)
```bash
pnpm test -- --testPathPattern="[feature]"
```
Requirements:
- Test complete feature behavior
- Test ALL user stories
- Test with mock API responses
- Test error handling
- **Location**: `apps/[app]/src/__tests__/[feature]/[feature].test.tsx`

Create feature test file:
```typescript
/**
 * @feature [feature-name]
 * @priority P[0-2]
 */
describe('[Feature] Tests', () => {
  describe('[User Story 1]', () => {
    it('should [expected behavior]', async () => {
      // Test implementation
    });
  });
});
```

#### 5.3 Integration Tests (REQUIRED if API features)
```bash
pnpm test -- --testPathPattern="[api-hook]"
```
Requirements:
- Test API hook behavior
- Test loading/error/success states
- Test data transformation
- **Location**: `packages/api-client/src/__tests__/`

#### 5.4 E2E Tests (REQUIRED for user-facing features)
```bash
pnpm test:e2e -- --spec="[feature-spec]"
```
Requirements:
- Test complete user journey
- Test navigation flows
- Test form submissions
- Test error scenarios
- Test authentication flows
- **Location**: `apps/[app]/src/e2e/specs/[feature].e2e.spec.ts`

#### 5.5 Accessibility Tests (REQUIRED for UI features)
```bash
pnpm test:a11y -- --spec="[page]"
```
Requirements:
- Run axe-core on ALL new pages/components
- Verify WCAG 2.1 AA compliance
- Test keyboard navigation
- Test screen reader compatibility
- Test color contrast
- **Location**: `a11y/[page].a11y.spec.ts`

**Required a11y checks**:
- [ ] 1.1.1 Non-text Content (images have alt)
- [ ] 1.3.1 Info and Relationships (proper HTML structure)
- [ ] 1.4.3 Contrast Minimum (4.5:1 ratio)
- [ ] 2.1.1 Keyboard Accessible
- [ ] 2.4.1 Bypass Blocks (skip links)
- [ ] 4.1.2 Name, Role, Value (ARIA)

#### 5.6 Visual Regression Tests (REQUIRED for new components)
- Create Storybook stories for ALL new components
- Cover all states/variants
- **Location**: `packages/ui/src/components/[component].stories.tsx`

```typescript
// [component].stories.tsx
export default {
  title: '[Category]/[ComponentName]',
  component: ComponentName,
};

export const Default = {};
export const Loading = { args: { isLoading: true } };
export const Error = { args: { error: 'Error message' } };
export const Empty = { args: { data: [] } };
```

#### 5.7 Performance Tests (REQUIRED for new pages)
```bash
pnpm lighthouse -- --url="[new-page-url]"
```
Requirements:
- Core Web Vitals must meet thresholds:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1
  - TTI (Time to Interactive): < 3.8s
- Lighthouse Performance score: ≥ 90
- Bundle size impact documented

#### 5.8 Security Tests (REQUIRED if auth/input handling)
Requirements:
- Test for XSS vulnerabilities
- Test for CSRF protection
- Test authentication/authorization
- Test input sanitization
- No sensitive data in client-side code
- **Document any security considerations**

#### 5.9 Regression Tests (REQUIRED)
```bash
pnpm test  # Run ALL tests
```
- Verify ALL existing tests still pass
- No regression in related functionality
- No decrease in overall coverage

**Test Coverage Requirements**:
- New code: >80% coverage
- Critical paths: 100% coverage
- All tests must pass
- No a11y violations (critical/serious)
- Performance within thresholds

**Test Checklist** (update in PRD):
```markdown
### Tests Created
| Test Type | File | Description | Status |
|-----------|------|-------------|--------|
| Unit | `[file]` | Component/hook tests | ✅ |
| Feature | `[file]` | User story tests | ✅ |
| E2E | `[file]` | User journey tests | ✅ |
| A11y | `[file]` | WCAG compliance | ✅ |
| Visual | `[file]` | Storybook stories | ✅ |
| Performance | Lighthouse | Core Web Vitals | ✅ |
| Security | Manual | Auth/XSS checks | ✅ |
| Regression | All tests | No regressions | ✅ |
```

Output: `<testing-complete>Unit: [X tests, Y% cov], Feature: [X tests], E2E: [X tests], A11y: [0 violations], Perf: [score], Security: [pass], Regression: [X tests pass]</testing-complete>`

---

### Phase 6: Verification

Run all verification steps:

1. **Backend Build & Tests** (if backend was modified):
   ```bash
   cd /Users/omsingh0/code/b2b/b2b-api && npm run build && npm run test
   ```

2. **Frontend Build & Tests**:
   ```bash
   cd /Users/omsingh0/code/b2b/b2b-web && pnpm build && pnpm test
   ```

3. **TypeScript Check**:
   ```bash
   cd /Users/omsingh0/code/b2b/b2b-web && pnpm tsc --noEmit
   ```

4. **Lint Check**:
   ```bash
   cd /Users/omsingh0/code/b2b/b2b-web && pnpm lint
   ```

5. **Functional Verification**:
   - Test the feature manually if dev server is running
   - Verify API integration works
   - Verify all user stories are satisfied

All checks must pass. If they fail, go back to Phase 4/5 and fix.

Output: `<verification-complete>All builds and tests pass</verification-complete>`

---

### Phase 7: Completion

1. **Update Feature PRD**: Add resolution section at the end:
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

   ### Components Created
   - [Component1]: [purpose]
   - [Component2]: [purpose]

   ### API Integration
   - [Hook1]: [endpoint]
   - [Hook2]: [endpoint]

   ### Tests Created
   | Test Type | File | Description | Coverage |
   |-----------|------|-------------|----------|
   | Unit | `[file]` | Component tests | [X]% |
   | Unit | `[file]` | Hook tests | [X]% |
   | Feature | `[file]` | User story tests | - |
   | E2E | `[file]` | User journey tests | - |
   | A11y | `[file]` | WCAG compliance | 0 violations |
   | Visual | `[file]` | Storybook stories | - |
   | Performance | Lighthouse | Core Web Vitals | Score: [X] |
   | Security | Manual | Auth/XSS checks | PASS |

   ### Test Results
   - Unit Tests: PASS ([X] tests, [Y]% coverage)
   - Feature Tests: PASS ([X] tests)
   - E2E Tests: PASS ([X] tests)
   - Accessibility: PASS (0 critical/serious violations)
   - Performance: PASS (LCP: Xs, FID: Xms, CLS: X.X)
   - Security: PASS (no vulnerabilities)
   - Regression Tests: PASS ([X] existing tests)

   ### Verification
   - [How it was verified]
   - Status: **COMPLETE**
   ```

2. **Check off Completion Criteria**: Mark all criteria as `[x]` in the PRD

3. **Final Summary**: Output a summary of what was implemented

Output:
```
<feature-complete>
FE-XXX: [Title]
Summary: [Brief description]
Files Created:
- [file1]
- [file2]
Files Modified:
- [file3]
Tests Created:
- [test1]
- [test2]
Test Coverage: [X]%
Status: COMPLETE
</feature-complete>
```

---

## Important Rules

- **Do NOT skip Deduplication Check** - always verify this is a NEW feature
- **Do NOT implement enhancements as features** - redirect to /enhance if appropriate
- **Do NOT ask for permission between phases** - run the entire workflow automatically
- **Do NOT skip API check** - verify all required endpoints exist before implementing
- **Do NOT skip LISA phase** - always plan before implementing
- **Do NOT skip Testing phase** - all features MUST have comprehensive tests
- **Follow existing patterns** - match the codebase style exactly
- **Use TodoWrite** to track progress through phases
- **If blocked**, output: `<blocked>[reason]</blocked>` and stop

## Common Blockers

- **Duplicate Feature**: Feature already exists → Inform user and stop
- **Enhancement Not Feature**: This improves existing functionality → Redirect to /enhance
- **Missing API**: Required endpoint doesn't exist → Create API blocker and stop
- **Missing Component**: Need UI component that doesn't exist → Create it as part of feature
- **Breaking Change**: Feature would break existing functionality → Document and proceed carefully
- **Build/Test Failure**: Code doesn't compile or tests fail → Fix before continuing

## Begin

Start Phase 0: Deduplication & Context Detection - verify this is a new feature.
