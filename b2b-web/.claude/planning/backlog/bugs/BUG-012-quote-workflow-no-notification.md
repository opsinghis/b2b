# BUG-012: Quote Approval/Rejection Does Not Send Customer Notification

## Summary
When a quote is approved or rejected with notes, the status changes but no notification is sent to the customer (quote creator). The customer should receive an in-app notification informing them of the approval/rejection and any notes from the approver.

## Priority
**P2** - Feature incomplete - workflow works but notification is missing

## Affected Module
`src/business/quotes/quotes.service.ts` (backend API)

## Related PRD
PRD-021: Quotes Module (backend) - specifically the "Approve/reject with comments" feature

## Type
Bug Fix / Feature Enhancement

---

## LISA Analysis

### Root Cause Investigation
1. The `QuotesService.approve()` and `QuotesService.reject()` methods update status and create audit logs
2. They do NOT call `NotificationsService.notifyUser()` to create customer notifications
3. The `NotificationsService` exists at `src/platform/notifications/notifications.service.ts` with a `notifyUser()` method
4. The quotes service needs to be updated to inject and use the NotificationsService
5. Need to identify the quote creator (`createdById`) to send the notification to

### Files to Investigate
- `src/business/quotes/quotes.service.ts` - Main service lacking notification calls
- `src/business/quotes/quotes.module.ts` - Module needs to import NotificationsModule
- `src/platform/notifications/notifications.service.ts` - Has notifyUser() method ready to use
- `prisma/schema.prisma` - Verify Quote.createdById field exists

### API Contract Analysis
- **No API contract changes** - This fix adds internal behavior
- **No endpoint changes** - approve/reject endpoints remain the same
- **No response schema changes** - Same QuoteResponseDto returned

### Risks Identified
- Risk 1: Circular dependency between modules → Mitigation: Use forwardRef if needed
- Risk 2: Quote may not have createdById → Mitigation: Check for null before notifying

### Test Strategy
- Unit: Test that approve/reject calls notifyUser
- Integration: Verify notification is created in database after approval/rejection

---

## Completion Criteria
- [x] QuotesService imports NotificationsService
- [x] approve() creates notification for quote creator
- [x] reject() creates notification for quote creator with rejection reason
- [x] Build passes
- [x] Unit tests pass (37 quotes tests)
- [ ] Integration tests pass

## Testing Requirements
- [x] **Unit test** for notification mock in test module (COMPLETED)
- [x] **Regression** - all quotes unit tests pass (37/37 tests)

## Dependencies
- NotificationsModule must be imported in QuotesModule

## Max Iterations
5
