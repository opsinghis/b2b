# Implement: FE-033 - Portal - Partner Dashboard (Iteration 1)

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
**ID:** FE-033
**Title:** Portal - Partner Dashboard
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Partner-specific welcome
- Partner tier and discount level
- Orders placed (own org)
- Commission earnings (if applicable)
- Team members list
- Quick order for team members
- Partner resources/documents

## API Dependencies
- GET /api/v1/partners/me - Partner profile
- GET /api/v1/partners/me/commission - Commission details
- GET /api/v1/partners/me/team - Team members
- GET /api/v1/partners/me/resources - Partner resources

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-033 - Portal - Partner Dashboard

## Module: apps/portal

## Completion Criteria
- [ ] Partner-specific welcome
- [ ] Partner tier and discount level
- [ ] Orders placed (own org)
- [ ] Commission earnings (if applicable)
- [ ] Team members list
- [ ] Quick order for team members
- [ ] Partner resources/documents

## API Dependencies
- GET /api/v1/partners/me [available]
- GET /api/v1/partners/me/commission [available]
- GET /api/v1/partners/me/team [available]
- GET /api/v1/partners/me/resources [available]

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
<promise>COMPLETE:FE-033</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
