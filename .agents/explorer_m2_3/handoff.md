# Handoff Report: Milestone 2 Unified Implementation Specification

**From**: explorer_m2_3  
**To**: Worker_M2 / parent  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/explorer_m2_3`  
**Date**: 2026-08-08

---

## 1. Observation

1. **Exact Target Files**:
   - `apps/api/src/modules/kpi/services/cv-speed-model.service.ts` _(To be created)_
   - `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts` _(To be created)_
   - `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` _(To be created)_
   - `apps/api/src/modules/kpi/routes.ts` _(To be updated to register `registerCvSpeedRoutes`)_

2. **Existing System Verification**:
   - `apps/api/prisma/crm.prisma` line 741: `model CrmCvSpeedProfile` (`@@map("crm_cv_speed_profile")`) and line 724: `model CrmLashTypeBenchmark` (`@@map("crm_lash_type_benchmarks")`) are already fully defined.
   - `packages/shared/src/types/cv-speed.ts`: All TypeScript interfaces (`CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedDetail`, `CvSpeedTrend`, `CvSpeedPrediction`, `CvSpeedSeedResult`) are already defined and exported from `@mos-lab/shared`.
   - `apps/api/src/modules/catalog/services/lash-benchmark.service.ts`: Function `parseLashSpecs(serviceKey, serviceName)` and style mappings are available.
   - `apps/api/src/modules/kpi/routes/cv.routes.ts`: `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')` fetches active CV staff IDs.

3. **Codebase Conventions**:
   - TypeScript configuration uses `NodeNext` resolution: all local relative imports MUST specify explicit `.js` extensions.
   - Legacy DB queries MUST use `COALESCE((SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1), o.booking_date_start)` for check-in date matching (Rule #15).

---

## 2. Logic Chain

1. **Mathematical Foundation**:
   The completion time non-linear model $\text{time}_{phase}(n) = a + b \ln(n)$ models the physical slowing down of lash application as remaining natural lashes decrease. An OLS log-transform linear fit converts $n \to \ln(n)$ to derive $a$, $b$, and fit metric $R^2$.

2. **Phase Breakdown & Service Mode**:
   Extracting `cleaning`, `extension`, `prep_qc`, and `total` from legacy `report_order_service` allows detailed phase coaching. Customer history lookup in legacy `order` determines whether a `Normal` service is `normal_clean` (no completed lash order in past 60 days) or `normal_removal` (has completed lash order in past 60 days).

3. **3-Layer Cascade & Monotonicity Check**:
   - Layer 1 ($\ge 5$ cases for exact count) yields direct P50 high confidence.
   - Layer 2 ($\ge 3$ cases across counts) uses regression if $R^2 \ge 0.5$ AND predictions for counts $30 < 60 < 70 < 80 < 90 < 100 < 120 < 140$ are strictly increasing.
   - Layer 3 (fallback) applies global benchmark P50 multiplied by the CV's bounded overall speed ratio ($0.70 \le ratio \le 1.30$).

4. **Seeding & Route Integration**:
   `CvSpeedSeedService` iterates active CVs and standard Lash Styles / Modes / Counts to generate profiles and upsert into `crm_cv_speed_profile`. `cv-speed.routes.ts` exposes 7 JSON endpoints adhering to `@mos-lab/shared` types.

---

## 3. Caveats

1. **Database Seed Requirement**:
   `crm_cv_speed_profile` requires an initial execution of `POST /api/kpi/cv-speed/seed` (or running `runNightlySeed`) to populate precomputed speed profiles before matrix queries return non-empty datasets.
2. **Legacy Data Outliers**:
   Durations $\le 15$ minutes or $\ge 200$ minutes must be excluded during model fitting to prevent skewed regressions caused by uncompleted test orders or open iPad timers.
3. **No Code Modification by Explorer**:
   As explorer_m2_3, no source code in `apps/` or `packages/` was modified. All specifications are documented in `analysis.md` for Worker_M2 execution.

---

## 4. Conclusion

The specification for Milestone 2 is complete, fully integrated, and ready for Worker_M2. It provides exact file paths, mathematical formulas, query patterns, NodeNext import rules, dual database usage, idempotency requirements, and a step-by-step verification plan.

---

## 5. Verification Method

Worker_M2 and parent can verify implementation by executing:

```bash
# 1. Build shared package
pnpm --filter @mos-lab/shared build

# 2. Build backend API package
pnpm --filter @mos-lab/api build

# 3. Test Seed recalculation
curl -X POST http://localhost:4001/api/kpi/cv-speed/seed

# 4. Check profiles API endpoint response count
curl -s http://localhost:4001/api/kpi/cv-speed/profiles | jq 'length'

# 5. Check Matrix endpoint structure
curl -s http://localhost:4001/api/kpi/cv-speed/matrix | jq '.data[0].staffName'

# 6. Check Monotonicity for Classic style
curl -s http://localhost:4001/api/kpi/cv-speed/matrix | jq '[.data[0].profiles[] | select(.lashStyle=="Classic")] | sort_by(.lashCount) | [.[].totalMinutes]'
```
