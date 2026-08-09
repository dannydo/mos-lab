# Comprehensive Specification Analysis: CV Lash Extension Speed Model

## Executive Summary

This document specifies the authoritative design, mathematical foundation, database schema, API contracts, rating rules, and edge cases for the **CV Lash Extension Speed Model** in `mos-lab`.

The model predicts completion times for lash extension services per CV (Chuyên viên / Kỹ thuật viên) across individual service phases (`cleaning`, `extension`, `prep_qc`, `total`). It incorporates non-linear logarithmic regression to reflect the real-world operational reality: as more lash extensions are applied, natural lash isolation becomes progressively more time-consuming ($n$ = lash count).

---

## 1. Mathematical Equations & Rules

### 1.1 Non-Linear Logarithmic Regression Formula

The completion time for any given phase as a function of lash count $n$ is modeled by:

$$\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$$

Where:

- $n \in \{30, 60, 70, 80, 90, 100, 120, 140\}$: target lash count (number of lashes).
- $a_{phase}$: base intercept coefficient in minutes (represents base overhead for the phase regardless of lash count).
- $b_{phase}$: log-rate scaling coefficient in minutes per log-unit (captures the diminishing speed per lash as natural lashes fill up).
- $\ln(n)$: natural logarithm of the lash count.

#### Closed-Form Least Squares Fitting

For a set of $N$ data points $(n_i, y_i)$ where $x_i = \ln(n_i)$ and $y_i$ is actual phase duration in minutes:

$$b = \frac{N \sum_{i=1}^N (x_i y_i) - \left(\sum_{i=1}^N x_i\right) \left(\sum_{i=1}^N y_i\right)}{N \sum_{i=1}^N x_i^2 - \left(\sum_{i=1}^N x_i\right)^2}$$

$$a = \bar{y} - b \bar{x} = \frac{\sum_{i=1}^N y_i - b \sum_{i=1}^N x_i}{N}$$

### 1.2 Goodness of Fit ($R^2$) Criteria

The coefficient of determination $R^2$ measures model fit quality:

$$R^2 = 1 - \frac{SS_{res}}{SS_{tot}} = 1 - \frac{\sum_{i=1}^N (y_i - (a + b \ln(n_i)))^2}{\sum_{i=1}^N (y_i - \bar{y})^2}$$

- **Threshold**: Layer 2 regression requires $R^2 > 0.5$.
- **Validation Failure**: If $R^2 \le 0.5$, the regression curve fit is discarded, and prediction falls back to Layer 3 with warning flag `low_r2_fallback`.

### 1.3 Monotonicity Invariant Constraint

In eyelash extension operations, higher lash count MUST strictly require equal or greater completion time for the same CV, lash style, and service mode:

$$\text{for } n_1 < n_2 \implies \text{time}(n_1) < \text{time}(n_2) \quad (\text{i.e.}, b_{phase} > 0)$$

- Example: Classic 60 (390k) MUST predict faster than Classic 70 (440k) and Classic 80 (490k).
- **Validation Failure**: If regression produces $b_{phase} \le 0$ or predicted $\text{time}(n_1) \ge \text{time}(n_2)$ for $n_1 < n_2$, Layer 2 regression is invalidated, and prediction falls back to Layer 3 with warning flag `non_monotonic_fallback`.

### 1.4 Self-Correcting 3-Layer Estimation Hierarchy

When estimating completion time for a specific CV, `lashStyle`, `serviceMode`, and target `lashCount`:

1. **Layer 1 (Direct Data — High Confidence)**:
   - **Condition**: CV has $\ge 5$ actual completed cases for the exact tuple `(lashStyle, serviceMode, lashCount)`.
   - **Formula**: $\text{time}_{predicted} = \text{P50 (Median actual duration of matching cases)}$.
   - **Metadata**: `model_layer = 1`, `confidence = 'high'`.

2. **Layer 2 (Regression Interpolation — Medium Confidence)**:
   - **Condition**: CV has $\ge 3$ actual cases across at least 2 distinct lash counts for `(lashStyle, serviceMode)`, but $< 5$ cases for the exact target `lashCount`.
   - **Formula**: Fit $\text{time}(n) = a + b \ln(n)$.
   - **Validation**: Verify $R^2 > 0.5$ AND $b > 0$ (monotonicity).
   - **Result**: $\text{time}_{predicted} = a + b \ln(n_{target})$.
   - **Metadata**: `model_layer = 2`, `confidence = 'medium'`, `reg_a = a`, `reg_b = b`, `reg_r_squared = R^2`.

