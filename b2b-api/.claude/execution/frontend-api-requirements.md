# Frontend API Requirements

The frontend needs the following APIs before development can proceed.

**IMPORTANT:** Build ALL these APIs before returning to frontend development.

## DELETE /api/v1/admin/discount-tiers/:id
- **Module:** admin
- **Blocking:** FE-028
- **Priority:** HIGH

## DELETE /api/v1/cart
- **Module:** cart
- **Blocking:** FE-022
- **Priority:** HIGH

## DELETE /api/v1/cart/items/:id
- **Module:** cart
- **Blocking:** FE-022
- **Priority:** HIGH

## GET /api/v1/admin/discount-tiers
- **Module:** admin
- **Blocking:** FE-028
- **Priority:** HIGH

## GET /api/v1/admin/orders
- **Module:** admin
- **Blocking:** FE-030
- **Priority:** HIGH

## GET /api/v1/admin/orders/:id
- **Module:** admin
- **Blocking:** FE-030
- **Priority:** HIGH

## GET /api/v1/admin/promotions
- **Module:** admin
- **Blocking:** FE-029
- **Priority:** HIGH

## GET /api/v1/admin/promotions/:id/analytics
- **Module:** admin
- **Blocking:** FE-029
- **Priority:** HIGH

## GET /api/v1/admin/salary-deductions
- **Module:** admin
- **Blocking:** FE-031
- **Priority:** HIGH

## GET /api/v1/admin/salary-deductions/limit-requests
- **Module:** admin
- **Blocking:** FE-031
- **Priority:** HIGH

## GET /api/v1/admin/salary-deductions/report
- **Module:** admin
- **Blocking:** FE-031
- **Priority:** HIGH

## GET /api/v1/cart
- **Module:** cart
- **Blocking:** FE-022
- **Priority:** HIGH

## GET /api/v1/catalog/categories
- **Module:** catalog
- **Blocking:** FE-021
- **Priority:** HIGH

## GET /api/v1/catalog/products/:id
- **Module:** catalog
- **Blocking:** FE-021
- **Priority:** HIGH

## GET /api/v1/delivery-methods
- **Module:** delivery-methods
- **Blocking:** FE-023
- **Priority:** HIGH

## GET /api/v1/orders
- **Module:** orders
- **Blocking:** FE-026
- **Priority:** HIGH

## GET /api/v1/orders/:id
- **Module:** orders
- **Blocking:** FE-023,FE-025
- **Priority:** HIGH

## GET /api/v1/orders/:id/invoice
- **Module:** orders
- **Blocking:** FE-026
- **Priority:** HIGH

## GET /api/v1/orders/:id/tracking
- **Module:** orders
- **Blocking:** FE-025
- **Priority:** HIGH

## GET /api/v1/partners/me
- **Module:** partners
- **Blocking:** FE-033
- **Priority:** HIGH

## GET /api/v1/partners/me/commission
- **Module:** partners
- **Blocking:** FE-033
- **Priority:** HIGH

## GET /api/v1/partners/me/resources
- **Module:** partners
- **Blocking:** FE-033
- **Priority:** HIGH

## GET /api/v1/partners/me/team
- **Module:** partners
- **Blocking:** FE-033,FE-034
- **Priority:** HIGH

## GET /api/v1/payment-methods
- **Module:** payment-methods
- **Blocking:** FE-024
- **Priority:** HIGH

## GET /api/v1/promotions/available
- **Module:** promotions
- **Blocking:** FE-032
- **Priority:** HIGH

## GET /api/v1/users/:id/addresses
- **Module:** users
- **Blocking:** FE-034
- **Priority:** HIGH

## GET /api/v1/users/me/addresses
- **Module:** users
- **Blocking:** FE-023
- **Priority:** HIGH

## GET /api/v1/users/me/discount-tier
- **Module:** users
- **Blocking:** FE-021,FE-032
- **Priority:** HIGH

