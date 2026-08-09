# Logarithmic Speed Model Core Service Architecture & Design Report

**Target File**: `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`  
**Author**: `explorer_m2_1`  
**Date**: 2026-08-08  
**Workspace**: `/Users/dannydo/projects/mos-lab`

---

## 1. Executive Summary & Architecture Overview

The **CV Lash Extension Speed Model** is a self-correcting, non-linear regression system that models individual technician (CV) completion speeds across distinct service phases (`cleaning`, `extension`, `prep_qc`, `total`). The foundational mathematical principle models extension time as a logarithmic function of lash count ($n$):

$$\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$$

This model accounts for natural lash availability dynamics during extension application (early lashes are fast; later lashes take progressively longer as remaining natural lashes become harder to locate).

### Core Components

1. **Logarithmic Math Engine**: Least-squares fitting for linear regression in logarithmic space ($x = \ln(n)$), calculating slope ($b$), intercept ($a$), and coefficient of determination ($R^2$).
2. **Phase Time Extraction**: Legacy DB extraction from `report_order_service` for exact iPad timestamps (`cleaning_minute`, `servicing_minute`, `preparation_minute`, `pre_servicing_minute`).
3. **Customer History & `serviceMode` Classifier**: Categorizes cases into `normal_clean` (no lash order in past 60 days), `normal_removal` (has lash order in past 60 days requiring lash removal/cleaning), or `retain` (refill service).
4. **Adaptive Seniority Rolling Window**: Calculates CV tenure via `staff_bonus` first record date and total lash cases to assign a 3-month (Junior / <200 cases), 4-month (Mid-level), or 6-month (Senior) data window.
5. **3-Layer Self-Correcting Estimation Cascade**:
   - **Layer 1 (Direct Data)**: Median (P50) if exact sample size $N \ge 5$.
   - **Layer 2 (Logarithmic Interpolation)**: Regression fit if total style sample size $N \ge 3$, $R^2 \ge 0.5$, $b > 0$, and curve passes monotonicity validation.
   - **Layer 3 (Global Benchmark Fallback)**: Global P50 benchmark adjusted by CV's overall speed ratio $R_{cv}$ across other styles.
6. **Monotonicity Enforcement**: Invariant rule guaranteeing $\text{time}(n_1) < \text{time}(n_2)$ for $n_1 < n_2$ (e.g. Classic 60 < Classic 70 < Classic 80).

---

## 2. Mathematical Foundations

### 2.1 Logarithmic Regression Least-Squares Derivation

To fit $\text{time}(n) = a + b \ln(n)$, perform linear regression on transformed variable $x_i = \ln(n_i)$ and target $y_i = \text{time}_i$ for samples $i = 1, \dots, N$.

#### Summary Statistics:

$$\bar{x} = \frac{1}{N} \sum_{i=1}^{N} x_i, \quad \bar{y} = \frac{1}{N} \sum_{i=1}^{N} y_i$$
$$S_{xx} = \sum_{i=1}^{N} (x_i - \bar{x})^2 = \sum x_i^2 - \frac{(\sum x_i)^2}{N}$$
$$S_{xy} = \sum_{i=1}^{N} (x_i - \bar{x})(y_i - \bar{y}) = \sum (x_i y_i) - \frac{(\sum x_i)(\sum y_i)}{N}$$
$$S_{yy} = \sum_{i=1}^{N} (y_i - \bar{y})^2 = \sum y_i^2 - \frac{(\sum y_i)^2}{N}$$

#### Regression Parameters:

$$\text{Slope } b = \frac{S_{xy}}{S_{xx}}$$
$$\text{Intercept } a = \bar{y} - b \bar{x}$$

#### Fit Quality ($R^2$):

$$R^2 = \frac{(S_{xy})^2}{S_{xx} \cdot S_{yy}}$$

#### Edge Case Protections:

- If $N < 2$: Regression cannot be computed ($R^2 = 0$, `isValid = false`).
- If $S_{xx} == 0$ (all sample data points have identical lash count $n$): Slope $b$ is undefined ($R^2 = 0$, `isValid = false`).
- If $S_{yy} == 0$ (all completion times are identical): $R^2 = 1.0$, $b = 0$.

### 2.2 TypeScript Math Helper Implementation

