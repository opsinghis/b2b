# Development Workflow Prompt

You are working on a development task using the Lisa/Ralph methodology.

## Current Phase: {{PHASE}}

## PRD File: {{PRD_FILE}}

---

## Instructions

### If Phase is LISA (Planning)

1. **Read the PRD file** to understand the task
2. **Analyze the existing codebase** to identify:
   - Files that need to be modified
   - Files that need to be created
   - Existing patterns to follow
   - Potential risks or challenges

3. **Create a plan** that includes:
   - Implementation approach (step by step)
   - Test strategy (what tests to write)
   - Files to modify/create

4. **Output your analysis** in this format:

```markdown
## Lisa Analysis: [PRD ID]

### Task Summary
[Brief description]

### Affected Files
- `path/to/file.ts` (modify) - [what changes]
- `path/to/new-file.ts` (create) - [purpose]

### Implementation Steps
1. Step 1
2. Step 2
3. ...

### Test Strategy
- Unit: [what to test]
- Integration: [what to test]
- E2E: [what to test]

### Risks & Mitigations
- Risk 1 → Mitigation
- Risk 2 → Mitigation

### Ready for Implementation: YES
```

5. When analysis is complete, output: `<lisa-complete>`

---

### If Phase is RALPH (Execution)

1. **Read the PRD file** for requirements
2. **Follow your Lisa plan** (if available)
3. **Implement the changes**:
   - Write clean, tested code
   - Follow existing patterns in the codebase
   - Add proper error handling
   - Add input validation

4. **Write tests**:
   - Unit tests for service/business logic
   - Integration tests for database operations
   - E2E tests for API endpoints (if applicable)

5. **Ensure security**:
   - Authentication guards where needed
   - Authorization checks (CASL)
   - Input validation (class-validator)
   - Tenant isolation

6. **After each significant step**, output: `<checkpoint>[description]</checkpoint>`

7. **When implementation is complete**, output: `<implementation-complete>`

---

## Testing Requirements

All development work MUST include:

### Unit Tests
- Test service methods in isolation
- Mock dependencies (Prisma, external services)
- Cover happy path and edge cases
- Target: >80% coverage for new code

### Integration Tests
- Test with real database (Testcontainers)
- Use factories for test data
- Verify database state changes
- Test tenant isolation

### E2E Tests (for API changes)
- Test full HTTP request/response
- Include authentication
- Test error responses

### Security Tests
- Verify auth guards are applied
- Verify CASL permissions work
- Test that tenant A cannot access tenant B data

---

## Code Standards

1. **Follow existing patterns** - Look at similar modules for reference
2. **Use decorators** - @ApiOperation, @ApiResponse for Swagger
3. **Validate input** - Use class-validator DTOs
4. **Handle errors** - Use proper exception types
5. **Log appropriately** - Use the Logger service

---

## Output Signals

Use these signals to communicate status:

- `<lisa-complete>` - Lisa analysis is done
- `<checkpoint>[msg]</checkpoint>` - Progress checkpoint
- `<implementation-complete>` - Implementation is done
- `<blocked>[reason]</blocked>` - Cannot proceed, need help
- `<clarification>[question]</clarification>` - Need clarification

---

## Remember

1. **Read CONTEXT.md** for application understanding
2. **Run tests frequently** during implementation
3. **Commit working code** at checkpoints
4. **Update CONTEXT.md** when complete
