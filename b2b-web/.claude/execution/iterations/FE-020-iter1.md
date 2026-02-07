Let me verify the completion criteria are all met:

## Summary of Implementation - FE-020: Portal - Notifications & Preferences

### Completion Criteria Status:

| Criteria | Status | Implementation |
|----------|--------|----------------|
| Notifications dropdown with badge | ✅ | Enhanced `NotificationBell` component at `apps/portal/src/app/(dashboard)/components/notification-bell.tsx` with badge showing unread count |
| Mark as read/unread | ✅ | Added `useMarkNotificationUnread` hook and toggle buttons in both dropdown and notifications list page |
| Mark all as read | ✅ | Already existed, enhanced with button in dropdown header and notifications page |
| Notification preferences page | ✅ | Created `/settings/notifications` page with full preferences UI |
| Email notification toggles | ✅ | Implemented in preferences page with toggles for quotes, contracts, approvals, and system notifications |

### Files Created/Modified:

**New Files:**
- `packages/ui/src/components/switch.tsx` - Switch component for toggles
- `apps/portal/src/app/notifications/page.tsx` - Full notifications list page
- `apps/portal/src/app/settings/notifications/page.tsx` - Notification preferences page
- `apps/portal/src/app/settings/notifications/use-notification-preferences.ts` - Preferences hook with local storage

**Modified Files:**
- `packages/ui/src/index.ts` - Export Switch component
- `apps/portal/src/app/(dashboard)/hooks/use-notifications.ts` - Added `useMarkNotificationUnread` hook
- `apps/portal/src/app/(dashboard)/components/notification-bell.tsx` - Enhanced with mark as unread, preferences link, and improved UX

**Dependencies Added:**
- `@radix-ui/react-switch` to `packages/ui`

### Features:
1. **NotificationBell Component**: Shows badge with unread count, dropdown with notifications, mark as read/unread per notification, mark all as read, and link to preferences
2. **Notifications List Page** (`/notifications`): Full-page view of all notifications with filtering (all/unread), mark as read/unread, mark all as read
3. **Notification Preferences Page** (`/settings/notifications`): 
   - Email notification toggles (enabled, quotes, contracts, approvals, system)
   - In-app notification toggles (enabled, quotes, contracts, approvals, system)
   - Email digest settings (enabled, frequency: daily/weekly/never)
   - Reset to defaults functionality
   - Preferences stored in localStorage

<promise>COMPLETE:FE-020</promise>
