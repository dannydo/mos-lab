## 2026-07-28T02:11:47Z

You are worker_m2_1. Your working directory is /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:

1. Implement & export standard Vietnamese search utilities:
   - Create/export `removeVietnameseTones(str: string | number | null | undefined): string` and `vietnameseSearchFilter(input: string, option?: any): boolean` in `packages/shared/src/utils/search.ts` (re-export from `packages/shared/src/index.ts`). Run `pnpm --filter @mos-lab/shared build`.
   - Also export them from `apps/web/lib/utils/search.ts`.
   - Re-export `removeVietnameseTones` in `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` so existing imports remain intact.
2. Refactor search controls across `/dashboard/today`, `/dashboard/customers`, `/dashboard/bk`, `/dashboard/cc`:
   - `/dashboard/today`:
     - `BookerTeamConfigModal.tsx`: import standard utility from `@mos-lab/shared` or `apps/web/lib/utils/search.ts`.
     - `TodayCalendarSummary.tsx`: update to use `removeVietnameseTones`/`vietnameseSearchFilter`.
     - `TodayBookingsTable.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Booker filter `<Select>`.
   - `/dashboard/customers`:
     - `RevokeAssignmentModal.tsx`: refactor Target Booker Select to use `filterOption={vietnameseSearchFilter}`.
     - `CustomerFilters.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Assigned Booker Select.
     - `AssignmentHistoryDrawer.tsx`: refactor history text search filter to use `removeVietnameseTones`.
   - `/dashboard/bk`:
     - `BkBookingTab.tsx`: refactor `filteredDetailRecords` to use `removeVietnameseTones`.
     - `BkDoneTab.tsx`: refactor `filteredDetailRecords` to use `removeVietnameseTones`.
     - `BkRevenueTab.tsx`: refactor `filteredDetailRecords` to use `removeVietnameseTones`.
     - `BkTipTab.tsx`: refactor `filteredDetailRecords` to use `removeVietnameseTones`.
     - `BkConfigDrawer.tsx`: refactor `filteredStaff` to use `removeVietnameseTones`.
   - `/dashboard/cc`:
     - `CcConfigDrawer.tsx`: refactor `filteredStaff` to use `removeVietnameseTones`.
     - `CcDiamondDetailModal.tsx`: refactor `filteredDetails` to use `removeVietnameseTones`.
     - `CcDiamondTab.tsx`: refactor `filteredData` to use `removeVietnameseTones`.
     - `CcThuNhapTab.tsx`: refactor `filteredData` to use `removeVietnameseTones`.
     - `CcThuongTab.tsx`: refactor search filtering to use `removeVietnameseTones`.
     - `CcTipTab.tsx`: refactor search filtering to use `removeVietnameseTones`.
     - `CcXoayTab.tsx`: refactor `filteredData` to use `removeVietnameseTones`.
     - `page.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Consultant filter Select.

Output & Verification:

- Document all changes in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1/handoff.md`.
- Send a message to orchestrator (ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6) upon completion.
