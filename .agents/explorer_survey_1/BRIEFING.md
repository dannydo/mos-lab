# BRIEFING — 2026-08-08T08:53:00Z

## Mission

Investigate existing backend services, database schemas, KPI route patterns, and legacy tracking structures to lay the groundwork for building the CV Lash Extension Speed Model.

## 🔒 My Identity

- Archetype: explorer
- Roles: survey_explorer_1
- Working directory: /Users/dannydo/projects/mos-lab/.agents/explorer_survey_1
- Original parent: d3d9b188-ba89-48ed-b9b1-36fef7e66301
- Milestone: Investigation and Survey

## 🔒 Key Constraints

- Read-only investigation — do NOT modify application source code (only write to agent folder `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/`)
- Adhere strictly to user rules (Rule #15 check-in date filtering, Rule #21 date range parsing `parseComboDateBounds`, Rule #4 theme mode / tabular-nums, Rule #11 Fastify single source of truth)

## Current Parent

- Conversation ID: d3d9b188-ba89-48ed-b9b1-36fef7e66301
- Updated: 2026-08-08T08:53:00Z

## Investigation State

- **Explored paths**:
  - `ORIGINAL_REQUEST.md` (Full specification of CV Lash Extension Speed Model: log regression formula, 3-layer estimation, monotonicity invariant, adaptive rolling window, CRM schema `crm_cv_speed_profile`, 7 API endpoints, KPI dashboard tab)
  - `apps/api/src/modules/catalog/services/lash-benchmark.service.ts` (`parseLashSpecs()`, `calculateBenchmarks()`, `seedBenchmarks()`, `estimateETA()`, `batchEstimateETA()`)
  - `apps/api/prisma/crm.prisma` (L724-739 `CrmLashTypeBenchmark` / `crm_lash_type_benchmarks`)
  - `apps/api/src/modules/kpi/routes/cv.routes.ts`, `cv-paystub.routes.ts` (Fastify route registration, `requireAuth`, `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')`, raw SQL queries against legacy DB `management`)
  - `apps/api/src/modules/customers/services/combo-recognition.service.ts` (`parseComboDateBounds()`)
  - `apps/api/prisma/legacy.prisma` (`order`, `order_service`, `user_profile`, `report_order`, etc.)
- **Key findings**:
  - Phase times are stored in legacy table `report_order_service` (`preparation_minute`, `pre_servicing_minute`, `cleaning_minute`, `servicing_minute`).
  - Total duration = sum of all 4 phase columns.
  - Service modes: `normal_clean` (no completed lash order in past 2 months), `normal_removal` (has completed lash order in past 2 months), `retain` (`service_type = 'Retain'`).
  - CV Seniority can be queried from `MIN(sb.date_created)` in `staff_bonus` or `MIN(o.booking_date_start)` per CV staff ID.
- **Unexplored areas**: None, all 5 target areas inspected.

## Key Decisions Made

- Proceed to write comprehensive `analysis.md` and `handoff.md` summarizing evidence, SQL snippets, formulas, data flows, and architectural recommendations for model implementation.

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/DISPATCH.md` — Dispatch log
- `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/BRIEFING.md` — Agent briefing & state
- `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/analysis.md` — Detailed survey & investigation findings
- `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/handoff.md` — Handoff report following 5-component structure
