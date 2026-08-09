# BRIEFING — 2026-08-08T09:00:00Z

## Mission

Investigate and design the Next.js CRM KPI page tab ("CV Speed / Tốc Độ CV") and 4 UI component sections for Milestone 4 (M4).

## 🔒 My Identity

- Archetype: Teamwork Explorer
- Roles: Explorer 2 (Milestone 4 - KPI Dashboard UI & Booking Predictor Widget)
- Working directory: /Users/dannydo/projects/mos-lab/.agents/explorer_m4_2
- Original parent: df3ef5bf-7493-4e72-b987-ed361bd02374
- Milestone: M4

## 🔒 Key Constraints

- Read-only investigation — do NOT implement production components in web app (implementer will write them)
- Adhere strictly to AGENTS.md rules (`tabular-nums`, Light/Dark theme compatibility, controlled pagination, Ant Design 5 + Tailwind v4)
- Document exact file paths, interfaces, sub-component breakdowns, and verification plan

## Current Parent

- Conversation ID: df3ef5bf-7493-4e72-b987-ed361bd02374
- Updated: 2026-08-08T09:00:00Z

## Investigation State

- **Explored paths**:
  - `apps/web/app/dashboard/kpi/page.tsx`
  - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedTab.tsx`
  - `apps/web/lib/api-client.ts`
  - `packages/shared/src/types/cv-speed.ts`
- **Key findings**:
  - `apps/web/app/dashboard/kpi/page.tsx` already has dynamic import of `CvSpeedTab` and tab item `key: 'speed'`.
  - `CvSpeedTab.tsx` currently exists as a single monolithic component; breaking it into 4 specialized modular section files (`CvSpeedMatrixSection.tsx`, `CvSpeedRankingSection.tsx`, `CvSpeedDetailModal.tsx`, `CvSpeedPredictorWidget.tsx`) improves maintainability and follows the project layout standards.
  - `@mos-lab/shared` and `apiClient.kpi.cvSpeed` are fully typed and ready for M4 consumption.
- **Unexplored areas**: None.

## Key Decisions Made

- Deconstruct `CvSpeedTab.tsx` into 4 dedicated sub-components in `apps/web/app/dashboard/kpi/components/cv-speed/`:
  1. `CvSpeedMatrixSection.tsx`
  2. `CvSpeedRankingSection.tsx`
  3. `CvSpeedDetailModal.tsx`
  4. `CvSpeedPredictorWidget.tsx`
- Ensure 100% adherence to theme rules, `tabular-nums` formatting, pagination persistence, and API contract matching.

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/explorer_m4_2/analysis.md` — Detailed M4 component architecture and design specifications
- `/Users/dannydo/projects/mos-lab/.agents/explorer_m4_2/handoff.md` — 5-component handoff report for M4 implementer
