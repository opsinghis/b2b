# Enhancement Command

You are implementing an enhancement using the dev.sh workflow. The user has provided:

**Enhancement:** $ARGUMENTS

## Your Task

Execute the COMPLETE enhancement workflow automatically:

### Phase 1: Find or Create Enhancement PRD

1. Check if a PRD exists in `.claude/planning/backlog/enhancements/` matching this
2. If exists, use it. If not, create: `.claude/planning/backlog/enhancements/ENH-XXX-short-description.json`
3. Determine next ENH number by checking existing files

### Phase 2: Update Dev State

Update `.claude/execution/dev-state.json`:
- Set `current.prd_id` to the ENH ID
- Set `current.phase` to "lisa"

### Phase 3: Lisa Analysis

1. Read current implementation
2. Understand what enhancement is needed
3. Plan changes with minimal disruption
4. Ensure backward compatibility
5. Output: `<lisa-complete>`

### Phase 4: Ralph Execution

1. Implement the enhancement
2. Update tests if needed
3. Output checkpoints: `<checkpoint>[description]</checkpoint>`
4. Output: `<implementation-complete>`

### Phase 5: Verification

1. Run `npm run test` - all tests must pass
2. Verify enhancement works
3. Verify no regressions

### Phase 6: Update Tracking Files

1. **Enhancement PRD**: Change `status` to "completed"
2. **Dev State**: Reset to idle, add to `history`
3. **CONTEXT.md**: Update changelog

### Important

- Run automatically without asking permission
- If blocked: `<blocked>[reason]</blocked>`
- All tests must pass

## Begin

Start by analyzing the enhancement request.
