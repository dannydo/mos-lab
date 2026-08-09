# M3 API Endpoints Analysis: CV Lash Extension Speed Model

## Executive Summary

This report presents a comprehensive investigation and integration analysis for the **7 Fastify API Endpoints** belonging to Milestone 3 (M3: CV Lash Extension Speed Model). It examines how data queries, parameter validation, active staff filtering, date range parsing, and business logic delegation are structured across `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`, `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`, `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`, and `packages/shared/src/types/cv-speed.ts`.

---

## 1. Architecture & Service Delegation Overview

The API endpoints form the bridge between the frontend KPI Dashboard ("CV Speed / Tốc Độ CV" tab) and the underlying data layer (`crm_cv_speed_profile` table in CRM Prisma and `order_service`/`report_order_service` in Legacy Prisma).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Fastify Route Handler                              │
│                (apps/api/src/modules/kpi/routes/cv-speed.routes.ts)          │
└────────┬───────────────────────────┬─────────────────────────────┬──────────┘
         │                           │                             │
         ▼                           ▼                             ▼
┌──────────────────┐    ┌──────────────────────────┐    ┌─────────────────────┐
│  CRM Prisma DB   │    │  CvSpeedModelService     │    │  CvSpeedSeedService │
│ (crmCvSpeedProf) │    │ (3-Layer Log Regression) │    │ (Nightly Seeder)    │
└──────────────────┘    └────────────┬─────────────┘    └─────────────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────┐
                        │   Legacy Prisma DB       │
                        │ (order_service, ros, ro) │
                        └──────────────────────────┘
```

---

## 2. Cross-Cutting Standards Compliance

### 2.1 Active CV Staff Configuration (`ACTIVE_CV_STAFF_CONFIG`)

- **Requirement**: All CV speed endpoints must filter CV staff by the active technician configuration in `crmConfig`.
- **Implementation**: Managed via `getActiveCvStaffList(crmPrisma, legacyPrisma)` (in `cv-speed-seed.service.ts`) or `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')`.
- **Fallback Behavior**: If `ACTIVE_CV_STAFF_CONFIG` key is missing or empty in `crmConfig`, falls back to `FALLBACK_CV_IDS = [47510, 48026, 46092, 37790, 34295, 51659]`.
- **Staff Name Resolution**: User IDs are joined against legacy `user_profile` (`SELECT user_id, full_name FROM user_profile WHERE user_id IN (...)`) to attach cached display names.

### 2.2 Rule #15: Completion & Check-in Date Recognition (`actual_booking_date_start`)

