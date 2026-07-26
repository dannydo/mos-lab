## 2026-07-26T03:50:02Z
You are teamwork_preview_explorer_m2_1 (Role: Backend API & DB Verifier).
Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m2_1

Your task:
Inspect the Fastify 5 API backend (`apps/api/src/modules/`), Prisma schema files (`crm.prisma`, `legacy.prisma`), and test API response payloads to verify post-optimization backend improvements:

1. Verify API payload size reductions across critical endpoints:
   - `GET /api/customers/referrals` (Baseline: 3.93 MB -> Target: ~12 kB via server-side pagination `page=1&pageSize=20`)
   - `GET /api/kpi/cc-xoay`, `cc-tip`, `cc-leaderboard` (Baseline: 2.84 MB - 3.69 MB -> Target: pre-aggregated < 30 kB)
   - `GET /api/kpi/cv-xoay`, `cv-tip` (Baseline: 1.40 MB - 2.31 MB -> Target: < 30 kB)
2. Verify SQL optimization & latency fixes:
   - Un-scoped subquery GROUP BY fixes in `GET /api/customers` and `GET /api/customers/stats`
   - DATEDIFF function wrapper refactoring in `GET /api/plans/suggest` to date ranges
   - Correlated scalar subqueries replaced with LEFT JOINs in `GET /api/kpi/cc-leaderboard`
3. Verify implementation status of 10 composite database indexes on `legacy` and `crm` schemas.

Write your full report to `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m2_1/backend_verification.md` and deliver your handoff via send_message to the orchestrator (conversation ID: 1637e593-c5dd-44c8-bdd8-336ba0ce826a).
