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
