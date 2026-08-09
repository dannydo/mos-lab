# Analysis: Fastify API Route Structure for Milestone 3 (CV Speed & Productivity Metric System)

## 1. Overview & Architecture Context

The **CV Lash Extension Speed Model** requires 7 Fastify API endpoints under `/api/kpi/cv-speed/*`.
In `mos-lab`, Fastify API routes are organized as follows:

- **Server Registration**: In `apps/api/src/server.ts` line 180:
  ```ts
  await server.register(kpiRoutes, { prefix: '/api' });
  ```
- **KPI Module Central Aggregator**: In `apps/api/src/modules/kpi/routes.ts` lines 10 & 217:
  ```ts
  import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';
  // ... inside kpiRoutes:
  await registerCvSpeedRoutes(fastify);
  ```
- **Route File**: `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`.

Because `kpiRoutes` is mounted with `{ prefix: '/api' }` in `server.ts`, all paths registered within `cv-speed.routes.ts` MUST be relative to `/api` (e.g. `/kpi/cv-speed/profiles`), NOT starting with `/api/kpi/...` (which would result in double-prefixing `/api/api/kpi/...`).

---

## 2. Examination of Existing KPI Route Patterns

By analyzing existing KPI route handlers (`cv.routes.ts`, `cv-tip.routes.ts`, `cv-paystub.routes.ts`):

1. **Active CV Filtering**:
   - CV routes retrieve active CV staff IDs using `ACTIVE_CV_STAFF_CONFIG` from `crmConfig` table in `fastify.prisma.crm` (via `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')` or `getActiveCvStaffList`).
2. **Dual Database Pattern**:
   - `fastify.prisma.crm`: Database `mos_lab` for CRM metadata, configuration, teams, and speed profile predictions (`crm_cv_speed_profile`, `crm_lash_type_benchmarks`).
   - `fastify.prisma.legacy`: Database `management` for legacy transactions and shift data (`order`, `order_service`, `report_order`, `report_order_service`, `staff_bonus`, `user_profile`).
