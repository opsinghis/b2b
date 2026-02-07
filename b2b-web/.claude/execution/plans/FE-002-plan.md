# Plan: FE-002 - Next.js Admin Scaffold

## Module: apps/admin

## Completion Criteria
- [x] Next.js 14+ with App Router
- [x] TypeScript strict mode
- [x] Tailwind CSS configured
- [x] pnpm --filter admin dev works (port 3002)
- [x] Basic layout with sidebar placeholder

## API Dependencies
None - this is a scaffold feature.

## Implementation Plan

### Components Created
- `src/components/layout/sidebar.tsx` - Main sidebar navigation with placeholder links
- `src/components/layout/header.tsx` - Header component with search and notifications placeholder
- `src/components/layout/index.ts` - Barrel export for layout components

### Files Modified
- `src/app/globals.css` - Added CSS custom properties for theming (shadcn/ui compatible)
- `src/app/layout.tsx` - Added sidebar to root layout
- `src/app/page.tsx` - Updated to dashboard page with stats cards placeholder

### State Management
- No state management needed for scaffold
- Using `usePathname` from next/navigation for active nav highlighting

### Testing Strategy
- Type checking: `pnpm --filter @b2b/admin typecheck` - PASSED
- Build: `pnpm --filter @b2b/admin build` - PASSED
- Dev server: `pnpm --filter @b2b/admin dev` starts on port 3002 - PASSED

## Ready for Ralph: [x] COMPLETE
