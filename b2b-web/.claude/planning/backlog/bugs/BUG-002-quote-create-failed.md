# BUG-002: Quote Creation Fails on Submit for Approval

## Summary
When creating a new quote and submitting it for approval, the operation fails with "failed to create a quote" error message.

## Priority
**P1** - Critical functionality blocking quote workflow

## Affected Module
`apps/portal/src/app/quotes`

## Related PRD
PRD-021: Quotes Module (backend)

## Type
Bug Fix

## API Impact Assessment
- **Endpoints Affected**: POST /api/v1/quotes (create quote)
- **Response Schema Changed**: TBD
- **Breaking Change**: TBD
- **Consumer Impact**: High - blocks quote creation flow

---

## LISA Analysis

### Root Cause Investigation
1. Check quotes page component for form submission
2. Check API client for quote creation call
3. Verify request payload matches API expectations
4. Check error handling and response parsing
5. Verify authentication token is being sent
6. Check network request/response in browser dev tools

### Files to Investigate
- `apps/portal/src/app/quotes/new/page.tsx` - Quote creation page
- `apps/portal/src/app/quotes/components/` - Quote form components
- `packages/api-client/` - API client for quotes
- Browser network tab - actual API request/response

### Risks Identified
- Risk 1: Missing required field in request → Mitigation: Check DTO requirements
- Risk 2: Auth token not sent → Mitigation: Verify auth headers
- Risk 3: API endpoint URL mismatch → Mitigation: Check API client config

### Test Strategy
- Unit: Test quote form submission
- E2E: Test quote creation flow
- API Contract: Verify request matches API spec

---

## Completion Criteria
- [x] Bug fixed
- [x] Build passes
- [x] Unit tests pass (2898 tests)
- [x] Quote creation works in UI

## Testing Requirements
- [x] **Unit test** for the specific fix (REQUIRED) - quotes.service.spec.ts (37 tests pass)
- [x] **API verification** - tested POST /api/v1/quotes and POST /api/v1/quotes/:id/submit
- [x] **Manual verification** - API returns 201 for USER role

## Dependencies
Backend API must be running

## Max Iterations
5

---

## Resolution (2026-02-08)

### Root Cause
The backend quotes controller (`b2b-api/src/business/quotes/quotes.controller.ts`) used `@CanManage('Quote')` decorator for the create, update, and submit endpoints. The `@CanManage` decorator requires the 'manage' permission, but the USER role in the ability factory only has `create`, `read`, `update`, and `submit` permissions on Quote - not 'manage'.

### Fixes Applied
1. **Backend** (`b2b-api/src/core/authorization/check-ability.decorator.ts`):
   - Added `CanSubmit` decorator for submit action
   - Added `CanApprove` decorator for approve action

2. **Backend** (`b2b-api/src/business/quotes/quotes.controller.ts`):
   - Changed POST `/quotes` from `@CanManage` to `@CanCreate`
   - Changed PATCH `/quotes/:id` from `@CanManage` to `@CanUpdate`
   - Changed POST `/quotes/:id/submit` from `@CanManage` to `@CanSubmit`

### Verification
- API now returns 201 for USER role creating quotes
- Quote can be created and submitted for approval
- All 2898 unit tests pass
- Build successful
- Status: **COMPLETE**
