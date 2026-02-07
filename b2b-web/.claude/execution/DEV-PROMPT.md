# Implement: FE-005 - OpenAPI Client Generation (Iteration 4)

You are building a B2B e-commerce frontend application.

## Project Structure
- apps/admin - Next.js 14 Admin Portal (port 3002)
- apps/portal - Next.js 14 Customer Portal (port 3003)
- packages/ui - Shared React components (@b2b/ui)
- packages/api-client - Generated API client (@b2b/api-client)
- packages/config - Shared configs

## Tech Stack
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Tailwind CSS
- Radix UI primitives
- React Query (TanStack Query)
- pnpm workspaces + Turborepo

## Current Feature
**ID:** FE-005
**Title:** OpenAPI Client Generation
**Module:** packages/api-client

## Completion Criteria (ALL must be met)
- Client generated from b2b-api OpenAPI spec
- Typed API client with all endpoints
- pnpm --filter api-client generate works
- Client usable in apps via @b2b/api-client
- Includes request/response types

## API Dependencies
- GET /docs-json - OpenAPI JSON spec

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-005 - OpenAPI Client Generation

## Module: packages/api-client

## Completion Criteria
- [ ] Client generated from b2b-api OpenAPI spec
- [ ] Typed API client with all endpoints
- [ ] pnpm --filter api-client generate works
- [ ] Client usable in apps via @b2b/api-client
- [ ] Includes request/response types

## API Dependencies
- GET /docs-json [available]

## Implementation Plan
<!-- Claude: Fill this section during Lisa phase -->

### Components to Create
- 

### State Management
- 

### Testing Strategy
- 

## Ready for Ralph: [ ]

## Previous Iteration Output
All FE-005 completion criteria have been verified:

## FE-005 Verification Summary

| Criteria | Status | Evidence |
|----------|--------|----------|
| Client generated from b2b-api OpenAPI spec | ✅ | `openapi.json` (16,934 lines) exists and is valid |
| Typed API client with all endpoints | ✅ | `src/generated/api.ts` (8,780 lines) with full `paths`, `components`, `operations` |
| `pnpm --filter api-client generate` works | ✅ | Command completes in 21ms |
| Client usable in apps via `@b2b/api-client` | ✅ | Both `apps/admin` and `apps/portal` have `@b2b/api-client: "workspace:*"` |
| Includes request/response types | ✅ | 75+ DTOs exported (LoginDto, UserResponseDto, TenantResponseDto, etc.) |

### Additional Verification
- **Tests**: 8/8 passing
- **TypeCheck**: Clean (no errors)
- **Build**: Successful
- **Generate**: Works correctly with openapi-typescript 6.7.6

The api-client package is fully functional and ready for use by both applications.

```
<promise>COMPLETE:FE-005</promise>
```

## Instructions
1. Implement ALL completion criteria for this feature
2. Create necessary files, components, pages
3. Follow Next.js 14 App Router patterns
4. Use TypeScript strict mode
5. Write basic tests if time permits
6. Ensure pnpm build passes

## IMPORTANT
When you have implemented ALL completion criteria, output:
```
<promise>COMPLETE:FE-005</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
