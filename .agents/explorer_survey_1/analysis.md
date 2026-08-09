# Detailed Technical Survey & Analysis Report: CV Lash Extension Speed Model

## 1. Executive Summary

This report documents the architectural investigation and codebase survey conducted to prepare for building the **CV Lash Extension Speed Model** for `mos-lab`.

The objective of the model is to provide a non-linear (logarithmic) per-CV speed profile for eyelash extension services across 4 phases (`cleaning`, `extension`, `prep_qc`, and `total`). This enables:

1. Targeted coaching for technicians based on phase-specific bottlenecks.
2. Highly accurate booking duration/ETA predictions for scheduling and customer management.

Key findings from inspecting existing backend services, Prisma schemas, KPI routes, and legacy database structures confirm that all necessary data points and existing service components are available in `mos-lab`.

---

## 2. Model Specification & Mathematical Formulation (from ORIGINAL_REQUEST.md)

### 2.1 Logarithmic Speed Model Equation

Lash application naturally becomes slower per lash as more lashes are attached because finding healthy natural lashes becomes increasingly difficult. The model uses logarithmic regression:

$$\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$$

Where:

- $n$ = lash count ($n \in \{30, 60, 70, 80, 90, 100, 120, 140\}$).
- $a_{phase}$ = base intercept (fixed setup overhead for the phase).
- $b_{phase}$ = log-rate coefficient (rate of duration increase as lash density increases).

### 2.2 Model Dimensions

Each CV has speed profile parameters fitted across 3 key dimensions:

1. **Lash Style**: Extracted via `parseLashSpecs()` from `service_key` / `service_name`:
   - `Classic`, `Mink`, `Under Mink`, `Volume 3D`, `Volume 4D`, `Volume 5D`, `Ultralight`, `Hyperlight`, `Flawless`, `Ivylight`, `Ivylight 3L`, `Ivylight 4L`, `Ivylight 5L`.
2. **Service Mode**:
   - `normal_clean`: Customer has NO prior completed lash order in the past 2 months.
   - `normal_removal`: Customer HAS a prior completed lash order in the past 2 months (requires lash removal/cleaning of old lashes).
   - `retain`: Refill / dặm mi (`service_type = 'Retain'`).
3. **Phase**:
   - `cleaning`: `cleaning_minute` from `report_order_service` (ServiceStart → ServiceCleaned).
   - `extension`: `servicing_minute` from `report_order_service` (ServiceCleaned → ServiceEnd).
   - `prep_qc`: `preparation_minute + pre_servicing_minute` (setup + quality check).
   - `total`: `preparation_minute + pre_servicing_minute + cleaning_minute + servicing_minute`.

### 2.3 3-Layer Self-Correcting Estimation Logic

To handle sparse data per CV, the model uses a 3-layer hierarchy:

- **Layer 1 (Direct Data)**: CV has $\ge 5$ historical cases for exact `(lashStyle, serviceMode, lashCount)` $\rightarrow$ use actual median P50 duration.
- **Layer 2 (Logarithmic Interpolation)**: CV has $\ge 3$ data points across different lash counts for `(lashStyle, serviceMode)` $\rightarrow$ fit logarithmic curve $\text{time} = a + b \ln(n)$, interpolate for target lash count $n$.
  - Requires $R^2 > 0.5$ and monotonicity compliance.
- **Layer 3 (Global Benchmark Fallback)**: CV has $< 3$ data points $\rightarrow$ use global benchmark P50 from `crm_lash_type_benchmarks`, scaled by the CV's overall speed ratio on styles they _do_ have sufficient data for.

### 2.4 Monotonicity Constraint Invariant

- **Invariant**: For the same CV and service mode, a lower lash count MUST predict a shorter duration than a higher lash count (e.g., Classic 60 sợi < Classic 70 sợi < Classic 80 sợi).
- If logarithmic regression violates monotonicity, the model must fall back to Layer 3 and log a warning flag.

### 2.5 Seniority-Based Adaptive Rolling Window

CV seniority is determined by finding their earliest record in the legacy database (e.g., `MIN(sb.date_created)` in `staff_bonus` or `MIN(ro.actual_booking_date_start)`):

- **Junior CV** (< 6 months working OR < 200 total lash cases): 3-month rolling window.
- **Mid-level CV** (6 to 12 months working): 4-month rolling window.
- **Senior CV** ($\ge 12$ months working): 6-month rolling window.

---

## 3. Analysis of Existing Service Components

### 3.1 LashBenchmarkService (`apps/api/src/modules/catalog/services/lash-benchmark.service.ts`)

