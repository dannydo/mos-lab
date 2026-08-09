# Handoff Report — Explorer M4-1

## 1. Observation

- **`packages/shared/src/types/cv-speed.ts` (Lines 1-130)**:
  Contains base interfaces `CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedDetail`, `CvSpeedMonthlyTrend`, `CvSpeedTrend`, `CvSpeedPrediction`, `CvSpeedSeedResult`. Missing `CvSpeedSeedStatus` interface, `CvSpeedStyles` interface, and `CvSpeedTrend` alias alignment with `CvSpeedMonthlyTrend`.
- **`apps/api/src/modules/kpi/routes/cv-speed.routes.ts` (Lines 41-693)**:
  Exposes 9 API endpoints:
  1. `GET /api/kpi/cv-speed/profiles`
  2. `GET /api/kpi/cv-speed/matrix`
  3. `GET /api/kpi/cv-speed/ranking`
  4. `GET /api/kpi/cv-speed/trend/:staffId`
  5. `GET /api/kpi/cv-speed/detail/:staffId`
  6. `GET` / `POST /api/kpi/cv-speed/predict`
  7. `POST /api/kpi/cv-speed/seed`
  8. `GET /api/kpi/cv-speed/seed/status`
  9. `GET /api/kpi/cv-speed/styles`
- **`apps/web/lib/api-client.ts` (Lines 152-160 & 796-825)**:
  `apiClient.kpi.cvSpeed` currently has 7 methods defined without explicit TypeScript return type annotations and is missing `getSeedStatus` and `getStyles` methods.

## 2. Logic Chain

1. **Observation**: Backend `/seed/status` returns `{ totalProfiles: number; activeStaffCount: number; lastUpdatedAt: string | null; isSeeded: boolean }` and `/styles` returns `{ lashStyles: string[]; lashCounts: number[]; serviceModes: LashServiceMode[]; benchmarksCount: number }`.
2. **Step 1 Reasoning**: Define `CvSpeedSeedStatus` and `CvSpeedStyles` in `packages/shared/src/types/cv-speed.ts` so frontend SDK can import strongly-typed response signatures.
3. **Observation**: `/trend/:staffId` returns `CvSpeedMonthlyTrend[]`.
4. **Step 2 Reasoning**: Export `type CvSpeedTrend = CvSpeedMonthlyTrend;` to ensure any UI component importing `CvSpeedTrend` compiles without error.
5. **Observation**: Existing `apiClient.kpi.cvSpeed` lacks explicit `Promise<T>` return types and omits query params for `getTrend` (`lashStyle`, `serviceMode`) and `getDetail` (`dateFrom`, `dateTo`, `limit`).
6. **Step 3 Reasoning**: Restructure `apiClient.kpi.cvSpeed` into 9 strongly-typed SDK namespace methods matching backend routes.

## 3. Caveats

- Read-only investigation mode: source files in `apps/` and `packages/` were not modified.
- `predict` endpoint in Fastify supports both GET and POST; the SDK implementation targets GET as standard retrieval.

## 4. Conclusion

The SDK extension design (`apps/web/lib/api-client.ts`) and shared types export design (`packages/shared/src/types/cv-speed.ts`) are completely specified and ready for implementation.

## 5. Verification Method

After implementation by Implementer:

1. Build shared package:
   ```bash
   pnpm --filter @mos-lab/shared build
   ```
2. Build web package:
   ```bash
   pnpm --filter @mos-lab/web build
   ```
3. Type-check verification:
   Confirm all 9 SDK methods `apiClient.kpi.cvSpeed.getProfiles`, `getMatrix`, `getRanking`, `getTrend`, `getDetail`, `predict`, `seed`, `getSeedStatus`, `getStyles` have complete IDE autocomplete and return explicit promises.
