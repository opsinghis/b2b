# Implement: FE-023 - Portal - Checkout Flow (Iteration 1)

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
**ID:** FE-023
**Title:** Portal - Checkout Flow
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Multi-step checkout wizard
- Delivery address selection/entry
- Delivery method selection
- Order summary with line items
- Discount breakdown display
- Payment method selection
- Order notes/special instructions
- Terms acceptance checkbox
- Place order confirmation

## API Dependencies
- GET /api/v1/users/me/addresses - User's saved addresses
- POST /api/v1/users/me/addresses - Add new address
- GET /api/v1/delivery-methods - Available delivery options
- POST /api/v1/orders - Create order from cart
- GET /api/v1/orders/:id - Get order details

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-023 - Portal - Checkout Flow

## Module: apps/portal

## Completion Criteria
- [ ] Multi-step checkout wizard
- [ ] Delivery address selection/entry
- [ ] Delivery method selection
- [ ] Order summary with line items
- [ ] Discount breakdown display
- [ ] Payment method selection
- [ ] Order notes/special instructions
- [ ] Terms acceptance checkbox
- [ ] Place order confirmation

## API Dependencies
- GET /api/v1/users/me/addresses [available]
- POST /api/v1/users/me/addresses [available]
- GET /api/v1/delivery-methods [available]
- POST /api/v1/orders [available]
- GET /api/v1/orders/:id [available]

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
<promise>COMPLETE:FE-023</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
