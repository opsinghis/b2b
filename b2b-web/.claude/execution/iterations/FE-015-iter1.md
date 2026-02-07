## Summary of Implementation

I have implemented **FE-015 - Portal - Contract Workflow** with all completion criteria met:

### Completion Criteria Status

| Criteria | Status | Implementation |
|----------|--------|----------------|
| Create contract form | ✅ | `apps/portal/src/app/contracts/components/contract-form.tsx` |
| Submit for review button | ✅ | "Save & Submit for Review" button in ContractForm + WorkflowActions "Submit for Review" |
| Workflow action buttons (based on status) | ✅ | `workflow-actions.tsx` - Shows different buttons based on contract status |
| Approve/reject with comments modal | ✅ | `workflow-action-modal.tsx` - Modal with configurable actions and comments |
| Status transition confirmations | ✅ | WorkflowActionModal provides confirmation dialogs before each action |

### Files Created/Modified

**New Files:**
- `apps/portal/src/app/contracts/components/contract-form.tsx` - Form for creating contracts
- `apps/portal/src/app/contracts/components/workflow-action-modal.tsx` - Modal for workflow actions with comments
- `apps/portal/src/app/contracts/components/workflow-actions.tsx` - Status-based workflow action buttons
- `apps/portal/src/app/contracts/new/page.tsx` - New contract creation page

**Modified Files:**
- `apps/portal/src/app/contracts/hooks/use-contracts.ts` - Added mutation hooks for workflow actions
- `apps/portal/src/app/contracts/hooks/index.ts` - Updated exports
- `apps/portal/src/app/contracts/components/index.ts` - Updated exports
- `apps/portal/src/app/contracts/[id]/page.tsx` - Added workflow actions to detail page
- `apps/portal/src/app/contracts/page.tsx` - Added "Create Contract" button

### Workflow Action Flow

The workflow buttons shown depend on contract status:
- **DRAFT** → "Submit for Review" button
- **PENDING_APPROVAL** → "Approve" and "Reject" buttons
- **APPROVED** → "Activate" button
- **ACTIVE/EXPIRED/TERMINATED/CANCELLED** → No actions available

All API endpoints are used:
- `POST /api/v1/contracts` - Create contract
- `POST /api/v1/contracts/:id/submit` - Submit for review
- `POST /api/v1/contracts/:id/approve` - Approve contract
- `POST /api/v1/contracts/:id/reject` - Reject contract (requires comment)
- `POST /api/v1/contracts/:id/activate` - Activate contract

```
<promise>COMPLETE:FE-015</promise>
```
