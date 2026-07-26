# Audit Plan — Catalog Management Implementation Plan Review

## Objective

Conduct a thorough, multi-perspective audit review of the proposed Implementation Plan for "Catalog Management (Services, Combos & Products CRUD for Admin)" in `mos-lab`.

## Audit Dimensions & Task Breakdown

### Milestone 1: R1 — Schema Correctness Audit

- Compare proposed Prisma models (`service_price`, `product`, `product_language`, `product_price`) against actual WingsLashes PHP models (`ServicePriceDbTable.php`, `ProductDbTable.php`, `ProductLanguageDbTable.php`, `ProductPriceDbTable.php`, `ServiceDbTable.php`, `ServiceLanguageDbTable.php`).
- Audit existing `service` and `service_language` models in `apps/api/prisma/legacy.prisma` against `ServiceDbTable.php` and `ServiceLanguageDbTable.php` for missing columns or mismatched types.
- Output: Field-by-field comparison tables & missing/mismatched column list.

### Milestone 2: R2 — API Design & Completeness Review

- Evaluate 11 proposed endpoints under `/api/catalog/*`.
- Check RESTful naming conventions and consistency with `apps/api/src/server.ts` and existing module routes.
- Verify pagination, input validation, error handling, typing, and `requireRole` middleware signature (`UserRole[]` array vs single string).
- Identify missing endpoints (soft delete, bulk operations, reordering, filtering/search).

### Milestone 3: R3 — Business Logic Gaps & Edge Cases

- Investigate multi-currency handling (`service_price.currency_id`).
- Address multi-store/client tenancy (`client_id`, `client_business_id`).
- Analyze parent-child service hierarchy (`parent_service_id`).
- Catalog valid enum/string values for `service_type`, `service_group`, `service_price_type`.
- Assess cascading effects on disable/delete.
- Enforce `service_price_package_key` format convention for compatibility with `ComboRecognitionService`.

### Milestone 4: R4 — Security & Data Integrity Risk Assessment

- Verify 3-tier admin access control (Backend middleware, Frontend guard, Sidebar visibility).
- Assess READ-ONLY legacy DB rule in AGENTS.md vs CRM writing directly to legacy DB `management`.
- Analyze race conditions and dual-system concurrency with WingsLashes PHP app.
- Evaluate Prisma `$transaction` requirements for multi-table write operations.

### Milestone 5: R5 — Frontend UX & AGENTS.md Compliance

- Audit Theme compliance (Light/Dark mode, `tabular-nums`, Antd design tokens).
- Verify `apiClient` SDK usage, shared types from `@mos-lab/shared`, and backend `.js` file extensions.
- Assess 3-tab layout suitability (Services, Combos, Products).

### Milestone 6: Synthesis & Audit Report Finalization

- Synthesize all subagent findings into a comprehensive audit report with Executive Summary, Risk Ratings (Critical, High, Medium, Low), Proposed Fixes, and Schema Comparison Tables.

## Subagent Allocation Strategy

- Dispatch 5 `teamwork_preview_explorer` subagents (or specialist workers) in parallel for M1 to M5.
- Each explorer will investigate their specific domain and produce a detailed handoff report in their designated working folder (`.agents/teamwork_preview_explorer_r1/`, etc.).
- Synthesize results in M6 and present the final report.