3. **Date Range Normalization (Rule #21)**:
   - Must use `parseComboDateBounds(dateFrom, dateTo)` from `apps/api/src/modules/customers/services/combo-recognition.service.ts` to pad date strings into `YYYY-MM-DD 00:00:00` and `YYYY-MM-DD 23:59:59`.
4. **Actual Check-in / Service Start Recognition (Rule #15)**:
   - SQL queries must use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` by `LEFT JOIN report_order ro ON o.id = ro.order_id`.

---

## 3. Analysis of the 7 Required Endpoints

| Method | Endpoint                        | Description                                      | Query / Path Parameters                                                                                                                                 | Key Invariants & Rules                                                                                                                                     |
| ------ | ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/kpi/cv-speed/profiles`        | List all stored CV speed profiles                | `staffId?: string`, `lashStyle?: string`, `serviceMode?: LashServiceMode`, `dateFrom?: string`, `dateTo?: string`                                       | Filters `crm_cv_speed_profile`. Auto-seeds if table is empty. Returns `CvSpeedProfile[]`.                                                                  |
| `GET`  | `/kpi/cv-speed/matrix`          | Full matrix of CV speed predictions              | `serviceMode?: LashServiceMode` (default `normal_clean`), `dateFrom?: string`, `dateTo?: string`                                                        | Active CVs (rows) × Standard Styles (cols) × Standard Counts. Dynamic fallback if cell missing. Returns `CvSpeedMatrix`.                                   |
| `GET`  | `/kpi/cv-speed/ranking`         | Ranked list of CVs for specific style/count/mode | `lashStyle?: string` (`Classic`), `lashCount?: number` (`60`), `serviceMode?: LashServiceMode` (`normal_clean`), `dateFrom?: string`, `dateTo?: string` | **FIX REQUIRED**: Path was `/api/kpi/cv-speed/ranking` causing double `/api/api/...`. Must be `/kpi/cv-speed/ranking`. Computes 6-month speed trend arrow. |
| `GET`  | `/kpi/cv-speed/trend/:staffId`  | Monthly speed trend for single CV                | Path: `staffId: string`. Query: `lashStyle?: string`, `serviceMode?: LashServiceMode`, `dateFrom?: string`, `dateTo?: string`                           | Grouped by `DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m')`. Overlay benchmark line. Returns `CvSpeedMonthlyTrend[]`.  |
| `GET`  | `/kpi/cv-speed/detail/:staffId` | Detailed per-case breakdown & phase chart data   | Path: `staffId: string`. Query: `dateFrom?: string`, `dateTo?: string`, `limit?: number`                                                                | Queries `report_order_service` + `parseLashSpecs()`. Breakdown of cleaning/extension/prep_qc. Bounded score (50-100). Returns `CvSpeedDetail`.             |
| `GET`  | `/kpi/cv-speed/predict`         | ETA Prediction for booking widget                | `staffId: string` (required), `lashStyle?: string`, `serviceMode?: LashServiceMode`, `lashCount?: number`                                               | Calls `predictCvSpeed(...)` cascade (Layer 1 -> 2 -> 3). Returns `CvSpeedPrediction`.                                                                      |
| `POST` | `/kpi/cv-speed/seed`            | Trigger nightly model recalculation              | None                                                                                                                                                    | Executes `runNightlyCvSpeedSeed(crm, legacy)`. Recalculates profiles, enforces monotonicity invariant, upserts to CRM DB. Returns `CvSpeedSeedResult`.     |

---

## 4. Deep-Dive Findings & Discovered Issues

### Finding 1: Route Prefix Bug in `ranking` Endpoint

- **Location**: `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` line 182.
- **Observed Code**: `fastify.get('/api/kpi/cv-speed/ranking', ...)`
- **Issue**: `server.ts` registers `kpiRoutes` under `/api`. Having `/api/kpi/cv-speed/ranking` inside `cv-speed.routes.ts` causes Fastify to register the URL as `http://localhost:4001/api/api/kpi/cv-speed/ranking`.
- **Fix**: Change route path to `/kpi/cv-speed/ranking`.

### Finding 2: Integration with `parseComboDateBounds` (Rule #21)

- **Location**: `apps/api/src/modules/customers/services/combo-recognition.service.ts` line 12.
- **Requirement**: `parseComboDateBounds(dateFrom, dateTo)` ensures date inputs are formatted to `YYYY-MM-DD 00:00:00` and `YYYY-MM-DD 23:59:59`.
- **Fix**: Import `parseComboDateBounds` into `cv-speed.routes.ts` and apply to date filtering in `profiles`, `matrix`, `ranking`, `trend`, and `detail` endpoints.

### Finding 3: Compliance with Rule #15 (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`)

- **Location**: `cv-speed.routes.ts` lines 279, 291, 327, 343, 362, 408, 417, 530, 537.
- **Verification**: Verified that SQL queries joining legacy tables `order_service`, `order`, `report_order_service`, `report_order` consistently select/filter by `COALESCE(ro.actual_booking_date_start, o.booking_date_start)`.

### Finding 4: Single Source of Truth for Model Calculation Services

- **Location**: `apps/api/src/modules/kpi/services/cv-speed-model.service.ts` and `cv-speed-seed.service.ts`.
- **Role**:
  - `CvSpeedModelService`: Performs 3-layer speed estimation (Layer 1: direct P50 median, Layer 2: log regression $y = a + b \ln(n)$, Layer 3: global benchmark ratio).
  - `CvSpeedSeedService`: Runs nightly seed, enforces monotonicity invariant ($n_1 < n_2 \implies \text{time}_1 < \text{time}_2$), and upserts profiles into `crm_cv_speed_profile`.

---

## 5. Comprehensive Route Handler Specifications

Below is the detailed specification for each handler in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`:

```typescript
// 1. GET /kpi/cv-speed/profiles
fastify.get('/kpi/cv-speed/profiles', { preHandler: [requireAuth] }, async (request, reply) => {
  const { staffId, lashStyle, serviceMode, dateFrom, dateTo } = request.query as {
    staffId?: string;
    lashStyle?: string;
    serviceMode?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  const { startStr, endStr } = parseComboDateBounds(dateFrom, dateTo);
  // ... filter crmCvSpeedProfile by staffId, lashStyle, serviceMode
  // ... auto-seed if profiles table empty
  // ... return CvSpeedProfile[]
});

// 2. GET /kpi/cv-speed/matrix
fastify.get('/kpi/cv-speed/matrix', { preHandler: [requireAuth] }, async (request, reply) => {
  const { serviceMode = 'normal_clean', dateFrom, dateTo } = request.query as {
    serviceMode?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  const { startStr, endStr } = parseComboDateBounds(dateFrom, dateTo);
  // ... fetch active CV list via getActiveCvStaffList()
  // ... query crmCvSpeedProfile for active CVs and serviceMode
  // ... build row x col grid (10 styles x 8 counts) with fallback prediction if missing
  // ... return CvSpeedMatrix
});

// 3. GET /kpi/cv-speed/ranking
fastify.get('/kpi/cv-speed/ranking', { preHandler: [requireAuth] }, async (request, reply) => {
  const { lashStyle = 'Classic', lashCount = 60, serviceMode = 'normal_clean', dateFrom, dateTo } = request.query as ...;
  const { startStr, endStr } = parseComboDateBounds(dateFrom, dateTo);
  // ... fetch active CVs
  // ... predict/retrieve speed for each CV
  // ... calculate 6-month trend (recent 3 mos vs prior 3 mos)
  // ... sort fastest to slowest and assign ranks 1..N
  // ... return CvSpeedRanking[]
});

// 4. GET /kpi/cv-speed/trend/:staffId
fastify.get('/kpi/cv-speed/trend/:staffId', { preHandler: [requireAuth] }, async (request, reply) => {
  const { staffId } = request.params as { staffId: string };
  const { lashStyle = 'Classic', serviceMode = 'normal_clean', dateFrom, dateTo } = request.query as ...;
  const { startStr, endStr } = parseComboDateBounds(dateFrom, dateTo);
  // ... SQL query legacy DB for monthly average total minutes grouped by DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m')
  // ... query crmLashTypeBenchmark for benchmark line overlay
  // ... return CvSpeedMonthlyTrend[]
});

// 5. GET /kpi/cv-speed/detail/:staffId
fastify.get('/kpi/cv-speed/detail/:staffId', { preHandler: [requireAuth] }, async (request, reply) => {
  const { staffId } = request.params as { staffId: string };
  const { dateFrom, dateTo } = request.query as ...;
  const { startStr, endStr } = parseComboDateBounds(dateFrom, dateTo);
  // ... SQL query recent 50 completed orders for staffId with COALESCE(ro.actual_booking_date_start, o.booking_date_start)
  // ... parse lash specs via parseLashSpecs() and detect service mode via detectServiceMode()
  // ... compute average phase breakdown (cleaning, extension, prepQc)
  // ... compute overall score (50..100) and monthly trend
  // ... return CvSpeedDetail
});

// 6. GET /kpi/cv-speed/predict
fastify.get('/kpi/cv-speed/predict', { preHandler: [requireAuth] }, async (request, reply) => {
  const { staffId, lashStyle = 'Classic', serviceMode = 'normal_clean', lashCount = 60 } = request.query as ...;
  if (!staffId) return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tham số staffId.' });
  // ... call predictCvSpeed(crm, legacy, cvId, lashStyle, serviceMode, lashCount)
  // ... return CvSpeedPrediction
});

// 7. POST /kpi/cv-speed/seed
fastify.post('/kpi/cv-speed/seed', { preHandler: [requireAuth] }, async (_request, reply) => {
  // ... call runNightlyCvSpeedSeed(crm, legacy)
  // ... return CvSpeedSeedResult
});
```
