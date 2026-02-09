# Claude Code Slash Commands

This directory contains custom slash commands for the B2B project development workflow.

## Overview

All commands follow the **LISA/RALPH** methodology:
- **LISA** (Look, Investigate, Strategize, Analyze) - Planning phase, no code changes
- **RALPH** (Rapid Application Loop for Production Hardening) - Implementation phase with checkpoints

## Key Features

### Smart Context Detection
All commands include **Phase 0: Context Detection** which:
- Checks for duplicate PRDs before creating new ones
- Links bugs/enhancements to their original PRD items
- Redirects misclassified requests (e.g., enhancement submitted as feature)
- Prevents duplicate work

### Comprehensive Testing
All commands enforce **mandatory testing**:
- Unit tests (>80% coverage required)
- Integration tests (for API features)
- E2E tests (for user flows)
- Regression tests (no breaking existing functionality)

## Available Commands

| Command | Purpose | PRD Location |
|---------|---------|--------------|
| `/fix-bug` | Fix bugs with root cause analysis | `backlog/bugs/BUG-XXX-*.md` |
| `/enhance` | Improve existing functionality | `backlog/enhancements/ENH-XXX-*.md` |
| `/feature` | Implement new features | `backlog/features/FE-XXX-*.md` |

## Usage

```bash
# Fix a bug
/fix-bug Product images not displaying on catalog page

# Add an enhancement
/enhance Add pagination to the orders list with 20 items per page

# Implement a new feature
/feature Add wishlist functionality allowing users to save products for later
```

## Workflow Phases

### `/fix-bug` Workflow (6 Phases)

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Context Detection | Check for duplicates, link to original PRD |
| 1 | Create Bug PRD | Document bug with LISA analysis template |
| 2 | LISA Analysis | Investigate root cause (NO code changes) |
| 3 | RALPH Execution | Implement the fix |
| 4 | Testing | Unit tests, integration tests, regression tests |
| 5 | Verification | Build both repos, run all tests |
| 6 | Completion | Document resolution, update PRD |

### `/enhance` Workflow (6 Phases)

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Context Detection | Verify this enhances existing code (not new feature) |
| 1 | Create Enhancement PRD | Document with current vs improved behavior |
| 2 | LISA Analysis | Understand current implementation (NO code changes) |
| 3 | RALPH Execution | Implement enhancement |
| 4 | Testing | Unit tests, regression tests, integration tests |
| 5 | Verification | Build both repos, run all tests |
| 6 | Completion | Document changes, verify backward compatibility |

### `/feature` Workflow (7 Phases)

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Deduplication Check | Verify feature doesn't exist, not an enhancement |
| 1 | Create Feature PRD | Document with user stories and requirements |
| 2 | API Dependency Check | Verify all required APIs exist |
| 3 | LISA Analysis | Plan implementation (NO code changes) |
| 4 | RALPH Execution | Implement feature |
| 5 | Testing | Full test suite (unit, integration, E2E) |
| 6 | Verification | Build both repos, run all tests |
| 7 | Completion | Document implementation, test coverage |

## Context Detection Logic

### For `/fix-bug`:
```
If duplicate bug exists → STOP with <duplicate> message
If related to PRD item → Note PRD-XXX in bug report
If new issue → Proceed normally
```

### For `/enhance`:
```
If duplicate enhancement exists → STOP with <duplicate> message
If this is a NEW feature → REDIRECT to /feature with <redirect> message
If enhances existing PRD item → Note PRD-XXX in enhancement
If enhances legacy code → Proceed with "legacy" note
```

### For `/feature`:
```
If duplicate feature exists → STOP with <duplicate> message
If similar feature exists → REDIRECT to /enhance with <similar-exists> message
If truly new → Proceed normally
```

## Testing Requirements

### All Commands Must:
1. **Write unit tests** for new/changed code
2. **Run existing tests** to prevent regressions
3. **Achieve >80% coverage** on new code
4. **Pass all builds** before completion

### Test Types by Command:

| Test Type | `/fix-bug` | `/enhance` | `/feature` |
|-----------|------------|------------|------------|
| Unit Tests | Required | Required | Required |
| Integration Tests | If API affected | If API affected | Required |
| Regression Tests | Required | Required | Required |
| E2E Tests | If user flow | If user flow | Required |
| Coverage | >80% on fix | >80% on changes | >80% on all new |

## PRD Templates

### Bug PRD Structure
```
BUG-XXX-description.md
├── Summary
├── Priority (P1-P4)
├── Affected Module
├── Related PRD (linked to original feature)
├── LISA Analysis
│   ├── Root Cause Investigation
│   ├── Files to Investigate
│   ├── Patterns to Follow
│   ├── Risks Identified
│   └── Test Strategy
├── Completion Criteria
├── Testing Requirements
└── Resolution (added after fix)
    ├── Root Cause
    ├── Fixes Applied
    ├── Tests Added/Updated
    └── Test Results
```

