## 2026-08-08T01:52:53Z

You are explorer_m1_2 in working directory /Users/dannydo/projects/mos-lab/.agents/explorer_m1_2.
Your task is to analyze the Prisma schema requirements for M1 (`crm_cv_speed_profile` table).

Specifically:

1. Read `/Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md` (R2 section).
2. Inspect `apps/api/prisma/crm.prisma` (lines 700-750) and check existing models like `CrmLashTypeBenchmark` for naming conventions, column types, maps, and indexes.
3. Design the exact `CrmCvSpeedProfile` Prisma model for `crm.prisma`, ensuring:
   - Table name mapped via `@@map("crm_cv_speed_profile")`
   - Unique constraint `@@unique([staffId, lashStyle, serviceMode, lashCount])`
   - All fields match R2 spec (`staff_id`, `staff_name`, `lash_style`, `service_mode`, `lash_count`, `cleaning_minutes`, `extension_minutes`, `prep_qc_minutes`, `total_minutes`, `model_layer`, `sample_size`, `confidence`, `reg_a`, `reg_b`, `reg_r_squared`, `benchmark_total_minutes`, `speed_delta_percent`, `speed_rating`, `updated_at`, `created_at`).
4. Detail the command sequence to validate schema (`prisma validate`) and generate client (`pnpm --filter @mos-lab/api prisma:generate`).

Write your report to `/Users/dannydo/projects/mos-lab/.agents/explorer_m1_2/analysis.md` and handoff report to `/Users/dannydo/projects/mos-lab/.agents/explorer_m1_2/handoff.md`.
Send a message back to parent when done.
