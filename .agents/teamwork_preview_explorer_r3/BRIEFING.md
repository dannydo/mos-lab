# BRIEFING — 2026-07-26T15:29:40+07:00

## Mission

Perform R3: Business Logic Gaps & Edge Cases Review for Catalog Management in mos-lab.

## 🔒 My Identity

- Archetype: Teamwork explorer
- Roles: Read-only investigator
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r3
- Original parent: 35cb364f-e976-430d-abf1-6ac93ece4943
- Milestone: Catalog Management R3 Audit

## 🔒 Key Constraints

- Read-only investigation — do NOT implement code changes in project source files
- Write analysis report to handoff.md in working directory
- Produce comprehensive findings with risk ratings, evidence chains, and concrete proposed fixes

## Current Parent

- Conversation ID: 35cb364f-e976-430d-abf1-6ac93ece4943
- Updated: 2026-07-26T15:29:40+07:00

## Investigation State

- **Explored paths**:
  - `apps/api/src/modules/customers/services/combo-recognition.service.ts`
  - `apps/api/prisma/legacy.prisma`
  - `apps/api/prisma/crm.prisma`
  - `apps/api/src/modules/customers/routes.ts`
  - `apps/api/src/modules/customers/routes/booking.routes.ts`
  - `WingsLashes/Server/src/admin/apps/models/DbTable/ServiceDbTable.php`
  - `WingsLashes/Server/src/admin/apps/models/DbTable/ServicePriceDbTable.php`
  - `WingsLashes/Server/src/admin/apps/models/DbTable/CurrencyDbTable.php`
  - `WingsLashes/Server/src/admin/apps/models/DbTable/ClientBusinessDbTable.php`
  - `WingsLashes/Server/src/admin/apps/modules/admin/controllers/ServiceController.php`
  - `WingsLashes/Server/src/api/1/app/models/Service.php`
  - `WingsLashes/Server/src/api/1/app/models/ServicePrice.php`
  - `WingsLashes/Server/src/api/1/app/models/Product.php`
  - `WingsLashes/Server/src/api/1/app/models/ProductPrice.php`
- **Key findings**:
  - Multi-currency: `currency_id` is NOT NULL unsigned int. Hardcoded `currency_id = 3` (Credit/Points) and `1` (VND) used across legacy queries. Omission in API payload causes MySQL insert failures.
  - Multi-store tenancy: `client_id` and `client_business_id` are NOT NULL in legacy schema. Must default to `1` for single-tenant mos-lab to avoid insertion crashes and SQL `WHERE client_business_id = 1` report invisibility.
  - Parent-child hierarchy: `parent_service_id` maps child services (Refill/Retain, Fix, Removal) to root Normal services. Missing from mos-lab API, risking misclassification and touch-up expiration rule breakage.
  - Valid Enums: Audited exact values for `service_type`, `service_group`, `service_price_type`, and `package_key`.
  - Cascading effects: Disabling a service in legacy updates `service.is_disabled = 1` but leaves `service_price.is_disabled = 0`. Hard deletion corrupts historical `order_service` and `user_service_balance`.
  - Package Key Format: `sp.service_price_package_key` requires `'single'` for base prices and `combo_*` for combos. Arbitrary keys trigger false-positive combo recognition in `ComboRecognitionService`.
- **Unexplored areas**: None, all 6 focus areas fully audited.

## Key Decisions Made

- Completed systematic audit of all 6 Catalog Management areas and prepared 5-component handoff report.

## Artifact Index

- ORIGINAL_REQUEST.md — Subagent task definition
- BRIEFING.md — Persistent memory index
- progress.md — Heartbeat progress tracking
- handoff.md — Comprehensive 5-component analysis report
