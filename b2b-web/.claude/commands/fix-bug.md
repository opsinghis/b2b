# Fix Bug Command

You are fixing a bug using the dev workflow. The user has provided this bug description:

**Bug:** $ARGUMENTS

## Your Task

Execute the COMPLETE bug fix workflow automatically:

### Phase 1: Create Bug PRD

1. Determine the next bug number by checking `.claude/planning/backlog/bugs/` for existing BUG-XXX files
2. Create a new bug PRD file: `.claude/planning/backlog/bugs/BUG-XXX-short-description.json`
3. Include all required fields: id, type, title, module, priority, status, description, steps_to_reproduce, expected_behavior, actual_behavior, testing, acceptance_criteria

### Phase 2: Update Dev State

Update `.claude/execution/dev-state.json`:
- Set `current.prd_id` to the bug ID
- Set `current.phase` to "lisa"
- Set `phases.lisa.status` to "in_progress"

### Phase 3: Lisa Analysis

1. Read relevant source files to understand the issue
2. Check browser console for errors if UI issue
3. Identify root cause
4. Create fix plan
5. Output: `<lisa-complete>`

### Phase 4: Ralph Execution

1. Update dev-state.json phase to "ralph"
2. Implement the fix
3. Output checkpoints as you progress: `<checkpoint>[description]</checkpoint>`
4. Output: `<implementation-complete>`

### Phase 5: Verification

1. Run `pnpm lint` - no lint errors
2. Run `pnpm build` - build succeeds
3. Run `pnpm test` - all tests pass (if tests exist)
4. Confirm the bug is fixed visually if possible

### Phase 6: Update All Tracking Files

After successful fix:

1. **Bug PRD**: Change `status` from "backlog" to "completed", add `resolution` object
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
- Build must succeed after the fix

## Begin

Start by analyzing the bug description and creating the PRD.
