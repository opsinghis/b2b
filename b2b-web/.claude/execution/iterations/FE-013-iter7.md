All checks pass. Let me provide the final verification summary:

## FE-013 - Portal Dashboard: Final Verification (Iteration 7)

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| **Personalized welcome message** | ✅ | `apps/portal/src/app/(dashboard)/page.tsx:66-71` - Time-aware greeting via `getGreeting()` function (Good morning/afternoon/evening) + user's first name from auth context |
| **KPI cards (my quotes, contracts, pending approvals)** | ✅ | `apps/portal/src/app/(dashboard)/components/kpi-cards.tsx:12-56` - 3 KPI cards showing: quotes (total/draft/pending), contracts (total/active/expiring soon), and pending approvals with amber highlight indicators |
| **Quick actions (new quote, view contracts)** | ✅ | `apps/portal/src/app/(dashboard)/components/quick-actions.tsx:15-73` - 4 action buttons: "New Quote" (primary), "View Contracts", "My Quotes", "Browse Catalog" |
| **Notification bell with dropdown** | ✅ | `apps/portal/src/app/(dashboard)/components/notification-bell.tsx:29-155` - Bell icon with unread count badge, dropdown showing notifications with category icons, type colors, timestamps, and "Mark all read" functionality; integrated into header at `apps/portal/src/components/layout/header.tsx:35` |
| **Recent activity** | ✅ | `apps/portal/src/app/(dashboard)/components/recent-activity.tsx:53-117` - Activity feed with entity icons (Quote/Contract/Order/Approval), action icons (Create/Update/Approve/Reject/Submit), colored action indicators, and relative timestamps |

**Build Status:** ✅ Passes (`pnpm --filter portal build`)
**Lint Status:** ✅ No warnings or errors

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

All completion criteria are met:
1. **Personalized welcome message** - Time-aware greeting (morning/afternoon/evening) with user's first name
2. **KPI cards** - 3 cards for quotes, contracts, and pending approvals with visual highlights for items needing attention
3. **Quick actions** - "New Quote" (primary), "View Contracts", "My Quotes", "Browse Catalog" buttons
4. **Notification bell** - Bell icon in header with unread count badge, dropdown showing notifications by category/type, mark all read functionality
5. **Recent activity** - Feed showing user actions with entity types, action types, timestamps, and visual indicators

```
<promise>COMPLETE:FE-013</promise>
```
