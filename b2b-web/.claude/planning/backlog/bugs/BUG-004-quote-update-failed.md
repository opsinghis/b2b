# BUG-004: Quote Update Failed - Field Name Mismatch

## Summary
When clicking "Save & Submit for Approval" on an edited quote, the API returns "Failed to update quote" error. The frontend was sending `productId` but the backend expects `masterProductId`.

## Priority
**P1** - Blocks quote editing workflow

## Affected Module
`apps/portal/src/app/quotes`

## Related PRD
PRD-021: Quotes Module (backend), PRD-022: Quotes List & Detail

## Type
Bug Fix (Field Name Mismatch)

## API Impact Assessment
- **Endpoints Affected**: PUT /api/v1/quotes/:id
- **Response Schema Changed**: No
- **Breaking Change**: No
- **Consumer Impact**: None - aligning frontend with existing backend contract

---

## LISA Analysis

### Root Cause Investigation
1. Backend `CreateQuoteLineItemDto` expects `masterProductId` field
2. Frontend `CreateQuoteLineItemData` interface had `productId` field
3. `buildQuotePayload()` was mapping `item.product.id` to `productId`
4. `useCloneQuote()` was also using `productId` instead of `masterProductId`

### Files Modified
- `apps/portal/src/app/quotes/hooks/use-quotes.ts` - Fixed interface and clone function
- `apps/portal/src/app/quotes/components/review-step.tsx` - Fixed buildQuotePayload

### Root Cause
**Field name mismatch**: Frontend sent `productId` but backend DTO expects `masterProductId`.

### Fixes Applied
1. **use-quotes.ts**: Changed `CreateQuoteLineItemData.productId` to `masterProductId`
2. **review-step.tsx**: Changed `buildQuotePayload()` to use `masterProductId: item.product.id`
3. **use-quotes.ts**: Changed `useCloneQuote()` to use `masterProductId: item.productId`

### Verification
- Build passes
- Status: **COMPLETE**

---

## Completion Criteria
- [x] Frontend sends `masterProductId` instead of `productId`
- [x] Build passes
- [ ] Manual verification - Edit and submit quote works

## Testing Requirements
- [ ] **Manual verification** - Edit draft quote and submit for approval

## Dependencies
BUG-003 (Quote Edit Page 404) - must be fixed first

## Max Iterations
1

---

## Resolution (2026-02-08)

### Root Cause
Field name mismatch between frontend and backend:
- Frontend was sending: `{ productId: "..." }`
- Backend expected: `{ masterProductId: "..." }`

### Fixes Applied
1. `CreateQuoteLineItemData` interface: `productId` → `masterProductId`
2. `buildQuotePayload()`: `productId` → `masterProductId`
3. `useCloneQuote()`: `productId` → `masterProductId`

### Status
**COMPLETE** - Build verified, ready for manual testing