- **Requirement**: All queries joining `order` and `report_order` MUST use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` for filtering and grouping dates.
- **SQL Pattern**:
  ```sql
  WHERE o.order_state = 'Completed'
    AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL ? MONTH)
  ```
- **Enforced In**: `predictCvSpeed()`, `detectServiceMode()`, `trend/:staffId` handler, `detail/:staffId` handler, and `getCvAverageSpeedWindow()`.

### 2.3 Rule #21: Unified Date Range Parsing (`parseComboDateBounds`)

- **Requirement**: Any date filter accepting `dateFrom` and `dateTo` strings must be formatted with 00:00:00 start bounds and 23:59:59 end bounds.
- **Implementation**: Imported from `apps/api/src/modules/customers/services/combo-recognition.service.js`.

---

## 3. Mapping of the 7 Endpoints

### Endpoint 1: `GET /api/kpi/cv-speed/profiles`

- **Purpose**: List stored CV speed profiles from database table `crm_cv_speed_profile`.
- **Query Parameters**:
  - `staffId` (optional): Numeric staff ID. Validated via `parseInt(staffId, 10)`.
  - `lashStyle` (optional): String style name (e.g. `'Classic'`, `'Mink'`).
  - `serviceMode` (optional): Enum string (`'normal_clean'`, `'normal_removal'`, `'retain'`).
- **Data Access**: `crmPrisma.crmCvSpeedProfile.findMany({ where, orderBy: [{ staffId: 'asc' }, { lashStyle: 'asc' }, { lashCount: 'asc' }] })`.
- **Auto-Seed Fallback**: If table is empty and no filters are passed, calls `runNightlyCvSpeedSeed` once automatically before returning.
- **Response Type**: `CvSpeedProfile[]` (defined in `@mos-lab/shared`).

### Endpoint 2: `GET /api/kpi/cv-speed/matrix`

- **Purpose**: Retrieve full CV speed matrix for Section 1 Overview UI (rows = active CVs, cols = `lashStyle_lashCount`, cells = speed rating + total minutes).
- **Query Parameters**:
  - `serviceMode` (optional): Default `'normal_clean'`.
- **Data Access**:
  1. Queries active CV list via `getActiveCvStaffList()`.
  2. Queries `crmCvSpeedProfile` matching active CV IDs and `serviceMode`.
  3. Maps profiles into lookup dictionary: `${staffId}_${lashStyle}_${lashCount}`.
  4. On-the-fly Fallback: If a profile cell for a specific CV and standard (style, count) is missing from DB, calls `predictCvSpeed` on the fly to compute Layer 3 fallback.
- **Response Type**: `CvSpeedMatrix` (`{ data: CvSpeedMatrixRow[], lashStyles: string[], lashCounts: number[] }`).

### Endpoint 3: `GET /api/kpi/cv-speed/ranking`

- **Purpose**: Rank active CVs from fastest to slowest for a specific lash configuration.
- **Query Parameters**:
  - `lashStyle` (optional): Default `'Classic'`.
  - `lashCount` (optional): Default `60`. Validated via `parseInt(lashCount, 10)`.
  - `serviceMode` (optional): Default `'normal_clean'`.
- **Data Access & Logic**:
  1. Queries active CV list and matching `crmCvSpeedProfile` rows.
  2. Calculates 6-month speed trend per CV by comparing recent 3-month avg speed (`[0, 3]` mos ago) vs prior 3-month avg speed (`[3, 6]` mos ago):
     - Diff < -5% -> `'improving'` (faster time)
     - Diff > +5% -> `'declining'` (slower time)
     - Else -> `'stable'`
  3. Sorts entries ascending by `totalMinutes`.
  4. Assigns rank numbers 1..N.
- **Response Type**: `CvSpeedRanking[]`.

### Endpoint 4: `GET /api/kpi/cv-speed/trend/:staffId`

- **Purpose**: Retrieve 6-month historical monthly trend for a specific CV vs global benchmark.
- **Path / Query Parameters**:
  - `staffId` (path, required): Numeric staff ID. Validated via `parseInt(staffId, 10)`. Returns 400 Bad Request if invalid or non-numeric.
  - `lashStyle` (query, optional): Default `'Classic'`.
  - `serviceMode` (query, optional): Default `'normal_clean'`.
- **Data Access**:
  1. SQL query against `report_order_service` + `order` + `staff_bonus` joined on `COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`.
  2. Groups by `DATE_FORMAT(..., '%Y-%m')`.
  3. Compares monthly average `totalMinutes` against `crmLashTypeBenchmark` (or default fallback 60 min).
- **Response Type**: `CvSpeedMonthlyTrend[]`.

### Endpoint 5: `GET /api/kpi/cv-speed/detail/:staffId`

- **Purpose**: Detailed CV profile summary, phase breakdown (cleaning, extension, prepQc), recent 10-50 completed cases, and monthly trend.
- **Path / Query Parameters**:
  - `staffId` (path, required): Numeric staff ID. Validated via `parseInt(staffId, 10)`. Returns 400 Bad Request if invalid.
  - `dateFrom` / `dateTo` (query, optional): Parsed via `parseComboDateBounds`.
  - `limit` (query, optional): Default `50`.
- **Data Access & Logic**:
  1. Queries `user_profile` for `full_name`.
  2. Queries recent completed lash cases from `order_service` + `report_order_service`.
  3. Runs `parseLashSpecs()` on service keys to extract lash style and count.
  4. Runs `detectServiceMode()` to check customer history (retain vs normal_removal vs normal_clean).
  5. Computes median phase breakdown (`cleaning`, `extension`, `prepQc`).
  6. Calculates overall score and average speed vs benchmark percent.
- **Response Type**: `CvSpeedDetail`.

### Endpoint 6: `GET /api/kpi/cv-speed/predict`

- **Purpose**: Real-time ETA prediction calculator for booking widget.
- **Query Parameters**:
  - `staffId` (required): Numeric staff ID. Validated via `parseInt(staffId, 10)`. Returns 400 Bad Request if missing/invalid.
  - `lashStyle` (optional): Default `'Classic'`.
  - `serviceMode` (optional): Default `'normal_clean'`.
  - `lashCount` (optional): Default `60`. Validated via `parseInt(lashCount, 10)`.
- **Data Access & Logic**:
  Calls `CvSpeedModelService.predictCvSpeed(crmPrisma, legacyPrisma, staffId, lashStyle, serviceMode, lashCount)`.
- **Response Type**: `CvSpeedPrediction`.

### Endpoint 7: `POST /api/kpi/cv-speed/seed`

- **Purpose**: Nightly background recalculation and seeding trigger.
- **Delegation**: Calls `CvSpeedSeedService.runNightlyCvSpeedSeed(crmPrisma, legacyPrisma)`.
- **Logic Executed**:
  1. Iterates over active CVs, 10 standard lash styles, 3 service modes, and 8 standard lash counts (30, 60, 70, 80, 90, 100, 120, 140).
  2. Runs 3-layer estimation per CV/style/mode.
  3. Enforces monotonicity invariant (`totalMinutes(N+1) > totalMinutes(N)`).
  4. Upserts profile records into `crm_cv_speed_profile`.
- **Response Type**: `CvSpeedSeedResult` (`{ success, profilesProcessed, cvsCount, timestamp }`).

---

## 4. Parameter Validation & Error Handling Matrix

| Endpoint               | Parameter     | Type           | Required? | Fallback / Default   | Error Code on Invalid |
| ---------------------- | ------------- | -------------- | --------- | -------------------- | --------------------- |
| `GET /profiles`        | `staffId`     | Query (int)    | No        | Ignored if NaN       | 200 (all profiles)    |
| `GET /profiles`        | `lashStyle`   | Query (string) | No        | Ignored if undefined | 200                   |
| `GET /profiles`        | `serviceMode` | Query (string) | No        | Ignored if undefined | 200                   |
| `GET /matrix`          | `serviceMode` | Query (string) | No        | `'normal_clean'`     | 200                   |
| `GET /ranking`         | `lashStyle`   | Query (string) | No        | `'Classic'`          | 200                   |
| `GET /ranking`         | `lashCount`   | Query (int)    | No        | `60`                 | 200                   |
| `GET /ranking`         | `serviceMode` | Query (string) | No        | `'normal_clean'`     | 200                   |
| `GET /trend/:staffId`  | `staffId`     | Path (int)     | **Yes**   | None                 | 400 Bad Request       |
| `GET /trend/:staffId`  | `lashStyle`   | Query (string) | No        | `'Classic'`          | 200                   |
| `GET /detail/:staffId` | `staffId`     | Path (int)     | **Yes**   | None                 | 400 Bad Request       |
| `GET /predict`         | `staffId`     | Query (int)    | **Yes**   | None                 | 400 Bad Request       |
| `GET /predict`         | `lashStyle`   | Query (string) | No        | `'Classic'`          | 200                   |
| `GET /predict`         | `serviceMode` | Query (string) | No        | `'normal_clean'`     | 200                   |
| `GET /predict`         | `lashCount`   | Query (int)    | No        | `60`                 | 200                   |
| `POST /seed`           | None          | N/A            | N/A       | N/A                  | 500 on seed crash     |

---

## 5. Conclusion & Actionability

The route file `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` is correctly registered in Fastify under `kpiRoutes` (`apps/api/src/modules/kpi/routes.ts`), fully implements all 7 API endpoints, adheres strictly to shared TypeScript types in `@mos-lab/shared`, and correctly integrates the 3-layer estimation engine in `CvSpeedModelService` and nightly seeder in `CvSpeedSeedService`.
