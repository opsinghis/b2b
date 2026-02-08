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
