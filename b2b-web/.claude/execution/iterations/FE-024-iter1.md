The implementation is complete. Here's a summary of what was implemented:

## Summary of FE-024: Portal - Payment Methods

### Files Created/Modified:

**New Files:**
- `apps/portal/src/app/payment-history/page.tsx` - Full payment history page with salary deduction summary

**Modified Files:**
- `apps/portal/src/app/checkout/hooks/use-checkout.ts` - Added payment methods API hooks:
  - `usePaymentMethods()` - Fetch available payment methods
  - `useSalaryDeduction()` - Fetch employee salary deduction status/limits
  - `useProcessPayment()` - Process payment for an order
  - `usePaymentHistory()` - Fetch user's payment history

- `apps/portal/src/app/checkout/context/checkout-context.tsx` - Updated state to support:
  - `paymentMethodType` - Track selected payment type
  - `selectedPaymentMethod` - Store full payment method object
  - Updated validation logic for salary deduction

- `apps/portal/src/app/checkout/components/payment-step.tsx` - Complete rewrite with:
  - API-fetched payment methods
  - Salary deduction option with limit/balance display
  - Credit card, Invoice, and Purchase Order options
  - Links to payment history

- `apps/portal/src/app/checkout/components/review-step.tsx` - Updated to:
  - Display selected payment method
  - Process payments via API
  - Show salary deduction notice

- `apps/portal/src/app/checkout/components/confirmation-step.tsx` - Updated to:
  - Display payment method info
  - Show salary deduction confirmation
  - Link to payment history

- `packages/api-client/src/index.ts` - Added type exports:
  - `ProcessPaymentDto`
  - `PaymentResponseDto`
  - `PaymentHistoryResponseDto`

```
<promise>COMPLETE:FE-024</promise>
```
