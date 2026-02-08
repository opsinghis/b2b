# Implement: FE-024 - Portal - Payment Methods (Iteration 1)

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
**ID:** FE-024
**Title:** Portal - Payment Methods
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Payment method selection UI
- Salary deduction option (employees only)
- Salary deduction limit display
- Salary deduction balance/remaining
- Credit card payment option
- Invoice/PO payment option (partners)
- Payment confirmation screen
- Payment history link

## API Dependencies
- GET /api/v1/payment-methods - Available payment methods for user type
- GET /api/v1/users/me/salary-deduction - Employee's salary deduction status/limit
- POST /api/v1/orders/:id/pay - Process payment for order
- GET /api/v1/users/me/payment-history - User's payment history

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-024 - Portal - Payment Methods

## Module: apps/portal

## Completion Criteria
- [ ] Payment method selection UI
- [ ] Salary deduction option (employees only)
- [ ] Salary deduction limit display
- [ ] Salary deduction balance/remaining
- [ ] Credit card payment option
- [ ] Invoice/PO payment option (partners)
- [ ] Payment confirmation screen
- [ ] Payment history link

## API Dependencies
- GET /api/v1/payment-methods [available]
- GET /api/v1/users/me/salary-deduction [available]
- POST /api/v1/orders/:id/pay [available]
- GET /api/v1/users/me/payment-history [available]

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
<promise>COMPLETE:FE-024</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
