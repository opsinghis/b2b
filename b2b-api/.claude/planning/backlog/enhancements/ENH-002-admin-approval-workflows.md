# ENH-002: Admin Portal Approval Workflows for Quotes and Orders

## Summary
Add approval workflow UI to the Admin portal for:
1. **Quote Approvals**: Allow admins to approve/reject/send quotes that are in PENDING_APPROVAL status
2. **Order Approvals**: Add approval step for B2B orders - orders should require admin confirmation before processing

## Priority
**P1** - Critical business workflow functionality missing from Admin portal

## Affected Module
- `apps/admin` (b2b-web) - Primary frontend changes
- `src/business/quotes` (b2b-api) - Quote workflow already exists
- `src/business/orders` (b2b-api) - May need ORDER added to approvals entity type

## Original PRD
- PRD-021: Quotes Module (backend quotes workflow exists)
- PRD-030: Orders Module (backend order management exists)
- PRD-020: Approvals Module (generic approval system exists)

## Type
Enhancement

## API Impact Assessment
- **Endpoints Affected**: None - using existing quote workflow endpoints
- **New Endpoints**: None required - quotes API already has /approve, /reject, /send
- **Response Schema Changed**: No
- **Request Schema Changed**: No
- **Breaking Change**: No
- **Consumer Impact**: None - adding frontend functionality for existing API

---

## LISA Analysis

### Current Behavior
1. **Quotes**: Customer portal creates quotes → status becomes PENDING_APPROVAL → NO admin UI to approve
2. **Orders**: Customer places order → status immediately becomes PENDING → NO approval gate

API endpoints exist for quotes:
- `POST /api/v1/quotes/:id/approve` - Approve quote (subject to threshold)
- `POST /api/v1/quotes/:id/reject` - Reject quote (back to draft)
- `POST /api/v1/quotes/:id/send` - Send approved quote to customer

### Improved Behavior
1. **Admin Quotes Page**: New page showing quotes with workflow actions
   - List all quotes with status filtering
   - Approve/Reject/Send workflow buttons based on status
   - Counter-offer capability (edit and send back)

2. **Order Approval Gate**: Orders from customers require admin confirmation
   - Orders enter PENDING status → Admin confirms → CONFIRMED → Processing begins
   - This uses existing `updateAdmin` with status transition

### Files to Modify (b2b-web)

**Admin Portal - New Pages/Components:**
- `apps/admin/src/app/quotes/page.tsx` - NEW: Admin quotes list
- `apps/admin/src/app/quotes/[id]/page.tsx` - NEW: Admin quote detail with actions
- `apps/admin/src/app/quotes/hooks/use-quotes.ts` - NEW: Admin quotes hooks
- `apps/admin/src/app/quotes/components/` - NEW: Quote components

**Admin Portal - Enhance Orders:**
- `apps/admin/src/app/orders/components/orders-table.tsx` - Add "Confirm" action for PENDING orders
- `apps/admin/src/app/orders/hooks/use-orders.ts` - Add confirm order mutation

**Sidebar Navigation:**
- `apps/admin/src/components/layout/sidebar.tsx` - Add Quotes link

### API Contract Changes
| Endpoint | Method | Change Type | Breaking? |
|----------|--------|-------------|-----------|
| No API changes needed | - | - | No |

### Backward Compatibility
- No breaking changes
- Uses existing API endpoints
- Frontend-only enhancement

### Risks Identified
- Risk 1: Quote approval thresholds may block lower-level admins → Already handled by API (returns error if exceeds threshold)
- Risk 2: Order confirmation may be skipped → Add UI warning for unconfirmed orders

### Test Strategy
- Unit: Component tests for new quote pages
- Integration: E2E tests for quote approval flow
- API Contract: Verify existing endpoints work with new UI

---

## Completion Criteria
- [ ] Admin can view all quotes with status filters
- [ ] Admin can approve quotes (respecting threshold)
- [ ] Admin can reject quotes with reason
- [ ] Admin can send approved quotes to customers
- [ ] Admin can confirm pending orders
- [ ] Sidebar shows Quotes link
- [ ] Build passes
- [ ] Unit tests pass

## Testing Requirements
- [ ] **Component tests** for new quote pages (REQUIRED)
- [ ] **E2E tests** for quote approval flow
- [ ] **Regression tests** - existing tests pass (REQUIRED)

## Dependencies
- Existing Quotes API (PRD-021)
- Existing Orders API (PRD-030)
- Existing Approvals API (PRD-020)

## Max Iterations
5