## GET /api/v1/users/me/payment-history
- **Module:** users
- **Blocking:** FE-024
- **Priority:** HIGH

## GET /api/v1/users/me/salary-deduction
- **Module:** users
- **Blocking:** FE-024,FE-027
- **Priority:** HIGH

## GET /api/v1/users/me/salary-deduction/history
- **Module:** users
- **Blocking:** FE-027
- **Priority:** HIGH

## GET /api/v1/users/me/savings
- **Module:** users
- **Blocking:** FE-032
- **Priority:** HIGH

## PATCH /api/v1/admin/discount-tiers/:id
- **Module:** admin
- **Blocking:** FE-028
- **Priority:** HIGH

## PATCH /api/v1/admin/orders/:id/status
- **Module:** admin
- **Blocking:** FE-030
- **Priority:** HIGH

## PATCH /api/v1/admin/promotions/:id
- **Module:** admin
- **Blocking:** FE-029
- **Priority:** HIGH

## PATCH /api/v1/admin/salary-deductions/:userId
- **Module:** admin
- **Blocking:** FE-031
- **Priority:** HIGH

## PATCH /api/v1/cart/items/:id
- **Module:** cart
- **Blocking:** FE-022
- **Priority:** HIGH

## PATCH /api/v1/users/me/salary-deduction
- **Module:** users
- **Blocking:** FE-027
- **Priority:** HIGH

## POST /api/v1/admin/coupons/generate
- **Module:** admin
- **Blocking:** FE-029
- **Priority:** HIGH

## POST /api/v1/admin/discount-tiers
- **Module:** admin
- **Blocking:** FE-028
- **Priority:** HIGH

## POST /api/v1/admin/discount-tiers/:id/assign
- **Module:** admin
- **Blocking:** FE-028
- **Priority:** HIGH

## POST /api/v1/admin/orders
- **Module:** admin
- **Blocking:** FE-030
- **Priority:** HIGH

## POST /api/v1/admin/orders/:id/refund
- **Module:** admin
- **Blocking:** FE-030
- **Priority:** HIGH

## POST /api/v1/admin/promotions
- **Module:** admin
- **Blocking:** FE-029
- **Priority:** HIGH

## POST /api/v1/admin/salary-deductions/limit-requests/:id/approve
- **Module:** admin
- **Blocking:** FE-031
- **Priority:** HIGH

## POST /api/v1/cart/apply-coupon
- **Module:** cart
- **Blocking:** FE-032
- **Priority:** HIGH

## POST /api/v1/cart/items
- **Module:** cart
- **Blocking:** FE-022
- **Priority:** HIGH

## POST /api/v1/orders
- **Module:** orders
- **Blocking:** FE-023
- **Priority:** HIGH

## POST /api/v1/orders/:id/cancel
- **Module:** orders
- **Blocking:** FE-025
- **Priority:** HIGH

## POST /api/v1/orders/:id/pay
- **Module:** orders
- **Blocking:** FE-024
- **Priority:** HIGH

## POST /api/v1/orders/:id/reorder
- **Module:** orders
- **Blocking:** FE-026
- **Priority:** HIGH

## POST /api/v1/orders/on-behalf
- **Module:** orders
- **Blocking:** FE-034
- **Priority:** HIGH

## POST /api/v1/users/me/addresses
- **Module:** users
- **Blocking:** FE-023
- **Priority:** HIGH

## POST /api/v1/users/me/salary-deduction/limit-request
- **Module:** users
- **Blocking:** FE-027
- **Priority:** HIGH


---

## Verification

After building all APIs, run:
```bash
npm run dev  # Start backend
curl http://localhost:3000/docs-json | jq '.paths | keys'  # Verify endpoints
```

Then return to frontend:
```bash
cd ../b2b-web
./.claude/ralph.sh --verify-apis  # Verify all APIs available
./.claude/ralph.sh --build        # Start frontend build
```
