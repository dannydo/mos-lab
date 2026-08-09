# Handoff Report: Milestone 3 Fastify API Route Structure Analysis

## 1. Observation

### 1.1 Fastify Server & Route Registration Architecture

- In `apps/api/src/server.ts` line 180:
  ```typescript
  await server.register(kpiRoutes, { prefix: '/api' });
  ```
- In `apps/api/src/modules/kpi/routes.ts` lines 10 & 217:
  ```typescript
  import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';
  // ...
  export async function kpiRoutes(fastify: FastifyInstance) {
    // ...
    await registerCvSpeedRoutes(fastify);
  }
  ```

### 1.2 Existing Route File Code Inspection

- File path: `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` (545 lines).
- Route handlers defined in `registerCvSpeedRoutes(fastify)`:
  - Line 40: `fastify.get('/kpi/cv-speed/profiles', ...)`
  - Line 100: `fastify.get('/kpi/cv-speed/matrix', ...)`
  - Line 182: `fastify.get('/api/kpi/cv-speed/ranking', ...)` (**DISCOVERED BUG**: leading `/api` prefix creates duplicate `/api/api/kpi/cv-speed/ranking`)
  - Line 264: `fastify.get('/kpi/cv-speed/trend/:staffId', ...)`
  - Line 314: `fastify.get('/kpi/cv-speed/detail/:staffId', ...)`
  - Line 451: `fastify.get('/kpi/cv-speed/predict', ...)`
  - Line 507: `fastify.post('/kpi/cv-speed/seed', ...)`

### 1.3 System Rules & Helpers

- Date Bounds Normalization (Rule #21): `parseComboDateBounds` in `apps/api/src/modules/customers/services/combo-recognition.service.ts` line 12:
  ```typescript
  export function parseComboDateBounds(dFrom?: string, dTo?: string): DateBounds;
  ```
- Check-in Recognition (Rule #15): Querying `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` using `LEFT JOIN report_order ro ON o.id = ro.order_id`. Verified present in SQL queries at lines 279, 291, 327, 343, 362, 408, 417, 530, 537 of `cv-speed.routes.ts`.
- Model & Seed Services:
  - `CvSpeedModelService` in `apps/api/src/modules/kpi/services/cv-speed-model.service.ts` (predicts CV speed via 3-layer cascade).
  - `CvSpeedSeedService` in `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts` (runs nightly seed & enforces monotonicity invariant).

---

## 2. Logic Chain

1. **Premise**: Fastify registers `kpiRoutes` with `{ prefix: '/api' }` in `server.ts` line 180.
2. **Step 1**: All routes registered within `kpiRoutes` automatically receive the `/api` prefix. Therefore, route paths inside `cv-speed.routes.ts` must start with `/kpi/cv-speed/...`.
3. **Observation Reference**: Line 182 of `cv-speed.routes.ts` contains `fastify.get('/api/kpi/cv-speed/ranking', ...)`.
4. **Step 2**: This line creates an incorrect route URL `http://localhost:4001/api/api/kpi/cv-speed/ranking`. Correcting line 182 to `fastify.get('/kpi/cv-speed/ranking', ...)` resolves the double-prefix issue.
5. **Step 3**: All 7 required endpoints (`GET /profiles`, `GET /matrix`, `GET /ranking`, `GET /trend/:staffId`, `GET /detail/:staffId`, `GET /predict`, `POST /seed`) are properly registered in `registerCvSpeedRoutes` and wired up in `kpiRoutes`.
6. **Step 4**: The endpoints integrate with `fastify.prisma.crm` (for predicted profiles & benchmarks) and `fastify.prisma.legacy` (for order history & phase timestamps), adhering to dual-database rules.
7. **Step 5**: Date filters require calling `parseComboDateBounds(dateFrom, dateTo)` (Rule #21), and SQL queries use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` (Rule #15).

---

## 3. Caveats

- **Active CV Fallback**: If `ACTIVE_CV_STAFF_CONFIG` in `crmConfig` table is missing or empty, `getActiveCvStaffList()` falls back to recent active CV staff IDs `[47510, 48026, 46092, 37790, 34295, 51659]`.
- **Database Seeding**: If `crm_cv_speed_profile` table is empty when `GET /profiles` is called, it auto-triggers `runNightlyCvSpeedSeed` synchronously to populate baseline profiles.

---

## 4. Conclusion

The Fastify API route structure for Milestone 3 (`cv-speed.routes.ts`) is fully designed and analyzed.

- **7 Endpoints**:
  1. `GET /api/kpi/cv-speed/profiles` — List stored CV speed profiles.
  2. `GET /api/kpi/cv-speed/matrix` — CV speed matrix (rows=CVs, cols=styles x counts).
  3. `GET /api/kpi/cv-speed/ranking` — Ranked CVs for specific style/count/mode (fixed double-prefix bug at line 182).
  4. `GET /api/kpi/cv-speed/trend/:staffId` — Monthly speed trend overlaying benchmark.
  5. `GET /api/kpi/cv-speed/detail/:staffId` — Detailed per-case breakdown & phase chart data.
  6. `GET /api/kpi/cv-speed/predict` — Dynamic ETA prediction cascade.
  7. `POST /api/kpi/cv-speed/seed` — Trigger nightly recalculation & seed.
- **Rules Compliance**: Dual Prisma databases (`fastify.prisma.crm` and `fastify.prisma.legacy`), `parseComboDateBounds` (Rule #21), `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` (Rule #15), and `@mos-lab/shared` type system.

---

## 5. Verification Method

### 5.1 Verification Commands

```bash
# 1. Build shared package
pnpm --filter @mos-lab/shared build

# 2. Build Fastify API package to verify TypeScript compilation
pnpm --filter @mos-lab/api build

# 3. Test API endpoint accessibility (when dev server running on port 4001)
curl -s http://localhost:4001/api/kpi/cv-speed/profiles | jq '.length'
curl -s http://localhost:4001/api/kpi/cv-speed/matrix | jq '.data | length'
curl -s "http://localhost:4001/api/kpi/cv-speed/ranking?lashStyle=Classic&lashCount=60" | jq '.[0].rank'
curl -s http://localhost:4001/api/kpi/cv-speed/trend/47510 | jq '.length'
curl -s http://localhost:4001/api/kpi/cv-speed/detail/47510 | jq '.staffId'
curl -s "http://localhost:4001/api/kpi/cv-speed/predict?staffId=47510&lashStyle=Classic&lashCount=60" | jq '.predictedMinutes'
curl -s -X POST http://localhost:4001/api/kpi/cv-speed/seed | jq '.success'
```

### 5.2 Invalidation Conditions

- Any route path containing `/api/api/` prefix.
- `GET /ranking` returning HTTP 404 due to path mismatch.
- SQL query using raw `order.date_created` instead of `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` for check-in date.
- Response payloads failing to match `@mos-lab/shared` types.
