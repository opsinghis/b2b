All checks pass. Let me provide a summary of the implementation:

## Summary: FE-008 - Admin - User Management Implementation

### Files Created:

**Hooks:**
- `apps/admin/src/app/users/hooks/use-users.ts` - React Query hooks for all user operations

**Components:**
- `apps/admin/src/app/users/components/user-table.tsx` - Users data table with actions
- `apps/admin/src/app/users/components/create-user-modal.tsx` - Modal form for creating users
- `apps/admin/src/app/users/components/reset-password-modal.tsx` - Modal for password reset
- `apps/admin/src/app/users/components/user-filters.tsx` - Role and status filter dropdowns
- `apps/admin/src/app/users/components/pagination.tsx` - Pagination component
- `apps/admin/src/app/users/components/index.ts` - Barrel export

**Pages:**
- `apps/admin/src/app/users/page.tsx` - Users list page with filters
- `apps/admin/src/app/users/[id]/page.tsx` - Edit user page

### Features Implemented:

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| Users list with filters (role, status) | Done | `UserFilters` component with Select dropdowns |
| Create user modal/form | Done | `CreateUserModal` with validation |
| Edit user page | Done | `/users/[id]` page with form |
| Role assignment dropdown | Done | Select component in create/edit forms |
| Password reset action | Done | `ResetPasswordModal` (placeholder - API missing) |
| Deactivate/activate user | Done | Toggle buttons in table and edit page |

### Build Status:
- `pnpm --filter admin build` - Passes
- `pnpm --filter admin lint` - No warnings or errors

### Note:
The password reset feature is implemented as a placeholder since the API doesn't currently support admin-initiated password reset. The UI is complete and ready; it just needs a backend endpoint like `POST /api/v1/admin/users/{id}/reset-password` to function properly.

<promise>COMPLETE:FE-008</promise>
