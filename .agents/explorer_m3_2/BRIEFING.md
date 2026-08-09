# BRIEFING — 2026-08-08T01:56:10Z

## Mission

Investigate data integration, query parameters, filtering, pagination, and service binding for the 7 CV Speed API endpoints in Fastify.

## 🔒 My Identity

- Archetype: Teamwork explorer
- Roles: Read-only investigator for M3 CV Speed API integration
- Working directory: /Users/dannydo/projects/mos-lab/.agents/explorer_m3_2
- Original parent: d3d9b188-ba89-48ed-b9b1-36fef7e66301
- Milestone: M3 (Fastify API Endpoints)

## 🔒 Key Constraints

- Read-only investigation — do NOT implement application code
- Output detailed integration spec in analysis.md and handoff report in handoff.md

## Current Parent

- Conversation ID: d3d9b188-ba89-48ed-b9b1-36fef7e66301
- Updated: 2026-08-08T01:56:10Z

## Investigation State

- **Explored paths**: `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`, `apps/api/src/modules/kpi/routes.ts`, `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`, `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`, `apps/api/src/modules/teams/team.service.ts`, `apps/api/src/modules/customers/services/combo-recognition.service.ts`, `apps/api/prisma/crm.prisma`, `packages/shared/src/types/cv-speed.ts`.
- **Key findings**:
  1. `ACTIVE_CV_STAFF_CONFIG` filtering resolved via `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')` with fallback to `DEFAULT_FALLBACK_CV_IDS = [47510, 48026, 46092, 37790, 34295, 51659]`.
  2. Date bounds parsing complies with Rule #21 (`parseComboDateBounds`) and Rule #15 (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`).
  3. Handlers for matrix, ranking, predict, profiles, detail, trend, and seed endpoints have complete design specs mapped to `@mos-lab/shared` types.
- **Unexplored areas**: None.

## Key Decisions Made

- Handlers in `cv-speed.routes.ts` will perform dynamic on-the-fly model predictions if pre-seeded data in `crm_cv_speed_profile` is missing for any cell/CV.
- All 7 endpoints are protected with `{ preHandler: [requireAuth] }` and registered under `/api/kpi/cv-speed/*`.

## Artifact Index

- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_2/DISPATCH.md — Dispatch log
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_2/BRIEFING.md — Working memory briefing
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_2/progress.md — Progress log
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_2/analysis.md — Technical integration specification for M3 Fastify API endpoints
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_2/handoff.md — 5-component handoff report