- **`parseLashSpecs(serviceKey, serviceName)`**:
  - Located at lines 16–83.
  - Maps `service_key` prefixes (e.g. `classic-`, `mink-`, `volume-`, `ultralight-`, `flawless-`, `ivylight-`, `under-mink-`) and regex `(\d{2,3})\s*(sợi|soi|lashes|sợ)` to `{ lashStyle, lashCount }`.
  - Also maps price tiers (e.g. 390k/440k $\rightarrow$ 60 sợi, 490k/550k $\rightarrow$ 80 sợi, 660k/690k $\rightarrow$ 90 sợi, 770k/790k/880k $\rightarrow$ 100 sợi, 990k/1090k/1110k $\rightarrow$ 120 sợi, 1220k+ $\rightarrow$ 140 sợi).
- **`calculateBenchmarks(fastify)`**:
  - Queries `order_service` JOIN `report_order_service` JOIN `order` JOIN `service` for completed orders over the last 6 months.
  - Computes total tracked duration: `(COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) + COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0))`.
  - Applies duration outlier bounds: $15 < \text{duration} < 200$.
  - Groups by `(lashStyle, serviceType, lashCount)` and calculates P25, P50, P75.
- **`seedBenchmarks(fastify)`**:
  - Clears `isAutoGenerated = true` from `crm_lash_type_benchmarks` in CRM DB (`fastify.prisma.crm`) and inserts freshly computed benchmarks.
- **`estimateETA(fastify, params)` and `batchEstimateETA(...)`**:
  - Demonstrates 3-layer fallback for booking ETA at the service level.

---

## 4. CRM Prisma Database Schemas

### 4.1 Global Benchmarks (`CrmLashTypeBenchmark`)

- Defined in `apps/api/prisma/crm.prisma` (lines 724–739):

```prisma
model CrmLashTypeBenchmark {
  id               Int      @id @default(autoincrement())
  lashStyle        String   @map("lash_style") @db.VarChar(50)
  serviceType      String   @map("service_type") @db.VarChar(30)
  lashCount        Int?     @map("lash_count")
  benchmarkMinutes Int      @map("benchmark_minutes")
  minMinutes       Int      @map("min_minutes")
  maxMinutes       Int      @map("max_minutes")
  sampleSize       Int      @default(0) @map("sample_size")
  isAutoGenerated  Boolean  @default(true) @map("is_auto_generated") @db.TinyInt
  updatedAt        DateTime @default(now()) @updatedAt @map("updated_at") @db.DateTime(0)
  createdAt        DateTime @default(now()) @map("created_at") @db.DateTime(0)

  @@unique([lashStyle, serviceType, lashCount], name: "style_type_count")
  @@map("crm_lash_type_benchmarks")
}
```

### 4.2 Proposed Model: `CrmCvSpeedProfile`

To support R2 of `ORIGINAL_REQUEST.md`, we will add `CrmCvSpeedProfile` to `apps/api/prisma/crm.prisma`:

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
  updatedAt             DateTime @default(now()) @updatedAt @map("updated_at") @db.DateTime(0)
  createdAt             DateTime @default(now()) @map("created_at") @db.DateTime(0)

  @@unique([staffId, lashStyle, serviceMode, lashCount], name: "cv_style_mode_count")
  @@index([staffId])
  @@index([lashStyle])
  @@map("crm_cv_speed_profile")
}
```

---

## 5. Fastify KPI Route Patterns & System Architecture Rules

### 5.1 Route Structure & Authentication

- KPI routes are registered under `apps/api/src/modules/kpi/routes/`.
- Routes use `preHandler: [requireAuth]` and `requireRole(['admin'])` for privileged actions.

### 5.2 Active CV Staff Resolution (`ACTIVE_CV_STAFF_CONFIG`)

- CV routes query active technician IDs via:
  `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')`
- Standard fallback IDs: `[47510, 48026, 46092, 37790, 34295, 51659]`.

### 5.3 Dual Prisma Database Strategy

- **CRM DB** (`fastify.prisma.crm`): Stores `crm_cv_speed_profile`, `crm_lash_type_benchmarks`, `crmConfig`.
- **Legacy DB** (`fastify.prisma.legacy`): Raw SQL read operations (`$queryRawUnsafe`) against `management` tables (`order`, `order_service`, `report_order_service`, `report_order`, `staff_bonus`, `user_profile`).

### 5.4 Date Boundaries & Formatting Rules

