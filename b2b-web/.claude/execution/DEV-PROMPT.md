# Implement: FE-026 - Portal - Order History (Iteration 1)

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
**ID:** FE-026
**Title:** Portal - Order History
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Orders list with filters (status, date range)
- Order status badges
- Order detail expandable row
- Reorder button (add items to cart)
- Download invoice/receipt
- Pagination and search
- Export orders to CSV

## API Dependencies
- GET /api/v1/orders - List user's orders
- GET /api/v1/orders/:id/invoice - Download invoice PDF
- POST /api/v1/orders/:id/reorder - Add order items to cart

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-026 - Portal - Order History

## Module: apps/portal

## Completion Criteria
- [ ] Orders list with filters (status, date range)
- [ ] Order status badges
- [ ] Order detail expandable row
- [ ] Reorder button (add items to cart)
- [ ] Download invoice/receipt
- [ ] Pagination and search
- [ ] Export orders to CSV

## API Dependencies
- GET /api/v1/orders [available]
- GET /api/v1/orders/:id/invoice [available]
- POST /api/v1/orders/:id/reorder [available]

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
<promise>COMPLETE:FE-026</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
