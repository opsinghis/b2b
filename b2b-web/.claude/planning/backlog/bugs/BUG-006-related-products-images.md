# BUG-006: Related Products Section Images Not Displaying

## Summary
On the product detail page, the "Related Products" section shows products without images (placeholder icons) even when the products have images in the database. This is the same root cause as BUG-001 but affects a different endpoint.

## Priority
**P2** - High visibility issue affecting user experience on product detail pages

## Affected Module
`src/business/tenant-catalog` - Backend API

## Related PRD
BUG-001 - Same root cause (images stored in attributes.images not being extracted)

## Type
Bug Fix

## API Impact Assessment
- **Endpoints Affected**: `GET /api/v1/catalog/products/:id/related`
- **Response Schema Changed**: No
- **Breaking Change**: No
- **Consumer Impact**: None (fixes data that should have been populated)

---

## LISA Analysis

### Root Cause Investigation
1. The `getRelatedProducts` method in `tenant-catalog.service.ts` was directly using `p.primaryImage`
2. The `primaryImage` column is often empty/null in the database
3. Images are actually stored in `product.attributes.images` JSON field
4. The main `toTenantProductResponse` method extracts from `attributes.images`, but `getRelatedProducts` didn't use this pattern

### Files Investigated
- `src/business/tenant-catalog/tenant-catalog.service.ts` - `getRelatedProducts` method (line 232-246)
- Same file - `toTenantProductResponse` method for reference on correct pattern

### API Contract Analysis
- Current Response: `primaryImage: null`
- Expected Response: `primaryImage: "https://...image-url..."`
- Schema Changes: None (same field, correct data now populated)

### Risks Identified
- Risk 1: Performance impact of extracting from JSON → Mitigation: Minimal, same logic used elsewhere

### Test Strategy
- Unit: Existing tests pass
- Integration: Verified via curl that primaryImage is now populated
- API Contract: No schema change

---

## Resolution

### Fix Applied
Modified `getRelatedProducts` method in `tenant-catalog.service.ts` to extract `primaryImage` from `attributes.images` when the `primaryImage` column is empty, using the same pattern as `toTenantProductResponse`.

### Files Modified
- `src/business/tenant-catalog/tenant-catalog.service.ts`

### Code Change
```typescript
// Before:
primaryImage: p.primaryImage,

// After:
let primaryImage: string | null = p.primaryImage;
if (!primaryImage && p.attributes) {
  const attrs = p.attributes as Record<string, unknown>;
  if (attrs.images && Array.isArray(attrs.images) && attrs.images.length > 0) {
    primaryImage = attrs.images[0] as string;
  }
}
```

---

## Completion Criteria
- [x] Bug fixed
- [x] Build passes
- [x] Unit tests pass (52 tenant-catalog tests)
- [x] API returns correct primaryImage

## Testing Requirements
- [x] **Unit test** - 52 existing tests pass
- [x] **API verification** - curl confirmed primaryImage populated
- [x] **Build** - passes

## Dependencies
None

## Max Iterations
1 (completed in single iteration)

## Status
**COMPLETE**
