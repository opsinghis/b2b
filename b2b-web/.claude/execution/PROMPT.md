# Ralph Loop Execution Prompt - B2B Web

> **CRITICAL**: Memory = Files + Git, NOT context window.
> You may lose context at ANY time. Checkpoint frequently.

---

## STEP 0: Read State (ALWAYS FIRST)

```bash
cat .claude/execution/state.json
cat .claude/execution/blockers.json | jq '.active_blockers'
git log --oneline -15
git diff --stat HEAD~1 2>/dev/null || echo "First commit"
```

**Parse the state carefully:**
- `current.prd_item` → What you're working on
- `subtasks.checklist` → What's done, what's next
- `test_gates` → Which tests have passed
- `checkpoints.last_commit_sha` → Your last checkpoint

---

## STEP 1: Understand Context from Git

**Your memory is in git, not your context window.**

```bash
# See what previous iterations accomplished
git log --oneline -20

# See detailed changes from last iteration
git show --stat HEAD

# If subtasks exist, see what's checked off
cat .claude/execution/state.json | jq '.subtasks'
```

**NEVER assume you remember what you did. READ THE FILES.**

---

## STEP 2: Plan Subtasks (if not already done)

If `subtasks.checklist` is empty for current PRD:

1. Read `prd.json` for acceptance criteria
2. Break into atomic subtasks (max 30 min each)
3. Update state.json with checklist

```json
{
  "subtasks": {
    "prd_item": "PRD-030",
    "total": 6,
    "completed": 0,
    "current_subtask": "Create Button component",
    "checklist": [
      { "id": 1, "task": "Create Button component with variants", "status": "pending" },
      { "id": 2, "task": "Write Button unit tests", "status": "pending" },
      { "id": 3, "task": "Create Button Storybook story", "status": "pending" },
      { "id": 4, "task": "Create Input component", "status": "pending" },
      { "id": 5, "task": "Write Input unit tests", "status": "pending" },
      { "id": 6, "task": "Create Input Storybook story", "status": "pending" }
    ]
  }
}
```

---

## STEP 3: Work on ONE Subtask

1. Pick the first `pending` subtask
2. Implement it completely
3. Write tests for it
4. **CHECKPOINT** (see below)

**NEVER work on multiple subtasks before checkpointing.**

---

## STEP 4: CHECKPOINT (After EVERY Subtask)

**This is critical for surviving context compaction.**

### 4.1 Update state.json

```bash
# Mark subtask complete, update counters
jq '.subtasks.checklist[0].status = "completed" |
    .subtasks.completed += 1 |
    .subtasks.current_subtask = "Next subtask name" |
    .checkpoints.checkpoint_count += 1 |
    .checkpoints.last_checkpoint = (now | todate)' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

### 4.2 Git Commit (YOUR MEMORY)

```bash
git add -A
git commit -m "checkpoint(PRD-XXX): Subtask N of M complete

Completed: [what was done]
Next: [what's next]
Tests: [pass/fail count]
Coverage: [X%]

Subtask: N/M
Status: in_progress
"
```

### 4.3 Update checkpoint SHA

```bash
SHA=$(git rev-parse HEAD)
jq --arg sha "$SHA" '.checkpoints.last_commit_sha = $sha' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Commit IMMEDIATELY after completing each subtask. Don't batch.**

---

## STEP 5: Test Gates (ALL MUST PASS)

**No PRD completion without ALL test gates green.**

### 5.1 Unit Tests (Vitest)
```bash
pnpm test
pnpm test --coverage

# Update state with results
jq '.test_gates.unit = {"status": "passed", "passed": X, "failed": 0, "coverage": Y}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** 80%+ coverage for packages/ui, 0 failures

### 5.2 Component Tests (Testing Library)
```bash
pnpm --filter ui test

# Update state
jq '.test_gates.component = {"status": "passed", "passed": X, "failed": 0}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** All component tests pass

### 5.3 E2E Tests (Playwright)
```bash
pnpm test:e2e

# Update state
jq '.test_gates.e2e = {"status": "passed", "passed": X, "failed": 0}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** All E2E tests pass

### 5.4 Visual Regression Tests
```bash
pnpm test:visual

# Update state
jq '.test_gates.visual = {"status": "passed", "snapshots_updated": 0}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** No unintended visual changes

### 5.5 Accessibility Tests
```bash
pnpm test:a11y

# Update state
jq '.test_gates.a11y = {"status": "passed", "violations": 0}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** Zero a11y violations (WCAG 2.1 AA)

---

## STEP 6: Output Signals

### PRD Complete (ALL criteria met + ALL tests pass)

**Only output this when:**
- [ ] All subtasks in checklist are `completed`
- [ ] `test_gates.unit.status` = "passed"
- [ ] `test_gates.component.status` = "passed"
- [ ] `test_gates.e2e.status` = "passed"
- [ ] `test_gates.visual.status` = "passed" (if applicable)
- [ ] `test_gates.a11y.status` = "passed"

```
<promise>COMPLETE:PRD-XXX</promise>
```

### Still Working (Subtasks remain)

```
<checkpoint>PRD-XXX: Subtask N/M complete. Continuing.</checkpoint>
```

### Blocked (Cannot proceed)

```
<blocked>Clear description of what's blocking progress</blocked>
```

### Need Clarification

```
<clarification>Specific question about requirements</clarification>
```

---

## RECOVERY: If Context Was Lost

**Signs you lost context:**
- You don't remember what you were doing
- State shows work in progress but you have no memory of it

**Recovery steps:**
1. Read `state.json` completely
2. Read last 5 git commits with `git log -5 --stat`
3. Check `subtasks.current_subtask` to know what's next
4. Continue from where git says you left off

**NEVER start over. NEVER redo completed work.**

---

## FORBIDDEN Actions

- [ ] **NEVER** claim completion without ALL tests passing
- [ ] **NEVER** skip checkpointing after subtasks
- [ ] **NEVER** work from memory - always read state files
- [ ] **NEVER** batch multiple subtasks before committing
- [ ] **NEVER** hallucinate test results - run the actual tests
- [ ] **NEVER** mark tests as passed without running them

---

## Test Commands Reference

```bash
# Unit tests (Vitest)
pnpm test
pnpm test --coverage

# Component tests
pnpm --filter ui test

# E2E tests (Playwright)
pnpm test:e2e
pnpm --filter admin test:e2e
pnpm --filter portal test:e2e

# Visual regression
pnpm test:visual

# Accessibility
pnpm test:a11y

# All tests
pnpm test:all

# Storybook (for visual testing)
pnpm --filter ui storybook
```

---

## API Client Regeneration

If backend API changed:
```bash
# Copy latest OpenAPI spec from backend
cp ../b2b-api/openapi.json packages/api-client/

# Regenerate client
pnpm --filter api-client generate
```

---

## BEGIN

Read `.claude/execution/state.json` now and continue from where you left off.
