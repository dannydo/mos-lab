## 2026-08-08T01:55:16Z

You are explorer_m3_1 in working directory /Users/dannydo/projects/mos-lab/.agents/explorer_m3_1.
Your task is to analyze and design the route structure for Milestone 3 (Fastify API Endpoints in apps/api/src/modules/kpi/routes/cv-speed.routes.ts).

Path to ORIGINAL_REQUEST.md: /Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md

Inspect:

1. Existing route files in `apps/api/src/modules/kpi/routes/` (`cv.routes.ts`, `cv-paystub.routes.ts`, `cv-tip.routes.ts`).
2. `apps/api/src/modules/kpi/routes.ts` and `apps/api/src/server.ts` to see how module routes are registered with Fastify.
3. Design the exact route handlers for:
   - `GET /profiles`
   - `GET /matrix`
   - `GET /ranking`
   - `GET /trend/:staffId`
   - `GET /detail/:staffId`
   - `GET /predict`
   - `POST /seed`
4. Ensure all routes use `fastify.prisma.crm` and `fastify.prisma.legacy`, apply `parseComboDateBounds` (Rule #21), and use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` (Rule #15).

Write your analysis to `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/analysis.md` and handoff report to `/Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/handoff.md`.
Send a message back to parent when done.
