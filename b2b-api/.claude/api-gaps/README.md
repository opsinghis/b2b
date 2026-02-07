# API Gap Requests

This directory receives API requests from the frontend when APIs are missing or insufficient.

## Gap Request Format

Each gap request is a JSON file: `GAP-XXX-description.json`

```json
{
  "id": "GAP-001",
  "requested_by": "FE-021",
  "requested_at": "2026-02-07T10:00:00Z",
  "status": "open",
  
  "endpoint": {
    "method": "POST",
    "path": "/api/v1/orders",
    "description": "Create a new order from cart"
  },
  
  "request_schema": {
    "cartId": "string (required)",
    "deliveryAddressId": "string (required)",
    "paymentMethodId": "string (required)"
  },
  
  "response_schema": {
    "id": "uuid",
    "orderNumber": "string",
    "status": "string",
    "total": "number"
  },
  
  "priority": "P0",
  "notes": "Blocking checkout flow"
}
```

## Processing Gaps

Backend processes gaps by:
1. Running: `./.claude/ralph.sh --process-gaps`
2. This generates PRD items for each gap
3. Ralph loop builds the APIs
4. Updates gap status to "resolved"

## Status Values
- `open` - Waiting to be processed
- `in_progress` - Being built
- `resolved` - API available
- `rejected` - Won't implement (with reason)
