## 2026-08-08T01:59:30Z

You are Explorer 1 for Milestone 4 (M4: KPI Dashboard UI & API SDK).
Your working directory is /Users/dannydo/projects/mos-lab/.agents/explorer_m4_1.

Objective:
Investigate and design `apps/web/lib/api-client.ts` SDK extension (`cvSpeed` methods) and shared types exports (`packages/shared/src/types/cv-speed.ts`).

Inputs to read:

- /Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md
- /Users/dannydo/projects/mos-lab/.agents/orchestrator/plan.md
- packages/shared/src/types/cv-speed.ts
- apps/api/src/modules/kpi/routes/cv-speed.routes.ts
- apps/web/lib/api-client.ts

Tasks:

1. Examine `apps/web/lib/api-client.ts` to see how existing API namespaces (e.g. `kpi`, `customers`) are structured.
2. Define the exact `cvSpeed` SDK namespace methods to add to `apiClient`:
   - `getProfiles`, `getMatrix`, `getRanking`, `getTrend`, `getDetail`, `predict`, `seed`, `getSeedStatus`, `getStyles`.
3. Check `packages/shared/src/types/cv-speed.ts` for missing type aliases (e.g. `CvSpeedTrend = CvSpeedMonthlyTrend`) to ensure UI components compile cleanly.
4. Write your investigation analysis in `/Users/dannydo/projects/mos-lab/.agents/explorer_m4_1/analysis.md` and `handoff.md`. Send message when done.
