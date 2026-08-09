## 2026-08-08T02:04:49Z

<USER_REQUEST>
You are Worker for Gate Remediation (CV Speed Model & Routes Fixes).
Your working directory is /Users/dannydo/projects/mos-lab/.agents/worker_m3m4_fix.

Objective:
Remediate math, service mode, and API export findings identified by Gate Reviewers and Challengers.

Inputs to read:

- /Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md
- /Users/dannydo/projects/mos-lab/.agents/reviewer_m3m4_2/handoff.md
- /Users/dannydo/projects/mos-lab/.agents/challenger_m3m4_2/handoff.md
- `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`
- `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`
- `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Fix instructions:

1. `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`:
   - Define and export `getActiveCvStaffList(crmPrisma, legacyPrisma)` returning `Promise<Array<{ id: number; name: string }>>`.
   - Query active staff IDs from `getActiveCvStaffIds(crmPrisma)` and resolve names from legacy `user_profile`.

2. `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`:
   - **Layer Threshold Inversion Fix**:
     - Layer 1 check: `if (exactCases.length >= 3)` (historical average for exact match).
     - Layer 2 check: `if (parsedCases.length >= 5 && logFit.isMonotonic && logFit.rSquared >= 0.5)` (logarithmic regression).
   - **Phase Breakdown Sum Invariant Fix ($T_{total} = T_{cleaning} + T_{extension} + T_{prep\_qc}$)**:
     - Layer 1: Calculate `medianTotal = Math.round(sortedTotal[Math.floor(sortedTotal.length / 2)])`. Compute clean ratio `avgCleanRatio` and prep ratio `avgPrepRatio` from exact cases. Set `predClean = Math.max(5, Math.round(medianTotal * avgCleanRatio))`, `predPrep = Math.max(5, Math.round(medianTotal * avgPrepRatio))`, and `predExt = medianTotal - predClean - predPrep`.
     - Layer 2: Compute `predClean = Math.max(5, Math.round(predTotal * (avgCleanRatio || 0.15)))`, `predPrep = Math.max(5, Math.round(predTotal * (avgPrepRatio || 0.10)))`, and `predExt = predTotal - predClean - predPrep`.
     - Ensure $T_{cleaning} + T_{extension} + T_{prep\_qc} = T_{total}$ strictly holds in Layer 1 and Layer 2 without arithmetic overrides.
   - **Service Mode `normal_removal` Fix**:
     - Update historical case classification in `predictCvSpeed` to distinguish `normal_clean` (clean slate) vs `normal_removal` (has old lashes to remove).
     - Use `detectServiceMode` or inspect order service names/types (e.g. 'tháo mi', 'removal', 'refill') for historical orders. Ensure `normal_removal` adds removal time (~10-15 mins) over `normal_clean`.

3. Monorepo Build Verification:
   - Run `pnpm --filter @mos-lab/shared build && pnpm --filter @mos-lab/api build`.
   - Write handoff report in `/Users/dannydo/projects/mos-lab/.agents/worker_m3m4_fix/handoff.md`. Send message when done.
     </USER_REQUEST>
