# Claude Code Slash Commands (API)

This directory contains custom slash commands for the B2B API development workflow.

## Overview

All commands follow the **LISA/RALPH** methodology with **API Contract Analysis**:
- **LISA** (Look, Investigate, Strategize, Analyze) - Planning phase, no code changes
- **RALPH** (Rapid Application Loop for Production Hardening) - Implementation phase
- **API Contract Analysis** - Breaking change detection and consumer impact assessment

## Key Features

### Smart Context Detection
All commands include **Phase 0: Context Detection** which:
- Checks for duplicate PRDs before creating new ones
- Links bugs/enhancements to their original PRD items
- Redirects misclassified requests

### API Contract Analysis
All commands include **mandatory API contract analysis**:
- Captures OpenAPI spec before/after changes
- Detects breaking vs non-breaking changes
- Assesses consumer impact (b2b-web frontend)
- Outputs `<breaking-change-warning>` when needed

### Comprehensive Testing
All commands enforce **mandatory testing**:
- Unit tests (>80% coverage)
- Integration tests for all endpoints
- Regression tests (433+ existing tests must pass)
- API contract verification

## Available Commands

| Command | Purpose | PRD Location |
|---------|---------|--------------|
| `/fix-bug` | Fix API bugs with contract analysis | `backlog/bugs/BUG-XXX-*.md` |
| `/enhance` | Improve existing API endpoints | `backlog/enhancements/ENH-XXX-*.md` |
| `/feature` | Implement new API endpoints | `backlog/features/FE-XXX-*.md` |

## Usage

```bash
# Fix a bug
/fix-bug Catalog API returning empty images array for products

# Add an enhancement
/enhance Add pagination metadata to orders list endpoint

# Implement a new feature
/feature Add wishlist API endpoints for saving products
```

## Breaking Change Detection

### What Triggers a Breaking Change Warning

**BREAKING CHANGES** (require `<breaking-change-warning>`):
- ❌ Removing a response field
- ❌ Changing a field type (string → number)
- ❌ Making an optional field required
- ❌ Removing an endpoint
- ❌ Changing an endpoint path
- ❌ Removing query parameters

**NON-BREAKING CHANGES** (safe to proceed):
- ✅ Adding a new response field
- ✅ Adding a new optional request field
- ✅ Adding a new endpoint
- ✅ Adding a new query parameter

### Breaking Change Warning Format

```
<breaking-change-warning>
⚠️ BREAKING CHANGE DETECTED

Endpoint: GET /api/v1/products
Change: Removed 'legacyId' field from response

Affected Consumers:
- b2b-web:
  - Files: apps/portal/src/app/catalog/page.tsx
  - Required changes: Remove legacyId usage

Mitigation Options:
1. API Versioning: Create /api/v2/products
2. Backward Compatible: Keep legacyId, add deprecation notice
3. Coordinated Release: Update both API and frontend

Recommendation: Option 2 - keep backward compatible
</breaking-change-warning>
```

## Consumer Impact Assessment

Every API change includes a consumer impact report:

```
┌─────────────────────────────────────────────────────────────┐
│                   CONSUMER IMPACT REPORT                     │
├─────────────────────────────────────────────────────────────┤
│ Endpoint: GET /api/v1/products                               │
│ Method: GET                                                  │
│                                                              │
│ Changes:                                                     │
│ - Added 'totalCount' field to response                      │
│ - Added 'cursor' query parameter                            │
│                                                              │
│ Consumers:                                                   │
│ - b2b-web (portal frontend)                                 │
│   Impact: None (additive changes only)                      │
│   Files affected: None                                      │
│                                                              │
│ Migration Required: No                                       │
│ Suggested Timeline: Immediate                               │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Phases

### `/fix-bug` Workflow (7 Phases)

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Context Detection | Check for duplicates, link to original PRD |
| 1 | Create Bug PRD | Document bug with API impact assessment |
| 2 | LISA Analysis | Investigate root cause (NO code changes) |
| 3 | API Contract Analysis | Detect breaking changes, assess consumer impact |
| 4 | RALPH Execution | Implement the fix |
| 5 | Testing | Unit, integration, API contract tests |
| 6 | Verification | Build, all tests, API spec validation |
| 7 | Completion | Document resolution, API contract status |

### `/enhance` Workflow (7 Phases)

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Context Detection | Verify this enhances existing code |
| 1 | Create Enhancement PRD | Document with API contract changes |
| 2 | LISA Analysis | Understand current API (NO code changes) |
| 3 | API Contract Analysis | Document ALL changes, detect breaking |
| 4 | RALPH Execution | Implement enhancement |
| 5 | Testing | Unit, integration, regression tests |
| 6 | Verification | Build, all tests, Swagger validation |
| 7 | Completion | Document changes, consumer impact |

### `/feature` Workflow (8 Phases)

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Deduplication Check | Verify feature doesn't exist |
| 1 | Create Feature PRD | Document with API specification |
| 2 | Database Schema Design | Plan schema changes if needed |
| 3 | LISA Analysis | Plan implementation (NO code changes) |
| 4 | API Contract Definition | Define all new endpoints |
| 5 | RALPH Execution | Implement feature |
| 6 | Testing | Full test suite |
| 7 | Verification | Build, tests, Swagger |
| 8 | Completion | Document, consumer integration plan |

## Testing Requirements

### All Commands Must:
1. **Write unit tests** for new/changed code (>80% coverage)
2. **Write integration tests** for all affected endpoints
3. **Run regression tests** (433+ existing tests must pass)
4. **Verify API contract** (OpenAPI spec validation)

### Test Commands:
```bash
# Unit tests with coverage
npm run test -- --testPathPattern="[module]" --coverage

