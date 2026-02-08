I have successfully implemented all the completion criteria for FE-032 - Portal - My Discounts & Savings:

## Summary of Implementation

### Files Created:

1. **Hooks** (`apps/portal/src/app/discounts/hooks/`)
   - `use-discounts.ts` - API hooks for discount tier, savings, promotions, and coupon validation
   - `index.ts` - Exports

2. **Components** (`apps/portal/src/app/discounts/components/`)
   - `current-tier-display.tsx` - **Current discount tier display** with stats
   - `tier-benefits.tsx` - **Tier benefits breakdown** showing available benefits based on tier level
   - `tier-progress.tsx` - **Progress to next tier** with visual progress bars for spend/orders
   - `savings-summary.tsx` - **Total savings this month/year** with KPI cards
   - `available-promotions.tsx` - **Available promotions list** with copy code functionality
   - `apply-coupon.tsx` - **Apply coupon code input** with validation and application
   - `savings-history.tsx` - **Savings history** with chart and table views
   - `index.ts` - Exports

3. **Page** (`apps/portal/src/app/discounts/`)
   - `page.tsx` - Main discounts page with tabbed interface (My Tier, Promotions, History)

### Completion Criteria Met:
- [x] Current discount tier display
- [x] Tier benefits breakdown
- [x] Progress to next tier
- [x] Total savings this month/year
- [x] Available promotions list
- [x] Apply coupon code input
- [x] Savings history

### API Integration:
- GET `/api/v1/api/v1/users/me/discount-tier` - User's discount tier
- GET `/api/v1/api/v1/users/me/savings` - Savings statistics
- GET `/api/v1/api/v1/promotions/available` - Available promotions for user
- POST `/api/v1/api/v1/promotions/validate` - Validate coupon code
- POST `/api/v1/cart/apply-coupon` - Apply coupon to cart

### Build Status: **PASSED**

```
<promise>COMPLETE:FE-032</promise>
```
