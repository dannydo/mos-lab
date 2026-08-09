# Forensic Audit Report — Milestones 2, 3, and 4 (CV Lash Extension Speed Model)

**Work Product**: CV Speed Model Engine (`cv-speed-model.service.ts`), Seed Service (`cv-speed-seed.service.ts`), Fastify Routes (`cv-speed.routes.ts`), Shared Types (`cv-speed.ts`), and Dashboard UI (`CvSpeedTab.tsx`)
**Profile**: General Project
**Integrity Mode**: Development
**Verdict**: CLEAN

---

## 1. Observation

### Code Analysis & Verification

1. **Mathematical & Cascade Engine (`cv-speed-model.service.ts`)**:
   - `fitLogarithmicModel()` (lines 56–106): Fits non-linear logarithmic curve $y = a + b \ln(n)$ via least-squares linear regression on $(\ln(n), y)$. Computes intercept $a$, slope $b$, coefficient of determination $R^2$, and checks monotonicity ($b > 0$).
   - `getCvRollingWindowMonths()` (lines 114–146): Queries `staff_bonus` for `MIN(date_created)` and total cases to classify CV seniority: $< 6$ months or $< 200$ cases $\rightarrow$ 3-month window, $\ge 12$ months $\rightarrow$ 6-month window, 6–12 months $\rightarrow$ 4-month window.
   - `detectServiceMode()` (lines 154–184): Detects `retain` (serviceType retain/dặm/refill), `normal_removal` (prior lash order in past 2 months via `COALESCE(ro.actual_booking_date_start, o.booking_date_start)`), or `normal_clean`.
   - `predictCvSpeed()` (lines 281–487): Implements 3-layer cascade:
     - **Layer 1**: Direct data ($N \ge 5$ exact match cases) $\rightarrow$ actual median time per phase.
     - **Layer 2**: Log regression interpolation ($N \ge 3$ cases across counts, $R^2 \ge 0.5$, $b > 0$) $\rightarrow$ logarithmic curve prediction.
     - **Layer 3**: Global benchmark fallback $\rightarrow$ adjusted by CV's personal historical speed ratio vs global average.

2. **Seeding & CRM Storage (`cv-speed-seed.service.ts`)**:
   - Fetches active CVs from `crmConfig` (`ACTIVE_CV_STAFF_CONFIG`) or legacy fallback.
   - `enforceMonotonicity()` (lines 98–130): Enforces strictly increasing completion time as lash count increases ($t_{30} < t_{60} < t_{70} < t_{80} < \dots$).
   - `runNightlyCvSpeedSeed()` (lines 136–214): Generates predictions across 10 standard lash styles $\times$ 3 service modes $\times$ 8 standard counts ($30, 60, 70, 80, 90, 100, 120, 140$) and upserts into `crm_cv_speed_profile`.

3. **Fastify API Routes (`cv-speed.routes.ts`)**:
   - Implements all 7 required endpoints:
     - `GET /api/kpi/cv-speed/profiles` (lines 69–126)
     - `GET /api/kpi/cv-speed/matrix` (lines 129–219)
     - `GET /api/kpi/cv-speed/ranking` (lines 222–301)
     - `GET /api/kpi/cv-speed/trend/:staffId` (lines 304–352)
     - `GET /api/kpi/cv-speed/detail/:staffId` (lines 355–503)
     - `GET /api/kpi/cv-speed/predict` & `POST /api/kpi/cv-speed/predict` (lines 506–638)
     - `POST /api/kpi/cv-speed/seed` (lines 640–649)
     - Helper status endpoints `/seed/status` and `/styles`.
   - All routes execute genuine SQL/Prisma database queries against `crm_cv_speed_profile`, `report_order_service`, `order_service`, `order`, `staff_bonus`, and `crm_lash_type_benchmarks`.
   - Strictly respects Rule #15 (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`) and Rule #21 (`parseComboDateBounds`).

