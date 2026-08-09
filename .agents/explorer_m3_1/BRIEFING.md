# BRIEFING — 2026-08-08T01:55:54Z

## Mission

Analyze and design Fastify API route structure for Milestone 3 (cv-speed.routes.ts in apps/api/src/modules/kpi/routes/cv-speed.routes.ts).

## 🔒 My Identity

- Archetype: Teamwork explorer
- Roles: Read-only investigation, analysis, route design
- Working directory: /Users/dannydo/projects/mos-lab/.agents/explorer_m3_1
- Original parent: d3d9b188-ba89-48ed-b9b1-36fef7e66301
- Milestone: Milestone 3 - Fastify API Endpoints for KTV Speed & Productivity Metric System

## 🔒 Key Constraints

- Read-only investigation — do NOT implement route code in source files (only write analysis.md and handoff.md in working directory)
- Must inspect existing route files in `apps/api/src/modules/kpi/routes/` and Fastify route registration.
- Design exact route handlers for:
  - `GET /profiles`
  - `GET /matrix`
  - `GET /ranking`
  - `GET /trend/:staffId`
  - `GET /detail/:staffId`
  - `GET /predict`
  - `POST /seed`
- Ensure all routes use `fastify.prisma.crm` and `fastify.prisma.legacy`, apply `parseComboDateBounds` (Rule #21), and use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` (Rule #15).

## Current Parent

- Conversation ID: d3d9b188-ba89-48ed-b9b1-36fef7e66301
- Updated: 2026-08-08T01:55:54Z

## Investigation State

- **Explored paths**:
  - `ORIGINAL_REQUEST.md`
  - `apps/api/src/server.ts`
  - `apps/api/src/modules/kpi/routes.ts`
  - `apps/api/src/modules/kpi/routes/cv.routes.ts`
  - `apps/api/src/modules/kpi/routes/cv-tip.routes.ts`
  - `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`
  - `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`
  - `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`
  - `apps/api/src/modules/customers/services/combo-recognition.service.ts`
  - `packages/shared/src/types/cv-speed.ts`
- **Key findings**:
  - Completed detailed analysis of all 7 required Fastify API endpoints.
  - Identified and documented double-prefix bug in `cv-speed.routes.ts` line 182 (`/api/kpi/cv-speed/ranking`).
  - Verified compliance with Rule #15 (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`), Rule #21 (`parseComboDateBounds`), and dual database separation (`fastify.prisma.crm` and `fastify.prisma.legacy`).
- **Unexplored areas**: None for this milestone phase.

## Key Decisions Made

- Written detailed analysis report to `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/analysis.md`.
- Written 5-component handoff report to `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/handoff.md`.

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/DISPATCH.md` — Dispatch log
- `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/BRIEFING.md` — Briefing file
- `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/analysis.md` — Analysis of Milestone 3 Fastify API routes
- `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/handoff.md` — Handoff report for Milestone 3
