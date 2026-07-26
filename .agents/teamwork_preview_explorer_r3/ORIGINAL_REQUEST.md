# Subagent Task: R3 — Business Logic Gaps & Edge Cases Review

## Working Directory

/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r3

## Task Description

Audit business logic gaps, edge cases, and enum/constant specifications for Catalog Management.

### Source Files to Examine:

1. `apps/api/src/modules/customers/services/combo-recognition.service.ts` (examine `service_price_package_key` rules, package matching, `%single%`, `%refill%`, `%balance%` exclusions)
2. `apps/api/prisma/legacy.prisma`
3. WingsLashes PHP codebase (e.g. `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServiceDbTable.php`, `ServicePriceDbTable.php`, etc. to discover valid values for `service_type`, `service_group`, `service_price_type`, `package_key`, `currency_id`, `client_id`, `client_business_id`)
4. Rules in `AGENTS.md` (e.g. Rule #21 Unified Combo Recognition, Rule #13 FAL rules)

### Detailed Instructions:

1. Multi-currency handling: Examine `service_price.currency_id`. What currencies exist in legacy DB? What default currency should be used for mos-lab single-tenant setup? How should price creation handle `currency_id`?
2. Multi-store/client tenancy: `client_id` and `client_business_id` in `service` and `product`. What fixed default values are required for single-tenant mos-lab?
3. Parent-child service hierarchy: `service.parent_service_id`. How is hierarchy structured in legacy DB? How should admin UI display/manage parent vs child services?
4. Valid enum/constant values: Audit exact values used in WingsLashes and mos-lab codebase for:
   - `service_type` (e.g. Normal, Fix, Adjust, Log...)
   - `service_group` (e.g. combo, single, product...)
   - `service_price_type`
   - `package_key` format conventions
5. Cascading effects: What happens when a service or product is disabled/deleted? Do child `service_price` or `product_price` records get soft-disabled? How does disabling a service impact existing `order_service`, `user_service_balance`, or booking workflows?
6. Package Key Format Convention: Inspect `ComboRecognitionService` and legacy DB for `service_price_package_key`. Define exact package key naming format required so CRM combo recognition doesn't break.
7. Write a detailed report `handoff.md` in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r3/` with risk ratings, clear analysis, and concrete proposed fixes for each edge case.
