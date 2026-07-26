# Subagent Task: R1 — Schema Correctness Audit

## Working Directory

/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r1

## Task Description

Perform a field-by-field audit comparing the actual WingsLashes PHP models with the existing and proposed Prisma schemas for legacy database (`apps/api/prisma/legacy.prisma`).

### Source Files to Examine:

1. WingsLashes PHP models:
   - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServicePriceDbTable.php`
   - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ProductDbTable.php`
   - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ProductLanguageDbTable.php`
   - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ProductPriceDbTable.php`
   - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServiceDbTable.php`
   - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServiceLanguageDbTable.php`

2. Existing Prisma schema:
   - `/Users/dannydo/projects/mos-lab/apps/api/prisma/legacy.prisma` (examine existing `service`, `service_language`, and any other related models)

### Detailed Instructions:

1. Compare every column (column name, data type, nullability, default value, primary keys, foreign keys/indexes) between the WingsLashes PHP DbTable definitions and the Prisma schema (existing and proposed).
2. Check existing `service` model in `legacy.prisma` against `ServiceDbTable.php` line by line:
   - Look specifically for missing columns (e.g., `reminding_interval_day` vs `remind_interval_day`, `duration_minute_standard`, `last_day_required`, `attribute_set_id`, `client_id`, `client_business_id`, `parent_service_id`, etc.).
3. Check existing `service_language` model in `legacy.prisma` against `ServiceLanguageDbTable.php`.
4. Construct complete Prisma model definitions for: `service_price`, `product`, `product_language`, `product_price`, plus updated/corrected `service` and `service_language`.
5. Format findings into markdown tables comparing PHP DbTable fields vs Prisma fields.
6. Write a comprehensive report `handoff.md` in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r1/` detailing all discrepancies, missing fields, data type mismatches, risk levels, and exact proposed Prisma schema fixes.
