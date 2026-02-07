# PRD Templates for Frontend Development

Use these templates when creating new PRDs for features, bugs, or enhancements.

---

## Feature Template

Save as: `features/FE-XXX-feature-name.json`

```json
{
  "id": "FE-XXX",
  "type": "feature",
  "title": "Feature: [Descriptive Title]",
  "module": "apps/[admin|portal]/[page-or-component]",
  "priority": "P0|P1|P2",
  "created": "YYYY-MM-DD",
  "status": "backlog",

  "description": "Clear description of what this feature does and why it's needed.",

  "api_dependencies": [
    {
      "endpoint": "GET /api/v1/resource",
      "status": "available|missing|insufficient",
      "notes": "Any notes about the API"
    }
  ],

  "requirements": [
    "UI requirement 1",
    "UI requirement 2",
    "Data fetching requirement"
  ],

  "components_to_create": [
    "src/components/FeatureName/index.tsx",
    "src/components/FeatureName/FeatureName.tsx"
  ],

  "testing": {
    "unit": [
      "Component renders correctly",
      "Handles loading state",
      "Handles error state"
    ],
    "component": [
      "Storybook story exists",
      "All variants documented"
    ],
    "e2e": [
      "User can complete flow",
      "Error handling works"
    ],
    "a11y": [
      "Keyboard navigable",
      "Screen reader compatible",
      "Color contrast passes"
    ]
  },

  "acceptance_criteria": [
    "AC1: Given X, When Y, Then Z",
    "AC2: Given X, When Y, Then Z"
  ],

  "out_of_scope": [
    "What this feature does NOT include"
  ],

  "dependencies": ["FE-XXX"],
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
  "module": "apps/[admin|portal]/[page-or-component]",
  "priority": "P0|P1|P2",
  "created": "YYYY-MM-DD",
  "status": "backlog",

  "description": "What is happening vs what should happen.",

  "steps_to_reproduce": [
    "Step 1: Navigate to...",
    "Step 2: Click on...",
    "Step 3: Observe..."
  ],

  "expected_behavior": "What should happen",
  "actual_behavior": "What actually happens",

  "environment": {
    "browser": "Chrome 120+",
    "device": "Desktop/Mobile",
    "conditions": "Any specific conditions"
  },

  "console_errors": "Any browser console errors",
  "network_errors": "Any API errors",

  "root_cause_hypothesis": "Initial guess at the cause (optional)",

  "testing": {
    "regression": [
      "Add test that reproduces the bug",
      "Add edge case tests",
      "All existing tests must pass"
    ]
  },

  "affected_files_guess": [
    "apps/admin/src/app/page/component.tsx"
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
  "module": "apps/[admin|portal]/[page-or-component]",
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
    "visual": [
      "Update Storybook if needed",
      "Check responsive design"
    ],
    "performance": [
      "Lighthouse score maintained",
      "No render performance regression"
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

## API Blocker Template

Save as: `api-blockers/API-XXX-description.json`

When a feature requires a backend API that is missing or insufficient:

```json
{
  "id": "API-XXX",
  "type": "api-blocker",
  "title": "API Blocker: [Short Description]",
  "created": "YYYY-MM-DD",
  "status": "open",

  "blocking_feature": "FE-XXX",

  "required_endpoint": {
    "method": "GET|POST|PATCH|DELETE",
    "path": "/api/v1/resource",
    "description": "What this endpoint should do"
  },

  "current_state": "missing|insufficient|broken",

  "if_insufficient": {
    "current_behavior": "What the API currently does",
    "required_behavior": "What the API needs to do",
    "missing_fields": ["field1", "field2"],
    "missing_filters": ["filter1", "filter2"]
  },

  "workaround": "Any temporary workaround, or null if none",

  "backend_ticket": "Link to backend issue if created",

  "notes": "Any additional context"
}
```

---

## Priority Definitions

| Priority | Description | Response Time |
|----------|-------------|---------------|
| **P0** | Critical - App unusable, security issue | Immediate |
| **P1** | High - Major feature broken, blocking users | Within 1 day |
| **P2** | Medium - Feature request, minor bug, improvement | Planned sprint |

---

## Naming Convention

- Features: `FE-XXX` (start from FE-001)
- Bugs: `BUG-XXX` (start from BUG-001)
- Enhancements: `ENH-XXX` (start from ENH-001)
- API Blockers: `API-XXX` (start from API-001)

File names: `{id}-{kebab-case-title}.json`

Examples:
- `features/FE-001-turborepo-setup.json`
- `bugs/BUG-001-login-not-redirecting.json`
- `enhancements/ENH-001-table-sorting.json`
- `api-blockers/API-001-missing-pagination.json`
