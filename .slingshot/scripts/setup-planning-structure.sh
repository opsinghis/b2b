#!/bin/bash

# Setup LISA-RALPH planning structure
echo "🏗️  Setting up LISA-RALPH planning structure..."

# Create directory structure
mkdir -p .slingshot/planning/{specs,plans,context,risks,verification}
mkdir -p .slingshot/execution/{iterations,logs,reports}
mkdir -p .slingshot/artifacts/{generated,templates}
mkdir -p .slingshot/ralph/{loops,progress,commits}

# Create template files
cat > .slingshot/planning/README.md << 'EOF'
# LISA Planning Documents

This directory contains all planning artifacts generated during the LISA phase of the hybrid workflow.

## Structure

- **specs/**: Feature specifications and requirements
- **plans/**: Implementation plans and architecture decisions  
- **context/**: Codebase context and analysis documents
- **risks/**: Risk assessments and mitigation strategies
- **verification/**: Verification checklists and acceptance criteria

## Document Naming Convention

All documents follow the pattern: `{type}-{sessionId}.md`

Example: `spec-20240208-143022.md`

## LISA Phase Workflow

1. **Context Analysis** → `context/context-{sessionId}.md`
2. **Specification** → `specs/spec-{sessionId}.md`  
3. **Planning** → `plans/plan-{sessionId}.md`
4. **Risk Assessment** → `risks/risk-assessment-{sessionId}.md`
5. **Verification Setup** → `verification/verification-checklist-{sessionId}.md`
EOF

cat > .slingshot/execution/README.md << 'EOF'
# RALPH Execution Tracking

This directory contains all execution artifacts from the RALPH phase.

## Structure

- **iterations/**: Individual iteration logs and results
- **logs/**: Detailed execution logs and debugging info
- **reports/**: Summary reports and metrics

## Ralph Loop Process

1. Read planning documents from `.slingshot/planning/`
2. Execute PRD item with fresh context
3. Log iteration results to `iterations/`
4. Check for completion promise
5. Repeat until complete or max iterations reached

## Progress Tracking

Progress is tracked in `progress-{sessionId}.md` files with:
- Current iteration count
- Completion status
- Error logs
- Performance metrics
EOF

cat > .slingshot/ralph/PROMPT.md << 'EOF'
# Ralph Loop Prompt Template

You are a development agent working on implementing features according to the LISA-RALPH hybrid methodology.

## Your Context

Read the following planning documents:
- Context: `.slingshot/planning/context/context-{SESSION_ID}.md`
- Specification: `.slingshot/planning/specs/spec-{SESSION_ID}.md`
- Plan: `.slingshot/planning/plans/plan-{SESSION_ID}.md`
- PRD Items: `.slingshot/planning/prd-items-{SESSION_ID}.md`

## Your Task

Implement the current PRD item according to the specification and plan.

## Completion Criteria

ONLY WORK ON A SINGLE PRD ITEM.
If, while implementing the PRD item, you notice that all completion criteria are met, output <promise>COMPLETE</promise>.

## Git Integration

- Make atomic commits after each significant change
- Use descriptive commit messages
- Tag commits with iteration number

## Error Handling

If you encounter errors:
1. Log the error clearly
2. Attempt to resolve using the plan guidance
3. If unresolvable, document the blocker
4. Continue with next iteration

## Fresh Context

Each iteration starts with fresh context. Use git history and file system state to understand previous work.
EOF

echo "✅ LISA-RALPH planning structure created successfully!"
echo ""
echo "📁 Created directories:"
echo "  - .slingshot/planning/ (LISA documents)"
echo "  - .slingshot/execution/ (RALPH tracking)"  
echo "  - .slingshot/artifacts/ (Generated files)"
echo "  - .slingshot/ralph/ (Ralph loop config)"
echo ""
echo "📄 Created template files:"
echo "  - Planning README with workflow guide"
echo "  - Execution README with process guide"
echo "  - Ralph PROMPT.md template"