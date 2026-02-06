# Ralph Loop Execution Prompt - B2B API

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
    "prd_item": "PRD-001",
    "total": 5,
    "completed": 0,
    "current_subtask": "Create NestJS project scaffold",
    "checklist": [
      { "id": 1, "task": "Create NestJS project scaffold", "status": "pending" },
      { "id": 2, "task": "Configure TypeScript strict mode", "status": "pending" },
      { "id": 3, "task": "Add ESLint + Prettier", "status": "pending" },
      { "id": 4, "task": "Setup Jest for testing", "status": "pending" },
      { "id": 5, "task": "Create initial health endpoint", "status": "pending" }
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
# Example using jq:
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

### 5.1 Unit Tests
```bash
npm run test
npm run test:cov

# Update state with results
jq '.test_gates.unit = {"status": "passed", "passed": X, "failed": 0, "coverage": Y}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** 80%+ coverage, 0 failures

### 5.2 Integration Tests
```bash
npm run test:integration

# Update state
jq '.test_gates.integration = {"status": "passed", "passed": X, "failed": 0}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** All integration tests pass

### 5.3 E2E Tests
```bash
npm run test:e2e

# Update state
jq '.test_gates.e2e = {"status": "passed", "passed": X, "failed": 0}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** All E2E tests pass

### 5.4 Performance Tests (When applicable)
```bash
npm run test:perf

# Update state with p95 latency
jq '.test_gates.performance = {"status": "passed", "p95_ms": X, "threshold_ms": 200}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** p95 < 200ms for API endpoints

### 5.5 Load Tests (When applicable)
```bash
npm run test:load

# Update state
jq '.test_gates.load = {"status": "passed", "rps": X, "error_rate": Y}' \
    .claude/execution/state.json > tmp.json && mv tmp.json .claude/execution/state.json
```

**Requirement:** Error rate < 1% under load

---

## STEP 6: Output Signals

### PRD Complete (ALL criteria met + ALL tests pass)

**Only output this when:**
- [ ] All subtasks in checklist are `completed`
- [ ] `test_gates.unit.status` = "passed"
- [ ] `test_gates.integration.status` = "passed"
- [ ] `test_gates.e2e.status` = "passed"
- [ ] `test_gates.performance.status` = "passed" (if applicable)
- [ ] `test_gates.load.status` = "passed" (if applicable)

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
# Unit tests with coverage
npm run test
npm run test:cov

# Integration tests (requires Docker)
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# Performance tests
npm run test:perf

# Load tests (k6)
npm run test:load
```

---

## BEGIN

Read `.claude/execution/state.json` now and continue from where you left off.