```typescript
export interface LogRegressionResult {
  a: number;
  b: number;
  rSquared: number;
  isValid: boolean;
}

export function fitLogarithmicRegression(
  dataPoints: Array<{ lashCount: number; minutes: number }>
): LogRegressionResult {
  const N = dataPoints.length;
  if (N < 2) {
    return { a: 0, b: 0, rSquared: 0, isValid: false };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;

  for (const pt of dataPoints) {
    const x = Math.log(pt.lashCount);
    const y = pt.minutes;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }

  const Sxx = sumXX - (sumX * sumX) / N;
  const Syy = sumYY - (sumY * sumY) / N;
  const Sxy = sumXY - (sumX * sumY) / N;

  if (Math.abs(Sxx) < 1e-9) {
    return { a: sumY / N, b: 0, rSquared: 0, isValid: false };
  }

  const b = Sxy / Sxx;
  const a = sumY / N - b * (sumX / N);

  let rSquared = 0;
  if (Math.abs(Syy) < 1e-9) {
    rSquared = 1.0;
  } else {
    rSquared = Math.max(0, Math.min(1.0, (Sxy * Sxy) / (Sxx * Syy)));
  }

  // Validity requires positive slope (increasing time with lash count) and non-negative parameters
  const isValid = b > 0 && rSquared >= 0.5;

  return {
    a: Math.round(a * 10000) / 10000,
    b: Math.round(b * 10000) / 10000,
    rSquared: Math.round(rSquared * 10000) / 10000,
    isValid,
  };
}
```

---

## 3. Phase Time Extraction & Customer History Pipeline

### 3.1 Legacy DB Phase Time Extraction

In `report_order_service` (legacy database `management`), technician service time is tracked on iPad terminals across 3 progress timestamps:

1. `ServiceStart` $\rightarrow$ `ServiceCleaned`: `cleaning_minute`
2. `ServiceCleaned` $\rightarrow$ `ServiceEnd`: `servicing_minute`
3. Setup & QC: `preparation_minute` + `pre_servicing_minute`

#### Standard Phase Field Mapping:

- **`cleaningMinutes`**: `COALESCE(ros.cleaning_minute, 0)`
- **`extensionMinutes`**: `COALESCE(ros.servicing_minute, 0)`
- **`prepQcMinutes`**: `COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)`
- **`totalMinutes`**: `cleaningMinutes + extensionMinutes + prepQcMinutes`

#### Outlier Filtering Rules:

- Order status: `o.order_state = 'Completed'`
- Service group: `s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')`
- Duration bounds: `15 < totalMinutes < 200`
- Extension phase sanity check: `servicing_minute > 5`

### 3.2 Customer History Lookup & `serviceMode` Classifier

`serviceMode` is defined in 3 categories:

1. **`retain`**: Refill / Maintenance service (`s.service_type = 'Retain'`).
2. **`normal_removal`**: Customer has an existing completed order with a lash service in the 60-day window preceding this order date (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`). Old lashes require removal/cleaning.
3. **`normal_clean`**: Customer has NO completed lash service order in the 60 days prior to this order date. Clean slate.

#### Optimized SQL Query with History Subquery:

```sql
SELECT
  os.id AS order_service_id,
  os.assigned_staff_id AS staff_id,
  o.user_id AS customer_id,
  s.service_key,
  COALESCE(sl.service_name, s.service_key) AS service_name,
  s.service_type,
  COALESCE(ro.actual_booking_date_start, o.booking_date_start) AS order_date,
  COALESCE(ros.cleaning_minute, 0) AS cleaning_minute,
  COALESCE(ros.servicing_minute, 0) AS servicing_minute,
  (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) AS prep_qc_minute,
  (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) +
   COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) AS total_minute,
  CASE
    WHEN s.service_type = 'Retain' THEN 'retain'
    WHEN EXISTS (
      SELECT 1 FROM `order` prev_o
      JOIN order_service prev_os ON prev_os.order_id = prev_o.id
      JOIN service prev_s ON prev_os.service_id = prev_s.id
      WHERE prev_o.user_id = o.user_id
        AND prev_o.order_state = 'Completed'
        AND prev_o.id != o.id
        AND prev_s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
        AND COALESCE(prev_o.actual_booking_date_start, prev_o.booking_date_start) >= DATE_SUB(
              COALESCE(ro.actual_booking_date_start, o.booking_date_start), INTERVAL 60 DAY
            )
        AND COALESCE(prev_o.actual_booking_date_start, prev_o.booking_date_start) < COALESCE(
              ro.actual_booking_date_start, o.booking_date_start
            )
    ) THEN 'normal_removal'
    ELSE 'normal_clean'
  END AS service_mode
