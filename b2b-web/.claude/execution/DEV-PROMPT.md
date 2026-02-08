# Implement: FE-030 - Admin - Order Management (Iteration 1)

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
**ID:** FE-030
**Title:** Admin - Order Management
**Module:** apps/admin

## Completion Criteria (ALL must be met)
- All orders list with filters
- Order detail view
- Order status management
- Manual order creation
- Order notes/comments
- Refund processing
- Order export to CSV
- Bulk status update

## API Dependencies
- GET /api/v1/admin/orders - List all orders
- GET /api/v1/admin/orders/:id - Order details
- PATCH /api/v1/admin/orders/:id/status - Update order status
- POST /api/v1/admin/orders - Create order manually
- POST /api/v1/admin/orders/:id/refund - Process refund

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-030 - Admin - Order Management

## Module: apps/admin

## Completion Criteria
- [ ] All orders list with filters
- [ ] Order detail view
- [ ] Order status management
- [ ] Manual order creation
- [ ] Order notes/comments
- [ ] Refund processing
- [ ] Order export to CSV
- [ ] Bulk status update

## API Dependencies
- GET /api/v1/admin/orders [available]
- GET /api/v1/admin/orders/:id [available]
- PATCH /api/v1/admin/orders/:id/status [available]
- POST /api/v1/admin/orders [available]
- POST /api/v1/admin/orders/:id/refund [available]

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
<promise>COMPLETE:FE-030</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
