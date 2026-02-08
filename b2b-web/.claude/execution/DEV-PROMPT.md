# Implement: FE-034 - Portal - Partner Order on Behalf (Iteration 1)

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
**ID:** FE-034
**Title:** Portal - Partner Order on Behalf
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Select team member dropdown
- Order on behalf indicator
- Apply team member's discount
- Delivery to team member address
- Notification to team member
- Order attribution tracking

## API Dependencies
- GET /api/v1/partners/me/team - Team members list
- POST /api/v1/orders/on-behalf - Create order on behalf
- GET /api/v1/users/:id/addresses - Team member addresses

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-034 - Portal - Partner Order on Behalf

## Module: apps/portal

## Completion Criteria
- [ ] Select team member dropdown
- [ ] Order on behalf indicator
- [ ] Apply team member's discount
- [ ] Delivery to team member address
- [ ] Notification to team member
- [ ] Order attribution tracking

## API Dependencies
- GET /api/v1/partners/me/team [available]
- POST /api/v1/orders/on-behalf [available]
- GET /api/v1/users/:id/addresses [available]

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
<promise>COMPLETE:FE-034</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