3. **Layer 3 (Global Benchmark Fallback — Low Confidence)**:
   - **Condition**: CV has $< 3$ data points across different lash counts, OR Layer 2 regression failed $R^2$/monotonicity checks.
   - **Formula**:
     $$\text{ratio}_{CV} = \frac{1}{|M_{CV}|} \sum_{s \in M_{CV}} \frac{\text{CV average duration for style } s}{\text{Global benchmark duration for style } s}$$
     $$\text{time}_{predicted} = \text{GlobalBenchmark}(lashStyle, serviceMode, lashCount) \times \text{ratio}_{CV}$$
   - **Fallback default**: If CV has zero historical cases overall ($\text{ratio}_{CV}$ unavailable), use unadjusted `GlobalBenchmark` (P50 from `crm_lash_type_benchmarks`).
   - **Metadata**: `model_layer = 3`, `confidence = 'low'`.

### 1.5 Adaptive Rolling Window Rules

Data evaluation windows are dynamically scaled based on CV seniority to balance sensitivity to recent performance improvements against sample size stability:

- **CV Seniority Calculation**: Seniority is computed in months from the CV's earliest work record:
  $$\text{seniority\_months} = \text{TIMESTAMPDIFF(MONTH, MIN(sb.date\_created), NOW())}$$
- **Window Rules**:
  - **Junior CV** (< 6 months working OR < 200 total historical lash cases): **3-month rolling window** (`INTERVAL 3 MONTH`).
  - **Mid-level CV** (6 – 12 months working AND $\ge 200$ cases): **4-month rolling window** (`INTERVAL 4 MONTH`).
  - **Senior CV** ($\ge 12$ months working AND $\ge 200$ cases): **6-month rolling window** (`INTERVAL 6 MONTH`).

---

## 2. Model Dimensions & Service Mode Logic

### 2.1 Model Dimensions

Every speed profile entry is categorized along three primary axes:

1. **Lash Style** (Derived via `parseLashSpecs()`):
   - `Classic`
   - `Mink`
   - `Volume 3D`
   - `Volume 4D`
   - `Volume 5D`
   - `Ultralight`
   - `Hyperlight`
   - `Flawless`
   - `Ivylight` (Ivylight, Ivylight 3L, Ivylight 4L, Ivylight 5L)
   - `Under Mink`

2. **Standard Lash Counts**:
   - $n \in [30, 60, 70, 80, 90, 100, 120, 140]$

3. **Phase Breakdown** (in minutes):
   - `cleaning`: `cleaning_minute` from `report_order_service` (iPad state: ServiceStart $\rightarrow$ ServiceCleaned)
   - `extension`: `servicing_minute` from `report_order_service` (iPad state: ServiceCleaned $\rightarrow$ ServiceCompleted)
   - `prep_qc`: `preparation_minute + pre_servicing_minute` (Setup + Quality Check)
   - `total`: `cleaning_minutes + extension_minutes + prep_qc_minutes`

### 2.2 Customer History & Service Mode Classification Logic

Service Mode captures the complexity of the natural lash bed prior to application:

- **`retain`**: Service is a refill/maintenance session (`service_type = 'Retain'`).
- **`normal_removal`**: Service is a full set (`service_type != 'Retain'`) AND the customer HAS a completed order with lash services in the past 2 months (`actual_booking_date_start >= NOW() - INTERVAL 2 MONTH`). Indicates existing old extensions must be removed/cleaned first.
- **`normal_clean`**: Service is a full set (`service_type != 'Retain'`) AND the customer HAS NO completed lash orders in the past 2 months. Represents a fresh, clean-slate natural lash bed.

```sql
-- Service Mode Detection Query Logic
CASE
  WHEN s.service_type = 'Retain' THEN 'retain'
  WHEN EXISTS (
    SELECT 1 FROM `order` prev_o
    JOIN order_service prev_os ON prev_o.id = prev_os.order_id
    JOIN service prev_s ON prev_os.service_id = prev_s.id
    LEFT JOIN report_order prev_ro ON prev_o.id = prev_ro.order_id
    WHERE prev_o.user_id = o.user_id
      AND prev_o.order_state = 'Completed'
      AND prev_s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
      AND COALESCE(prev_ro.actual_booking_date_start, prev_o.booking_date_start) >= DATE_SUB(COALESCE(ro.actual_booking_date_start, o.booking_date_start), INTERVAL 2 MONTH)
      AND prev_o.id != o.id
  ) THEN 'normal_removal'
  ELSE 'normal_clean'
END AS service_mode
```

