# Handoff Report: CV Speed Profile Seeding Service (`apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`)

**From**: `explorer_m2_2`  
**To**: `parent` (`d3d9b188-ba89-48ed-b9b1-36fef7e66301`)  
**Date**: 2026-08-08  
**Milestone**: M2 — CV Speed Profile Seeding Service

---

## 1. Observation

- Target service path: `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`.
- Verified `CrmCvSpeedProfile` table schema in `apps/api/prisma/crm.prisma` L741-769 with composite unique constraint `@@unique([staffId, lashStyle, serviceMode, lashCount])`.
- Verified `CrmLashTypeBenchmark` table schema in `apps/api/prisma/crm.prisma` L724-739.
- Verified active CV staff lookup pattern: `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')` in `apps/api/src/modules/teams/team.service.ts`.
- Verified catalog spec parser: `parseLashSpecs()` in `apps/api/src/modules/catalog/services/lash-benchmark.service.ts` L16-83.
- Verified existing shared types in `packages/shared/src/types/cv-speed.ts` (`CvSpeedProfile`, `CvSpeedSeedResult`, `SpeedRating`, `ModelLayer`, `ConfidenceLevel`).

---

## 2. Logic Chain

- Step 1 (`Active CV Resolution`): Query active CV IDs via `TeamService.getActiveStaffIdsWithFallback()` using key `ACTIVE_CV_STAFF_CONFIG`. Map staff display names from legacy `user_profile`.
- Step 2 (`CV Seniority & Windowing`): Determine working months from earliest `staff_bonus` record date: Junior (<6 months or <200 cases) -> 3 months lookback; Senior (>=12 months) -> 6 months lookback; Mid-level (6-12 months) -> 4 months lookback.
- Step 3 (`Service Mode & Spec Extraction`): Join `staff_bonus`, `order_service`, `order`, `service`, `report_order_service`, `report_order` with duration filter $15 < \text{total} < 200$. Classify into `retain`, `normal_removal` (prior lash order within 2 months), or `normal_clean`.
- Step 4 (`3-Layer Non-Linear Speed Fitting`):
  - Layer 1: Direct P50 median when $\ge 5$ exact samples.
  - Layer 2: Logarithmic OLS curve fitting ($y = a + b \ln(n)$) when $\ge 3$ samples. Validate $b > 0$, $R^2 \ge 0.5$, and strict monotonicity across target counts $[30, 60, 70, 80, 90, 100, 120, 140]$.
  - Layer 3: Global benchmark P50 multiplied by CV overall speed ratio when sample $< 3$ or Layer 2 fails validation.
- Step 5 (`Benchmark & Rating`): Calculate percentage speed delta vs global P50 benchmark. Assign rating: Green (`fast`, $<-10\%$), Yellow (`normal`, $-10\%$ to $+10\%$), Red (`slow`, $>+10\%$).
- Step 6 (`Idempotent Atomic Upsert`): Execute `$transaction` to delete existing active CV speed profiles and batch insert new profiles, guaranteeing 100% idempotency across re-runs.

---

## 3. Caveats

- **Zero-Case Fallback**: Active CVs with no recorded cases default to 3-month window, `cvRatio = 1.0`, and receive complete Layer 3 fallback profiles for all styles and counts.
- **Prisma Transaction Chunking**: Profile records are batch inserted in chunks of 500 rows to prevent MySQL payload size limits.

---

## 4. Conclusion

The technical architecture, algorithmic workflow, database query strategy, self-correcting 3-layer estimation engine, speed rating rules, and idempotency guarantees for `CvSpeedSeedService` have been fully designed and documented in `/Users/dannydo/projects/mos-lab/.agents/explorer_m2_2/analysis.md`. The design is complete, modular, and ready for immediate code implementation.

---

## 5. Verification Method

1. **File Locations**:
   - Technical Analysis: `/Users/dannydo/projects/mos-lab/.agents/explorer_m2_2/analysis.md`
   - Target Implementation File: `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`
2. **Build Verification Commands**:
   ```bash
   pnpm --filter @mos-lab/shared build
   pnpm --filter @mos-lab/api build
   ```
3. **Execution & Idempotency Verification**:
   ```bash
   # Execute seed endpoint
   curl -X POST http://localhost:4001/api/kpi/cv-speed/seed

   # Verify profile count stability across consecutive seed executions
   curl -s http://localhost:4001/api/kpi/cv-speed/profiles | jq 'length'
   ```
4. **Monotonicity Assertion Command**:
   ```bash
   curl -s http://localhost:4001/api/kpi/cv-speed/matrix | jq '[.data[0].profiles[] | select(.lashStyle=="Classic")] | sort_by(.lashCount) | [.[].totalMinutes] | . as $t | if ($t[0] < $t[1] and $t[1] < $t[2]) then "PASS" else "FAIL" end'
   ```
