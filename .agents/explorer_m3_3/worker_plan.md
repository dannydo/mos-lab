# Worker Implementation Plan for Milestone 3 (Fastify API Endpoints)

## Target Milestone

**Milestone 3 (M3): Fastify API Endpoints**
Implement `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` with 7 Fastify API endpoints and register it in `apps/api/src/modules/kpi/routes.ts`.

---

## 1. File Changes Required

### File 1: `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` (NEW FILE)

Create new route module exporting `registerCvSpeedRoutes(fastify: FastifyInstance)`.

#### Required Imports:

```ts
import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  CvSpeedProfile,
  CvSpeedMatrix,
  CvSpeedMatrixRow,
  CvSpeedMatrixCell,
  CvSpeedRanking,
  CvSpeedDetail,
  CvSpeedMonthlyTrend,
  CvSpeedPrediction,
  CvSpeedSeedResult,
  LashServiceMode,
  SpeedRating,
  ModelLayer,
  ConfidenceLevel,
} from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';
import { CvSpeedModelService } from '../services/cv-speed-model.service.js';
import { CvSpeedSeedService, STANDARD_LASH_STYLES, STANDARD_LASH_COUNTS } from '../services/cv-speed-seed.service.js';
import { parseComboDateBounds } from '../../customers/services/combo-recognition.service.js';
```

#### Helper Functions inside `cv-speed.routes.ts`:

- `getActiveCvIds(fastify: FastifyInstance): Promise<number[]>`
  Uses `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')`, fallback to `[47510, 48026, 46092, 37790, 34295, 51659]`.

#### Endpoints Implementation:

1. **`GET /api/kpi/cv-speed/profiles`**
   - Options: `{ preHandler: [requireAuth] }`
   - Query: `{ staffId?: string; lashStyle?: string; serviceMode?: string }`
   - Retrieves profiles from `fastify.prisma.crm.crmCvSpeedProfile`.
   - Filters by active CV IDs (plus optional query filters `staffId`, `lashStyle`, `serviceMode`).
   - Auto-triggers seed if 0 profiles exist.
   - Maps database records to `CvSpeedProfile[]` (camelCase fields).

2. **`GET /api/kpi/cv-speed/matrix`**
   - Options: `{ preHandler: [requireAuth] }`
   - Query: `{ serviceMode?: string; lashStyle?: string }` (default `serviceMode = 'normal_clean'`)
   - Queries `fastify.prisma.crm.crmCvSpeedProfile` for active CVs and specified `serviceMode`.
   - Auto-triggers seed if database has 0 profiles.
   - Groups profiles by `staffId` and `staffName`.
   - Constructs `CvSpeedMatrix` payload with `data: CvSpeedMatrixRow[]`, `lashStyles: STANDARD_LASH_STYLES`, `lashCounts: STANDARD_LASH_COUNTS`.

3. **`GET /api/kpi/cv-speed/ranking`**
   - Options: `{ preHandler: [requireAuth] }`
   - Query: `{ lashStyle?: string; lashCount?: string; serviceMode?: string }`
     - Defaults: `lashStyle = 'Classic'`, `lashCount = '80'`, `serviceMode = 'normal_clean'`
   - Queries `crmCvSpeedProfile` for specified style, count, mode across active CVs.
   - Sorts profiles by `totalMinutes` ascending (fastest first).
   - Assigns rank (1..N), extracts `staffId`, `staffName`, `predictedTime`, `sampleSize`, `confidence`, `speedRating`.
   - Determines `trend` ('improving' | 'declining' | 'stable') by checking historical monthly averages or speed delta.

4. **`GET /api/kpi/cv-speed/trend/:staffId`**
   - Options: `{ preHandler: [requireAuth] }`
   - Params: `{ staffId: string }`
   - Query: `{ lashStyle?: string; serviceMode?: string }`
   - Queries legacy DB `staff_bonus` JOIN `order_service` JOIN `order` JOIN `report_order` JOIN `report_order_service` for `staffId` where `bonus_type = 'Banana'` and `order_state = 'Completed'` over the past 6 months.
   - Groups by month (`YYYY-MM`), computes `avgTotalMinutes` and compares against benchmark.
   - Returns `CvSpeedMonthlyTrend[]`.

