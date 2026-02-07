# Enhancement Command

You are implementing an enhancement using the dev workflow. The user has provided:

**Enhancement:** $ARGUMENTS

## Your Task

Execute the COMPLETE enhancement workflow automatically:

### Phase 1: Create Enhancement PRD

1. Determine the next enhancement number by checking `.claude/planning/backlog/enhancements/` for existing ENH-XXX files
2. Create a new enhancement PRD file: `.claude/planning/backlog/enhancements/ENH-XXX-short-description.json`
3. Include all required fields: id, type, title, module, priority, status, description, current_behavior, improved_behavior, requirements, testing, backward_compatibility

### Phase 2: Update Dev State

Update `.claude/execution/dev-state.json`:
- Set `current.prd_id` to the enhancement ID
- Set `current.phase` to "lisa"
- Set `phases.lisa.status` to "in_progress"

### Phase 3: Lisa Analysis

1. Read relevant source files to understand current behavior
2. Identify scope of changes needed
3. Check for any breaking changes
4. Create enhancement plan
5. Output: `<lisa-complete>`

### Phase 4: Ralph Execution

1. Update dev-state.json phase to "ralph"
2. Implement the enhancement
3. Follow existing code patterns
4. Output checkpoints as you progress: `<checkpoint>[description]</checkpoint>`
5. Output: `<implementation-complete>`

### Phase 5: Verification

1. Run `pnpm lint` - no lint errors
2. Run `pnpm build` - build succeeds
3. Run `pnpm test` - all tests pass (if tests exist)
4. Verify enhancement works as expected

### Phase 6: Update All Tracking Files

After successful implementation:

1. **Enhancement PRD**: Change `status` from "backlog" to "completed"
2. **Dev State**:
   - Set `current.prd_id` to null
   - Set `current.phase` to "idle"
   - Add entry to `history` array with prd_id, completed_at, result, summary
3. **CONTEXT.md**:
   - Add new row to "Recent Changes" table
   - Add new changelog entry

### Important

- Do NOT ask for permission between phases - run the entire workflow automatically
- If you encounter a blocking error, output: `<blocked>[reason]</blocked>` and stop
- Use TodoWrite to track progress through phases
- Build must succeed after the enhancement

## Begin

Start by analyzing the enhancement description and creating the PRD.
