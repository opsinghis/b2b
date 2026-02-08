All completion criteria have been implemented. Let me provide a summary of what was completed:

## Summary: FE-026 - Portal - Order History (Iteration 1)

### Completion Criteria Met:

1. **Orders list with filters (status, date range)** ✅
   - Created `OrdersFilters` component with:
     - Search by order number
     - Status dropdown filter
     - Date range filters (start/end date using DatePicker)
     - Clear filters functionality
     - Active filters summary with removable tags

2. **Order status badges** ✅
   - Created `OrderStatusBadge` component with color-coded status display

3. **Order detail expandable row** ✅
   - Created `OrderExpandableRow` component with:
     - Click-to-expand/collapse functionality
     - Items preview (first 3 items with "+N more" indicator)
     - Shipping address
     - Tracking info (carrier, tracking number with link)
     - Order timeline (ordered, confirmed, shipped, delivered)
     - Order summary (subtotal, discount, tax, total)
     - "View Full Details" button

4. **Reorder button (add items to cart)** ✅
   - Reorder button in each row's action column
   - Uses existing `useReorder` hook to add items to cart
   - Shows loading spinner during operation
   - Toast notifications for success/error

5. **Download invoice/receipt** ✅
   - Download button in each row's action column
   - Added `useDownloadInvoice` hook to API client
   - Downloads PDF as `invoice-{orderNumber}.pdf`
   - Toast notifications for success/error

6. **Pagination and search** ✅
   - Numeric pagination buttons (up to 5 visible pages)
   - Previous/Next buttons with proper disabled states
   - Shows "Showing X-Y of Z orders"
   - Search with 300ms debounce
   - Page resets to 1 on filter changes

7. **Export orders to CSV** ✅
   - Export button in filters section
   - Exports all visible columns (order number, date, status, items, subtotal, discount, tax, total, currency, shipping address, tracking number, carrier)
   - Downloads as `orders-{date}.csv`
   - Disabled when no orders to export

### Files Created/Modified:

**New Files:**
- `apps/portal/src/app/orders/components/order-status-badge.tsx`
- `apps/portal/src/app/orders/components/order-expandable-row.tsx`
- `apps/portal/src/app/orders/components/orders-filters.tsx`

**Modified Files:**
- `apps/portal/src/app/orders/page.tsx` - Complete rewrite with new features
- `apps/portal/src/app/orders/hooks/use-orders.ts` - Added `useDownloadInvoice` hook
- `apps/portal/src/app/orders/components/index.ts` - Added new exports

<promise>COMPLETE:FE-026</promise>
