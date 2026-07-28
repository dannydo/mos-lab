# BRIEFING — 2026-07-28T02:14:50Z

## Mission

Refactor search controls across /dashboard/nyc, /dashboard/omicall, /dashboard/staff, and shared dashboard components using vietnameseSearchFilter, then verify web build.

## 🔒 My Identity

- Archetype: worker_m2_3
- Roles: implementer, qa, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_3
- Original parent: b443607f-5adc-4cf6-b4eb-a237d405d7f4
- Milestone: vietnamese_search_refactor

## 🔒 Key Constraints

- Minimal change principle.
- Use `removeVietnameseTones` / `vietnameseSearchFilter`.
- Do not introduce build errors or type mismatches.

## Current Parent

- Conversation ID: b443607f-5adc-4cf6-b4eb-a237d405d7f4
- Updated: 2026-07-28T02:14:50Z

## Task Summary

- **What to build**: Refactor Select components in nyc/page.tsx, omicall/page.tsx, staff/components/StaffTabsContent.tsx, staff/page.tsx, BookingWizardDrawer.tsx, RescheduleBookingModal.tsx, DailyCallsTable.tsx.
- **Success criteria**: Clean compilation with `pnpm --filter @mos-lab/web build`.

## Change Tracker

- **Files modified**:
  - `apps/web/app/dashboard/nyc/page.tsx`: Added `showSearch` and `filterOption={vietnameseSearchFilter}` to Booker/Telesales Select dropdown.
  - `apps/web/app/dashboard/omicall/page.tsx`: Refactored Staff filter `<Select showSearch>` to use `filterOption={vietnameseSearchFilter}`.
  - `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx`: Refactored Legacy Wings Lashes Staff Select to use `filterOption={vietnameseSearchFilter}` and removed `optionFilterProp="children"`.
  - `apps/web/app/dashboard/staff/page.tsx`: Added `showSearch` and `filterOption={vietnameseSearchFilter}` to Target Merge Staff Select.
  - `apps/web/components/BookingWizardDrawer.tsx`: Refactored Service and Promotion `<Select showSearch>` to use `filterOption={vietnameseSearchFilter}`.
  - `apps/web/components/RescheduleBookingModal.tsx`: Refactored Service `<Select showSearch>` to use `filterOption={vietnameseSearchFilter}`.
  - `apps/web/components/DailyCallsTable.tsx`: Added `showSearch` and `filterOption={vietnameseSearchFilter}` to Booker filter Select.
- **Build status**: PASS (`pnpm --filter @mos-lab/web build` succeeded with exit code 0)
- **Pending issues**: None

## Quality Status

- **Build/test result**: PASS
- **Lint status**: PASS
- **Tests added/modified**: Verified via Next.js web build typecheck and page generation.

## Loaded Skills

- None

## Key Decisions Made

- Used standard `vietnameseSearchFilter` exported from `@mos-lab/shared`.

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_3/handoff.md` — Final Handoff Report
