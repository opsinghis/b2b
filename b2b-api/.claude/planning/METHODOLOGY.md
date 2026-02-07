# Hybrid Lisa/Ralph Methodology Execution Guide

> How to apply planning-first (Lisa) and iteration-first (Ralph) approaches at each phase.

---

## Building from Scratch

**Everything is generated from PRDs.** No templates, no pre-built configs.

### What's in `.claude/` folder

```
.claude/
├── CONTEXT.md                    # Living context (updated during build)
├── ralph.sh                      # Build from scratch script
├── dev.sh                        # Development workflow script
├── planning/
│   ├── architecture.md           # System architecture decisions
│   ├── spec.md                   # Feature specifications
│   ├── plan.md                   # Implementation patterns
│   ├── METHODOLOGY.md            # This file
│   ├── data/
│   │   └── cleaned_products.json # Seed data (9,488 products)
│   └── backlog/                  # Development backlog
│       ├── features/             # Feature PRDs
│       ├── bugs/                 # Bug PRDs
│       └── enhancements/         # Enhancement PRDs
├── execution/
│   ├── prd.json                  # Build PRD definitions (32 items)
│   ├── state.json                # Build execution state
│   ├── dev-state.json            # Dev workflow state
│   ├── blockers.json             # Blocker tracking
│   ├── PROMPT.md                 # Build prompt
│   └── DEV-PROMPT.md             # Dev workflow prompt
└── logs/                         # Execution logs
```

### New Engineer Workflow

```bash
# 1. Create empty project folder
mkdir b2b-api && cd b2b-api

# 2. Copy .claude folder from source
cp -r /path/to/.claude .

# 3. Initialize project
./.claude/ralph.sh --init

# 4. Start Ralph Loop - builds EVERYTHING
./.claude/ralph.sh
```

### What PRDs Generate

| PRD | What Gets Created |
|-----|-------------------|
| PRD-000 | package.json, tsconfig.json, eslintrc, prettierrc, nest-cli.json, src/ structure |
| PRD-001 | jest.config.js, test utilities |
| PRD-002 | Integration test setup, testcontainers config, factories |
| PRD-003 | E2E test setup, supertest config |
| PRD-004 | prisma/schema.prisma, seed.ts, migrations |
| PRD-005 | docker/docker-compose.yml (PostgreSQL, Redis, MinIO, Elasticsearch) |
| PRD-006 | Docker services for Temporal, Keycloak |
| PRD-007 | docker/docker-compose.observability.yml (Prometheus, Grafana, Jaeger) |
| PRD-008 | .github/workflows/ci.yml |

### Rebuild from Scratch (Existing Project)

```bash
# Full reset - removes all generated code
./.claude/ralph.sh --full-reset

# Rebuild everything
./.claude/ralph.sh
```

---

## Development Workflow (dev.sh)

After the initial build, use `dev.sh` for ongoing development:

### Two Workflows

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `ralph.sh` | Build from scratch | Initial setup, full rebuild |
| `dev.sh` | Ongoing development | Features, bugs, enhancements |

### Dev Workflow Commands

```bash
# Add new work to backlog
./dev.sh add feature "Product Search with Filters"
./dev.sh add bug "Login fails with special characters"
./dev.sh add enhancement "Improve query performance"

# View backlog
./dev.sh list              # All items
./dev.sh list bugs         # Only bugs
./dev.sh list features     # Only features

# Start working on a PRD
./dev.sh work PRD-030      # Specific PRD
./dev.sh work BUG-001      # Specific bug

# Check status
./dev.sh status
```

### Dev Workflow Phases