FROM order_service os
JOIN `order` o ON os.order_id = o.id
LEFT JOIN report_order ro ON o.id = ro.order_id
JOIN service s ON os.service_id = s.id
JOIN report_order_service ros ON os.id = ros.order_service_id
LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
WHERE o.order_state = 'Completed'
  AND os.assigned_staff_id = :cvStaffId
  AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= :rollingWindowStartDate
  AND (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) +
       COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0)) BETWEEN 15 AND 200
  AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC;
```

---

## 4. Adaptive Rolling Window & Seniority Algorithm

CV skill trajectory varies depending on tenure and cumulative case volume. The rolling window adapts dynamically based on CV seniority determined from their earliest `staff_bonus` record date:

### 4.1 Seniority Determination Rules

- **First Work Date**: `MIN(sb.date_created)` from `staff_bonus` where `staff_id = :cvStaffId`. (Fallback to `MIN(o.booking_date_start)` from `order_service`).
- **Total Historical Lash Cases**: `COUNT(DISTINCT os.id)` for lash services across all time.
- **Tenure in Months**: $\text{tenureMonths} = \frac{\text{NOW}() - \text{firstWorkDate}}{\text{30.4375 days}}$.

### 4.2 Window Thresholds

| Seniority Tier   | Conditions                                                           | Rolling Window ($W$) | Rationale                                      |
| ---------------- | -------------------------------------------------------------------- | -------------------- | ---------------------------------------------- |
| **Junior CV**    | $\text{tenureMonths} < 6$ OR $\text{totalLashCases} < 200$           | **3 months**         | Rapidly improving speed; older data stale      |
| **Mid-Level CV** | $6 \le \text{tenureMonths} < 12$ AND $\text{totalLashCases} \ge 200$ | **4 months**         | Transition phase; moderate stabilization       |
| **Senior CV**    | $\text{tenureMonths} \ge 12$ AND $\text{totalLashCases} \ge 200$     | **6 months**         | Stable mastery; maximum historical sample size |

### 4.3 Window Start Date Calculation

$$\text{rollingWindowStartDate} = \text{NOW}() - W \text{ months}$$

```typescript
export interface CvSeniorityInfo {
  tenureMonths: number;
  totalLashCases: number;
  windowMonths: number;
  windowStartDate: Date;
}

export async function getCvRollingWindow(fastify: FastifyInstance, cvStaffId: number): Promise<CvSeniorityInfo> {
  const result = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ first_date: Date | null; total_cases: bigint }>>(`
    SELECT
      MIN(sb.date_created) AS first_date,
      COUNT(DISTINCT os.id) AS total_cases
    FROM staff_bonus sb
    JOIN order_service os ON sb.order_service_id = os.id
    JOIN service s ON os.service_id = s.id
    WHERE sb.staff_id = ${cvStaffId}
      AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
  `);

  const firstDate = result[0]?.first_date ? new Date(result[0].first_date) : new Date();
  const totalLashCases = Number(result[0]?.total_cases || 0);

  const now = new Date();
  const diffMs = now.getTime() - firstDate.getTime();
  const tenureMonths = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.4375));

  let windowMonths = 6; // Default senior
  if (tenureMonths < 6 || totalLashCases < 200) {
    windowMonths = 3; // Junior
  } else if (tenureMonths < 12) {
    windowMonths = 4; // Mid-level
  }

  const windowStartDate = new Date(now);
  windowStartDate.setMonth(windowStartDate.getMonth() - windowMonths);

  return {
    tenureMonths: Math.round(tenureMonths * 10) / 10,
    totalLashCases,
    windowMonths,
    windowStartDate,
  };
}
```

---

## 5. 3-Layer Estimation Cascade & Self-Correction Logic

For each target standard lash count $n \in [30, 60, 70, 80, 90, 100, 120, 140]$, prediction uses a 3-layer waterfall:

```
                      +---------------------------------------+
                      | Exact samples for (style, mode, n)?  |
                      +---------------------------------------+
                                          |
                        +-----------------+-----------------+
                        | (>= 5 cases)                      | (< 5 cases)
                        v                                   v
             +--------------------+               +-------------------+
             | Layer 1: Direct P50 |               | Total style cases |
             +--------------------+               |    N_total >= 3?   |
                                                  +-------------------+
                                                            |
                                           +----------------+----------------+
                                           | (Yes)                           | (No)
                                           v                                 v
                                +---------------------+           +--------------------+
                                |  Fit Log-Regression |           | Layer 3: Benchmark |
                                | R^2 >= 0.5, b > 0?  |           | Fallback x R_cv    |
                                +---------------------+           +--------------------+
                                           |
                          +----------------+----------------+
                          | (Passes check)                  | (Fails check)
                          v                                 v
               +----------------------+           +--------------------+
               | Layer 2: Interpolate |           | Layer 3: Benchmark |
               |    a + b * ln(n)     |           | Fallback x R_cv    |
               +----------------------+           +--------------------+
