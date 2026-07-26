# Project: mos-lab Dashboard Performance & Accessibility Audit

## Architecture

- Frontend: Next.js 15 + Ant Design 5 (Port 4000)
- Backend: Fastify 5 + TypeScript + Prisma CRM/Legacy DBs (Port 4001)
- Target Report: `performance_report.md` at root

## Milestones

| #   | Name                | Scope                                                                                                                  | Dependencies | Status |
| --- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | M1_frontend_perf    | Measure exact navigation load time, compilation, TTI, network requests, payload sizes for all 13 pages and nested tabs | None         | DONE   |
| 2   | M2_backend_api_db   | Fastify API route inspection & SQL query/index analysis for routes taking >1.0s                                        | None         | DONE   |
| 3   | M3_a11y_ux          | Semantic HTML, ARIA, keyboard navigation, contrast ratio audit across dashboard components                             | None         | DONE   |
| 4   | M4_report_synthesis | Synthesize performance_report.md containing benchmark matrix, slow APIs, root cause, and code solutions                | M1, M2, M3   | DONE   |
| 5   | M5_verification     | Reviewer verification & Forensic Integrity Audit                                                                       | M4           | DONE   |

## Code Layout

- `apps/web/`: Next.js 15 frontend application
- `apps/api/`: Fastify 5 backend application (`apps/api/src/modules/`)
- `packages/shared/`: Shared types and constants
- `performance_report.md`: Deliverable audit report