```
┌─────────────────────────────────────────────────────────────┐
│  1. LISA PHASE (Planning)                                   │
│     - Read PRD requirements                                 │
│     - Analyze existing codebase                             │
│     - Identify affected files                               │
│     - Plan implementation approach                          │
│     - Define test strategy                                  │
├─────────────────────────────────────────────────────────────┤
│  2. RALPH PHASE (Execution)                                 │
│     - Implement changes                                     │
│     - Write unit tests                                      │
│     - Write integration tests                               │
│     - Write E2E tests                                       │
│     - Checkpoint after each step                            │
├─────────────────────────────────────────────────────────────┤
│  3. VERIFICATION PHASE                                      │
│     - Run ALL existing tests (regression)                   │
│     - Run new tests                                         │
│     - Lint check                                            │
│     - Type check                                            │
│     - Build check                                           │
│     - Security review                                       │
├─────────────────────────────────────────────────────────────┤
│  4. COMPLETION                                              │
│     - Update CONTEXT.md                                     │
│     - Git commit                                            │
│     - Mark PRD complete                                     │
└─────────────────────────────────────────────────────────────┘
```

### PRD Types

| Type | Prefix | Template Location |
|------|--------|-------------------|
| Feature | `PRD-XXX` | `backlog/features/` |
| Bug | `BUG-XXX` | `backlog/bugs/` |
| Enhancement | `ENH-XXX` | `backlog/enhancements/` |

### Testing Requirements

Every PRD MUST include tests:

```json
{
  "testing": {
    "unit": [
      "Test case descriptions..."
    ],
    "integration": [
      "Integration test descriptions..."
    ],
    "e2e": [
      "E2E test descriptions..."
    ],
    "performance": [
      "Performance requirements..."
    ],
    "security": [
      "Security requirements..."
    ]
  }
}
```

### Verification Checklist

Before marking complete, dev.sh verifies:

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ All E2E tests pass
- ✅ All EXISTING tests pass (regression)
- ✅ Lint passes
- ✅ TypeScript compiles
- ✅ Build succeeds

---

## Core Principle

```
Early Phases  →  Lisa-Heavy (plan thoroughly, execute carefully)
Later Phases  →  Ralph-Heavy (patterns established, iterate quickly)
```

The shift happens because:
- Early phases define architecture, patterns, and conventions
- Later phases apply those patterns to new domains
- Mistakes in foundations are expensive; mistakes in features are cheap

---

## Phase Execution Matrix

| Phase | Weight | Lisa Activities | Ralph Activities |
|-------|--------|-----------------|------------------|
| **Phase 0: Foundation** | 70% Lisa / 30% Ralph | Architecture decisions, testing strategy, conventions | Scaffold execution |
| **Phase 1: Core Infra** | 50% Lisa / 50% Ralph | Security design, auth patterns, tenant isolation | Implementation of defined patterns |
| **Phase 2: Core Modules** | 30% Lisa / 70% Ralph | Data model review | CRUD implementation, tests |
| **Phase 3: Business** | 40% Lisa / 60% Ralph | Workflow design, state machines | Feature implementation |
| **Phase 4: Platform** | 30% Lisa / 70% Ralph | Integration patterns | Module implementation |
| **Phase 5: Agentic** | 60% Lisa / 40% Ralph | Agent architecture, tool design | Tool implementation |

---

## How to Apply Lisa (Planning Phase)

### When to Use Lisa Mode

1. **Before starting a new phase** — Review spec.md, plan.md for that phase
2. **Before architectural PRD items** — PRD-008 (tenancy), PRD-010 (auth), PRD-026 (agents)
3. **When patterns are undefined** — First module of a type establishes the pattern
4. **When security is involved** — Auth, authorization, data isolation

### Lisa Mode Activities

```
1. READ existing documentation
   - spec.md for requirements
   - plan.md for patterns
   - architecture.md for context
   - Existing code for conventions

2. ANALYZE the problem space
   - What decisions need to be made?
   - What are the trade-offs?
   - What patterns apply?

3. DOCUMENT decisions before coding
   - Update plan.md if new pattern
   - Add clarifications to spec.md
   - Note constraints in PRD item

4. REVIEW with human (if needed)
   - Phase boundaries are natural checkpoints
   - Security-sensitive items need review
```

### Lisa Artifacts to Produce

For **Lisa-heavy PRD items**, produce these before coding:

```markdown
## PRD-XXX: [Title] — Lisa Analysis

### Decisions Made
- [ ] Decision 1: [choice] because [reason]
- [ ] Decision 2: [choice] because [reason]

### Patterns to Follow
- Pattern from plan.md: [section]
- Similar implementation: [file path]

### Risks Identified
- Risk 1: [description] → Mitigation: [approach]

### Test Strategy
- Unit: [what to test]
- Integration: [what to test]
- E2E: [what to test]

### Ready for Ralph Execution: YES/NO
```

---

## How to Apply Ralph (Execution Phase)

### When to Use Ralph Mode

1. **After Lisa analysis is complete** — Decisions documented
2. **For well-defined PRD items** — Clear completion criteria
3. **For pattern-following items** — Second+ module of a type
4. **For test-driven items** — Tests define success

### Ralph Mode Activities

```
1. READ the PRD item
   - Completion criteria = definition of done
   - Constraints = boundaries
   - Dependencies = prerequisites

2. IMPLEMENT incrementally
   - One completion criterion at a time
   - Write test → write code → verify
   - Commit after each significant step

3. VERIFY before marking complete
   - All tests pass
   - Coverage thresholds met
   - No linting errors

4. OUTPUT completion promise
   - Only when ALL criteria met
```

### Ralph Iteration Pattern

```bash
# Each iteration follows this loop:
while not complete:
    1. Check progress.txt for current state
    2. Read PRD item for next criterion
    3. Implement the criterion
    4. Run tests to verify
    5. Commit if passing
    6. Update progress.txt
    7. Check if all criteria met
    8. If yes → output <promise>COMPLETE:PRD-XXX</promise>
    9. If no → continue to next criterion
```

---

## Phase-by-Phase Execution Guide

### Phase 0: Foundation (70% Lisa / 30% Ralph)

**Lisa Activities (Do First):**
```
□ Review architecture.md for infrastructure decisions
□ Document testing strategy in plan.md
□ Define directory structure conventions
□ Specify environment variable requirements
□ Design Docker Compose topology
□ Plan CI/CD pipeline stages
```

**Ralph Activities (Execute After):**
```
□ PRD-001: Scaffold NestJS project
□ PRD-002-004: Set up testing infrastructure
□ PRD-005: Configure Prisma
□ PRD-006: Create Docker Compose
□ PRD-007: Configure CI pipeline
```

**Human Checkpoint:** Review testing infrastructure before Phase 1

---

### Phase 1: Core Infrastructure (50% Lisa / 50% Ralph)

**Lisa Activities (Do First):**
```
□ Design tenant isolation strategy (middleware + RLS)
□ Document JWT token structure and claims
□ Define RBAC roles and permissions matrix
□ Specify audit log schema and retention
□ Plan error response format
```

**Ralph Activities (Execute After):**
```
□ PRD-008: Implement tenant middleware
□ PRD-009: Configure RLS policies
□ PRD-010-011: Implement auth endpoints
□ PRD-012: Configure CASL authorization
□ PRD-013: Implement audit logging
□ PRD-014: Set up error handling
```

**Human Checkpoint:** Security review of auth and tenant isolation

---

### Phase 2: Core Modules (30% Lisa / 70% Ralph)

**Lisa Activities (Lighter):**
```
□ Review entity relationships in Prisma schema
□ Confirm CRUD patterns from plan.md
□ Verify tenant scoping on all entities
```

**Ralph Activities (Primary):**
```
□ PRD-015: Tenants CRUD (establishes pattern)
□ PRD-016: Organizations CRUD (follows pattern)
□ PRD-017: Users CRUD (follows pattern)
```

**Note:** PRD-015 is the "pattern setter" — extra care here. PRD-016 and PRD-017 follow the established pattern.

---

### Phase 3: Business Modules (40% Lisa / 60% Ralph)

**Lisa Activities:**
```
□ Design contract state machine (draft→active→expired)
□ Design quote workflow and approval thresholds
□ Document pricing calculation rules
□ Define approval chain evaluation logic
```

