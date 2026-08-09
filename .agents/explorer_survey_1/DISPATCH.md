## 2026-08-08T08:52:18Z

You are survey_explorer_1 in working directory /Users/dannydo/projects/mos-lab/.agents/explorer_survey_1.
Your task is to investigate the existing backend services and database structures in mos-lab to prepare for building the CV Lash Extension Speed Model.

Specifically:

1. Read `/Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md` completely.
2. Inspect `apps/api/src/modules/catalog/services/lash-benchmark.service.ts` to understand how `parseLashSpecs()`, 3-layer ETA, and global benchmarks work.
3. Inspect `apps/api/prisma/crm.prisma` around line 724-739 for `crm_lash_type_benchmarks` schema.
4. Inspect existing Fastify KPI routes (`apps/api/src/modules/kpi/routes/cv.routes.ts`, `cv-paystub.routes.ts`, etc.) to see standard route patterns, Prisma clients (`fastify.prisma.crm`, `fastify.prisma.legacy`), date bounds helper (`parseComboDateBounds`), and `ACTIVE_CV_STAFF_CONFIG` / `ACTIVE_CC_STAFF_CONFIG` usage.
5. Inspect legacy DB tables referenced (`report_order_service`, `order_service_progress`, `report_staff_technician_service`, `order_service`, `staff_bonus`) to understand how phase times (`cleaning_minute`, `servicing_minute`, `preparation_minute`, `pre_servicing_minute`), timestamps, CV assignment (`assigned_staff_id`), service types, and CV tenure/seniority are stored.

Write your findings and evidence to `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/analysis.md` and create `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_1/handoff.md`.
Send a message back to parent with summary and link to handoff.md.
