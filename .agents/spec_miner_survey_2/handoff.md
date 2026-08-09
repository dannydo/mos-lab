# Handoff Report: Specification Mining for CV Lash Extension Speed Model

## 1. Observation

- **Primary Specification Source**: `/Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md` (lines 30-123).
- **Existing System Integration Points**:
  - `LashBenchmarkService` at `/Users/dannydo/projects/mos-lab/apps/api/src/modules/catalog/services/lash-benchmark.service.ts` (lines 16-83 for `parseLashSpecs()`, lines 297-413 for 3-layer benchmark calculation).
  - `crm_lash_type_benchmarks` in `/Users/dannydo/projects/mos-lab/apps/api/prisma/crm.prisma` (lines 724-739).
  - Legacy DB tables: `order_service`, `report_order_service`, `report_staff_technician_service`, `staff_bonus`, `user_profile`.
  - Config key `ACTIVE_CV_STAFF_CONFIG` in `crmConfig` accessed via `TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG')`.
  - Date filtering rule #15 from `.agents/AGENTS.md`: `COALESCE(ro.actual_booking_date_start, o.booking_date_start)`.
- **Model Formulas Extracted**:
  - Non-linear logarithmic regression: $\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$
  - Goodness-of-fit: $R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$, threshold $R^2 > 0.5$.
  - Monotonicity invariant: $\text{time}(n_1) < \text{time}(n_2)$ for $n_1 < n_2$ ($b > 0$).
  - 3-Layer Estimation Cascade: Layer 1 (Direct $\ge 5$ cases) $\rightarrow$ Layer 2 (Regression $\ge 3$ cases) $\rightarrow$ Layer 3 (Adjusted Global Benchmark).
  - Adaptive Rolling Window: Junior (<6 mos / <200 cases) = 3 months, Mid (6-12 mos / $\ge 200$ cases) = 4 months, Senior ($\ge 12$ mos / $\ge 200$ cases) = 6 months.
- **Database Table Specification**: `crm_cv_speed_profile` with 21 fields, `UNIQUE(staff_id, lash_style, service_mode, lash_count)`.
- **API Surface**: 7 endpoints (`profiles`, `matrix`, `ranking`, `trend/:staffId`, `detail/:staffId`, `predict`, `seed`).
- **Speed Rating Thresholds**: Green ($<-10\%$), Yellow ($-10\%$ to $+10\%$), Red ($>+10\%$).
- **Service Mode Rules**: `normal_clean` (no prior lash order in 2 mos), `normal_removal` (has completed lash order in 2 mos), `retain` (`service_type = 'Retain'`).

## 2. Logic Chain

1. **Observation**: `ORIGINAL_REQUEST.md` R1 specifies $\text{time}_{phase}(n) = a + b \ln(n)$, 4 phases, 3 estimation layers, monotonicity invariant, and adaptive rolling windows.
   - **Inference**: The model requires closed-form least-squares fitting for linear regression on $x = \ln(n)$, $y = \text{time}_{phase}$, with validation checks for $R^2 > 0.5$ and $b > 0$. Failure of validation forces regression down to Layer 3 global benchmark fallback.

2. **Observation**: `ORIGINAL_REQUEST.md` R2 details `crm_cv_speed_profile` columns, data types, constraints, and standard lash counts $[30, 60, 70, 80, 90, 100, 120, 140]$.
   - **Inference**: The database schema must be declared in Prisma (`apps/api/prisma/crm.prisma`) as `CrmCvSpeedProfile` with composite unique constraint `@@unique([staffId, lashStyle, serviceMode, lashCount])` to support nightly idempotent seed upserts.

3. **Observation**: `ORIGINAL_REQUEST.md` R3 enumerates 7 API endpoints, requiring adherence to `ACTIVE_CV_STAFF_CONFIG`, `parseComboDateBounds`, and Rule #15 (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`).
   - **Inference**: Request and response DTOs must be created in `packages/shared/src/types/cv-speed.ts` and registered in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`.

4. **Observation**: `ORIGINAL_REQUEST.md` R1 & R2 set speed rating boundaries (Green $<-10\%$, Yellow $\pm 10\%$, Red $>+10\%$) and customer history service modes (`normal_clean`, `normal_removal`, `retain`).
   - **Inference**: Customer history lookup must inspect completed lash orders in the preceding 2-month window relative to the order completion date.

## 3. Caveats

- **No caveats**: All mathematical equations, database field requirements, service mode rules, speed thresholds, API endpoint contracts, and edge cases have been completely mined and documented directly from `ORIGINAL_REQUEST.md` and verified against existing codebase implementations (`LashBenchmarkService`, `crm.prisma`, `cv.routes.ts`).

## 4. Conclusion

The specification mining for the CV Lash Extension Speed Model is 100% complete and fully documented in `/Users/dannydo/projects/mos-lab/.agents/spec_miner_survey_2/analysis.md`. The design provides exact mathematical formulas, schema definitions, endpoint contracts, speed boundaries, service mode classification, and edge cases needed for immediate execution by implementer subagents.

## 5. Verification Method

1. **Inspect Analysis Document**:
   View `/Users/dannydo/projects/mos-lab/.agents/spec_miner_survey_2/analysis.md` to confirm all 7 API endpoints, formulas, Prisma schema, speed thresholds, and edge cases are documented in full detail.
2. **Cross-Check Source Requirements**:
   Compare `analysis.md` against `/Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md` sections R1–R5 to verify 100% coverage.
3. **Invalidation Condition**:
   Any missing endpoint contract parameter or undocumented mathematical fallback rule would invalidate this specification report.
