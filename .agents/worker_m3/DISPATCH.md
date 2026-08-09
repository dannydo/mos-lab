## 2026-08-08T01:55:39Z

You are Worker for Milestone 3 (M3: Fastify API Endpoints).
Your working directory is /Users/dannydo/projects/mos-lab/.agents/worker_m3.

Objective:
Implement `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` with 7 Fastify API endpoints and register it in `apps/api/src/modules/kpi/routes.ts`.

Inputs to read:

- /Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md
- /Users/dannydo/projects/mos-lab/.agents/orchestrator/plan.md
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_3/worker_plan.md
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_3/handoff.md
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_1/handoff.md
- /Users/dannydo/projects/mos-lab/.agents/explorer_m3_2/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership for this task:

- `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` (NEW file)
- `apps/api/src/modules/kpi/routes.ts` (MODIFICATION - register route plugin)

Rules & Requirements:

1. Relative imports in `apps/api` MUST end with `.js` (NodeNext TS mode).
   e.g. `import { requireAuth } from '../../../middlewares/auth.js';`
   e.g. `import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';`
2. Follow all user rules in `AGENTS.md`:
   - Single source of truth model (`CvSpeedModelService`, `CvSpeedSeedService`)
   - Rule #15 (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`) for historical case queries
   - Rule #21 (`parseComboDateBounds`) for date filtering
   - Fastify 5 request/reply handlers with `requireAuth`
3. Endpoints to implement:
   - `GET /api/kpi/cv-speed/profiles` — List profiles (with query filters)
   - `GET /api/kpi/cv-speed/matrix` — Overview speed matrix table data
   - `GET /api/kpi/cv-speed/ranking` — Ranking table data
   - `GET /api/kpi/cv-speed/trend/:staffId` — Monthly speed trend
   - `GET /api/kpi/cv-speed/detail/:staffId` — Detailed breakdown and cases
   - `GET /api/kpi/cv-speed/predict` (and `POST /api/kpi/cv-speed/predict`) — Predict ETA
   - `POST /api/kpi/cv-speed/seed` — Trigger seeding
   - `GET /api/kpi/cv-speed/seed/status` — Get seed status
   - `GET /api/kpi/cv-speed/styles` — Get list of styles & counts
4. Verify by building: `pnpm --filter @mos-lab/api build`.
5. Write your report in `/Users/dannydo/projects/mos-lab/.agents/worker_m3/handoff.md` with build and test verification results. Send message when done.
