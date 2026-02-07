# Implement Feature Command

You are implementing a feature using the dev.sh workflow. The user has provided:

**Feature:** $ARGUMENTS

## Your Task

Execute the COMPLETE feature implementation workflow automatically:

### Phase 1: Find or Create Feature PRD

1. Check if a PRD already exists in `.claude/planning/backlog/features/` matching this feature
2. If exists, use it. If not, create a new PRD file: `.claude/planning/backlog/features/PRD-XXX-short-description.json`
3. Determine next PRD number by checking existing files

### Phase 2: Update Dev State

Update `.claude/execution/dev-state.json`:
- Set `current.prd_id` to the PRD ID
- Set `current.phase` to "lisa"
- Set `phases.lisa.status` to "in_progress"

### Phase 3: Lisa Analysis (Planning)

1. Read the PRD requirements thoroughly
2. Analyze existing codebase for patterns to follow
3. Identify all files to create/modify
4. Create implementation plan
5. Output: `<lisa-complete>`

### Phase 4: Ralph Execution (Implementation)

1. Update dev-state.json phase to "ralph"
2. Implement the feature following the plan
3. Follow existing code patterns
4. Add proper error handling and validation
5. Output checkpoints: `<checkpoint>[description]</checkpoint>`
6. Output: `<implementation-complete>`

### Phase 5: Verification

1. Run `npm run test` - all tests must pass
2. Run `npm run lint` - no lint errors
3. Verify feature works as expected

### Phase 6: Update All Tracking Files

After successful implementation:

1. **Feature PRD**: Change `status` to "completed"
2. **Dev State**: Reset to idle, add entry to `history` array
3. **CONTEXT.md**: Add to "Recent Changes" table and changelog

### Important

- Do NOT ask for permission between phases - run the entire workflow automatically
- If blocked, output: `<blocked>[reason]</blocked>` and stop
- Use TodoWrite to track progress through phases
- All tests must pass after implementation

## Begin

Start by finding or analyzing the PRD and planning the implementation.