**Ralph Activities:**
```
□ PRD-018: Contracts CRUD
□ PRD-019: Contracts workflow (uses state machine design)
□ PRD-020: Quotes module
□ PRD-021: Catalog module
□ PRD-022: Approvals module
```

**Human Checkpoint:** Review workflow state machines before implementation

---

### Phase 4: Platform Modules (30% Lisa / 70% Ralph)

**Lisa Activities (Light):**
```
□ Define notification channel priorities
□ Specify file storage conventions (bucket/prefix)
□ Plan dashboard KPI calculations
```

**Ralph Activities (Primary):**
```
□ PRD-023: Notifications module
□ PRD-024: Files module
□ PRD-025: Dashboard module
```

---

### Phase 5: Agentic Layer (60% Lisa / 40% Ralph)

**Lisa Activities (Heavy — New Domain):**
```
□ Design tool registration pattern
□ Define agent authentication mechanism
□ Specify task execution lifecycle
□ Plan rate limiting strategy
□ Document observability requirements
```

**Ralph Activities:**
```
□ PRD-026: Tool registry
□ PRD-027: Agent orchestrator
```

**Human Checkpoint:** Agent architecture review before implementation

---

## Shifting the Balance

### Signs You Need More Lisa

- Multiple failed Ralph iterations (>5 without progress)
- Unclear how to implement a criterion
- Conflicting patterns in codebase
- Security or data integrity concerns
- Cross-cutting concerns affecting multiple modules

### Signs You Need More Ralph

- Clear patterns already established
- Similar module exists to copy from
- Tests clearly define expected behavior
- PRD item is straightforward CRUD
- You're "overthinking" before writing code

---

## Context Preservation

### Purpose

The `.claude/CONTEXT.md` file is a **living document** that preserves application understanding between sessions, reducing context-building time and token usage significantly.

### MANDATORY: Update After Every Change

**Claude MUST update CONTEXT.md after completing ANY work:**

| Change Type | What to Update |
|-------------|----------------|
| **New Feature** | Recent Changes, Module Inventory (if new module), Changelog |
| **Bug Fix** | Recent Changes, remove from Known Issues, Changelog |
| **Improvement** | Recent Changes, relevant sections, Changelog |
| **New Entity** | Database Schema Summary, Module Inventory |
| **Architecture Change** | Key Architecture Decisions, Changelog |
| **Test Changes** | Test Infrastructure (update counts) |

### Sections to Maintain

```markdown
## 🚀 Recent Changes (Last 5)
- Quick view of latest work
- Keep only last 5 entries (move older to Changelog)

## 🔄 In Progress
- What is currently being worked on
- Add when starting, remove when complete

## 🐛 Known Issues / Tech Debt
- Bugs discovered but not yet fixed
- Technical debt to address later

## 📋 Changelog
- Full history of all changes
- Grouped by date with categories (Features, Bug Fixes, Improvements)
```

### Session Start Protocol

Every new Claude session should:
1. **Read `.claude/CONTEXT.md` first** — Immediate application understanding
2. Read `CLAUDE.md` — Project overview and commands
3. Check `state.json` — Current execution state
4. Only explore codebase if CONTEXT.md is outdated

### Session End Protocol

Before ending a session, Claude should:
1. Update "Recent Changes" with work completed
2. Update "Changelog" with detailed entry
3. Update "In Progress" (clear completed items)
4. Update any relevant sections (modules, schema, etc.)
5. Update "Last Updated" date at top

---

## Post-Build: Features, Bugs, and Enhancements

After the initial build is complete, the methodology shifts to tracking ongoing work.

### Adding New Features

1. **Create a new PRD item** in `prd.json`:
```json
{
  "id": "PRD-029",
  "title": "Feature: User Notifications Preferences",
  "module": "platform/notifications",
  "type": "feature",
  "priority": "P1",
  "completion_criteria": [
    "User can configure notification channels (email, in-app)",
    "Preferences stored in User model",
    "CRUD endpoints for preferences",
    "Unit tests: >80% coverage"
  ],
  "dependencies": ["PRD-024"],
  "max_iterations": 8,
  "status": "pending"
}
```