4. **Frontend UI Component (`apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedTab.tsx`)**:
   - Dynamically imported into `apps/web/app/dashboard/kpi/page.tsx`.
   - Interacts with `apiClient.kpi.cvSpeed` SDK.
   - Renders 4 functional sections:
     1. **Speed Matrix Overview**: Color-coded cells (Green/Yellow/Red), search input, style/mode select filters, manual recalculate seed button, controlled pagination.
     2. **Ranking Table**: Ranked fastest to slowest with rank badges #1..N, predicted times, rating tags, confidence tags, 3-month trend indicators.
     3. **CV Detail Modal**: Summary statistics, phase breakdown stacked horizontal bar, 6-month monthly trend grid, recent 10 cases timeline.
     4. **Booking Predictor Widget**: Select KTV, style, count, and mode $\rightarrow$ calculates ETA, confidence level, model layer, and 4 phase breakdown.
   - Complies with Light & Dark themes using `useTheme()` and `antTheme.useToken()`.
   - All numerical values use `tabular-nums`.
   - Controlled pagination uses `localStorage` persistence (`cv_speed_matrix_page`, `cv_speed_ranking_page`).

5. **Empirical Build & Test Verification**:
   - `@mos-lab/shared` build: **SUCCESS** (`pnpm --filter @mos-lab/shared build`)
   - `@mos-lab/api` build: **SUCCESS** (`pnpm --filter @mos-lab/api build`)
   - `@mos-lab/web` build: **SUCCESS** (`pnpm --filter @mos-lab/web build`)
   - Automated unit test suite (`scripts/test-cv-speed-verification.ts`): **ALL PASS** (log model fitting, inverted curves, noisy data, single-point edge cases, speed rating, standard counts/styles).

---

## 2. Logic Chain

1. **Calculations & Regression Logic**:
   - Verification of `fitLogarithmicModel()` shows exact implementation of non-linear logarithmic regression formulas: $x_i = \ln(n_i)$, $b = S_{xy} / S_{xx}$, $a = \bar{y} - b \bar{x}$, $R^2 = S_{xy}^2 / (S_{xx} S_{yy})$.
   - 3-Layer Cascade operates dynamically: Layer 1 ($N \ge 5$ exact match) $\rightarrow$ Layer 2 ($N \ge 3$, $R^2 \ge 0.5$, $b > 0$) $\rightarrow$ Layer 3 (Benchmark adjusted by CV ratio).
   - `enforceMonotonicity()` prevents anomalous predictions where larger lash counts take less time.

2. **Route Integrity**:
   - All 7 endpoints exist, are typed with shared interfaces in `packages/shared/src/types/cv-speed.ts`, and perform real database queries.
   - No hardcoded response payloads or dummy stubs were detected.

3. **Frontend Integration**:
   - `CvSpeedTab.tsx` fetches live backend data via `apiClient`.
   - All user inputs (CV, lash style, service mode, lash count, date range, search filter) dynamically refresh state and query backend endpoints.

4. **Build Cleanliness**:
   - All TypeScript compilation targets (`shared`, `api`, `web`) compile cleanly with zero errors.

---

## 3. Caveats

- **Database Population State**: Real production database instances need initial running of `POST /api/kpi/cv-speed/seed` (or automated nightly cron trigger) to populate `crm_cv_speed_profile` for fresh CVs who have no prior profiles stored. The backend includes auto-seeding fallbacks if queried while table is empty.

---

## 4. Conclusion

The implementation of Milestones 2, 3, and 4 (Logarithmic Speed Engine, Seed Service, Fastify Routes, and Dashboard UI) strictly complies with all requirements in `ORIGINAL_REQUEST.md`, architectural guidelines, and integrity rules. Zero prohibited patterns (hardcoded test results, facade implementations, fabricated verification outputs, self-certifying tests) were found.

**Verdict**: **CLEAN**

---

## 5. Verification Method

To independently verify this audit:

```bash
# 1. Build shared package
pnpm --filter @mos-lab/shared build

# 2. Build Fastify API backend
pnpm --filter @mos-lab/api build

# 3. Build Next.js web frontend
pnpm --filter @mos-lab/web build

# 4. Run automated unit verification script
npx tsx scripts/test-cv-speed-verification.ts
```

All commands must exit with code 0.