# Integration tests
npm run test:integration -- --testPathPattern="[module]"

# All tests
npm run test

# API contract check
curl -s http://localhost:3000/docs-json > /tmp/api-spec.json
```

## PRD Templates

### Bug PRD includes:
- API Impact Assessment
- Endpoints Affected
- Response Schema Changed
- Breaking Change status
- Consumer Impact level

### Enhancement PRD includes:
- API Contract Changes table
- Backward Compatibility assessment
- Migration path if needed

### Feature PRD includes:
- API Specification (new endpoints)
- Request/Response Schemas
- Consumer Integration Plan
- Database Schema changes

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
│       └── features/      # FE-XXX-*.md files
├── execution/
│   └── prd.json           # Main PRD with all built features
└── CONTEXT.md             # Application context summary
```

## Important Rules

1. **Never skip API Contract Analysis** - ALL API changes must be analyzed
2. **Never make breaking changes without warning** - output `<breaking-change-warning>`
3. **Always assess consumer impact** - document what b2b-web needs to change
4. **Never skip Testing phase** - all changes require tests
5. **All 433+ tests must pass** - no regressions allowed
6. **Update Swagger documentation** - all endpoints must be documented

## Integration with b2b-web

When API changes are made, the commands document:
- Which frontend files will be affected
- What changes the frontend needs to make
- Whether coordinated release is needed
- Migration timeline suggestions

This ensures smooth integration between API and frontend teams.

## Examples

### Bug Fix with No Breaking Change
```
/fix-bug Products API returning null for images

<context-check-complete>Related to: PRD-012 (Tenant Catalog)</context-check-complete>
<phase-1-complete>BUG-001 created (related to PRD-012)</phase-1-complete>
<lisa-complete>Root cause: images extracted from wrong field</lisa-complete>
<api-contract-check>Breaking: No, Impact: None</api-contract-check>
<checkpoint>tenant-catalog.service.ts: Fixed image extraction</checkpoint>
<ralph-complete>Fixed 1 file</ralph-complete>
<testing-complete>Unit: pass, Integration: pass, Contract: unchanged</testing-complete>
<verification-complete>All builds and tests pass</verification-complete>
<bug-fix-complete>
BUG-001: Products Images Null
API Contract: Unchanged
Consumer Impact: None
Status: COMPLETE
</bug-fix-complete>
```

### Enhancement with Breaking Change Detected
```
/enhance Remove deprecated legacyId from product response

<context-check-complete>Enhancing: PRD-012 (Tenant Catalog)</context-check-complete>
<phase-1-complete>ENH-001 created (enhancing PRD-012)</phase-1-complete>
<lisa-complete>Approach: Remove legacyId field from ProductResponseDto</lisa-complete>

<breaking-change-warning>
⚠️ BREAKING CHANGE DETECTED

Endpoint: GET /api/v1/catalog/products
Change: Removing 'legacyId' field from response

Affected Consumers:
- b2b-web:
  - Files: apps/portal/src/app/catalog/ProductCard.tsx
  - Required changes: Remove legacyId usage

Mitigation Options:
1. API Versioning: Create /api/v2/catalog/products
2. Backward Compatible: Keep field but return null (deprecate)
3. Coordinated Release: Update API and frontend together

Recommendation: Option 3 - coordinate with frontend team
</breaking-change-warning>
```

The command stops here and waits for user decision on how to proceed.
