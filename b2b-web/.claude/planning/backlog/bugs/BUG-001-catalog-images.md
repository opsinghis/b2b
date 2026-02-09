# BUG-001: Catalog Product Images Not Displaying

## Summary
Product images are not showing on the catalog page. Products display but the image area shows placeholder/broken images.

## Priority
**P1** - Visual bug affecting user experience

## Affected Module
`apps/portal/src/app/catalog`

## Type
Bug Fix

---

## LISA Analysis

### Root Cause Investigation
1. Check if `primaryImage` field contains valid URLs in API response
2. Check if images are stored in attributes.images array instead
3. Check if Next.js Image component has proper configuration
4. Check if external image domains are allowed in next.config.js

### Files to Investigate
- `apps/portal/src/app/catalog/page.tsx` - Main catalog page
- `apps/portal/src/app/catalog/components/ProductGrid.tsx` - Product display component
- `apps/portal/src/app/catalog/components/ProductCard.tsx` - Individual product card
- `apps/portal/next.config.js` - Image domain configuration
- API response structure for products

### Patterns to Follow
- Use Next.js Image component with proper width/height
- Fallback placeholder for missing images
- Handle both primaryImage and attributes.images array

### Risks Identified
- Risk 1: External image URLs not allowed → Mitigation: Add domains to next.config.js
- Risk 2: Image URLs are null/empty → Mitigation: Show placeholder image

### Test Strategy
- Unit: ProductCard renders with/without image
- Integration: Verify API returns image URLs
- Visual: Confirm images display correctly

---

## Completion Criteria
- [x] Images display correctly for products with primaryImage
- [x] Fallback placeholder shows for products without images
- [x] Next.js config allows external image domains
- [x] No console errors for image loading
- [x] Build passes

## Dependencies
None

## Max Iterations
5

---

## Resolution (2026-02-08)

### Root Cause
Images were stored in `product.attributes.images` (JSON field) but the tenant catalog service was only checking `product.images` (empty array column).

### Fixes Applied
1. **Backend** (`b2b-api/src/business/tenant-catalog/tenant-catalog.service.ts`):
   - Modified `toTenantProductResponse()` to extract images from `product.attributes.images`
   - Set `primaryImage` from first image if not explicitly set

2. **Frontend** (`b2b-web/apps/portal/next.config.js`):
   - Added `images.remotePatterns` config to allow `dev-uk.pandora.net` and related domains

### Verification
- API now returns `primaryImage` and `images` array with valid URLs
- Build passes for both backend and frontend
- Status: **COMPLETE**
