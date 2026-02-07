# PRD Templates for Development

Use these templates when creating new PRDs for features, bugs, or enhancements.

---

## Feature Template

Save as: `features/PRD-XXX-feature-name.json`

```json
{
  "id": "PRD-XXX",
  "type": "feature",
  "title": "Feature: [Descriptive Title]",
  "module": "[core|business|platform]/[module-name]",
  "priority": "P0|P1|P2",
  "created": "YYYY-MM-DD",
  "status": "backlog",

  "description": "Clear description of what this feature does and why it's needed.",

  "requirements": [
    "Specific requirement 1",
    "Specific requirement 2",
    "API: METHOD /endpoint - description"
  ],

  "testing": {
    "unit": [
      "Test case 1: description",
      "Test case 2: description",
      "Coverage target: >80%"
    ],
    "integration": [
      "Integration test 1: description",
      "Integration test 2: description"
    ],
    "e2e": [
      "E2E flow 1: description",
      "E2E flow 2: description"
    ],
    "performance": [
      "Response time <XXXms for [endpoint]",
      "Handle N concurrent requests"
    ],
    "security": [
      "Authentication required",
      "Authorization via CASL",
      "Input validation",
      "Tenant isolation"
    ]
  },

  "acceptance_criteria": [
    "AC1: Given X, When Y, Then Z",
    "AC2: Given X, When Y, Then Z"
  ],

  "out_of_scope": [
    "What this feature does NOT include"
  ],

  "dependencies": ["PRD-XXX"],
  "max_iterations": 10
}
```

---

## Bug Template

Save as: `bugs/BUG-XXX-bug-name.json`

```json
{
  "id": "BUG-XXX",
  "type": "bug",
  "title": "Bug: [Short Description]",
  "module": "[core|business|platform]/[module-name]",
  "priority": "P0|P1|P2",
  "created": "YYYY-MM-DD",
  "status": "backlog",

  "description": "What is happening vs what should happen.",

  "steps_to_reproduce": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],

  "expected_behavior": "What should happen",
  "actual_behavior": "What actually happens",

  "environment": {
    "version": "commit or version",
    "conditions": "Any specific conditions"
  },

  "root_cause_hypothesis": "Initial guess at the cause (optional)",

  "testing": {
    "regression": [
      "Add test that reproduces the bug",
      "Add edge case tests",
      "All existing tests must pass"
    ]
  },

  "affected_files_guess": [
    "src/path/to/likely/file.ts"
  ],

  "max_iterations": 5
}
```

---

## Enhancement Template

Save as: `enhancements/ENH-XXX-enhancement-name.json`

```json
{
  "id": "ENH-XXX",
  "type": "enhancement",
  "title": "Enhancement: [Short Description]",
  "module": "[core|business|platform]/[module-name]",
  "priority": "P1|P2",
  "created": "YYYY-MM-DD",
  "status": "backlog",

  "description": "What improvement is being made and why.",

  "current_behavior": "How it works now",
  "improved_behavior": "How it should work after",

  "requirements": [
    "Specific change 1",
    "Specific change 2"
  ],

  "testing": {
    "unit": [
      "Update existing tests if needed",
      "Add tests for new behavior"
    ],
    "integration": [
      "Verify integration still works"
    ],
    "performance": [
      "Benchmark: before vs after",
      "Target improvement: X%"
    ]
  },

  "backward_compatibility": {
    "breaking_changes": false,
    "migration_needed": false,
    "notes": "Any compatibility notes"
  },

  "dependencies": [],
  "max_iterations": 6
}
```

---

## Priority Definitions

| Priority | Description | Response Time |
|----------|-------------|---------------|
| **P0** | Critical - System down, security issue, data loss | Immediate |
| **P1** | High - Major functionality broken, blocking users | Within 1 day |
| **P2** | Medium - Feature request, minor bug, improvement | Planned sprint |

---

## Naming Convention

- Features: `PRD-XXX` (continue from last PRD number)
- Bugs: `BUG-XXX` (start from BUG-001)
- Enhancements: `ENH-XXX` (start from ENH-001)

File names: `{id}-{kebab-case-title}.json`
Examples:
- `features/PRD-030-product-search.json`
- `bugs/BUG-001-login-special-chars.json`
- `enhancements/ENH-001-query-performance.json`
