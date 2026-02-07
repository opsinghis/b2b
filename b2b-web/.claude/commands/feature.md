# Implement Feature Command

You are implementing a feature using the dev workflow. The user has provided:

**Feature:** $ARGUMENTS

## Your Task

Execute the COMPLETE feature implementation workflow automatically:

### Phase 1: Find or Create Feature PRD

1. Check if a PRD already exists in `.claude/planning/backlog/features/` matching this feature
2. If exists, use it. If not, create a new PRD file: `.claude/planning/backlog/features/FE-XXX-short-description.json`
3. Determine next FE number by checking existing files (start at FE-001)

### Phase 2: Check API Dependencies

1. Identify which backend APIs this feature requires
2. Check if those APIs exist in b2b-api (check Postman collection or Swagger)
3. If an API is missing or insufficient, create a blocker in `.claude/planning/backlog/api-blockers/`
4. If blocked, output `<blocked>API missing: [description]</blocked>` and stop

### Phase 3: Update Dev State

Update `.claude/execution/dev-state.json`:
- Set `current.prd_id` to the PRD ID
- Set `current.phase` to "lisa"
- Set `phases.lisa.status` to "in_progress"

### Phase 4: Lisa Analysis (Planning)

1. Read the PRD requirements thoroughly
2. Analyze existing codebase for patterns to follow
3. Identify all files to create/modify
4. Create implementation plan
5. Output: `<lisa-complete>`

### Phase 5: Ralph Execution (Implementation)

1. Update dev-state.json phase to "ralph"
2. Implement the feature following the plan
3. Follow existing code patterns (Next.js App Router, React Query, Tailwind)
4. Add proper TypeScript types
5. Output checkpoints: `<checkpoint>[description]</checkpoint>`
6. Output: `<implementation-complete>`

### Phase 6: Verification

1. Run `pnpm lint` - no lint errors
2. Run `pnpm build` - build succeeds
3. Run `pnpm test` - all tests pass (if tests exist)
4. Verify feature works visually

### Phase 7: Update All Tracking Files

After successful implementation:

1. **Feature PRD**: Change `status` to "completed"
2. **Dev State**: Reset to idle, add entry to `history` array
3. **CONTEXT.md**: Add to "Recent Changes" table and changelog

### Important

- Do NOT ask for permission between phases - run the entire workflow automatically
- If blocked by missing API, output: `<blocked>API: [endpoint] - [what's missing]</blocked>` and stop
- If blocked for other reasons, output: `<blocked>[reason]</blocked>` and stop
- Use TodoWrite to track progress through phases
- All builds must succeed after implementation

## Begin

Start by finding or analyzing the PRD and checking API dependencies.
