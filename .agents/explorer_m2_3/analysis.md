# Unified Implementation Specification for Milestone 2 (CV Speed Model & Seed Service)

**Target Worker**: Worker_M2  
**Working Directory**: `/Users/dannydo/projects/mos-lab`  
**Date**: 2026-08-08  
**Author**: explorer_m2_3

---

## 1. Executive Summary & Architecture Overview

Milestone 2 (M2) introduces the **CV Lash Extension Speed Model** — a per-CV non-linear (logarithmic) speed analysis and prediction system. This specification unifies the design into actionable implementation steps for **Worker_M2**.

### Target Architecture & File Paths

Worker_M2 will create and modify the following exact backend files:

1. **`apps/api/src/modules/kpi/services/cv-speed-model.service.ts`** _(NEW)_ — Core logarithmic mathematical regression service, 3-layer estimation cascade, phase time extractor, service mode classifier, seniority detection, and monotonicity guard.
2. **`apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`** _(NEW)_ — Nightly seed/refresh service, batch profile builder, benchmark comparator, speed rating classifier, and idempotent database upsert manager.
3. **`apps/api/src/modules/kpi/routes/cv-speed.routes.ts`** _(NEW)_ — Fastify route handler exposing 7 API endpoints with authentication and date bounds parsing.
4. **`apps/api/src/modules/kpi/routes.ts`** _(UPDATE)_ — Main KPI router registering `registerCvSpeedRoutes(fastify)`.

### Existing Infrastructure Leveraged

- **Prisma Schema (`crm.prisma`)**: Model `CrmCvSpeedProfile` (`@@map("crm_cv_speed_profile")`) and `CrmLashTypeBenchmark` (`@@map("crm_lash_type_benchmarks")`) are already fully defined.
- **Shared Types (`packages/shared/src/types/cv-speed.ts`)**: `CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedDetail`, `CvSpeedTrend`, `CvSpeedPrediction`, `CvSpeedSeedResult` are already exported in `@mos-lab/shared`.
- **Existing Helpers**: `LashBenchmarkService.parseLashSpecs()` for style/count extraction, `TeamService.getActiveStaffIdsWithFallback()` for active CV list.

---

## 2. Core Service Specification: `CvSpeedModelService`

**Exact File Path**: `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`

### 2.1 Mathematical Logarithmic Regression Engine

The model predicts completion time per phase using logarithmic regression:
$$\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$$
where $n$ is the lash count ($n \in \{30, 60, 70, 80, 90, 100, 120, 140\}$).

**OLS Regression Fitting Logic**:
Given sample points $(n_i, y_i)$ where $y_i$ is actual phase time:

1. Transform inputs: $x_i = \ln(n_i)$.
2. Calculate sample means: $\bar{x} = \frac{1}{N} \sum x_i$, $\bar{y} = \frac{1}{N} \sum y_i$.
3. Compute slope ($b$) and intercept ($a$):
   $$b = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2}$$
   $$a = \bar{y} - b \bar{x}$$
4. Compute Coefficient of Determination ($R^2$):
   $$SST = \sum (y_i - \bar{y})^2, \quad SSR = b^2 \sum (x_i - \bar{x})^2, \quad R^2 = \begin{cases} 1.0 & \text{if } SST = 0 \\ \frac{SSR}{SST} & \text{otherwise} \end{cases}$$

### 2.2 Phase Extraction & Service Mode Classifier

**Phase Breakdown**:
From legacy DB `report_order_service` table (`ros`):

- `cleaning` = `ros.cleaning_minute`
- `extension` = `ros.servicing_minute`
- `prep_qc` = `COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)`
- `total` = `cleaning + extension + prep_qc`

Filter condition for valid cases:
`total > 15 AND total < 200` (eliminates bad test data and system glitches).

**Service Mode Classification**:

- `retain`: Service record has `s.service_type = 'Retain'`.
- `normal_removal`: Service record is `Normal` lash service, AND customer has a completed lash order in the preceding 60 days (`date_created >= DATE_SUB(o.booking_date_start, INTERVAL 60 DAY)`).
- `normal_clean`: Service record is `Normal` lash service, AND customer has NO completed lash order in the preceding 60 days.

### 2.3 Adaptive Seniority Rolling Window

Query first record date of CV from legacy `staff_bonus` (`MIN(date_created)` for `staff_id = cvStaffId`):

- **Senior CV** ($\ge 12$ months working): 6-month rolling window (`INTERVAL 6 MONTH`).
- **Mid-level CV** (6–12 months working): 4-month rolling window (`INTERVAL 4 MONTH`).
- **Junior CV** ($< 6$ months working OR $< 200$ total lash cases): 3-month rolling window (`INTERVAL 3 MONTH`).