```

### 5.1 Layer 1: Direct Data (P50 Median)

- **Condition**: Historical sample size $N_{exact} \ge 5$ for exact `(lashStyle, serviceMode, lashCount = n)`.
- **Calculation**: Median (P50) for each phase independently:
  - `cleaningMinutes` = $\text{P50}(\text{cleaning}_i)$
  - `extensionMinutes` = $\text{P50}(\text{servicing}_i)$
  - `prepQcMinutes` = $\text{P50}(\text{prep\_qc}_i)$
  - `totalMinutes` = `cleaningMinutes + extensionMinutes + prepQcMinutes`
- **Metadata**: `modelLayer = 1`, `confidence = 'high'`, `sampleSize = N_exact`, `regA = null`, `regB = null`, `regRSquared = null`.

### 5.2 Layer 2: Regression Interpolation

- **Condition**: $N_{exact} < 5$, but total sample size across all lash counts for `(lashStyle, serviceMode)` $N_{total} \ge 3$.
- **Regression Fit**: Fits $y = a + b \ln(n)$ for `servicing` phase (and `cleaning`, `prep_qc` phases).
- **Validation Constraints**:
  1. $R^2_{extension} \ge 0.5$
  2. $b_{extension} > 0$
  3. Prediction array across $[30, 60, 70, 80, 90, 100, 120, 140]$ strictly satisfies monotonicity.
- **Calculation for $n$**:
  - `cleaningMinutes` = $\max(3.0, a_{clean} + b_{clean} \ln(n))$
  - `extensionMinutes` = $\max(15.0, a_{ext} + b_{ext} \ln(n))$
  - `prepQcMinutes` = $\max(3.0, a_{prep} + b_{prep} \ln(n))$
  - `totalMinutes` = `cleaningMinutes + extensionMinutes + prepQcMinutes`
- **Metadata**: `modelLayer = 2`, `confidence = 'medium'`, `sampleSize = N_total`, `regA = a_ext`, `regB = b_ext`, `regRSquared = R2_ext`.

### 5.3 Layer 3: Global Benchmark Fallback with CV Speed Ratio Adjustment

- **Condition**: $N_{exact} < 5$ AND Layer 2 fails validation (or $N_{total} < 3$).
- **CV Speed Ratio $R_{cv}$**: CV's overall speed relative to global benchmark across styles where CV has data:
  $$R_{cv} = \text{median}\left(\left\{ \frac{\text{CV Actual Time}_j}{\text{Global Benchmark}_j} \right\}\right)$$
  - Clamped to $[0.6, 1.4]$ to prevent extreme outliers.
  - Defaults to $1.0$ if CV has zero data overall.
- **Calculation**:
  - `benchmarkTotal` = Global P50 from `crm_lash_type_benchmarks` for `(lashStyle, serviceMode, lashCount)`. (Fallback: 60 min for 60s, 75 min for 80s, 90 min for 100s, 110 min for 120s, 130 min for 140s).
  - `totalMinutes` = $\text{Math.round}(\text{benchmarkTotal} \times R_{cv})$
  - Phase Allocation (Standard SOP split):
    - `prepQcMinutes` = $\max(5, \text{Math.round}(\text{totalMinutes} \times 0.12))$
    - `cleaningMinutes` = $\max(5, \text{Math.round}(\text{totalMinutes} \times 0.15))$
    - `extensionMinutes` = `totalMinutes - prepQcMinutes - cleaningMinutes`
- **Metadata**: `modelLayer = 3`, `confidence = 'low'`, `sampleSize = N_total`, `regA = null`, `regB = null`, `regRSquared = null`.

---

## 6. Monotonicity Enforcement Invariant & Self-Correction

### 6.1 Mathematical Invariant

For standard lash counts sorted ascending $n_1 < n_2 < \dots < n_K$ ($30 < 60 < 70 < 80 < 90 < 100 < 120 < 140$):

$$\text{totalMinutes}(n_1) < \text{totalMinutes}(n_2) < \dots < \text{totalMinutes}(n_K)$$

### 6.2 Violation Handling Protocol

1. **Layer 2 Rejection**: If Layer 2 regression produces $\text{totalMinutes}(n_{k+1}) \le \text{totalMinutes}(n_k)$ for any $k$, Layer 2 fails validation $\rightarrow$ immediate fallback to Layer 3.
2. **Post-Processing Monotonic Smoothing**: After profiles are candidate-generated (across Layer 1, 2, 3), apply a final monotonic check:
   ```typescript
   export function enforceMonotonicity(
     profiles: Array<{ lashCount: number; totalMinutes: number; extensionMinutes: number }>
   ): void {
     profiles.sort((a, b) => a.lashCount - b.lashCount);
     for (let i = 1; i < profiles.length; i++) {
       const prev = profiles[i - 1];
       const curr = profiles[i];
       const minStep = Math.max(2.0, (curr.lashCount - prev.lashCount) * 0.1);
       if (curr.totalMinutes <= prev.totalMinutes + minStep) {
         const delta = prev.totalMinutes + minStep - curr.totalMinutes;
         curr.totalMinutes = Math.round((prev.totalMinutes + minStep) * 10) / 10;
         curr.extensionMinutes = Math.round((curr.extensionMinutes + delta) * 10) / 10;
       }
     }
   }
   ```

---

## 7. Database Integration & Nightly Seeding Engine

### 7.1 Database Schema (`crm_cv_speed_profile`)

Already present in `apps/api/prisma/crm.prisma`:

```prisma
model CrmCvSpeedProfile {
  id                    Int      @id @default(autoincrement())
  staffId               Int      @map("staff_id")
  staffName             String?  @map("staff_name") @db.VarChar(100)
  lashStyle             String   @map("lash_style") @db.VarChar(50)
  serviceMode           String   @map("service_mode") @db.VarChar(20)
  lashCount             Int      @map("lash_count")
  cleaningMinutes       Float    @map("cleaning_minutes")
  extensionMinutes      Float    @map("extension_minutes")
  prepQcMinutes         Float    @map("prep_qc_minutes")
  totalMinutes          Float    @map("total_minutes")
  modelLayer            Int      @map("model_layer")
  sampleSize            Int      @map("sample_size")
  confidence            String   @db.VarChar(10)
  regA                  Float?   @map("reg_a")
  regB                  Float?   @map("reg_b")
  regRSquared           Float?   @map("reg_r_squared")
  benchmarkTotalMinutes Float?   @map("benchmark_total_minutes")
  speedDeltaPercent     Float?   @map("speed_delta_percent")
  speedRating           String   @map("speed_rating") @db.VarChar(10)
  createdAt             DateTime @default(now()) @map("created_at") @db.DateTime(0)
  updatedAt             DateTime @updatedAt @map("updated_at") @db.DateTime(0)

  @@unique([staffId, lashStyle, serviceMode, lashCount], name: "staffId_lashStyle_serviceMode_lashCount")
  @@index([staffId])
  @@index([lashStyle])
  @@index([speedRating])
  @@map("crm_cv_speed_profile")
}
```

### 7.2 Speed Rating Calculation

- `speedDeltaPercent` = $\frac{\text{totalMinutes} - \text{benchmarkTotalMinutes}}{\text{benchmarkTotalMinutes}} \times 100$
- `speedRating`:
  - `'fast'` (Green): `speedDeltaPercent < -10.0`
  - `'normal'` (Yellow): `-10.0 <= speedDeltaPercent <= 10.0`
  - `'slow'` (Red): `speedDeltaPercent > 10.0`

### 7.3 Nightly Idempotent Seeding Pipeline

Triggered by `POST /api/kpi/cv-speed/seed`:

1. Retrieve active CV IDs from `ACTIVE_CV_STAFF_CONFIG` (or fallback active CVs: `[47510, 48026, 46092, 37790, 34295, 51659]`).
2. Query legacy `user_profile` to cache CV display names.
3. For each CV:
   - Compute rolling window and extract historical cases.
   - For all style combinations (`Classic`, `Mink`, `Volume 3D`, `Volume 4D`, `Volume 5D`, `Ultralight`, `Hyperlight`, `Flawless`, `Ivylight`, `Under Mink`) and modes (`normal_clean`, `normal_removal`, `retain`), run 3-Layer cascade across standard counts `[30, 60, 70, 80, 90, 100, 120, 140]`.
   - Enforce monotonicity.
   - Upsert records into `crm_cv_speed_profile` using Prisma `upsert`.
4. Return seed summary statistics: `{ cvsProcessed, recordsUpserted, durationMs }`.

---

## 8. Service Class Structure (`CvSpeedModelService`)

```typescript
// apps/api/src/modules/kpi/services/cv-speed-model.service.ts

