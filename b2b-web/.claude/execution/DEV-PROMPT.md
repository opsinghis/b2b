# Implement: FE-021 - Portal - Product Catalog Browser (Iteration 1)

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
**ID:** FE-021
**Title:** Portal - Product Catalog Browser
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Product grid/list view with toggle
- Category navigation sidebar
- Search with autocomplete
- Filters (price range, category, availability)
- Product quick view modal
- Product detail page with images
- Stock availability indicator
- User's discount price displayed

## API Dependencies
- GET /api/v1/catalog/products - available
- GET /api/v1/catalog/categories - available
- GET /api/v1/catalog/products/:id - available
- GET /api/v1/users/me/discount-tier - available

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-021 - Portal - Product Catalog Browser

## Module: apps/portal

## Completion Criteria
- [ ] Product grid/list view with toggle
- [ ] Category navigation sidebar
- [ ] Search with autocomplete
- [ ] Filters (price range, category, availability)
- [ ] Product quick view modal
- [ ] Product detail page with images
- [ ] Stock availability indicator
- [ ] User's discount price displayed

## API Dependencies
- GET /api/v1/catalog/products [available]
- GET /api/v1/catalog/categories [available]
- GET /api/v1/catalog/products/:id [available]
- GET /api/v1/users/me/discount-tier [available]

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
<promise>COMPLETE:FE-021</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