---

## 3. Database Table Specification: `crm_cv_speed_profile`

### 3.1 Field Schema Definition

| Field Name                | MySQL Data Type | Nullable | Key / Constraint   | Description                                                   |
| ------------------------- | --------------- | -------- | ------------------ | ------------------------------------------------------------- |
| `id`                      | `INT`           | No       | PK, AUTO_INCREMENT | Unique surrogate identifier                                   |
| `staff_id`                | `INT`           | No       | FK / Index         | CV staff user ID from legacy DB                               |
| `staff_name`              | `VARCHAR(100)`  | Yes      |                    | Cached full display name of CV                                |
| `lash_style`              | `VARCHAR(50)`   | No       | Index              | Lash style name (e.g. Classic, Volume 3D)                     |
| `service_mode`            | `VARCHAR(20)`   | No       | Index              | Service mode (`normal_clean`, `normal_removal`, `retain`)     |
| `lash_count`              | `INT`           | No       | Index              | Target lash count (30, 60, 70, 80, 90, 100, 120, 140)         |
| `cleaning_minutes`        | `FLOAT`         | No       |                    | Predicted cleaning phase time (mins)                          |
| `extension_minutes`       | `FLOAT`         | No       |                    | Predicted extension phase time (mins)                         |
| `prep_qc_minutes`         | `FLOAT`         | No       |                    | Predicted setup & QC phase time (mins)                        |
| `total_minutes`           | `FLOAT`         | No       |                    | Predicted total service time (mins)                           |
| `model_layer`             | `INT`           | No       |                    | Estimation layer used: 1=direct, 2=regression, 3=benchmark    |
| `sample_size`             | `INT`           | No       |                    | Sample count of cases used for model                          |
| `confidence`              | `VARCHAR(10)`   | No       |                    | Model confidence (`high`, `medium`, `low`)                    |
| `reg_a`                   | `FLOAT`         | Yes      |                    | Logarithmic regression intercept $a$ (if layer 2)             |
| `reg_b`                   | `FLOAT`         | Yes      |                    | Logarithmic regression slope $b$ (if layer 2)                 |
| `reg_r_squared`           | `FLOAT`         | Yes      |                    | Regression coefficient of determination $R^2$ (if layer 2)    |
| `benchmark_total_minutes` | `FLOAT`         | Yes      |                    | Global P50 benchmark for comparison                           |
| `speed_delta_percent`     | `FLOAT`         | Yes      |                    | Percentage delta vs benchmark: `((total - bm)/bm)*100`        |
| `speed_rating`            | `VARCHAR(10)`   | No       | Index              | Rating: `'fast'` (green), `'normal'` (yellow), `'slow'` (red) |
| `updated_at`              | `DATETIME`      | No       |                    | Last model update timestamp                                   |
| `created_at`              | `DATETIME`      | No       |                    | Creation timestamp                                            |

### 3.2 Constraints & Indexes

- **Unique Constraint**:
  `UNIQUE KEY unique_cv_speed_profile (staff_id, lash_style, service_mode, lash_count)`
- **Indexes**:
  - `INDEX idx_staff_id (staff_id)`
  - `INDEX idx_style_count (lash_style, lash_count)`
  - `INDEX idx_speed_rating (speed_rating)`
  - `INDEX idx_service_mode (service_mode)`

### 3.3 Prisma Schema Definition Snippet

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
  confidence            String   @map("confidence") @db.VarChar(10)
  regA                  Float?   @map("reg_a")
  regB                  Float?   @map("reg_b")
  regRSquared           Float?   @map("reg_r_squared")
  benchmarkTotalMinutes Float?   @map("benchmark_total_minutes")
  speedDeltaPercent     Float?   @map("speed_delta_percent")
  speedRating           String   @map("speed_rating") @db.VarChar(10)
  updatedAt             DateTime @updatedAt @map("updated_at") @db.DateTime(0)
  createdAt             DateTime @default(now()) @map("created_at") @db.DateTime(0)

  @@unique([staffId, lashStyle, serviceMode, lashCount], name: "unique_cv_speed_profile")
  @@index([staffId])
  @@index([lashStyle, lashCount])
  @@index([speedRating])
  @@index([serviceMode])
  @@map("crm_cv_speed_profile")
}
```

---

## 4. Speed Rating Boundaries

Speed rating evaluates a CV's predicted performance against global store benchmarks:

$$\text{speed\_delta\_percent} = \frac{\text{total\_minutes} - \text{benchmark\_total\_minutes}}{\text{benchmark\_total\_minutes}} \times 100$$

| Speed Rating | Rating Key | Threshold Condition                     | UI Color Code      | Meaning                    |
| ------------ | ---------- | --------------------------------------- | ------------------ | -------------------------- |
| **Fast**     | `'fast'`   | `speed_delta_percent < -10.0`           | Green (`#52c41a`)  | >10% faster than benchmark |
| **Normal**   | `'normal'` | `-10.0 <= speed_delta_percent <= +10.0` | Yellow (`#faad14`) | Within ±10% of benchmark   |
| **Slow**     | `'slow'`   | `speed_delta_percent > +10.0`           | Red (`#ff4d4f`)    | >10% slower than benchmark |