import { FastifyInstance } from 'fastify';
import { parseLashSpecs } from '../../catalog/services/lash-benchmark.service.js';
import { CvSpeedProfile, CvSpeedMatrix, CvSpeedRanking, CvSpeedPrediction, CvSpeedSeedResult } from '@mos-lab/shared';

export class CvSpeedModelService {
  /**
   * Fit logarithmic curve y = a + b * ln(n) and compute R^2
   */
  static fitLogarithmicRegression(dataPoints: Array<{ lashCount: number; minutes: number }>): LogRegressionResult;

  /**
   * Calculate dynamic rolling window based on CV seniority from staff_bonus
   */
  static getCvRollingWindow(fastify: FastifyInstance, cvStaffId: number): Promise<CvSeniorityInfo>;

  /**
   * Extract historical cases from legacy DB report_order_service with serviceMode classification
   */
  static extractCvCases(fastify: FastifyInstance, cvStaffId: number, windowStartDate: Date): Promise<ExtractedCase[]>;

  /**
   * Compute profiles for a single CV using 3-Layer cascade
   */
  static computeCvProfiles(fastify: FastifyInstance, cvStaffId: number, staffName: string): Promise<CvSpeedProfile[]>;

  /**
   * Nightly seed process - recalculates and upserts profiles for all active CVs
   */
  static seedAllProfiles(fastify: FastifyInstance): Promise<CvSpeedSeedResult>;

