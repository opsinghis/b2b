# BUG-008: Checkout Address Country Validation Error

## Summary
When saving an address on the checkout page, users get a 400 Bad Request error if they enter a country name longer than 2 characters. The backend expects ISO 3166-1 alpha-2 country codes (e.g., "US", "BR", "MX") but the frontend allows free-form text input without validation or guidance.

## Priority
**P2** - Blocks checkout flow when user enters full country name

## Affected Module
`apps/portal/src/app/checkout/components/address-step.tsx` - Frontend form validation

## Related PRD
PRD-032: Checkout Flow

## Type
Bug Fix (Frontend UX)

## API Impact Assessment
- **Endpoints Affected**: None - backend validation is correct
- **Response Schema Changed**: No
- **Breaking Change**: No
- **Consumer Impact**: None

---

## LISA Analysis

### Root Cause Investigation
1. Backend DTO `CreateUserAddressDto` correctly validates `country` with `@MaxLength(2)` for ISO codes
2. Frontend form has a free-text `<Input>` for country with placeholder "US"
3. No frontend validation prevents users from typing full country names
4. No dropdown or guidance tells users to use 2-letter codes
5. Error: "country must be shorter than or equal to 2 characters"

### Files to Investigate
- `apps/portal/src/app/checkout/components/address-step.tsx` - Address form component
- `src/business/payments/dto/user-address.dto.ts` - Backend validation (correct)

### Root Cause
Frontend UX issue - the country input allows any text but should either:
1. Be a dropdown with valid country codes
2. Have maxLength=2 on the input
3. Show validation error before submit

### Risks Identified
- Risk 1: Users don't know country codes → Mitigation: Add a dropdown with common countries

### Test Strategy
- Manual: Enter address with dropdown selection
- Build: Verify frontend builds

---

## Resolution

### Fix Applied
Added `maxLength={2}` attribute to the country input and improved the placeholder/label to indicate 2-letter codes are expected.

### Files Modified
- `apps/portal/src/app/checkout/components/address-step.tsx`

---

## Completion Criteria
- [x] Bug fixed
- [x] Build passes
- [x] Frontend validates country input

## Testing Requirements
- [x] Manual test: Try entering country, constrained to 2 chars
- [x] Build passes

## Dependencies
None

## Max Iterations
1

## Code Change
```tsx
// Before:
<Label htmlFor="country">Country</Label>
<Input
  id="country"
  placeholder="US"
  value={formData.country}
  onChange={(e) => updateField("country", e.target.value)}
/>

// After:
<Label htmlFor="country">Country Code (2-letter ISO)</Label>
<Input
  id="country"
  placeholder="US"
  value={formData.country}
  onChange={(e) => updateField("country", e.target.value.toUpperCase())}
  maxLength={2}
  className="uppercase"
/>
<p className="text-xs text-muted-foreground mt-1">
  e.g., US, CA, MX, BR, GB
</p>
```

## Status
**COMPLETE**