5. **`GET /api/kpi/cv-speed/detail/:staffId`**
   - Options: `{ preHandler: [requireAuth] }`
   - Params: `{ staffId: string }`
   - Query: `{ dateFrom?: string; dateTo?: string; limit?: string }`
   - Uses `parseComboDateBounds(dateFrom, dateTo)` for date window.
   - Fetches CV name from legacy `user_profile`.
   - Queries recent cases from legacy DB (`report_order_service`, `order_service`, `report_order`, `service`).
   - Calculates `totalCases`, `phaseBreakdown` (`cleaning`, `extension`, `prepQc`), `avgSpeedVsBenchmarkPercent`, `overallScore`, `recentCases: CvSpeedCaseDetail[]`, and `monthlyTrend`.
   - Returns `CvSpeedDetail`.

6. **`GET /api/kpi/cv-speed/predict`**
   - Options: `{ preHandler: [requireAuth] }`
   - Query: `{ staffId?: string; lashStyle?: string; serviceMode?: string; lashCount?: string }`
   - Parses `staffId` (number), `lashStyle` (string, default 'Classic'), `serviceMode` (string, default 'normal_clean'), `lashCount` (number, default 80).
   - First checks `crmCvSpeedProfile` for pre-computed profile matching parameters.
   - If not found, calls `CvSpeedModelService.predictCvSpeed(fastify.prisma.crm, fastify.prisma.legacy, staffId, lashStyle, serviceMode as LashServiceMode, lashCount)`.
   - Returns `CvSpeedPrediction`.

7. **`POST /api/kpi/cv-speed/seed`**
   - Options: `{ preHandler: [requireAuth] }`
   - Triggers `CvSpeedSeedService.runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy)`.
   - Returns `CvSpeedSeedResult`.

---

### File 2: `apps/api/src/modules/kpi/routes.ts` (MODIFICATION)

Register `registerCvSpeedRoutes` inside `kpiRoutes`.

1. Add import statement at top of file (with `.js` extension):
   ```ts
   import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';
   ```
2. Inside `export async function kpiRoutes(fastify: FastifyInstance)`:
   ```ts
   await registerCvSpeedRoutes(fastify);
   ```

---

## 2. Key Code Standards & Safety Checklist

1. **Relative Import File Extensions**: ALL relative imports in backend TS files MUST end with `.js` (NodeNext module resolution rule).
   - `import { requireAuth } from '../../../middlewares/auth.js';`
   - `import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';`
2. **Fastify 5 Signatures**: Route handlers must use `async (request, reply) => { ... }`.
3. **Date Filtering**: Follow Rule #15 — use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` when querying legacy date ranges.
4. **Date Padding**: Use `parseComboDateBounds` (or equivalent `00:00:00` / `23:59:59` bounds) for date filters.
5. **Types Integrity**: Import all types directly from `@mos-lab/shared`.
6. **Error Handling**: Wrap route handlers in `try / catch` blocks and return appropriate status codes (`400`, `404`, `500`).

---

## 3. Verification Instructions for Worker

After creating `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` and updating `apps/api/src/modules/kpi/routes.ts`:

1. Build backend API package:
   ```bash
   pnpm --filter @mos-lab/api build
   ```
2. Start dev servers or restart API:
   ```bash
   pnpm --filter @mos-lab/api dev
   ```
3. Test all 7 API endpoints via `curl`:
   - `POST /api/kpi/cv-speed/seed`
   - `GET /api/kpi/cv-speed/profiles`
   - `GET /api/kpi/cv-speed/matrix`
   - `GET /api/kpi/cv-speed/ranking?lashStyle=Classic&lashCount=80`
   - `GET /api/kpi/cv-speed/predict?staffId=47510&lashStyle=Classic&lashCount=60`
   - `GET /api/kpi/cv-speed/trend/47510`
   - `GET /api/kpi/cv-speed/detail/47510`