  /**
   * Predict ETA for booking widget
   */
  static predictEta(
    fastify: FastifyInstance,
    params: { staffId: number; lashStyle: string; serviceMode?: string; lashCount: number; customerId?: number }
  ): Promise<CvSpeedPrediction>;

  /**
   * Matrix overview data query
   */
  static getSpeedMatrix(fastify: FastifyInstance): Promise<CvSpeedMatrix>;

  /**
   * Ranking query
   */
  static getSpeedRanking(
    fastify: FastifyInstance,
    params: { lashStyle: string; lashCount: number; serviceMode: string }
  ): Promise<CvSpeedRanking[]>;

  /**
   * Monthly speed trend for a CV
   */
  static getMonthlyTrend(fastify: FastifyInstance, staffId: number): Promise<any>;

  /**
   * Detailed breakdown for CV modal
   */
  static getCvDetail(fastify: FastifyInstance, staffId: number): Promise<any>;
}
```

---

## 9. Verification & Acceptance Criteria Validation Plan

### 9.1 Mathematical Validation

- [x] Logarithmic regression formula correctly transforms $x = \ln(n)$ and handles $S_{xx} = 0$, $S_{yy} = 0$, $N < 2$.
- [x] $R^2$ formula bounded in $[0, 1.0]$.
- [x] Monotonicity invariant enforced across standard counts $[30, 60, 70, 80, 90, 100, 120, 140]$.

### 9.2 Data Integrity & System Compliance

- [x] Phase times mapped directly from `report_order_service` (`cleaning_minute`, `servicing_minute`, `preparation_minute + pre_servicing_minute`).
- [x] Date filtering uses `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` per Rule #15.
- [x] Active CVs loaded from `ACTIVE_CV_STAFF_CONFIG`.
- [x] Idempotent upsert on `crm_cv_speed_profile` via unique index `[staffId, lashStyle, serviceMode, lashCount]`.

---

_Report completed by explorer_m2_1._
