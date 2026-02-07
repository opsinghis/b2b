Let me verify all completion criteria have been met:

**Completion Criteria Verification:**

1. **Organizations list** - ✅ Created `/apps/admin/src/app/organizations/page.tsx` with:
   - Table view showing all organizations with pagination
   - Search functionality with debouncing
   - Status toggle and delete actions

2. **Organization hierarchy tree view** - ✅ Created `/apps/admin/src/app/organizations/components/organization-tree.tsx` with:
   - Collapsible tree structure showing parent-child relationships
   - Visual indicators for hierarchy depth
   - Actions (edit, manage users) on each node
   - Toggle between list and tree views on the main page

3. **Create organization form** - ✅ Created `/apps/admin/src/app/organizations/components/create-organization-modal.tsx` with:
   - Name, code, description fields
   - Parent organization selection dropdown
   - Form validation

4. **Edit organization page** - ✅ Created `/apps/admin/src/app/organizations/[id]/page.tsx` with:
   - Full edit form for organization details
   - Status card with activate/deactivate/delete actions
   - Parent organization selection with circular reference prevention
   - Change tracking

5. **Assign users to organization** - ✅ Created `/apps/admin/src/app/organizations/components/assign-users-modal.tsx` with:
   - User search functionality
   - Assign/unassign users with pending changes preview
   - Batch apply changes
   - Integrated into the edit organization page

**Additional files created:**
- `apps/admin/src/app/organizations/hooks/use-organizations.ts` - All API hooks
- `apps/admin/src/app/organizations/components/organization-table.tsx` - Table component
- `apps/admin/src/app/organizations/components/pagination.tsx` - Pagination component
- `apps/admin/src/app/organizations/components/index.ts` - Component exports
- Updated `apps/admin/src/components/layout/sidebar.tsx` - Added Organizations link with Network icon

**Build Status:** ✅ Passes successfully

```
<promise>COMPLETE:FE-009</promise>
```
