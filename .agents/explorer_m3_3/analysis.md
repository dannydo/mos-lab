# Analysis & Step-by-Step Implementation Plan for Worker_M3

## 1. Overview & Objectives

Worker_M3 is responsible for finalizing and verifying the Fastify API route layer for the **CV Lash Extension Speed Model** in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`, ensuring registration in `apps/api/src/modules/kpi/routes.ts`, and verifying all 7 endpoints through automated build checks and executable `curl` commands.

---

## 2. Codebase Audit & File Locations

| Component            | File Path                                                     | Status / Notes                                                                                                                                |
| -------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Target Route File    | `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`          | **Existed**, contains 2 bugs (URL route prefix bug + TS2347 type error)                                                                       |
| Route Module Index   | `apps/api/src/modules/kpi/routes.ts`                          | **Registered** (`registerCvSpeedRoutes`)                                                                                                      |
| Server Entry Point   | `apps/api/src/server.ts`                                      | **Registered** (`server.register(kpiRoutes, { prefix: '/api' })`)                                                                             |
| Speed Model Service  | `apps/api/src/modules/kpi/services/cv-speed-model.service.ts` | Implements 3-layer estimation & logarithmic regression                                                                                        |
| Nightly Seed Service | `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`  | Implements `runNightlyCvSpeedSeed` & `getActiveCvStaffList`                                                                                   |
| Shared Types         | `packages/shared/src/types/cv-speed.ts`                       | Defines `CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedMonthlyTrend`, `CvSpeedDetail`, `CvSpeedPrediction`, `CvSpeedSeedResult` |

---

## 3. Critical Findings & Required Modifications

### 3.1 Bug 1: Extra `/api` Prefix in Route Path (Line 182)

- **Location**: Line 182 in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`
- **Existing Code**:
  ```typescript
  fastify.get('/api/kpi/cv-speed/ranking', { preHandler: [requireAuth] }, async (request, reply) => {
  ```
- **Root Cause**: `kpiRoutes` is registered in `apps/api/src/server.ts` with prefix `/api`:
  ```typescript
  await server.register(kpiRoutes, { prefix: '/api' });
  ```
  All other endpoints in `cv-speed.routes.ts` use `/kpi/cv-speed/...` without leading `/api`. Having `/api/kpi/cv-speed/ranking` on line 182 causes Fastify to mount the route at `/api/api/kpi/cv-speed/ranking`, resulting in 404 Not Found when calling `/api/kpi/cv-speed/ranking`.
- **Required Action for Worker_M3**: Change line 182 to:
  ```typescript
  fastify.get('/kpi/cv-speed/ranking', { preHandler: [requireAuth] }, async (request, reply) => {
  ```

### 3.2 Bug 2: TypeScript Compilation Error TS2347 (Line 527)

- **Location**: Line 527 in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`
- **Existing Code**:
  ```typescript
  const rows = await legacyPrisma.$queryRawUnsafe<Array<{ avg_time: number }>>(`
  ```
- **Compiler Error**: `src/modules/kpi/routes/cv-speed.routes.ts(527,24): error TS2347: Untyped function calls may not accept type arguments.`
- **Root Cause**: `legacyPrisma` in helper function `getCvAverageSpeedWindow` (line 520) is typed as `SafeAny` (which is `any`). In TypeScript strict mode, calling a method on `any` with explicit generic type parameters `<T>` triggers `TS2347`.
- **Required Action for Worker_M3**: Update line 527 to cast the result after invocation instead of passing a generic parameter:
  ```typescript
  const rows = (await legacyPrisma.$queryRawUnsafe(`
    SELECT ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) as avg_time
    ...
  `)) as Array<{ avg_time: number }>;
  ```

### 3.3 Compliance with Relative Import Rules (NodeNext)

- All relative imports in `apps/api` **MUST** include `.js` file extensions.
- Verified imports in `cv-speed.routes.ts`:
  - `import { requireAuth } from '../../../middlewares/auth.js';`
  - `import { predictCvSpeed, detectServiceMode, computeSpeedRating } from '../services/cv-speed-model.service.js';`
  - `import { runNightlyCvSpeedSeed, getActiveCvStaffList } from '../services/cv-speed-seed.service.js';`
  - `import { parseLashSpecs } from '../../catalog/services/lash-benchmark.service.js';`
- Worker_M3 must ensure no extensionless relative imports are introduced.

### 3.4 Compliance with Rule #15 (Order Completion & Actual Check-in)

