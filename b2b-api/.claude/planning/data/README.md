# Planning Data

This folder contains seed data files used during application setup.

## Files

### cleaned_products.json

Master catalog product data (9,488 products) imported during `npm run prisma:seed`.

**Source Fields**:
| Field | Description |
|-------|-------------|
| `product_id` | Maps to `sku` |
| `product_name` | Maps to `name` |
| `description` | Maps to `description` |
| `price` | Maps to `listPrice` (defaults to £1.00 if missing) |
| `material` | Maps to `material` |
| `primary_category` | Maps to `category` |
| `images` | Maps to `images` JSON array |
| `category` | Stored in `attributes.categories` |

**Usage**:

```bash
# Import products via seed script
npm run prisma:seed

# Or via admin API endpoint (runtime)
curl -X POST http://localhost:3000/api/v1/admin/master-catalog/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@.claude/planning/data/cleaned_products.json"
```

## Adding New Seed Data

Place JSON files in this folder and update `prisma/seed.ts` to import them.