- **Rule #21**: `parseComboDateBounds(dFrom, dTo)` from `apps/api/src/modules/customers/services/combo-recognition.service.ts` guarantees start `YYYY-MM-DD 00:00:00` and end `YYYY-MM-DD 23:59:59`.
- **Rule #15**: actual check-in date filtering requires:
  `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` via `LEFT JOIN report_order ro ON o.id = ro.order_id`.

---

## 6. Legacy Database Tables & Phase Time Data Structures

| Table Name                        | Primary Role                    | Key Columns Inspected                                                                                                                             |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order_service`                   | Individual service per order    | `id`, `order_id`, `service_id`, `assigned_staff_id`, `service_type`, `service_group`, `next_fix_order_service_id`, `next_adjust_order_service_id` |
| `report_order_service`            | iPad tracked phase durations    | `order_service_id`, `preparation_minute`, `pre_servicing_minute`, `cleaning_minute`, `servicing_minute`                                           |
| `order_service_progress`          | iPad step transition log        | Timestamps for `ServiceStart` $\rightarrow$ `ServiceCleaned` $\rightarrow$ `ServiceEnd`                                                           |
| `report_staff_technician_service` | Legacy pre-aggregated speed     | `user_id`, `service_id`, `servicing_minute`                                                                                                       |
| `staff_bonus`                     | KTV work points & staff records | `staff_id`, `user_id`, `bonus_type` ('Banana', 'Cash'), `date_created` (used to determine CV seniority/first working date)                        |
| `order`                           | Order header                    | `id`, `user_id` (customer), `order_state` ('Completed'), `booking_date_start`                                                                     |
| `report_order`                    | Check-in reporting table        | `order_id`, `actual_booking_date_start`, `date`                                                                                                   |

### 6.1 Phase Minutes Calculation SQL Pattern

```sql
SELECT
  os.assigned_staff_id AS staff_id,
  os.id AS order_service_id,
  s.service_key,
  sl.service_name,
  s.service_type,
  o.user_id AS customer_id,
  COALESCE(ro.actual_booking_date_start, o.booking_date_start) AS checkin_time,
  COALESCE(ros.cleaning_minute, 0) AS cleaning_minutes,
  COALESCE(ros.servicing_minute, 0) AS extension_minutes,
  (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) AS prep_qc_minutes,
  (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) +
   COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0)) AS total_minutes
FROM order_service os
JOIN `order` o ON os.order_id = o.id
JOIN report_order_service ros ON os.id = ros.order_service_id
JOIN service s ON os.service_id = s.id
LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
LEFT JOIN report_order ro ON o.id = ro.order_id
WHERE o.order_state = 'Completed'
  AND os.assigned_staff_id > 0
  AND (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) +
       COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0)) BETWEEN 15 AND 200;
```

---

## 7. Implementation Roadmap & Concrete Next Steps

1. **Shared Types (`packages/shared/src/types/cv-speed.ts`)**:
   - Define interfaces for `CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedDetail`, `CvSpeedTrend`, `CvSpeedPrediction`, `CvSpeedSeedResult`.
   - Export from `packages/shared/src/index.ts` and run `pnpm --filter @mos-lab/shared build`.
2. **Prisma Schema Update (`apps/api/prisma/crm.prisma`)**:
   - Add `CrmCvSpeedProfile` model.
   - Execute `pnpm --filter @mos-lab/api prisma:generate`.
3. **Service Layer (`apps/api/src/modules/kpi/services/cv-speed-model.service.ts`)**:
   - Implement seniority calculation query (`MIN(date_created)` from `staff_bonus`).
   - Implement logarithmic regression fitting ($\text{time} = a + b \ln(n)$) with monotonicity verification.
   - Implement 3-layer estimation engine (Layer 1, Layer 2, Layer 3 benchmark fallback).
   - Implement seed method (`POST /api/kpi/cv-speed/seed`).
4. **Fastify Route Module (`apps/api/src/modules/kpi/routes/cv-speed.routes.ts`)**:
   - Register all 7 endpoints (`/profiles`, `/matrix`, `/ranking`, `/trend/:staffId`, `/detail/:staffId`, `/predict`, `/seed`).
   - Wire route into `apps/api/src/app.ts`.
5. **Frontend Dashboard UI (`apps/web/app/(dashboard)/kpi/...`)**:
   - Add "CV Speed / Tốc Độ CV" tab into KPI page.
   - Implement Speed Matrix (overview grid), Ranking Table, CV Detail Modal with phase breakdown horizontal stacked bar chart, and Booking Predictor Widget.
   - Ensure Light/Dark theme support and `tabular-nums` formatting.
