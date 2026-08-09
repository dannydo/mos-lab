## 2026-08-08T08:53:40Z

You are worker_m2_retry in working directory /Users/dannydo/projects/mos-lab/.agents/worker_m2_retry.
Your task is to implement Milestone 2 (Logarithmic Speed Model Service & Nightly Seed Service for CV Lash Extension Speed Model).

Path to ORIGINAL_REQUEST.md: /Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions for Worker_M2_Retry:

1. Create `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`:
   - Implement `fitLogarithmicModel(dataPoints: Array<{ lashCount: number, timeMinutes: number }>)`:
     Compute a, b, R^2, and isMonotonic (b > 0).
   - Implement `getCvRollingWindowMonths(legacyPrisma: any, staffId: number)`:
     Compute rolling window (3, 4, or 6 months) based on first `staff_bonus` record date and case count.
   - Implement `detectServiceMode(legacyPrisma: any, customerId: number, serviceType: string)`:
     Return 'normal_clean', 'normal_removal', or 'retain' based on 2-month history check.
   - Implement `predictCvSpeed(crmPrisma: any, legacyPrisma: any, staffId: number, lashStyle: string, serviceMode: LashServiceMode, lashCount: number)`:
     3-Layer cascade (Layer 1 >= 5 cases P50, Layer 2 >= 3 cases log regression if R^2 >= 0.5 & monotonic, Layer 3 global benchmark fallback adjusted by CV ratio).
     Enforce monotonicity invariant (Classic 60 < Classic 70 < Classic 80 < Classic 100 < Classic 120 < Classic 140).
     Calculate 4 phase times (cleaning, extension, prep_qc, total).
     Calculate speed rating (Green <-10%, Yellow -10% to +10%, Red >+10%).
2. Create `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`:
   - Implement `runNightlyCvSpeedSeed(crmPrisma: any, legacyPrisma: any)`:
     Query active CV IDs from `crmConfig` key `ACTIVE_CV_STAFF_CONFIG`.
     Iterate active CVs x styles x service modes x counts [30, 60, 70, 80, 90, 100, 120, 140].
     Upsert into `crm_cv_speed_profile`.
3. Use NodeNext `.js` relative imports.
4. Run `pnpm --filter @mos-lab/api build` to verify compilation.
5. Write your execution report to `/Users/dannydo/projects/mos-lab/.agents/worker_m2_retry/handoff.md`.
6. Send a message back to parent when complete.
