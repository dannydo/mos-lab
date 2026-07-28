# BRIEFING — 2026-07-28T09:15:15+07:00

## Mission

Implement standard Vietnamese search utilities in shared package & web utils, and refactor search controls across today, customers, bk, and cc dashboards.

## 🔒 My Identity

- Archetype: worker_m2_1
- Roles: implementer, qa, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1
- Original parent: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Milestone: Vietnamese Search Refactor

## 🔒 Key Constraints

- Code modification minimal change principle.
- Use `removeVietnameseTones` and `vietnameseSearchFilter`.
- Re-export `removeVietnameseTones` from `BookerTeamConfigModal.tsx` to maintain backward compatibility.
- Perform build and test checks after changes (`pnpm --filter @mos-lab/shared build`, `pnpm build`, `pnpm lint`).

## Current Parent

- Conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Updated: 2026-07-28T09:15:15+07:00

## Task Summary

- **What to build**: Standard Vietnamese search helper functions (`removeVietnameseTones`, `vietnameseSearchFilter`) in `@mos-lab/shared` and `apps/web/lib/utils/search.ts`. Update all search and Select filter controls across specified components.
- **Success criteria**: All listed files updated, build succeeds, lint succeeds, unit tests pass, handoff report generated.
- **Interface contracts**: `packages/shared/src/utils/search.ts`
- **Code layout**: monorepo (`packages/shared`, `apps/web`)

## Key Decisions Made

- All requested refactorings completed and verified.
- Unit tests added in `apps/web/lib/utils/search.test.ts`.

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1/ORIGINAL_REQUEST.md` — Original prompt
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1/BRIEFING.md` — Briefing document
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1/progress.md` — Progress tracker
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1/handoff.md` — Handoff report

## Change Tracker

- **Files modified**:
  - `packages/shared/src/utils/search.ts`
  - `packages/shared/src/index.ts`
  - `apps/web/lib/utils/search.ts`
  - `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx`
  - `apps/web/app/dashboard/today/components/TodayCalendarSummary.tsx`
  - `apps/web/app/dashboard/today/components/TodayBookingsTable.tsx`
  - `apps/web/app/dashboard/customers/components/RevokeAssignmentModal.tsx`
  - `apps/web/app/dashboard/customers/components/CustomerFilters.tsx`
  - `apps/web/app/dashboard/customers/components/AssignmentHistoryDrawer.tsx`
  - `apps/web/app/dashboard/bk/components/BkBookingTab.tsx`
  - `apps/web/app/dashboard/bk/components/BkDoneTab.tsx`
  - `apps/web/app/dashboard/bk/components/BkRevenueTab.tsx`
  - `apps/web/app/dashboard/bk/components/BkTipTab.tsx`
  - `apps/web/app/dashboard/bk/components/BkConfigDrawer.tsx`
  - `apps/web/app/dashboard/cc/components/CcConfigDrawer.tsx`
  - `apps/web/app/dashboard/cc/components/CcDiamondDetailModal.tsx`
  - `apps/web/app/dashboard/cc/components/CcDiamondTab.tsx`
  - `apps/web/app/dashboard/cc/components/CcThuNhapTab.tsx`
  - `apps/web/app/dashboard/cc/components/CcThuongTab.tsx`
  - `apps/web/app/dashboard/cc/components/CcTipTab.tsx`
  - `apps/web/app/dashboard/cc/components/CcXoayTab.tsx`
  - `apps/web/app/dashboard/cc/page.tsx`
  - `apps/web/lib/utils/search.test.ts`
- **Build status**: PASS (Shared build & Next.js production build succeeded)
- **Pending issues**: none

## Quality Status

- **Build/test result**: PASS (5/5 unit tests passed)
- **Lint status**: PASS
- **Tests added/modified**: `apps/web/lib/utils/search.test.ts`

## Loaded Skills

- None
