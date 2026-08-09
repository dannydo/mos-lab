# Handoff Report: CV Lash Extension Speed Model Survey & Investigation

## 1. Observation

Direct observations from inspecting the `mos-lab` codebase and schema definitions:

1. **`ORIGINAL_REQUEST.md` (Lines 30–123)**:
   - Specifies a logarithmic speed model: $\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$ where $n \in \{30, 60, 70, 80, 90, 100, 120, 140\}$.
   - 3 Service Modes: `normal_clean` (no completed lash order in past 2 months), `normal_removal` (has completed lash order in past 2 months), `retain` (`service_type = 'Retain'`).
   - 4 Phases: `cleaning` (`cleaning_minute`), `extension` (`servicing_minute`), `prep_qc` (`preparation_minute + pre_servicing_minute`), `total` (sum of 4 phases).
   - 3-Layer estimation: Layer 1 (Direct data $\ge 5$ cases P50), Layer 2 (Logarithmic regression interpolation for $\ge 3$ cases across lash counts), Layer 3 (Global benchmark fallback from `crm_lash_type_benchmarks`).
   - Monotonicity invariant: Classic 60 sợi < Classic 70 sợi < Classic 80 sợi for same CV & mode.
   - Seniority rolling window: Junior (< 6 months or < 200 cases) $\rightarrow$ 3 months; Mid (6-12 months) $\rightarrow$ 4 months; Senior ($\ge 12$ months) $\rightarrow$ 6 months. Seniority determined via earliest `staff_bonus` record.
   - CRM table requirement: `crm_cv_speed_profile` with UNIQUE(`staff_id`, `lash_style`, `service_mode`, `lash_count`).
   - 7 Backend API endpoints (`/profiles`, `/matrix`, `/ranking`, `/trend/:staffId`, `/detail/:staffId`, `/predict`, `/seed`).

2. **`LashBenchmarkService` (`apps/api/src/modules/catalog/services/lash-benchmark.service.ts`)**:
   - `parseLashSpecs(serviceKey, serviceName)` (Lines 16–83): Standardized helper mapping `service_key` / `service_name` to `{ lashStyle, lashCount }`.
   - `calculateBenchmarks(fastify)` (Lines 104–185): Queries `order_service` JOIN `report_order_service` JOIN `order` JOIN `service` for past 6 months where $15 < \text{duration} < 200$.
   - `seedBenchmarks(fastify)` (Lines 191–216): Inserts P25, P50, P75 into `crm_lash_type_benchmarks`.
   - `estimateETA` & `batchEstimateETA` (Lines 297–604): Implements 3-layer estimation for booking ETAs.

3. **Prisma Schemas (`apps/api/prisma/crm.prisma` & `legacy.prisma`)**:
   - `crm.prisma` L724-739: `CrmLashTypeBenchmark` mapped to `crm_lash_type_benchmarks`.
   - `legacy.prisma`: Defines models for `management` DB; raw SQL queries via `fastify.prisma.legacy.$queryRawUnsafe` access `report_order_service`, `order_service_progress`, `order_service`, `staff_bonus`, `report_order`, `user_profile`.

4. **Fastify Route & Rule Patterns**:
   - `cv.routes.ts` & `cv-paystub.routes.ts`: `preHandler: [requireAuth]`, active staff filtering via `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')`.
   - `combo-recognition.service.ts` (Lines 12–33): `parseComboDateBounds(dFrom, dTo)` formats start date `YYYY-MM-DD 00:00:00` and end date `YYYY-MM-DD 23:59:59` (Rule #21).
   - Rule #15 Check-in filter: `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` from `report_order` table.

---

## 2. Logic Chain

1. **Phase Duration Tracking**:
   - _Observation 1 & 3_: `report_order_service` records exact minute breakdowns: `preparation_minute`, `pre_servicing_minute`, `cleaning_minute`, `servicing_minute`.
   - _Logic_: We can directly extract phase times for individual technicians (`os.assigned_staff_id`) by joining `order_service` and `report_order_service` for completed orders (`o.order_state = 'Completed'`).

2. **Lash Style & Count Parsing**:
   - _Observation 2_: `parseLashSpecs()` in `LashBenchmarkService` extracts structured `lashStyle` and `lashCount` from service names and keys.
   - _Logic_: Using `parseLashSpecs()` guarantees 100% consistency across benchmark calculation, speed profile fitting, and booking prediction without duplicating regex rules.

3. **Seniority & Rolling Window Computation**:
   - _Observation 1 & 3_: CV seniority is measured from their first activity date. In legacy DB, `staff_bonus` records every service completed by a technician with `date_created`.
   - _Logic_: Querying `MIN(date_created)` from `staff_bonus` per CV staff ID yields their exact start date, allowing precise determination of Junior (<6m), Mid (6-12m), and Senior ($\ge 12$m) rolling windows (3, 4, or 6 months).

4. **Model Seeding & API Architecture**:
   - _Observation 1, 3 & 4_: KPI routes use Fastify, dual Prisma (`crm` & `legacy`), `TeamService` for active staff, and `parseComboDateBounds`.
   - _Logic_: Adding a new CRM table `crm_cv_speed_profile` to `crm.prisma`, creating `CvSpeedModelService` in Fastify, and registering routes in `cv-speed.routes.ts` aligns perfectly with existing system design patterns and repository rules.

---

## 3. Caveats

1. **Historical Data Density**: Some junior CVs or rare lash styles (e.g. `Ivylight 5L` or `Under Mink`) may have $<3$ data points in historical data. Layer 3 (global benchmark fallback scaled by CV overall speed ratio) is critical to ensure every active CV has a complete profile for all standard lash counts.
2. **Outlier Filtering**: Phase durations under 15 minutes or over 200 minutes represent tracking errors (e.g. forgotten iPad timer) and must be excluded from regression fitting.
3. **No Code Modifications Made**: This investigation was strictly read-only. Source files and schemas were inspected without modification.

---

## 4. Conclusion

The technical investigation is complete. The system architecture, database schema, mathematical model, and implementation patterns for the **CV Lash Extension Speed Model** are fully understood and mapped out.

The project is ready to proceed to implementation:

- Shared types in `packages/shared/src/types/cv-speed.ts`.
- Schema addition `crm_cv_speed_profile` in `apps/api/prisma/crm.prisma`.
- Model & Service logic in `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`.
- Fastify route endpoints in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`.
- Dashboard UI tab in Next.js web application.

---

## 5. Verification Method

To verify the findings of this survey:

1. **Inspect Analysis Report**:
   ```bash
   cat /Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/analysis.md
   ```
2. **Verify Code Locations & Schemas**:
   - Benchmark service: `apps/api/src/modules/catalog/services/lash-benchmark.service.ts`
   - Benchmark DB schema: `apps/api/prisma/crm.prisma` (Lines 724-739)
   - Date bounds helper: `apps/api/src/modules/customers/services/combo-recognition.service.ts`
   - KPI route patterns: `apps/api/src/modules/kpi/routes/cv.routes.ts`
