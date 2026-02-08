All completion criteria have been met. Let me summarize what was implemented:

## Implementation Summary: FE-022 - Portal - Shopping Cart

### Files Created:
1. **`apps/portal/src/app/cart/hooks/use-cart.ts`** - Cart state management with:
   - `useCart()` - Fetch cart from API
   - `useAddToCart()` - Add items to cart with localStorage fallback for unauthenticated users
   - `useUpdateCartItem()` - Update cart item quantity
   - `useRemoveCartItem()` - Remove items from cart
   - `useClearCart()` - Clear entire cart
   - `useApplyCoupon()` / `useRemoveCoupon()` - Coupon management
   - `useSyncLocalCart()` - Sync localStorage cart to server after login
   - Helper functions: `formatCartPrice()`, `calculateItemTotal()`

2. **`apps/portal/src/app/cart/hooks/use-add-to-cart.ts`** - Convenience hook wrapping add-to-cart with toast notifications

3. **`apps/portal/src/app/cart/hooks/index.ts`** - Barrel export

4. **`apps/portal/src/app/cart/components/cart-drawer.tsx`** - Full cart drawer/sidebar with:
   - Cart items list with quantity controls
   - Update quantity and remove items functionality
   - Coupon input/display
   - Real-time subtotal calculation
   - Discount preview (item discounts + coupon discounts)
   - Proceed to checkout button
   - Continue shopping button

5. **`apps/portal/src/app/cart/components/cart-icon.tsx`** - Cart icon with item count badge

6. **`apps/portal/src/app/cart/components/index.ts`** - Barrel export

7. **`packages/ui/src/components/sheet.tsx`** - Sheet/Drawer component (Radix UI-based)

8. **`packages/ui/src/components/toast.tsx`** - Toast notification system

### Files Modified:
- `packages/ui/src/index.ts` - Added Sheet and Toast exports
- `apps/portal/src/components/layout/header.tsx` - Added CartIcon to header
- `apps/portal/src/app/layout.tsx` - Added ToastProvider
- `apps/portal/src/app/catalog/page.tsx` - Integrated add-to-cart functionality
- `apps/portal/src/app/catalog/[id]/page.tsx` - Integrated add-to-cart functionality

### Completion Criteria Met:
- [x] Add to cart from product pages
- [x] Cart icon with item count badge
- [x] Cart drawer/sidebar
- [x] Update quantity in cart
- [x] Remove items from cart
- [x] Cart persistence (localStorage + API sync)
- [x] Real-time subtotal calculation
- [x] Discount applied preview
- [x] Proceed to checkout button

<promise>COMPLETE:FE-022</promise>
