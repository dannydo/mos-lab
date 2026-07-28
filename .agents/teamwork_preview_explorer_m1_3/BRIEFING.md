# BRIEFING — 2026-07-28T09:10:00Z

## Mission

Audit and inventory Ant Design Select showSearch, Table filters, and search inputs in NYC, OmiCall, and Staff modules, as well as shared search utilities.

## 🔒 My Identity

- Archetype: explorer
- Roles: explorer_m1_3
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3
- Original parent: b443607f-5adc-4cf6-b4eb-a237d405d7f4
- Milestone: m1_3

## 🔒 Key Constraints

- Read-only investigation — do NOT implement
- Operational scope: /dashboard/nyc, /dashboard/omicall, /dashboard/staff, and shared search utilities

## Current Parent

- Conversation ID: b443607f-5adc-4cf6-b4eb-a237d405d7f4
- Updated: 2026-07-28T09:10:00Z

## Investigation State

- **Explored paths**:
  - `apps/web/app/dashboard/nyc/` (`page.tsx`, `NycColumns.tsx`, `useNycData.ts`)
  - `apps/web/app/dashboard/omicall/` (`page.tsx`)
  - `apps/web/app/dashboard/staff/` (`page.tsx`, `StaffColumns.tsx`, `StaffTabsContent.tsx`, `useStaffData.ts`)
  - `apps/web/components/` (`BookingWizardDrawer.tsx`, `RescheduleBookingModal.tsx`, `DailyCallsTable.tsx`, `CallLogModal.tsx`, `TelesalesConfigPanel.tsx`)
  - `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` (existing `removeVietnameseTones` reference)
  - `packages/shared/` & `apps/web/lib/` (utility package locations)
- **Key findings**:
  - Existing `removeVietnameseTones` function exists locally in `BookerTeamConfigModal.tsx` and is imported by `TodayCalendarSummary.tsx`.
  - Omicall module (`page.tsx` line 626) currently uses tone-sensitive `filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}`.
  - Staff module (`StaffTabsContent.tsx` line 211) uses `showSearch` and `optionFilterProp="children"` without tone removal.
  - Shared modals (`BookingWizardDrawer.tsx` lines 735 & 897, `RescheduleBookingModal.tsx` line 402) use tone-sensitive `(option?.label ?? '').toLowerCase()`.
  - NYC module (`page.tsx` line 286) has staff selector without `showSearch`.
  - No unified `removeVietnameseTones` or `vietnameseSearchFilter` utility currently exists in `packages/shared` or `apps/web/lib/utils/search.ts`.
- **Unexplored areas**: None, all scope files audited.

## Key Decisions Made

- Formulated the standard `removeVietnameseTones` and `vietnameseSearchFilter` specification for `@mos-lab/shared/src/utils/search.ts` and `apps/web/lib/utils/search.ts`.
- Documented exact file paths, line numbers, current logic, and proposed refactoring for all controls.

## Artifact Index

- ORIGINAL_REQUEST.md — Original mission description
- BRIEFING.md — Persistent state index
- handoff.md — Final audit and handoff report
