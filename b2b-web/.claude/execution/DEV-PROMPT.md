# Implement: FE-015 - Portal - Contract Workflow (Iteration 1)

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
**ID:** FE-015
**Title:** Portal - Contract Workflow
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Create contract form
- Submit for review button
- Workflow action buttons (based on status)
- Approve/reject with comments modal
- Status transition confirmations

## API Dependencies
- POST /api/v1/contracts - available
- POST /api/v1/contracts/:id/submit - available
- POST /api/v1/contracts/:id/approve - available
- POST /api/v1/contracts/:id/reject - available
- POST /api/v1/contracts/:id/activate - available

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-015 - Portal - Contract Workflow

## Module: apps/portal

## Completion Criteria
- [ ] Create contract form
- [ ] Submit for review button
- [ ] Workflow action buttons (based on status)
- [ ] Approve/reject with comments modal
- [ ] Status transition confirmations

## API Dependencies
- POST /api/v1/contracts [available]
- POST /api/v1/contracts/:id/submit [available]
- POST /api/v1/contracts/:id/approve [available]
- POST /api/v1/contracts/:id/reject [available]
- POST /api/v1/contracts/:id/activate [available]

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
<promise>COMPLETE:FE-015</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
