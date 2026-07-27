# Project: Combo Package Key (service_price_package_key) Renaming Audit & Verification

## Architecture

- Legacy Codebase: WingsLashes (PHP Backend `/WingsLashes/Server/src/api/1` + Angular Frontend `/WingsLashes/Client`)
- CRM Codebase: mos-lab (Next.js 15 Frontend `apps/web` + Fastify 5 API `apps/api`)
- Database: MySQL Legacy DB (`management`) & CRM DB (`mos_lab`)
- Target Deliverable: Comprehensive audit report `combo_package_key_audit_report.md` in `.agents/orchestrator/`

## Milestones

| #   | Name                          | Scope                                                                                                                                                                | Dependencies | Status |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | M1_wingslashes_legacy_audit   | Audit WingsLashes PHP backend models/controllers and Angular frontend for all references to `service_price_package_key`, hardcoded checks, price suffix side-effects | None         | DONE   |
| 2   | M2_moslab_crm_audit           | Verify `service_price_package_key` in `combo-recognition.service.ts`, `catalog/routes.ts`, frontend components, ensuring 100% compliance with Rule #21               | None         | DONE   |
| 3   | M3_audit_synthesis_and_report | Synthesize comprehensive audit report documenting all references, safety ratings, normalizations, and Rule #21 verification                                          | M1, M2       | DONE   |
| 4   | M4_review_and_verification    | Independent review and verification of audit findings and evidence                                                                                                   | M3           | DONE   |

## Code Layout

- `WingsLashes/Server/src/api/1/`: WingsLashes PHP backend models and controllers
- `WingsLashes/Client/`: WingsLashes Angular frontend components and services
- `apps/api/src/modules/customers/services/combo-recognition.service.ts`: mos-lab combo recognition logic
- `apps/api/src/modules/catalog/routes.ts`: mos-lab catalog management API routes
- `apps/web/`: mos-lab Next.js frontend
- `packages/shared/`: Shared types
