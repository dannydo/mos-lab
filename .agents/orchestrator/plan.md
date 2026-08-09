# Master Plan: CV Lash Extension Speed Model

## Objective

Implement a per-CV non-linear (logarithmic) speed estimation model with 3-layer self-correcting logic, CRM database storage (`crm_cv_speed_profile`), nightly seeding background task, 7 backend API endpoints in Fastify, and a rich interactive dashboard tab on Next.js CRM frontend.

## Feature Inventory

| #   | Feature                      | Description                                                                                                                | Requirement | Milestone |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------- | --------- |
| 1   | Shared Types                 | TypeScript definitions for CvSpeedProfile, Matrix, Ranking, Detail, Trend, Prediction, SeedResult                          | R5          | M1        |
| 2   | DB Schema & Migration        | Prisma model `crm_cv_speed_profile` in `apps/api/prisma/crm.prisma` & migration                                            | R2          | M1        |
| 3   | Logarithmic Speed Model Core | Fit $a + b \ln(n)$, phase breakdown, self-correcting 3-layer estimation, monotonicity enforcement, adaptive rolling window | R1          | M2        |
| 4   | Nightly Seed Service         | Seeding logic per CV/style/mode/count, idempotency, speed rating calculation                                               | R2          | M2        |
| 5   | Backend API Endpoints        | 7 Fastify endpoints in `cv-speed.routes.ts` with filters, active CC config, date parsing                                   | R3          | M3        |
| 6   | Speed Matrix Overview        | Section 1 UI: Grid of CVs vs Lash Styles/Counts with Green/Yellow/Red indicators                                           | R4          | M4        |
| 7   | Speed Ranking Table          | Section 2 UI: Sortable ranking table with speed rating, sample size, trend arrows                                          | R4          | M4        |
| 8   | CV Speed Detail Modal        | Section 3 UI: Summary card, phase breakdown chart, per-case timeline, monthly trend chart                                  | R4          | M4        |
| 9   | Booking Predictor Widget     | Section 4 UI: Interactive calculator predicting ETA and phase breakdown for selected inputs                                | R4          | M4        |
| 10  | E2E Verification & Auditing  | Automated build, unit/integration verification, monotonicity checks, forensic audit                                        | Acceptance  | M5        |

## Milestones

| #   | Name                           | Scope                                                                         | Dependencies   | Status  |
| --- | ------------------------------ | ----------------------------------------------------------------------------- | -------------- | ------- |
| M1  | Shared Types & DB Schema       | `packages/shared/src/types/cv-speed.ts`, Prisma schema `crm_cv_speed_profile` | None           | DONE    |
| M2  | Logarithmic Speed Model & Seed | Logarithmic regression service, 3-layer estimation, seed service              | M1             | DONE    |
| M3  | Backend API Endpoints          | 7 Fastify endpoints in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts`   | M1, M2         | PLANNED |
| M4  | KPI Dashboard UI               | "CV Speed / Tốc Độ CV" tab in KPI page (4 sections)                           | M1, M3         | PLANNED |
| M5  | Verification & Audit           | Automated tests, monotonicity verification, audit check                       | M1, M2, M3, M4 | PLANNED |

## Code Layout & Boundaries

- `packages/shared/src/types/cv-speed.ts` — Shared TypeScript types & export in index
- `apps/api/prisma/crm.prisma` — Prisma schema addition `crm_cv_speed_profile`
- `apps/api/src/modules/kpi/services/cv-speed-model.service.ts` — Logarithmic speed regression & 3-layer estimation engine
- `apps/api/src/modules/kpi/services/cv-speed-seed.service.ts` — Nightly seeding & calculation runner
- `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` — Fastify API endpoints
- `apps/web/app/(dashboard)/kpi/components/cv-speed/` — React UI components (Speed Matrix, Ranking, Detail Modal, Booking Predictor)
- `apps/web/app/(dashboard)/kpi/page.tsx` — Add "CV Speed / Tốc Độ CV" tab
