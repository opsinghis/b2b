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
