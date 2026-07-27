# Audit Plan: Combo Package Key (service_price_package_key) Renaming & Compatibility

## Objective

Execute a deep audit and verification of `service_price_package_key` references and renaming impacts across:

1. **WingsLashes Legacy Codebase** (PHP backend `/WingsLashes/Server/src/api/1` & Angular frontend `/WingsLashes/Client`)
2. **mos-lab CRM Codebase** (`apps/api/src/modules/customers/services/combo-recognition.service.ts`, `apps/api/src/modules/catalog/routes.ts`, frontend components in `apps/web/`)

## Milestones & Work Items

### Milestone 1: WingsLashes Legacy Codebase Impact Audit (R1)

- Search and list all occurrences of `service_price_package_key` across PHP models, controllers, services, SQL queries, and Angular frontend.
- Analyze if there are hardcoded package key checks (e.g. `'combo_5_5'`, `'combo_7_3'`, `'single'`, `'refill'`, `'balance'`).
- Evaluate side effects of appending price suffixes (e.g. `_100k`, `_150k`, `_200k` or `_price`) to package keys.
- Rate safety of each reference (Safe / Caution / High Risk / Breaking).

### Milestone 2: mos-lab CRM Compatibility Audit (R2)

- Inspect `apps/api/src/modules/customers/services/combo-recognition.service.ts` for package key regexes, exclusions (`%single%`, `%refill%`, `%balance%`), normalization, and matching.
- Inspect `apps/api/src/modules/catalog/routes.ts` and catalog routes/services for package key generation/modification.
- Inspect `apps/web/` frontend components for hardcoded package key handling.
- Verify 100% compliance with **Rule #21**:
  - `total_price > 0`
  - Package key exclusion (`%single%`, `%refill%`, `%balance%`)
  - `user_service_type = 'combo'` or `service_group = 'combo'`
  - Date range parsing & padding (`parseComboDateBounds`)
  - `user_service_balance` update.

### Milestone 3: Report Synthesis & Risk Assessment

- Consolidate findings into a comprehensive audit report `combo_package_key_audit_report.md` in `.agents/orchestrator/`.
- Produce full tables of references, safety ratings, normalization recommendations, and verification matrix.

### Milestone 4: Review & Verification

- Review findings with reviewer / challenger subagents to verify completeness and accuracy.

## Dispatch Plan

- `explorer_wingslashes`: Subagent (`teamwork_preview_explorer`) to audit WingsLashes PHP backend and Angular frontend.
- `explorer_moslab`: Subagent (`teamwork_preview_explorer`) to audit mos-lab Fastify API and Next.js frontend.