---

## 5. API Endpoint Contracts & Business Logic Requirements

All endpoints must enforce key platform invariants:

- Filter active CVs via `ACTIVE_CV_STAFF_CONFIG` in `crmConfig` (with fallback to default CV staff list).
- Support date range filtering using `parseComboDateBounds` padding (`00:00:00` to `23:59:59`).
- Respect Rule #15 for completion dates: `COALESCE(ro.actual_booking_date_start, o.booking_date_start)`.

### Endpoint 1: `GET /api/kpi/cv-speed/profiles`

- **Purpose**: List speed profile records from `crm_cv_speed_profile`.
- **Query Parameters**:
  - `staffId?: number`
  - `lashStyle?: string`
  - `serviceMode?: string`
  - `lashCount?: number`
  - `speedRating?: string` ('fast' | 'normal' | 'slow')
  - `page?: number` (default 1)
  - `pageSize?: number` (default 50)
- **Response Contract (`CvSpeedProfileResponse`)**:
  ```ts
  {
    data: CvSpeedProfile[];
    total: number;
    page: number;
    pageSize: number;
  }
  ```

### Endpoint 2: `GET /api/kpi/cv-speed/matrix`

- **Purpose**: Retrieve 2D overview matrix (rows = active CVs, columns = lash style × lash count).
- **Query Parameters**:
  - `serviceMode?: string` (default `'normal_clean'`)
  - `dateFrom?: string` (YYYY-MM-DD)
  - `dateTo?: string` (YYYY-MM-DD)
- **Response Contract (`CvSpeedMatrixResponse`)**:
  ```ts
  {
    columns: Array<{ lashStyle: string; lashCount: number; benchmarkMinutes: number }>;
    rows: Array<{
      staffId: number;
      staffName: string;
      avatar: string | null;
      store: string;
      cells: Record<
        string,
        {
          // Key format: "Classic_60"
          totalMinutes: number;
          speedRating: 'fast' | 'normal' | 'slow';
          speedDeltaPercent: number;
          modelLayer: 1 | 2 | 3;
          confidence: 'high' | 'medium' | 'low';
        }
      >;
    }>;
  }
  ```

### Endpoint 3: `GET /api/kpi/cv-speed/ranking`

- **Purpose**: Rank active CVs from fastest to slowest for a specific configuration.
- **Query Parameters**:
  - `lashStyle: string` (required, e.g. `'Classic'`)
  - `lashCount: number` (required, e.g. `60`)
  - `serviceMode?: string` (default `'normal_clean'`)
  - `dateFrom?: string`
  - `dateTo?: string`
- **Response Contract (`CvSpeedRankingResponse`)**:
  ```ts
  {
    lashStyle: string;
    lashCount: number;
    serviceMode: string;
    benchmarkMinutes: number;
    rankings: Array<{
      rank: number;
      staffId: number;
      staffName: string;
      avatar: string | null;
      store: string;
      predictedMinutes: number;
      sampleSize: number;
      confidence: 'high' | 'medium' | 'low';
      speedRating: 'fast' | 'normal' | 'slow';
      speedDeltaPercent: number;
      trend: 'improving' | 'declining' | 'stable';
    }>;
  }
  ```

### Endpoint 4: `GET /api/kpi/cv-speed/trend/:staffId`

- **Purpose**: Get monthly historical speed trend for a specific CV.
- **Query Parameters**:
  - `lashStyle?: string` (optional filter)
  - `months?: number` (default 6)
