# Implement: FE-031 - Admin - Salary Deduction Management (Iteration 1)

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
**ID:** FE-031
**Title:** Admin - Salary Deduction Management
**Module:** apps/admin

## Completion Criteria (ALL must be met)
- Employee deduction limits list
- Set/update deduction limits
- Pending deductions approval
- Monthly deduction report
- Payroll export (CSV/Excel)
- Deduction limit requests inbox
- Bulk limit updates

## API Dependencies
- GET /api/v1/admin/salary-deductions - List all employee deductions
- PATCH /api/v1/admin/salary-deductions/:userId - Update employee limit
- GET /api/v1/admin/salary-deductions/report - Monthly report
- GET /api/v1/admin/salary-deductions/limit-requests - Pending limit requests
- POST /api/v1/admin/salary-deductions/limit-requests/:id/approve - Approve limit request

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-031 - Admin - Salary Deduction Management

## Module: apps/admin

## Completion Criteria
- [ ] Employee deduction limits list
- [ ] Set/update deduction limits
- [ ] Pending deductions approval
- [ ] Monthly deduction report
- [ ] Payroll export (CSV/Excel)
- [ ] Deduction limit requests inbox
- [ ] Bulk limit updates

## API Dependencies
- GET /api/v1/admin/salary-deductions [available]
- PATCH /api/v1/admin/salary-deductions/:userId [available]
- GET /api/v1/admin/salary-deductions/report [available]
- GET /api/v1/admin/salary-deductions/limit-requests [available]
- POST /api/v1/admin/salary-deductions/limit-requests/:id/approve [available]

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
<promise>COMPLETE:FE-031</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