### Enhancement PRD Structure
```
ENH-XXX-description.md
├── Summary
├── Priority (P1-P4)
├── Affected Module
├── Original PRD (linked to feature being enhanced)
├── LISA Analysis
│   ├── Current Behavior
│   ├── Improved Behavior
│   ├── Files to Modify
│   ├── Backward Compatibility
│   └── Test Strategy
├── Completion Criteria
├── Testing Requirements
└── Resolution (added after implementation)
    ├── Implementation Summary
    ├── Changes Made
    ├── Tests Added/Updated
    ├── Test Results
    └── Backward Compatibility Status
```

### Feature PRD Structure
```
FE-XXX-description.md
├── Summary
├── Priority (P1-P4)
├── Module
├── Context Check (duplicate/enhancement verification)
├── API Dependencies
│   ├── Required Endpoints
│   └── API Blockers
├── LISA Analysis
│   ├── Requirements
│   ├── User Stories
│   ├── Files to Create/Modify
│   ├── UI Components
│   ├── State Management
│   └── Test Strategy
├── Completion Criteria
├── Testing Requirements
└── Resolution (added after implementation)
    ├── Implementation Summary
    ├── Files Created/Modified
    ├── Components Created
    ├── API Integration
    ├── Tests Created
    └── Test Results with Coverage
```

## Directory Structure

```
.claude/
├── commands/
│   ├── README.md          # This file
│   ├── fix-bug.md         # Bug fix workflow
│   ├── enhance.md         # Enhancement workflow
│   └── feature.md         # Feature workflow
├── planning/
│   └── backlog/
│       ├── bugs/          # BUG-XXX-*.md files
│       ├── enhancements/  # ENH-XXX-*.md files
│       ├── features/      # FE-XXX-*.md files
│       └── api-blockers/  # API-XXX-*.md files
├── execution/
│   ├── prd.json           # Main PRD with all built features
│   └── dev-state.json     # Current work tracking
└── CONTEXT.md             # Application context summary
```

## Important Rules

1. **Never skip Phase 0** - Context detection prevents duplicates
2. **Never skip LISA phase** - Always investigate before implementing
3. **Never skip Testing phase** - All changes require tests
4. **Never ask permission between phases** - Run entire workflow automatically
5. **Output checkpoints** - Show progress during implementation
6. **All builds must pass** - Verification is mandatory
7. **Document resolution** - Update PRD with what was actually done

## Blocked States

If the command encounters a blocker, it outputs one of:
```
<duplicate>...</duplicate>        # Already exists
<redirect>...</redirect>          # Wrong command type
<similar-exists>...</similar-exists>  # Should be enhancement
<blocked>...</blocked>            # Other blocker
```

Common blockers:
- Duplicate PRD already exists
- Feature is actually an enhancement (or vice versa)
- Missing API endpoint (features)
- Cannot reproduce bug
- Breaking change detected
- Build/test failure after implementation

## Examples

### Bug Fix with Context Detection
```
/fix-bug Cart total not updating when quantity changes

<context-check-complete>Related to: PRD-015 (Shopping Cart)</context-check-complete>
<phase-1-complete>BUG-002 created (related to PRD-015)</phase-1-complete>
<lisa-complete>Root cause: useEffect missing quantity dependency</lisa-complete>
<checkpoint>cart.tsx: Added quantity to useEffect dependency array</checkpoint>
<ralph-complete>Fixed 1 file</ralph-complete>
<testing-complete>Unit: pass, Integration: N/A, E2E: N/A</testing-complete>
<verification-complete>All builds and tests pass</verification-complete>
<bug-fix-complete>
BUG-002: Cart Total Not Updating
Related PRD: PRD-015
Root Cause: Missing dependency in useEffect
Files Modified: apps/portal/src/app/cart/page.tsx
Tests Added: cart.test.tsx
Status: COMPLETE
</bug-fix-complete>
```

### Feature Redirected to Enhancement
```
/feature Add dark mode toggle to settings

<context-check-complete>Status: enhancement</context-check-complete>
<similar-exists>
Related feature found: PRD-008 (Settings Page)
This request appears to be an ENHANCEMENT to existing functionality.
Recommendation: Use /enhance command instead.
</similar-exists>
```

### Duplicate Detection
```
/fix-bug Images not showing on catalog

<context-check-complete>Status: duplicate</context-check-complete>
<duplicate>BUG-001 already covers this issue</duplicate>
```
