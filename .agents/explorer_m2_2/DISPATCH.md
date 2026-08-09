## 2026-08-08T01:53:25Z

You are explorer_m2_2 in working directory /Users/dannydo/projects/mos-lab/.agents/explorer_m2_2.
Your task is to analyze and design the Seeding Service (`apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`).

Path to ORIGINAL_REQUEST.md: /Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md

Specifically:

1. Design `runNightlySeed()` workflow:
   - Query active CV staff IDs from `crmConfig` key `ACTIVE_CV_STAFF_CONFIG`.
   - Query `report_order_service` historical data.
   - For each active CV, lash style, service mode, and standard counts `[30, 60, 70, 80, 90, 100, 120, 140]`: compute predictions across 4 phases.
   - Compare total minutes vs global benchmark from `crm_lash_type_benchmarks`.
   - Compute speed rating: Green (<-10%), Yellow (-10% to +10%), Red (>+10%).
   - Upsert into `crm_cv_speed_profile`.
2. Ensure seed operation is idempotent (re-running produces identical results).

Write your analysis report to `/Users/dannydo/projects/mos-lab/.agents/explorer_m2_2/analysis.md` and handoff report to `/Users/dannydo/projects/mos-lab/.agents/explorer_m2_2/handoff.md`.
Send a message back to parent when done.
