Let me verify all the completion criteria are met:

**Completion Criteria Review:**

1. **Personalized welcome message** - Implemented in `apps/portal/src/app/(dashboard)/page.tsx`:
   - Uses `getGreeting()` to show time-appropriate greeting (Good morning/afternoon/evening)
   - Uses `user.firstName` from auth context for personalization
   - Shows "Here's what's happening with your account today."

2. **KPI cards (my quotes, contracts, pending approvals)** - Implemented in `apps/portal/src/app/(dashboard)/components/kpi-cards.tsx`:
   - My Quotes card showing total, draft, and pending counts
   - My Contracts card showing total, active, and expiring soon counts  
   - Pending Approvals card showing total with breakdown of quotes and contracts
   - Cards highlight with amber border when attention is needed

3. **Quick actions (new quote, view contracts)** - Implemented in `apps/portal/src/app/(dashboard)/components/quick-actions.tsx`:
   - "New Quote" - primary action to create a new quote request
   - "View Contracts" - browse active contracts
   - "My Quotes" - view all quotes
   - "Browse Catalog" - explore available products

4. **Notification bell with dropdown** - Implemented in `apps/portal/src/app/(dashboard)/components/notification-bell.tsx`:
   - Bell icon with unread count badge
   - Dropdown popover showing notifications
   - Mark as read on click
   - "Mark all read" button
   - Visual indicators for notification type/category
   - Link to full notifications page

5. **Recent activity** - Implemented in `apps/portal/src/app/(dashboard)/components/recent-activity.tsx`:
   - Activity feed showing recent actions
   - Entity icons (quote, contract, order, approval)
   - Action icons with colors (create, update, approve, reject, submit)
   - Time ago formatting
   - Empty state handling

All completion criteria have been met! The build passes successfully.

```
<promise>COMPLETE:FE-013</promise>
```
