## 2026-07-26T16:52:34Z

You are an Explorer subagent (mos-lab CRM Codebase Auditor).
Your working directory is: /Users/dannydo/projects/mos-lab/.agents/explorer_r2

TASK:
Perform a deep, comprehensive audit of all references to `service_price_package_key` across the mos-lab codebase (`apps/api/`, `apps/web/`, `packages/shared/`).

Key Audit Directives:

1. Audit `apps/api/src/modules/customers/services/combo-recognition.service.ts`:
   - Inspect package key queries, SQL filters (`NOT LIKE '%single%'`, `NOT LIKE '%refill%'`, `NOT LIKE '%balance%'`), normalization routines, and regex parsing (e.g., `X+Y` parsing for combo count).
   - Determine if adding price suffixes (e.g. `_100k`, `_150k`, `_200k` or price numbers) breaks package key matching, combo recognition, or count extraction.
   - Verify 100% compliance with Rule #21 (Unified Combo Recognition & Date Range Parsing Invariant):
     (1) `order_state = 'Completed'`
     (2) Combo detail in `order_service_combo` (`total_price > 0`, package key exclusion) OR `order_service` (`user_service_type = 'combo'` / `service_group = 'combo'`)
     (3) `user_service_balance` update
     (4) `parseComboDateBounds` usage for `dateFrom` and `dateTo` (YYYY-MM-DD 00:00:00 to 23:59:59).
2. Audit `apps/api/src/modules/catalog/routes.ts` and catalog services/routes:
   - Check how `service_price_package_key` is generated, validated, updated, and queried in catalog CRUD endpoints.
   - Check if admin creation/update of combos handles package keys with price suffixes cleanly.
3. Audit `apps/web/` frontend components & `packages/shared/`:
   - Search all frontend references to `service_price_package_key`, `package_key`, `packageKey`.
   - Check UI components, tables, select dropdowns, report filters, and modals.
4. Document EVERY reference found with:
   - File Path
   - Line Number(s)
   - Code Snippet
   - Context & Purpose
   - Safety Rating: SAFE / CAUTION / HIGH_RISK.
5. Provide precise recommendations and code fixes for any potential issues.

OUTPUT:
Write your full report to `/Users/dannydo/projects/mos-lab/.agents/explorer_r2/r2_moslab_audit.md` and write a handoff summary to `/Users/dannydo/projects/mos-lab/.agents/explorer_r2/handoff.md`.
Communicate back via send_message when done.
