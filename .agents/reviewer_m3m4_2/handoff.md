# 5-Component Review Handoff Report — Reviewer M3 & M4 (Reviewer 2)

**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/reviewer_m3m4_2`  
**Verdict**: `APPROVE`

---

## 1. Observation

Direct examination of implementation artifacts across `apps/api`, `apps/web`, and `packages/shared`:

### 1.1 API Contract Conformance (`cv-speed.routes.ts` vs `api-client.ts`)

- All 9 Fastify backend endpoints in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` map 1-to-1 with SDK methods in `apps/web/lib/api-client.ts` (`apiClient.kpi.cvSpeed`):
  1. `GET /api/kpi/cv-speed/profiles` $\rightarrow$ `getProfiles(params?)`: Returns `CvSpeedProfile[]`.
  2. `GET /api/kpi/cv-speed/matrix` $\rightarrow$ `getMatrix(params?)`: Returns `CvSpeedMatrix`.
  3. `GET /api/kpi/cv-speed/ranking` $\rightarrow$ `getRanking(params?)`: Returns `CvSpeedRanking[]`.
  4. `GET /api/kpi/cv-speed/trend/:staffId` $\rightarrow$ `getTrend(staffId, params?)`: Returns `CvSpeedMonthlyTrend[]`.
  5. `GET /api/kpi/cv-speed/detail/:staffId` $\rightarrow$ `getDetail(staffId, params?)`: Returns `CvSpeedDetail`.
  6. `GET` / `POST /api/kpi/cv-speed/predict` $\rightarrow$ `predict(params)`: Returns `CvSpeedPrediction`.
  7. `POST /api/kpi/cv-speed/seed` $\rightarrow$ `seed()`: Returns `CvSpeedSeedResult`.
  8. `GET /api/kpi/cv-speed/seed/status` $\rightarrow$ `getSeedStatus()`: Returns `CvSpeedSeedStatus`.
  9. `GET /api/kpi/cv-speed/styles` $\rightarrow$ `getStyles()`: Returns `CvSpeedStyles`.
- All response interfaces are exported in `@mos-lab/shared` (`packages/shared/src/types/cv-speed.ts`).

### 1.2 Robustness & Fallback Strategy

- **Unseeded Database Auto-Seeding**: When `crm_cv_speed_profile` is empty on first query (`GET /profiles`), it automatically triggers `runNightlyCvSpeedSeed` to populate profiles before returning results.
- **3-Layer Estimation Engine**: `predictCvSpeed` implements Layer 1 (exact matches $\ge 5$), Layer 2 (logarithmic regression $y = a + b \ln(n)$ for sample $\ge 3$, requiring $b > 0$ and $R^2 \ge 0.5$), and Layer 3 (global benchmark ratio fallback).
- **Monotonicity Enforcement**: `enforceMonotonicity` in `cv-speed-seed.service.ts` guarantees $T(n) > T(n-1)$ across standard counts `[30, 60, 70, 80, 90, 100, 120, 140]`.
- **Active CV Configuration Fallback**: `getActiveCvStaffIds` checks `crmConfig` (`ACTIVE_CV_STAFF_CONFIG`), falls back to historical Banana bonus queries, and defaults to `DEFAULT_FALLBACK_CV_IDS = [47510, 48026, 46092, 37790, 34295, 51659]`.

### 1.3 Error Handling & Status Codes

- All route handlers in `cv-speed.routes.ts` are enclosed in `try / catch` blocks with error logging via `fastify.log.error`.
- Input validation: `predict` route validates missing `staffId` and throws HTTP 400 Bad Request (`{ error: 'Bad Request', message: 'Thiếu tham số staffId.' }`).
- Parameter type casting: Query/params safely convert strings to numbers via `parseInt(..., 10)`.

### 1.4 Client-Side Safety & UI Compliance

- All React components in `apps/web/app/dashboard/kpi/components/cv-speed/` specify `'use client'`.
- `localStorage` reads/writes for pagination state (`cv_speed_matrix_page` and `cv_speed_ranking_page`) check `typeof window !== 'undefined'` to prevent SSR hydration errors.
- `CvSpeedTab` is dynamically imported in `apps/web/app/dashboard/kpi/page.tsx` with `{ ssr: false }`.
- Theme adaptivity uses `useTheme()` and `antTheme.useToken()`.
- Numeric values, durations, percentages, ranks, and sample counts consistently use the `tabular-nums` Tailwind class to prevent layout jitter (Rule #5).

### 1.5 Integrity Audit

- No hardcoded test results, facade implementations, or bypasses detected in source code.
- Verification unit test script `scripts/test-cv-speed-verification.ts` executed and returned 100% PASS.

---

## 2. Logic Chain

1. **API Contract Verification**:
   - Inspected `cv-speed.routes.ts`, `api-client.ts`, and `packages/shared/src/types/cv-speed.ts`.
   - Verified that route paths, HTTP methods, input parameters, and return types match exactly across backend Fastify definitions and frontend Axios SDK wrappers.
   - Run `npx tsc --noEmit` in `apps/web` $\rightarrow$ Passed with exit code 0.

2. **Fallback & Robustness Verification**:
   - Evaluated `cv-speed-model.service.ts` and `cv-speed-seed.service.ts` under edge cases (unseeded DB, 0 cases for CV, non-monotonic data).
   - Verified that Layer 3 fallback handles missing CV cases gracefully without returning `NaN`, `null`, `0`, or negative durations.

3. **Error Handling & Input Validation**:
   - Confirmed `try / catch` coverage across all 9 API handlers in `cv-speed.routes.ts`.
   - Verified HTTP status code 400 for missing mandatory params and HTTP status code 500 for unexpected errors.

4. **Client-side State & Next.js Hygiene**:
   - Verified `typeof window !== 'undefined'` guard around `localStorage` access.
   - Verified `'use client'` directive and dynamic loading with `ssr: false` in `page.tsx`.

---

## 3. Caveats

- **Historical Database Dependency**: Layer 1 and Layer 2 estimations rely on historical records in legacy DB tables (`report_order_service`, `order_service`, `staff_bonus`). If legacy DB connections are temporarily offline, Layer 3 benchmark fallback operates cleanly.
- **No caveats regarding implementation quality or safety.**

---

## 4. Conclusion

The implementation of Milestones 3 and 4 for the **CV Speed Model** meets all project requirements, safety guidelines, default fallbacks, error handling practices, and API contract specifications.

**Verdict**: `APPROVE`

---

## 5. Verification Method

To independently verify this review:

1. **Verify TypeScript Compilation**:

   ```bash
   pnpm --filter @mos-lab/shared build
   pnpm --filter @mos-lab/api build
   cd apps/web && npx tsc --noEmit
   ```

   _Expected result_: All 3 packages compile with 0 errors (exit code 0).

2. **Execute Empirical Unit Verification Script**:

   ```bash
   npx tsx scripts/test-cv-speed-verification.ts
   ```

   _Expected result_:
   - Logarithmic curve fitting $y = a + b \ln(x)$: PASS
   - Non-monotonic detection ($b \le 0$): PASS
   - Speed rating calculation (< -10% fast, > +10% slow): PASS
   - Standard styles (10) & standard counts (8): PASS

3. **Inspect Key Source Files**:
   - `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`
   - `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`
   - `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts`
   - `apps/web/lib/api-client.ts`
   - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedTab.tsx`
