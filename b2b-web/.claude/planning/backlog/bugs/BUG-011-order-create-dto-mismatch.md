# BUG-011: Order Creation DTO Mismatch - Frontend Sends IDs, Backend Expects Objects

## Summary
When placing an order from checkout, the API returns 400 Bad Request with validation errors indicating that the properties `shippingAddressId`, `billingAddressId`, `deliveryMethodId`, and `paymentMethodId` should not exist. The frontend sends ID references while the backend expects different fields (nested address objects or no reference to delivery/payment methods).

## Priority
**P1** - Critical: Blocks order placement completely

## Affected Module
`src/business/orders` - Backend order creation

## Related PRD
PRD-032: Checkout Flow

## Type
Bug Fix (API Contract Mismatch)

## API Impact Assessment
- **Endpoints Affected**: `POST /api/v1/orders`
- **Response Schema Changed**: No (still returns OrderResponseDto)
- **Breaking Change**: No - Adding fields to accept (additive)
- **Consumer Impact**: None - Fix enables frontend to work

---

## LISA Analysis

### Root Cause Investigation
1. Frontend sends: `{ shippingAddressId, billingAddressId, deliveryMethodId, paymentMethodId }`
2. Backend DTO only accepts: `{ notes, shippingAddress (object), billingAddress (object), metadata }`
3. ValidationPipe has `forbidNonWhitelisted: true` which rejects unknown properties
4. The DTO was designed for a different checkout flow where addresses are passed inline

### Files to Investigate
- `src/business/orders/dto/create-order.dto.ts` - DTO needs ID-based fields
- `src/business/orders/orders.service.ts` - Service needs to resolve IDs to addresses
- `src/business/payments/user-addresses.service.ts` - To fetch addresses by ID
- `src/business/payments/delivery-methods.service.ts` - To fetch delivery methods
- `src/business/payments/payment-methods.service.ts` - To fetch payment methods

### API Contract Analysis
- Current Request Schema: `{ notes?, shippingAddress?, billingAddress?, metadata? }`
- Expected Request Schema: `{ notes?, shippingAddressId?, billingAddressId?, deliveryMethodId?, paymentMethodId?, metadata? }`
- Response Schema: Unchanged (OrderResponseDto)

### Risks Identified
- Risk 1: IDs might reference non-existent entities → Mitigation: Validate IDs exist before creating order
- Risk 2: IDs might belong to different tenant → Mitigation: Include tenantId in queries

### Test Strategy
- Unit: Test DTO validation accepts new fields
- Integration: Test order creation with ID-based checkout
- API Contract: Verify request schema accepts both formats

---

## Completion Criteria
- [ ] Bug fixed
- [ ] DTO accepts ID-based fields
- [ ] Service resolves IDs to entities
- [ ] Order stores delivery/payment method references
- [ ] Build passes
- [ ] Unit tests pass
- [ ] Integration tests pass

## Testing Requirements
- [ ] **Unit test** for DTO validation (REQUIRED)
- [ ] **Integration test** for order creation endpoint (REQUIRED)
- [ ] **API contract validation** (REQUIRED)
- [ ] **Regression** - all tests pass (REQUIRED)

## Dependencies
- UserAddressesService
- DeliveryMethodsService
- PaymentMethodsService

## Max Iterations
5

## Status
IN PROGRESS
