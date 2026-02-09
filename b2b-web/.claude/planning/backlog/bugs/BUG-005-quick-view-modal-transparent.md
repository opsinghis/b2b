# BUG-005: Quick View Modal Appears Transparent

## Summary
On the catalog page, when clicking "Quick View" on a product, the modal window loads but appears transparent/see-through, making it difficult to read the content.

## Priority
**P2** - High visibility issue affecting user experience on catalog browsing

## Affected Module
`apps/portal/src/app/catalog` - Frontend portal (CSS)

## Related PRD
None - CSS infrastructure issue

## Type
Bug Fix

## API Impact Assessment
- **Endpoints Affected**: None
- **Response Schema Changed**: No
- **Breaking Change**: No
- **Consumer Impact**: None (frontend-only CSS fix)

---

## LISA Analysis

### Root Cause Investigation
1. Checked the ProductQuickView component - uses Modal from @b2b/ui
2. Modal component uses `bg-background` Tailwind class
3. `bg-background` resolves to `hsl(var(--background))` in Tailwind
4. Portal's globals.css was missing the `--background` CSS variable definition
5. Without `--background` defined, the background color resolves to transparent

### Files Investigated
- `apps/portal/src/app/catalog/components/product-quick-view.tsx` - Uses Modal component
- `packages/ui/src/components/modal.tsx` - Uses `bg-background` class
- `packages/ui/src/styles/globals.css` - Has proper CSS variable definitions
- `apps/portal/src/app/globals.css` - **Missing CSS variables**

### Root Cause
The portal's `globals.css` file was not including the CSS custom properties (CSS variables) that the UI package components rely on. Specifically:
- `--background` (for `bg-background`)
- `--foreground` (for `text-foreground`)
- `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`

Without these variables, Tailwind classes like `bg-background`, `text-foreground`, `bg-card`, etc. resolve to `hsl()` with no value, causing transparent/invisible backgrounds.

### Risks Identified
- Risk 1: Other components might have similar issues → Mitigation: Fixed by adding all CSS variables

### Test Strategy
- Visual: Verify modal has solid white background in light mode
- Visual: Verify modal has solid dark background in dark mode

---

## Resolution

### Fix Applied
Updated `apps/portal/src/app/globals.css` to include all CSS custom properties from the UI package:
- Added light mode variables in `:root`
- Added dark mode variables in `.dark`
- Added base layer styles for `border-border` and `bg-background text-foreground`

### Files Modified
- `apps/portal/src/app/globals.css`

---

## Completion Criteria
- [x] Bug fixed
- [x] Build passes
- [x] Modal now has solid background color
- [x] All UI components using CSS variables work correctly

## Testing Requirements
- [x] Visual verification - modal background is solid white
- [x] Build passes

## Dependencies
None

## Max Iterations
1 (completed in single iteration)

## Status
**COMPLETE** - Fixed by adding missing CSS variables to portal's globals.css
