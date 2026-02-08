# Implement: FE-017 - Portal - Quotes List & Detail (Iteration 2)

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
**ID:** FE-017
**Title:** Portal - Quotes List & Detail
**Module:** apps/portal

## Completion Criteria (ALL must be met)
- Quotes list with filters (status, date)
- Quote detail page with line items
- Quote status timeline
- Convert to contract action
- Clone quote action

## API Dependencies
- GET /api/v1/quotes - available
- GET /api/v1/quotes/:id - available
- POST /api/v1/quotes/:id/convert - available

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-017 - Portal - Quotes List & Detail

## Module: apps/portal

## Completion Criteria
- [x] Quotes list with filters (status, date)
- [x] Quote detail page with line items
- [x] Quote status timeline
- [x] Convert to contract action
- [x] Clone quote action

## API Dependencies
- GET /api/v1/quotes [available] - used
- GET /api/v1/quotes/:id [available] - used
- POST /api/v1/quotes/:id/convert-to-contract [available] - used
- POST /api/v1/quotes [available] - used for clone

## Implementation Summary

### Components Created
- `QuotesFilters` - Status dropdown and date range filters
- `QuoteTimeline` - Visual timeline showing quote workflow progression

### Hooks Added
- `useConvertQuoteToContract` - Converts accepted quote to contract
- `useCloneQuote` - Creates new quote by copying existing quote data

### Files Modified
1. `apps/portal/src/app/quotes/page.tsx` - Enhanced with date filters and improved filter UI
2. `apps/portal/src/app/quotes/[id]/page.tsx` - Added timeline, convert action, clone action
3. `apps/portal/src/app/quotes/hooks/use-quotes.ts` - Added conversion and clone hooks
4. `apps/portal/src/app/quotes/components/index.ts` - Export new components

### Files Created
1. `apps/portal/src/app/quotes/components/quotes-filters.tsx` - Filter controls
2. `apps/portal/src/app/quotes/components/quote-timeline.tsx` - Status timeline

## Ready for Ralph: [x] Completed

## Previous Iteration Output
# FE-017 Iteration 1 - Portal - Quotes List & Detail

## Status: COMPLETE

## Changes Made

### 1. Quotes List Page (`apps/portal/src/app/quotes/page.tsx`)
- Added date filters (start date, end date) using DatePicker
- Replaced button-based status filter with dropdown Select
- Added debounced search (300ms)
- Added refresh button
- Reset pagination on filter changes
- Date formatting for API (yyyy-MM-dd)

### 2. Quote Detail Page (`apps/portal/src/app/quotes/[id]/page.tsx`)
- Restructured to two-column layout (content + sidebar)
- Added QuoteTimeline component in sidebar
- Added Key Dates card showing important dates
- Added Quote Summary card with total amount
- Added "Clone Quote" action with modal dialog
- Added "Convert to Contract" action with confirmation modal
- Refresh button added

### 3. New Component: QuotesFilters (`apps/portal/src/app/quotes/components/quotes-filters.tsx`)
- Status dropdown filter
- Start date picker
- End date picker
- Clear all filters button

### 4. New Component: QuoteTimeline (`apps/portal/src/app/quotes/components/quote-timeline.tsx`)
- Visual timeline showing quote workflow stages
- Stages: Draft -> Submitted -> Approved -> Sent -> Accepted -> Converted
- Special handling for Rejected and Expired states
- Color-coded icons (green for completed, blue for current, gray for pending)
- Dates displayed for completed stages

### 5. Hooks (`apps/portal/src/app/quotes/hooks/use-quotes.ts`)
- Added `useConvertQuoteToContract` mutation hook
- Added `useCloneQuote` mutation hook (creates new quote via POST /api/v1/quotes)
- Added `canConvertToContract` helper function
- Added `canCloneQuote` helper function

## Completion Criteria Met

| Criteria | Status |
|----------|--------|
| Quotes list with filters (status, date) |  |
| Quote detail page with line items |  |
| Quote status timeline |  |
| Convert to contract action |  |
| Clone quote action |  |

## Build Status
- `pnpm --filter portal build` - PASSED

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
<promise>COMPLETE:FE-017</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