- All SQL queries fetching date timestamps use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` from legacy DB `report_order` table.
- Order filtering checks `o.order_state = 'Completed'`.

---

## 4. Endpoint Specifications & Logic Details

The route module exports `registerCvSpeedRoutes(fastify: FastifyInstance)` registering the 7 endpoints:

### Endpoint 1: `GET /api/kpi/cv-speed/profiles`

- **Route**: `/kpi/cv-speed/profiles`
- **Auth**: `requireAuth`
- **Query Params**: `staffId?: string`, `lashStyle?: string`, `serviceMode?: string`
- **Logic**:
  - Filter `crmCvSpeedProfile` table by `staffId`, `lashStyle`, `serviceMode`.
  - Auto-seed trigger: If DB table is empty and no specific staffId/lashStyle queried, automatically call `runNightlyCvSpeedSeed` and re-query.
  - Return `CvSpeedProfile[]` array.

### Endpoint 2: `GET /api/kpi/cv-speed/matrix`

- **Route**: `/kpi/cv-speed/matrix`
- **Auth**: `requireAuth`
- **Query Params**: `serviceMode?: string` (default: `'normal_clean'`)
- **Logic**:
  - Get active CVs via `getActiveCvStaffList`.
  - Query existing profiles for active CVs and specified `serviceMode`.
  - Build lookup map `staffId_lashStyle_lashCount`.
  - For missing cells, execute `predictCvSpeed` on-the-fly.
  - Return `CvSpeedMatrix` payload (`data: CvSpeedMatrixRow[]`, `lashStyles: string[]`, `lashCounts: number[]`).

### Endpoint 3: `GET /api/kpi/cv-speed/ranking`

- **Route**: `/kpi/cv-speed/ranking` (**Fixed path**)
- **Auth**: `requireAuth`
- **Query Params**: `lashStyle?: string` (default `'Classic'`), `lashCount?: string | number` (default `60`), `serviceMode?: string` (default `'normal_clean'`)
- **Logic**:
  - Query or predict profiles for all active CVs for specified `(lashStyle, lashCount, serviceMode)`.
  - Compute 6-month speed trend (`improving`, `declining`, `stable`) comparing 0-3 months vs 3-6 months.
  - Sort entries ascending by `predictedTime`.
  - Return `CvSpeedRanking[]` with ranks 1..N.

### Endpoint 4: `GET /api/kpi/cv-speed/trend/:staffId`

- **Route**: `/kpi/cv-speed/trend/:staffId`
- **Auth**: `requireAuth`
- **Path Params**: `staffId` (CV user ID)
- **Query Params**: `lashStyle?: string` (default `'Classic'`), `serviceMode?: string` (default `'normal_clean'`)
- **Logic**:
  - Query legacy DB via `$queryRawUnsafe` for monthly average total minutes over last 6 months.
  - Apply Rule #15 (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`).
  - Join global benchmark for `lashStyle` from `crmLashTypeBenchmark`.
  - Return `CvSpeedMonthlyTrend[]`.

### Endpoint 5: `GET /api/kpi/cv-speed/detail/:staffId`

- **Route**: `/kpi/cv-speed/detail/:staffId`
- **Auth**: `requireAuth`
- **Path Params**: `staffId` (CV user ID)
- **Logic**:
  - Query staff full name from `user_profile`.
  - Query up to 50 recent completed cases for this CV.
  - Parse specs, detect service mode, compute phase breakdown (cleaning, extension, prepQc).
  - Query monthly trend data.
  - Calculate overall score and average speed vs benchmark.
  - Return `CvSpeedDetail`.

### Endpoint 6: `GET /api/kpi/cv-speed/predict`

- **Route**: `/kpi/cv-speed/predict`
- **Auth**: `requireAuth`
- **Query Params**: `staffId` (required), `lashStyle?: string` (default `'Classic'`), `serviceMode?: string` (default `'normal_clean'`), `lashCount?: string | number` (default `60`)
- **Logic**:
  - Validate `staffId` presence (return 400 if missing).
  - Execute `predictCvSpeed`.
  - Return `CvSpeedPrediction`.

### Endpoint 7: `POST /api/kpi/cv-speed/seed`

- **Route**: `/kpi/cv-speed/seed`
- **Auth**: `requireAuth`
- **HTTP Method**: `POST`
- **Logic**:
  - Call `runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy)`.
  - Return `CvSpeedSeedResult`.

---

## 5. Step-by-Step Execution Plan for Worker_M3

### Step 1: Fix Route Path & TypeScript Errors in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`

1. Open `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`.
2. Locate line 182:
   ```typescript
   fastify.get('/api/kpi/cv-speed/ranking', { preHandler: [requireAuth] }, async (request, reply) => {
   ```
   Update line 182 to:
   ```typescript
   fastify.get('/kpi/cv-speed/ranking', { preHandler: [requireAuth] }, async (request, reply) => {
   ```
3. Locate line 527:
   ```typescript
   const rows = await legacyPrisma.$queryRawUnsafe<Array<{ avg_time: number }>>(`
   ```
   Update line 527 to:
   ```typescript
   const rows = (await legacyPrisma.$queryRawUnsafe(`
   ```
   and append `) as Array<{ avg_time: number }>;` to cast the output.

### Step 2: Verify Import Wiring in `apps/api/src/modules/kpi/routes.ts`

1. Confirm line 10 has:
   ```typescript
   import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';
   ```
2. Confirm inside `kpiRoutes`:
   ```typescript
   await registerCvSpeedRoutes(fastify);
   ```

### Step 3: Run TypeScript Build Verification

Execute the command:

```bash
pnpm --filter @mos-lab/api build
```

Verify zero TypeScript compilation errors and exit code 0.

### Step 4: Verification via `curl` Commands

Obtain a valid JWT token (or test against a running local server `http://localhost:4001`) and run:

1. **Profiles Endpoint**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4001/api/kpi/cv-speed/profiles?staffId=47510&lashStyle=Classic" | jq .
   ```
2. **Matrix Endpoint**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4001/api/kpi/cv-speed/matrix?serviceMode=normal_clean" | jq .
   ```
3. **Ranking Endpoint**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4001/api/kpi/cv-speed/ranking?lashStyle=Classic&lashCount=60&serviceMode=normal_clean" | jq .
   ```
4. **Trend Endpoint**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4001/api/kpi/cv-speed/trend/47510?lashStyle=Classic" | jq .
   ```
5. **Detail Endpoint**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4001/api/kpi/cv-speed/detail/47510" | jq .
   ```
6. **Predict Endpoint**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4001/api/kpi/cv-speed/predict?staffId=47510&lashStyle=Classic&serviceMode=normal_clean&lashCount=60" | jq .
   ```
7. **Seed Endpoint**:
   ```bash
   curl -s -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4001/api/kpi/cv-speed/seed" | jq .
   ```