### 2.4 3-Layer Estimation Cascade & Monotonicity Check

For any given `(cvStaffId, lashStyle, serviceMode, lashCount)`:

1. **Layer 1 (Direct Data)**:
   - Criteria: CV has $\ge 5$ actual completed cases for exact `(lashStyle, serviceMode, lashCount)`.
   - Output: `modelLayer = 1`, `confidence = 'high'`.
   - Predicted phase times: Median (P50) of historical actual phase times.
   - Regression params: `regA = null`, `regB = null`, `regRSquared = null`.

2. **Layer 2 (Regression Interpolation)**:
   - Criteria: CV has $< 5$ exact cases, BUT has $\ge 3$ cases across different lash counts for `(lashStyle, serviceMode)`.
   - Perform OLS log-regression to fit curves for `cleaning`, `extension`, `prep_qc`, and `total`.
   - **Monotonicity Enforcement**: Evaluate predicted `total` times for standard counts $[30, 60, 70, 80, 90, 100, 120, 140]$. Check:
     - Slope $b_{total} > 0$.
     - Predicted times strictly increase: $n_1 < n_2 \implies \text{pred}(n_1) < \text{pred}(n_2)$.
     - Total $R^2 \ge 0.5$.
   - If ALL pass: `modelLayer = 2`, `confidence = 'medium'`, predict times via $a + b \ln(n)$, save `regA`, `regB`, `regRSquared`.
   - If ANY check fails: Fall back to Layer 3.

3. **Layer 3 (Global Benchmark Fallback)**:
   - Criteria: CV has $< 3$ cases OR Layer 2 monotonicity / $R^2$ check failed.
   - Query global P50 benchmark from `crm_lash_type_benchmarks` for `(lashStyle, serviceMode, lashCount)`.
   - Calculate CV's global speed ratio:
     $$\text{speedRatio} = \text{clamp}\left( \frac{\text{CV Overall Avg Duration}}{\text{Global Overall Avg Duration}}, 0.70, 1.30 \right)$$
   - Output: `modelLayer = 3`, `confidence = 'low'`.
   - Predicted total = $\text{benchmarkTotalMinutes} \times \text{speedRatio}$.
   - Phase split: 15% cleaning, 75% extension, 10% prep_qc.

**Guardrails**:

- Clamp all predicted phase times to positive bounds: `cleaning >= 2`, `extension >= 10`, `prep_qc >= 2`, `total >= 15`.
- Speed Rating:
  - $\text{deltaPercent} = \frac{\text{totalMinutes} - \text{benchmarkTotalMinutes}}{\text{benchmarkTotalMinutes}} \times 100$
  - `deltaPercent < -10%` $\rightarrow$ `'fast'` (Green)
  - `deltaPercent > +10%` $\rightarrow$ `'slow'` (Red)
  - Otherwise $\rightarrow$ `'normal'` (Yellow)

---

## 3. Core Service Specification: `CvSpeedSeedService`

**Exact File Path**: `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`

### 3.1 Nightly Seeding Workflow (`runNightlySeed`)

1. **Active Staff List**:
   Fetch active CV IDs via `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')`.
   Fetch staff names from legacy `user_profile`.

2. **Styles & Target Counts**:
   Standard styles: `['Classic', 'Mink', 'Volume 3D', 'Volume 4D', 'Volume 5D', 'Ultralight', 'Hyperlight', 'Flawless', 'Ivylight', 'Under Mink']`.
   Standard service modes: `['normal_clean', 'normal_removal', 'retain']`.
   Standard lash counts: `[30, 60, 70, 80, 90, 100, 120, 140]`.

3. **Model Generation & Upsert**:
   For each active CV $\times$ style $\times$ serviceMode $\times$ lashCount:
   - Generate prediction profile via `CvSpeedModelService`.
   - Upsert into `fastify.prisma.crm.crmCvSpeedProfile`:
     ```typescript
     await fastify.prisma.crm.crmCvSpeedProfile.upsert({
       where: {
         staffId_lashStyle_serviceMode_lashCount: {
           staffId,
           lashStyle,
           serviceMode,
           lashCount,
         },
       },
       update: { ...profileData, updatedAt: new Date() },
       create: { ...profileData },
     });
     ```

4. **Return Value**:
   Returns `CvSpeedSeedResult` (`{ success: true, profilesProcessed, cvsCount, timestamp }`).

---

## 4. Fastify API Routes Specification: `cv-speed.routes.ts`

**Exact File Path**: `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`

All endpoints must be protected with `{ preHandler: [requireAuth] }`.