2. **Update state.json** to queue the new PRD
3. **Run Ralph Loop** or work on it manually
4. **Update CONTEXT.md** with the new feature

### Fixing Bugs

1. **Add to Known Issues** in CONTEXT.md when discovered:
```markdown
| BUG-001 | Bug | Login fails with special chars in password | P0 | auth |
```

2. **Create a PRD item** for the fix:
```json
{
  "id": "BUG-001",
  "title": "Bug: Login fails with special characters",
  "module": "core/auth",
  "type": "bugfix",
  "priority": "P0",
  "completion_criteria": [
    "Passwords with !@#$%^&*() work correctly",
    "Regression test added",
    "Fix verified in integration test"
  ],
  "dependencies": [],
  "max_iterations": 3,
  "status": "pending"
}
```

3. **After fixing**, remove from Known Issues and add to Changelog

### Enhancements

1. **Create enhancement PRD**:
```json
{
  "id": "ENH-001",
  "title": "Enhancement: Improve query performance",
  "module": "business/quotes",
  "type": "enhancement",
  "priority": "P2",
  "completion_criteria": [
    "Add database indexes for common queries",
    "Query time reduced by 50%",
    "No regression in existing tests"
  ],
  "dependencies": [],
  "max_iterations": 5,
  "status": "pending"
}
```

### PRD Naming Convention

| Prefix | Type | Example |
|--------|------|---------|
| `PRD-XXX` | Initial build items | PRD-000 to PRD-028 |
| `PRD-0XX` | New features (post-build) | PRD-029, PRD-030 |
| `BUG-XXX` | Bug fixes | BUG-001, BUG-002 |
| `ENH-XXX` | Enhancements | ENH-001, ENH-002 |

### Tracking in CONTEXT.md

All work is tracked in CONTEXT.md:

```markdown
## 🚀 Recent Changes (Last 5)
| 2026-02-08 | Feature | Added notification preferences | PRD-029 |
| 2026-02-08 | Bug Fix | Fixed login with special chars | BUG-001 |

## 📋 Changelog
### 2026-02-08 — Post-Build Improvements
**Features:**
- ✅ PRD-029: User notification preferences

**Bug Fixes:**
- 🐛 BUG-001: Login with special characters
```

---

## Integration with Progress Tracking

### Before Each PRD Item

```markdown
## PRD-XXX Pre-Flight Check

### Lisa Analysis Required: [YES/NO]

If YES:
- [ ] Decisions documented
- [ ] Patterns identified
- [ ] Risks mitigated
- [ ] Ready for Ralph execution

### Ralph Execution Mode:
- [ ] All dependencies complete
- [ ] Completion criteria clear
- [ ] Test strategy defined
- [ ] Starting iteration...
```

### Update progress.txt

```markdown
### PRD-XXX: [Title]
- **Mode**: Lisa → Ralph
- **Lisa Complete**: [timestamp]
- **Ralph Iterations**: [count]
- **Status**: [PENDING/IN_PROGRESS/COMPLETE]
- **Notes**: [learnings, blockers, decisions]
```

---

## Quick Reference

### Lisa Checklist
- [ ] Read spec.md section
- [ ] Read plan.md patterns
- [ ] Document decisions
- [ ] Identify risks
- [ ] Confirm ready for execution

### Ralph Checklist
- [ ] Read PRD item
- [ ] Check dependencies complete
- [ ] Implement criterion by criterion
- [ ] Run tests after each step
- [ ] Commit working code
- [ ] Update progress.txt
- [ ] Output completion promise when done

---

## Anti-Patterns to Avoid

### Lisa Anti-Patterns
- Over-planning simple CRUD operations
- Analysis paralysis on established patterns
- Waiting for "perfect" design
- Skipping to coding without any analysis on architectural items

### Ralph Anti-Patterns
- Starting complex items without any planning
- Ignoring failing tests to "finish faster"
- Not reading existing patterns before coding
- Spinning on unclear requirements instead of documenting blockers
