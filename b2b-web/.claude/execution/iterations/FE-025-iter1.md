All completion criteria have been met. Let me provide a summary of what was implemented:

## Summary: FE-025 - Portal Order Tracking

### Implemented Features

**Completion Criteria Met:**

1. **Order status timeline/stepper** - `OrderStatusTimeline` component displays a visual timeline showing order progression through PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED states, with special handling for CANCELLED and REFUNDED orders.

2. **Real-time status updates** - The `useOrder` and `useOrderTracking` hooks have `refetchInterval: 30000` to automatically refresh order data every 30 seconds.

3. **Estimated delivery date** - Displayed in the `OrderTrackingInfo` component with proper date formatting.

4. **Tracking number with carrier link** - Shows tracking number with copy-to-clipboard functionality and generates carrier-specific tracking URLs (UPS, FedEx, USPS, DHL).

5. **Delivery address display** - Shows the shipping address in the `OrderTrackingInfo` component.

6. **Order items summary** - `OrderItemsSummary` component displays all order items with product details, quantities, prices, and order totals (subtotal, discounts, tax, total).

7. **Contact support button** - Opens email client with pre-filled subject line containing order number.

8. **Cancel order option** - `CancelOrderModal` with reason input, only shown when order status allows cancellation (PENDING, CONFIRMED).

### Files Created

```
apps/portal/src/app/orders/
├── page.tsx                          # Orders list page
├── [id]/
│   └── page.tsx                      # Order detail/tracking page
├── hooks/
│   ├── use-orders.ts                 # Order hooks & utilities
│   └── index.ts
└── components/
    ├── order-status-timeline.tsx     # Status stepper component
    ├── order-tracking-info.tsx       # Tracking & delivery card
    ├── order-items-summary.tsx       # Items table with totals
    ├── cancel-order-modal.tsx        # Cancel confirmation modal
    └── index.ts
```

### API Endpoints Used
- `GET /api/v1/orders` - List orders with filtering/pagination
- `GET /api/v1/orders/:id` - Order details with status
- `GET /api/v1/orders/:id/tracking` - Tracking information
- `POST /api/v1/orders/:id/cancel` - Cancel order
- `POST /api/v1/orders/:id/reorder` - Reorder items to cart

<promise>COMPLETE:FE-025</promise>