- **Response Contract (`CvSpeedTrendResponse`)**:
  ```ts
  {
    staffId: number;
    staffName: string;
    months: Array<{
      month: string; // "YYYY-MM"
      avgTotalMinutes: number;
      benchmarkMinutes: number;
      caseCount: number;
      speedRating: 'fast' | 'normal' | 'slow';
      speedDeltaPercent: number;
    }>;
  }
  ```

### Endpoint 5: `GET /api/kpi/cv-speed/detail/:staffId`

- **Purpose**: Detailed breakdown of recent cases and phase metrics for a specific CV.
- **Query Parameters**:
  - `dateFrom?: string`
  - `dateTo?: string`
  - `lashStyle?: string`
  - `page?: number` (default 1)
  - `pageSize?: number` (default 20)
- **Response Contract (`CvSpeedDetailResponse`)**:
  ```ts
  {
    summary: {
      staffId: number;
      staffName: string;
      avatar: string | null;
      store: string;
      totalCases: number;
      overallSpeedScore: number;
      avgVsBenchmarkPercent: number;
      phaseAverages: {
        cleaningMinutes: number;
        extensionMinutes: number;
        prepQcMinutes: number;
        totalMinutes: number;
      }
    }
    cases: Array<{
      orderServiceId: number;
      orderId: number;
      checkinTime: string;
      clientName: string;
      store: string;
      lashStyle: string;
      lashCount: number | null;
      serviceMode: string;
      cleaningMinutes: number;
      extensionMinutes: number;
      prepQcMinutes: number;
      totalMinutes: number;
      benchmarkTotalMinutes: number;
      speedRating: 'fast' | 'normal' | 'slow';
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
  ```

### Endpoint 6: `GET /api/kpi/cv-speed/predict`

- **Purpose**: Real-time ETA prediction widget endpoint for booking system.
- **Query Parameters**:
  - `staffId: number` (required)
  - `lashStyle: string` (required)
  - `lashCount: number` (required)
  - `serviceMode?: string` (default `'normal_clean'`)
  - `customerId?: number` (optional)
- **Response Contract (`CvSpeedPredictionResponse`)**:
  ```ts
  {
    staffId: number;
    lashStyle: string;
    serviceMode: string;
    lashCount: number;
    predictedTimes: {
      cleaningMinutes: number;
      extensionMinutes: number;
      prepQcMinutes: number;
      totalMinutes: number;
    }
    modelLayer: 1 | 2 | 3;
    confidence: 'high' | 'medium' | 'low';
    speedRating: 'fast' | 'normal' | 'slow';
    benchmarkTotalMinutes: number;
    speedDeltaPercent: number;
    source: string;
  }
  ```

### Endpoint 7: `POST /api/kpi/cv-speed/seed`

- **Purpose**: Trigger model recalculation and database re-seeding.
- **Request Body**: `{ force?: boolean }`
- **Response Contract (`CvSpeedSeedResponse`)**:
  ```ts
  {
    success: boolean;
    cvsProcessed: number;
    profilesGenerated: number;
    durationMs: number;
    timestamp: string;
  }
  ```

---

## 6. Features Discovered & Edge Cases

### Features Discovered Table

