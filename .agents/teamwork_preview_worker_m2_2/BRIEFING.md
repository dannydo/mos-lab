# BRIEFING — 2026-07-28T02:14:00Z

## Mission

Refactor search controls across `/dashboard/cv`, `/dashboard/catalog`, `/dashboard/appointments`, `/dashboard/loca` to support tone-insensitive & case-insensitive Vietnamese search (`removeVietnameseTones` / `vietnameseSearchFilter`).

## 🔒 My Identity

- Archetype: worker_m2_2
- Roles: implementer, qa, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_2
- Original parent: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Milestone: tone-insensitive Vietnamese search refactoring

## 🔒 Key Constraints

- Refactor search controls across specific files in `/dashboard/cv`, `/dashboard/catalog`, `/dashboard/appointments`, `/dashboard/loca`.
- Maintain real state and produce real behavior — no hardcoded shortcuts.

## Current Parent

- Conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Updated: 2026-07-28T02:14:00Z

## Task Summary

- **What to build**: Vietnamese tone-insensitive search filtering across selected dashboard views.
- **Success criteria**: All listed search controls in CV, Catalog, Appointments, and LoCa use `vietnameseSearchFilter` or `removeVietnameseTones` properly.
- **Interface contracts**: `PROJECT.md` / `AGENTS.md` rules.
- **Code layout**: Monorepo with web in `apps/web`.

## Key Decisions Made

- Created/exported `removeVietnameseTones` and `vietnameseSearchFilter` in `@mos-lab/shared` (`packages/shared/src/utils/search.ts`) and `apps/web/lib/utils/search.ts`.

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_2/ORIGINAL_REQUEST.md` — Original request
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_2/BRIEFING.md` — Briefing document
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_2/handoff.md` — Handoff report

## Change Tracker

- **Files modified**:
  - `packages/shared/src/utils/search.ts`: Created standard search utilities.
  - `packages/shared/src/index.ts`: Exported search utilities.
  - `apps/web/lib/utils/search.ts`: Re-exported search utilities.
  - `apps/web/app/dashboard/cv/page.tsx`: Refactored Consultant Select `filterOption`.
  - `apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx`: Refactored `filteredStaff`.
  - `apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx`: Refactored `filteredData`.
  - `apps/web/app/dashboard/cv/components/CvTipTab.tsx`: Refactored `filteredRecords`.
  - `apps/web/app/dashboard/cv/components/CvXoayTab.tsx`: Refactored `filteredData`.
  - `apps/web/app/dashboard/catalog/page.tsx`: Refactored Combo Drawer Applicable Service Select.
  - `apps/web/app/dashboard/appointments/page.tsx`: Added `showSearch` + `vietnameseSearchFilter` to Booker Select.
  - `apps/web/app/dashboard/loca/page.tsx`: Added `showSearch` + `vietnameseSearchFilter` to Booker/Telesales Select.
- **Build status**: PASS (`pnpm --filter @mos-lab/shared build` and `pnpm --filter @mos-lab/web build` succeeded with 0 errors)
- **Pending issues**: None

## Quality Status

- **Build/test result**: PASS (Production build succeeded)
- **Lint status**: Clean
- **Tests added/modified**: Verified builds pass cleanly

## Loaded Skills

- None
