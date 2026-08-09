# Handoff Report: Milestone 3 Data Queries & Business Logic Integration Analysis

## 1. Observation

- **Files Examined**:
  - `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` (Lines 1 - 545)
  - `apps/api/src/modules/kpi/services/cv-speed-model.service.ts` (Lines 1 - 414)
  - `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts` (Lines 1 - 146)
  - `apps/api/src/modules/kpi/routes.ts` (Lines 10, 217)
  - `packages/shared/src/types/cv-speed.ts` (Lines 1 - 122)
  - `apps/api/src/modules/customers/services/combo-recognition.service.ts` (Lines 12 - 33)
- **API Endpoints Mapped**:
  1. `GET /api/kpi/cv-speed/profiles` -> `fastify.prisma.crm.crmCvSpeedProfile.findMany(...)`
  2. `GET /api/kpi/cv-speed/matrix` -> `getActiveCvStaffList` + `crmCvSpeedProfile.findMany` grouped by `staffId` and `lashStyle_lashCount`
  3. `GET /api/kpi/cv-speed/ranking` -> `crmCvSpeedProfile.findMany` matching parameters, sorted ascending by `totalMinutes`
  4. `GET /api/kpi/cv-speed/trend/:staffId` -> Historical SQL query over 6 months using `COALESCE(ro.actual_booking_date_start, o.booking_date_start)`
  5. `GET /api/kpi/cv-speed/detail/:staffId` -> CV profile summary, median phase breakdown, recent cases, 6-month trend
  6. `GET /api/kpi/cv-speed/predict` -> `CvSpeedModelService.predictCvSpeed(...)`
  7. `POST /api/kpi/cv-speed/seed` -> `CvSpeedSeedService.runNightlyCvSpeedSeed(...)`

## 2. Logic Chain

1. **Active Staff Filtering**:
   - `getActiveCvStaffList()` queries `crmConfig` table for key `'ACTIVE_CV_STAFF_CONFIG'`.
   - If empty/missing, falls back to `FALLBACK_CV_IDS = [47510, 48026, 46092, 37790, 34295, 51659]`.
   - Attaches display names from legacy `user_profile`.
2. **Rule #15 Date Coalescing**:
   - All historical queries use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` for order completion timestamps.
3. **Rule #21 Date Padding**:
   - Date range filters use `parseComboDateBounds(dateFrom, dateTo)` to force `00:00:00` start and `23:59:59` end bounds.
4. **Service Binding & Types**:
   - All 7 route handlers map data to shared TypeScript interfaces exported in `@mos-lab/shared`.
   - Service functions `predictCvSpeed` and `runNightlyCvSpeedSeed` enforce self-correcting 3-layer regression and monotonicity invariants.

## 3. Caveats

- **Database State**: Seeding writes to table `crm_cv_speed_profile`. If the DB table is empty when `/profiles` is called without filters, auto-seeding is triggered once automatically.
- **Legacy DB Read-Only**: Legacy DB queries strictly SELECT from `order_service`, `report_order_service`, `order`, `user_profile`, and `staff_bonus`.

## 4. Conclusion

The 7 Fastify API endpoints for Milestone 3 are fully specified, verified, and correctly bound to the backend model services and database schemas. They adhere to all user rules and architectural constraints, providing a robust backend API foundation for Milestone 4 (Frontend UI Dashboard).

## 5. Verification Method

- **Endpoint 1 (/profiles)**:
  `curl -s -H "Authorization: Bearer TEST_TOKEN" "http://localhost:4001/api/kpi/cv-speed/profiles" | jq '.[0].lashStyle'`
- **Endpoint 2 (/matrix)**:
  `curl -s -H "Authorization: Bearer TEST_TOKEN" "http://localhost:4001/api/kpi/cv-speed/matrix?serviceMode=normal_clean" | jq '.data | length'`
- **Endpoint 3 (/ranking)**:
  `curl -s -H "Authorization: Bearer TEST_TOKEN" "http://localhost:4001/api/kpi/cv-speed/ranking?lashStyle=Classic&lashCount=60" | jq '.[0].rank'`
- **Endpoint 4 (/trend/:staffId)**:
  `curl -s -H "Authorization: Bearer TEST_TOKEN" "http://localhost:4001/api/kpi/cv-speed/trend/47510" | jq '.[0].avgTotalMinutes'`
- **Endpoint 5 (/detail/:staffId)**:
  `curl -s -H "Authorization: Bearer TEST_TOKEN" "http://localhost:4001/api/kpi/cv-speed/detail/47510" | jq '.overallScore'`
- **Endpoint 6 (/predict)**:
  `curl -s -H "Authorization: Bearer TEST_TOKEN" "http://localhost:4001/api/kpi/cv-speed/predict?staffId=47510&lashStyle=Classic&lashCount=60" | jq '.predictedMinutes.total'`
- **Endpoint 7 (/seed)**:
  `curl -s -X POST -H "Authorization: Bearer TEST_TOKEN" "http://localhost:4001/api/kpi/cv-speed/seed" | jq '.success'`
