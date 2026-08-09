# BRIEFING — 2026-08-08T09:03:00Z

## Mission

Implement Milestone 4: Extend `packages/shared/src/types/cv-speed.ts`, update `apps/web/lib/api-client.ts`, implement Next.js KPI Dashboard UI ("CV Speed / Tốc Độ CV" tab with 4 sections), and run full monorepo build verification.

## 🔒 My Identity

- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/worker_m4
- Original parent: df3ef5bf-7493-4e72-b987-ed361bd02374
- Milestone: M4

## 🔒 Key Constraints

- Minimal change principle.
- Tabular numbers (`tabular-nums`) for all numbers, durations, count values.
- Support both Light and Dark theme adaptively.
- Controlled table pagination with localStorage persistence.
- Do NOT hardcode test results or create dummy implementations.

## Task Summary

- **What to build**: Shared types extension (`CvSpeedSeedStatus`, `CvSpeedStyles`, `CvSpeedTrend`), SDK update in `api-client.ts`, modular UI components in `apps/web/app/dashboard/kpi/components/cv-speed/` (Matrix, Ranking, Modal, Predictor, Container), and KPI page integration.
- **Success criteria**: Full monorepo build passes without type/lint errors (`pnpm build`), all 4 sections render correctly, theme & tabular-nums compliance.

## Change Tracker

- **Files modified**:
  - `packages/shared/src/types/cv-speed.ts`: Added `CvSpeedSeedStatus`, `CvSpeedStyles`, `CvSpeedTrend` alias
  - `apps/web/lib/api-client.ts`: Extended `cvSpeed` SDK with 9 strongly typed methods
  - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedMatrixSection.tsx`: Created Section 1 UI component
  - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedRankingSection.tsx`: Created Section 2 UI component
  - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedDetailModal.tsx`: Created Section 3 UI modal component
  - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedPredictorWidget.tsx`: Created Section 4 ETA widget component
  - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedTab.tsx`: Refactored main container component
- **Build status**: PASS
- **Pending issues**: None

## Quality Status

- **Build/test result**: PASS
- **Lint status**: PASS
