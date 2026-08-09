# BRIEFING — 2026-08-08T08:54:00Z

## Mission

Implement Milestone 2: Logarithmic Speed Model Service (`cv-speed-model.service.ts`) & Nightly Seed Service (`cv-speed-seed.service.ts`) for CV Lash Extension Speed Model in Fastify API (`apps/api`).

## 🔒 My Identity

- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/worker_m2_retry
- Original parent: d3d9b188-ba89-48ed-b9b1-36fef7e66301
- Milestone: M2 - CV Speed Model & Nightly Seed Services

## 🔒 Key Constraints

- Use NodeNext `.js` relative imports in `apps/api`.
- Genuine math & statistical logic (logarithmic regression, percentile calculation, monotonicity checks).
- 3-Layer cascade estimation.
- Adaptive rolling window (3, 4, 6 months).
- Service mode detection ('normal_clean', 'normal_removal', 'retain').
- Speed rating calculation ('fast', 'normal', 'slow').
- Upsert into `crm_cv_speed_profile`.
- Verify build with `pnpm --filter @mos-lab/api build`.

## Task Summary

- **What to build**: `cv-speed-model.service.ts` and `cv-speed-seed.service.ts`.
- **Success criteria**: Genuine implementation, compilation clean, correct 3-layer logic, adaptive rolling window, monotonicity invariant enforcement, seed service processing all active CVs.

## Change Tracker

- **Files created**: TBD
- **Build status**: Pending
- **Pending issues**: None

## Quality Status

- **Build/test result**: Pending