1. **`GET /api/kpi/cv-speed/profiles`**:
   - Query params: `staffId`, `lashStyle`, `serviceMode`, `speedRating`.
   - Returns array of `CvSpeedProfile`.

2. **`GET /api/kpi/cv-speed/matrix`**:
   - Returns `CvSpeedMatrix` structure with active CVs as rows, styles/counts as matrix cells with predicted time, rating, and model layer.

3. **`GET /api/kpi/cv-speed/ranking`**:
   - Query params: `lashStyle` (default `'Classic'`), `lashCount` (default `60`), `serviceMode` (default `'normal_clean'`).
   - Returns sorted `CvSpeedRanking[]` from fastest to slowest. Includes trend indicator (`improving`, `declining`, `stable`) comparing current month vs previous month.

4. **`GET /api/kpi/cv-speed/trend/:staffId`**:
   - Returns monthly speed trend (`CvSpeedMonthlyTrend[]`) for the specified CV over the last 6 months compared against benchmark line.

5. **`GET /api/kpi/cv-speed/detail/:staffId`**:
   - Returns `CvSpeedDetail` for a specific CV including phase breakdown percentages, recent cases, and overall score vs benchmark.

6. **`GET /api/kpi/cv-speed/predict`**:
   - Query params: `staffId`, `lashStyle`, `serviceMode`, `lashCount`.
   - Returns real-time `CvSpeedPrediction` object.

7. **`POST /api/kpi/cv-speed/seed`**:
   - Triggers `CvSpeedSeedService.runNightlySeed(fastify)` and returns `CvSpeedSeedResult`.

---

## 5. Architectural Rules & Compliance Checklist

### Rule 1: NodeNext Import Syntax

All local relative imports in `apps/api/src/modules/kpi/` MUST explicitly end with `.js`.

- ✅ `import { CvSpeedModelService } from './services/cv-speed-model.service.js';`
- ✅ `import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';`

### Rule 2: Database Client Boundaries

- **`fastify.prisma.crm`**: Write/read CRM tables (`crm_cv_speed_profile`, `crm_lash_type_benchmarks`, `crm_config`).
- **`fastify.prisma.legacy`**: Read-only queries on legacy CRM tables (`report_order_service`, `order_service`, `order`, `service`, `staff_bonus`, `user_profile`, `report_order`).

### Rule 3: Actual Check-in Recognition (Rule #15)

When querying timestamps from legacy DB, ALWAYS use:
`COALESCE((SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1), o.booking_date_start)`

---

## 6. Step-by-Step Implementation Guide for Worker_M2

Worker_M2 must execute the following steps in sequence:

1. **Step 1**: Create `apps/api/src/modules/kpi/services/cv-speed-model.service.ts` implementing `CvSpeedModelService`.
2. **Step 2**: Create `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts` implementing `CvSpeedSeedService`.
3. **Step 3**: Create `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` implementing Fastify routes.
4. **Step 4**: Modify `apps/api/src/modules/kpi/routes.ts` to import `registerCvSpeedRoutes` with `.js` extension and call `await registerCvSpeedRoutes(fastify);`.
5. **Step 5**: Run build checks:
   - `pnpm --filter @mos-lab/shared build`
   - `pnpm --filter @mos-lab/api build`

---

## 7. Verification Checklist for Worker_M2

Worker_M2 can independently verify implementation accuracy using these commands:

### Automated Verification Commands

```bash
# 1. Verify TypeScript build of shared package and API package
pnpm --filter @mos-lab/shared build
pnpm --filter @mos-lab/api build

# 2. Trigger seed service recalculation
curl -X POST http://localhost:4001/api/kpi/cv-speed/seed

# 3. Verify profiles listing endpoint
curl -s http://localhost:4001/api/kpi/cv-speed/profiles | jq 'length'

# 4. Verify matrix endpoint structure
curl -s http://localhost:4001/api/kpi/cv-speed/matrix | jq '.data[0].staffName'

# 5. Verify ranking endpoint
curl -s "http://localhost:4001/api/kpi/cv-speed/ranking?lashStyle=Classic&lashCount=60" | jq '.[0]'

# 6. Verify monotonicity invariant (Classic 60 < Classic 80 < Classic 100 for first CV)
curl -s http://localhost:4001/api/kpi/cv-speed/matrix | jq '[.data[0].profiles[] | select(.lashStyle=="Classic")] | sort_by(.lashCount) | [.[].totalMinutes]'

# 7. Verify seed idempotency (Count after running seed twice should match)
curl -X POST http://localhost:4001/api/kpi/cv-speed/seed
```
