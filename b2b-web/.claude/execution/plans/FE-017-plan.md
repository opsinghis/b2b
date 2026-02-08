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
