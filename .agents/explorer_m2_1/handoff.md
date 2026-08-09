# Handoff Report — explorer_m2_1

**Task**: Logarithmic Speed Model Core Service (`apps/api/src/modules/kpi/services/cv-speed-model.service.ts`)  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/explorer_m2_1`  
**Date**: 2026-08-08

---

## 1. Observation

1. **Existing Benchmark & Spec Context**:
   - `LashBenchmarkService` in `apps/api/src/modules/catalog/services/lash-benchmark.service.ts` provides `parseLashSpecs()` (L6-83) for parsing `lashStyle` (`Classic`, `Mink`, `Volume 3D/4D/5D`, `Ultralight`, `Hyperlight`, `Flawless`, `Ivylight`, `Under Mink`) and mapping price tiers to standard lash counts (`30, 60, 80, 90, 100, 120, 140`).
   - `CrmLashTypeBenchmark` table in `apps/api/prisma/crm.prisma` (L724-739) stores global benchmarks `(lashStyle, serviceType, lashCount)` with P50 median `benchmarkMinutes`.

2. **Legacy Database Phase Time Fields**:
   - `report_order_service` table in legacy DB `management` stores exact iPad timestamps:
     - `cleaning_minute` (cleaning phase)
     - `servicing_minute` (extension phase)
     - `preparation_minute` + `pre_servicing_minute` (prep and QC phase)
   - Total actual tracked time = `preparation_minute + pre_servicing_minute + cleaning_minute + servicing_minute`.

3. **Prisma CRM Schema**:
   - Table `crm_cv_speed_profile` is defined in `apps/api/prisma/crm.prisma` (L741-769) with unique composite constraint `@@unique([staffId, lashStyle, serviceMode, lashCount])`.

4. **System Conventions & Active Staff Rules**:
   - `ACTIVE_CV_STAFF_CONFIG` in `crmConfig` defines active technician IDs via `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')` (e.g. `cv.routes.ts` L7-9).
   - Rule #15 requires using `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` for all date queries.

---

## 2. Logic Chain

1. **Logarithmic Mathematical Model ($a + b \ln(n)$)**:
   - Derivation uses standard ordinary least-squares (OLS) linear regression on transformed variable $x = \ln(n)$ and $y = \text{minutes}$.
   - $S_{xx} = \sum x_i^2 - \frac{(\sum x_i)^2}{N}$, $S_{xy} = \sum x_i y_i - \frac{(\sum x_i)(\sum y_i)}{N}$, $S_{yy} = \sum y_i^2 - \frac{(\sum y_i)^2}{N}$.
   - Slope $b = \frac{S_{xy}}{S_{xx}}$, Intercept $a = \bar{y} - b \bar{x}$, $R^2 = \frac{S_{xy}^2}{S_{xx} S_{yy}}$.
   - Bounded edge case handling ensures zero division is avoided when all sample lash counts are identical ($S_{xx} = 0$) or sample size $N < 2$.

2. **Phase Time Extraction & Classification**:
   - `serviceMode` is determined by joining customer order history over a 60-day window preceding order date:
     - `retain`: `service_type = 'Retain'`
     - `normal_removal`: customer had a completed lash service order in $[D - 60 \text{ days}, D)$
     - `normal_clean`: customer had no completed lash service order in that 60-day window.

3. **Adaptive Seniority Window**:
   - CV tenure is calculated from the earliest `staff_bonus` record date (`MIN(sb.date_created)`).
   - Junior CV (< 6 months tenure OR < 200 total cases) $\rightarrow$ 3-month window ($W = 3$).
   - Mid-level CV (6-12 months tenure AND $\ge 200$ cases) $\rightarrow$ 4-month window ($W = 4$).
   - Senior CV ($\ge 12$ months tenure AND $\ge 200$ cases) $\rightarrow$ 6-month window ($W = 6$).

4. **3-Layer Estimation Cascade**:
   - **Layer 1 (Direct Data)**: Used when exact sample size for `(lashStyle, serviceMode, lashCount)` $N_{exact} \ge 5$. Returns actual P50 median.
   - **Layer 2 (Log-Regression Interpolation)**: Used when $N_{exact} < 5$ but total style sample size $N_{total} \ge 3$, $R^2 \ge 0.5$, $b > 0$, and prediction array passes monotonicity check.
   - **Layer 3 (Global Benchmark Fallback)**: Used when Layer 1 and Layer 2 are unavailable. Evaluates global P50 benchmark adjusted by CV's speed ratio $R_{cv}$ across other styles.

5. **Monotonicity Enforcement**:
   - Verifies $\text{totalMinutes}(n_1) < \text{totalMinutes}(n_2)$ for $n_1 < n_2$.
   - Rejects Layer 2 if regression violates monotonicity.
   - Applies post-processing monotonic smoothing pass (`enforceMonotonicity`) on generated profile arrays to guarantee the invariant.

---

## 3. Caveats

1. **Legacy DB Data Sparsity**:
   - For newly onboarded CVs with no historical orders, the model gracefully falls back to Layer 3 (Benchmark $\times R_{cv}$ where $R_{cv} = 1.0$).
2. **iPad Phase Timing Outliers**:
   - Technicians occasionally leave the iPad timer running during breaks, resulting in duration > 200 minutes or cleaning_minute = 0. The extraction query explicitly filters `15 < total_minutes < 200` and `servicing_minute > 5`.
3. **Database Schema Coexistence**:
   - The table `crm_cv_speed_profile` is already defined in `crm.prisma`. When implementers run migrations or client generation, they should execute `pnpm --filter @mos-lab/api prisma:generate`.

---

## 4. Conclusion

The analysis and complete software design for `CvSpeedModelService` (`apps/api/src/modules/kpi/services/cv-speed-model.service.ts`) has been fully established and documented in `analysis.md`. The design fulfills all requirements specified in `ORIGINAL_REQUEST.md`, strictly complies with repository guidelines (`AGENTS.md`), and is ready for implementation by `implementer_m2_1`.

---

## 5. Verification Method

To verify the implementation once completed by the implementer team:

1. **Shared & API Build Verification**:

   ```bash
   pnpm --filter @mos-lab/shared build
   pnpm --filter @mos-lab/api build
   ```

2. **Idempotent Nightly Seeding Trigger**:

   ```bash
   curl -X POST http://localhost:4001/api/kpi/cv-speed/seed | jq '.'
   ```

3. **Monotonicity Verification Script/Command**:

   ```bash
   curl http://localhost:4001/api/kpi/cv-speed/matrix | jq '[.data[0].profiles[] | select(.lashStyle=="Classic")] | sort_by(.lashCount) | [.[].totalMinutes] | . as $t | if ($t[0] < $t[1] and $t[1] < $t[2]) then "PASS" else "FAIL" end'
   ```

4. **Profile Count & Coverage Test**:
   ```bash
   curl http://localhost:4001/api/kpi/cv-speed/profiles | jq 'length'
   ```
