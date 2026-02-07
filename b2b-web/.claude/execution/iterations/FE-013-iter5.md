All components are properly exported. Let me verify the completion criteria one more time by creating a summary:

## FE-013 - Portal Dashboard: Verification Summary (Iteration 5)

All completion criteria have been verified and build passes:

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| **Personalized welcome message** | ✅ | `page.tsx:66-71` - Time-aware greeting via `getGreeting()` function (Good morning/afternoon/evening) + user's first name |
| **KPI cards (my quotes, contracts, pending approvals)** | ✅ | `kpi-cards.tsx:12-56` - 3 KPI cards showing quotes (total/draft/pending), contracts (total/active/expiring), and pending approvals with amber highlight indicators |
| **Quick actions (new quote, view contracts)** | ✅ | `quick-actions.tsx:15-73` - 4 action buttons: "New Quote" (primary), "View Contracts", "My Quotes", "Browse Catalog" |
| **Notification bell with dropdown** | ✅ | `notification-bell.tsx:29-155` - Bell icon with unread count badge, dropdown showing notifications with category icons, type colors, timestamps, and "Mark all read" functionality; integrated into `header.tsx:35` |
| **Recent activity** | ✅ | `recent-activity.tsx:53-117` - Activity feed with entity icons (Quote/Contract/Order/Approval), action icons (Create/Update/Approve/Reject/Submit), colored action indicators, and relative timestamps |

**Build Status:** ✅ Passes

**Files Implemented:**
- `apps/portal/src/app/(dashboard)/page.tsx` - Main dashboard page with loading/error states
- `apps/portal/src/app/(dashboard)/components/kpi-cards.tsx` - KPI cards component
- `apps/portal/src/app/(dashboard)/components/quick-actions.tsx` - Quick actions component
- `apps/portal/src/app/(dashboard)/components/notification-bell.tsx` - Notification bell with dropdown
- `apps/portal/src/app/(dashboard)/components/recent-activity.tsx` - Recent activity feed
- `apps/portal/src/app/(dashboard)/components/index.ts` - Component exports
- `apps/portal/src/app/(dashboard)/hooks/use-dashboard.ts` - Dashboard data hook with API integration
- `apps/portal/src/app/(dashboard)/hooks/use-notifications.ts` - Notifications hook with read/unread mutations
- `apps/portal/src/app/(dashboard)/hooks/index.ts` - Hook exports
- `apps/portal/src/components/layout/header.tsx` - Header with notification bell integration

```
<promise>COMPLETE:FE-013</promise>
```