| #   | Category       | Feature                         | Description                                                                                                                                         | Inputs                                              | Outputs                                         | Error Behavior                                                      | Discovered Via          |
| --- | -------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| 1   | Model          | Logarithmic Phase Curve Fitting | Non-linear fitting $\text{time}(n) = a + b\ln(n)$ for 4 distinct phases (`cleaning`, `extension`, `prep_qc`, `total`).                              | Case durations per phase, lash count $n$            | Coefficients $a$, $b$, $R^2$, predicted minutes | Discards model if $R^2 \le 0.5$ or $b \le 0$, falls back to Layer 3 | ORIGINAL_REQUEST.md §R1 |
| 2   | Model          | 3-Layer Estimation Hierarchy    | Fallback cascade: Direct P50 ($\ge 5$ cases) $\rightarrow$ Log Interpolation ($\ge 3$ cases across counts) $\rightarrow$ Adjusted Global Benchmark. | Sample count, historical cases                      | Predicted time, `model_layer`, `confidence`     | Graceful fallback down to Layer 3 global P50 benchmark              | ORIGINAL_REQUEST.md §R1 |
| 3   | Model          | Monotonicity Enforcement        | Constraint enforcing that larger lash counts must strictly require equal/greater time for same CV and mode.                                         | Predicted curve values across $n$                   | Validated monotonic curve                       | Triggers Layer 3 fallback with `non_monotonic_fallback` flag        | ORIGINAL_REQUEST.md §R1 |
| 4   | Model          | Adaptive Rolling Window         | Dynamic historical window (3, 4, or 6 months) based on CV seniority ($<6$ mos, 6-12 mos, $\ge 12$ mos).                                             | `MIN(date_created)` from legacy `staff_bonus`       | Date threshold `INTERVAL X MONTH`               | Defaults to 3 months if CV seniority cannot be determined           | ORIGINAL_REQUEST.md §R1 |
| 5   | Classification | 3-Tier Service Mode             | Classifies service complexity into `normal_clean`, `normal_removal`, `retain`.                                                                      | Customer order history (past 2 mos), `service_type` | Service mode string                             | Defaults to `normal_clean` if customer history query returns empty  | ORIGINAL_REQUEST.md §R1 |
| 6   | Database       | CRM Speed Profile Storage       | Persistent table `crm_cv_speed_profile` storing precomputed matrix predictions per CV.                                                              | Seed job inputs                                     | Table rows with predictions & metadata          | Idempotent replacement via upsert / delete-create                   | ORIGINAL_REQUEST.md §R2 |
| 7   | API            | 7 REST Endpoint Suite           | Complete API surface for matrix overview, rankings, trends, per-case details, predictions, and seeding.                                             | HTTP GET/POST parameters                            | Structured typed JSON responses                 | Standard HTTP 400 (Bad Params), 404, 500 error contracts            | ORIGINAL_REQUEST.md §R3 |

### Edge Cases Table

| #   | Feature             | Input / Trigger Condition                                                               | Observed / Required Behavior                                                                                           |
| --- | ------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Regression Fit      | Sample size $N < 3$ across different lash counts                                        | Disallow Layer 2 regression fit. Directly fall back to Layer 3 (Adjusted Global Benchmark).                            |
| 2   | Regression Fit      | Regression fit yields $R^2 \le 0.5$ due to high variance                                | Reject Layer 2 prediction. Fall back to Layer 3 with warning metadata `low_r2_fallback`.                               |
| 3   | Monotonicity        | Regression produces negative slope ($b \le 0$) or non-monotonic times ($t(60) > t(80)$) | Invalidate regression results. Fall back to Layer 3 with `non_monotonic_fallback` flag.                                |
| 4   | Phase Calculation   | Logarithmic calculation predicts phase time $\le 0$ minutes for small lash counts       | Bound predicted phase time by absolute operational minimums: cleaning $\ge 3$m, extension $\ge 10$m, prep_qc $\ge 3$m. |
| 5   | Service Mode        | Customer history has no lash orders in 2 months, but current service is `Retain`        | Service mode MUST evaluate to `retain` regardless of history (driven by `service_type = 'Retain'`).                    |
| 6   | CV Seniority        | Brand new CV with no prior `staff_bonus` or `user_profile` records                      | Assign Junior status (< 6 months), applying the conservative 3-month rolling window.                                   |
| 7   | Active CV Filtering | Inactive CV present in historical records but excluded from `ACTIVE_CV_STAFF_CONFIG`    | Exclude inactive CV from Matrix, Rankings, and Predictor dropdowns to prevent clutter.                                 |
| 8   | Nightly Seeding     | `POST /api/kpi/cv-speed/seed` called concurrently multiple times                        | Ensure operation is atomic or idempotent using SQL transactions / unique key upserts.                                  |
| 9   | Rating Delta        | Benchmark duration is 0 or null for obscure lash style                                  | Fallback benchmark to catalog `duration_minute_standard` (default 60m) to prevent division by zero in speed delta.     |
| 10  | Date Range Query    | Date range parameters omit time strings (`YYYY-MM-DD`)                                  | Apply `parseComboDateBounds` padding to set `dateFrom` to `00:00:00` and `dateTo` to `23:59:59`.                       |

---

## 7. Verification Method

To verify these specifications against the project implementation:

1. **Shared Types**: Check `packages/shared/src/types/cv-speed.ts` after generation against Section 5 interfaces. Run `pnpm --filter @mos-lab/shared build`.
2. **Prisma Model**: Inspect `apps/api/prisma/crm.prisma` for `CrmCvSpeedProfile` definition matching Section 3. Run `pnpm --filter @mos-lab/api prisma:generate`.
3. **API Implementation**: Check `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` for implementation of all 7 endpoints with exact route paths and response shapes.
4. **Model Invariants**: Test monotonicity and $R^2$ validation logic using mock data or unit tests.
