# Implement: FE-016 - Portal - Quote Builder (Iteration 1)

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
**ID:** FE-016
**Title:** Portal - Quote Builder
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Quote wizard (multi-step form)
- Product selector with search
- Line item editor (quantity, price override)
- Real-time total calculation
- Save as draft
- Submit for approval

## API Dependencies
- GET /api/v1/catalog/products - available
- POST /api/v1/quotes - available
- PATCH /api/v1/quotes/:id - available
- POST /api/v1/quotes/:id/submit - available

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-016 - Portal - Quote Builder

## Module: apps/portal

## Completion Criteria
- [ ] Quote wizard (multi-step form)
- [ ] Product selector with search
- [ ] Line item editor (quantity, price override)
- [ ] Real-time total calculation
- [ ] Save as draft
- [ ] Submit for approval

## API Dependencies
- GET /api/v1/catalog/products [available]
- POST /api/v1/quotes [available]
- PATCH /api/v1/quotes/:id [available]
- POST /api/v1/quotes/:id/submit [available]

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
<promise>COMPLETE:FE-016</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
