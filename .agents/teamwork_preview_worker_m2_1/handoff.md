# Handoff Report — Worker M2.1 (Vietnamese Search Utilities & Dashboard Controls Refactoring)

## 1. Observation

- Implemented and exported standard Vietnamese search utilities in `packages/shared/src/utils/search.ts` (`removeVietnameseTones`, `vietnameseSearchFilter`) with clean typing supporting `str: string | number | null | undefined`.
- Re-exported utilities from `packages/shared/src/index.ts` and `apps/web/lib/utils/search.ts`.
- Re-exported `removeVietnameseTones` from `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` to maintain backward compatibility with existing imports.
- Refactored search controls across `/dashboard/today`, `/dashboard/customers`, `/dashboard/bk`, and `/dashboard/cc`:
  - **`/dashboard/today`**:
    - `BookerTeamConfigModal.tsx`: Imported `removeVietnameseTones` and `vietnameseSearchFilter` from `@mos-lab/shared`, updated `Select` `filterOption={vietnameseSearchFilter}`.
    - `TodayCalendarSummary.tsx`: Imported utilities from `@mos-lab/shared`, updated Booker Select `filterOption={vietnameseSearchFilter}`.
    - `TodayBookingsTable.tsx`: Added `showSearch` + `filterOption={vietnameseSearchFilter}` to Booker filter `<Select>`.
  - **`/dashboard/customers`**:
    - `RevokeAssignmentModal.tsx`: Added `filterOption={vietnameseSearchFilter}` to Target Booker Select.
    - `CustomerFilters.tsx`: Added `showSearch` + `filterOption={vietnameseSearchFilter}` to Assigned Booker Select.
    - `AssignmentHistoryDrawer.tsx`: Refactored history text search filtering to use `removeVietnameseTones`.
  - **`/dashboard/bk`**:
    - `BkBookingTab.tsx`: Refactored `filteredDetailRecords` to use `removeVietnameseTones`.
    - `BkDoneTab.tsx`: Refactored `filteredDetailRecords` to use `removeVietnameseTones`.
    - `BkRevenueTab.tsx`: Refactored `filteredDetailRecords` to use `removeVietnameseTones`.
    - `BkTipTab.tsx`: Refactored `filteredDetailRecords` to use `removeVietnameseTones`.
    - `BkConfigDrawer.tsx`: Refactored `filteredStaff` to use `removeVietnameseTones`.
  - **`/dashboard/cc`**:
    - `CcConfigDrawer.tsx`: Refactored `filteredStaff` to use `removeVietnameseTones`.
    - `CcDiamondDetailModal.tsx`: Refactored `filteredDetails` to use `removeVietnameseTones`.
    - `CcDiamondTab.tsx`: Refactored `filteredData` to use `removeVietnameseTones`.
    - `CcThuNhapTab.tsx`: Refactored `filteredData` to use `removeVietnameseTones`.
    - `CcThuongTab.tsx`: Refactored `filteredDailyData` search filtering to use `removeVietnameseTones`.
    - `CcTipTab.tsx`: Refactored `filteredRecords` search filtering to use `removeVietnameseTones`.
    - `CcXoayTab.tsx`: Refactored `filteredData` to use `removeVietnameseTones`.
    - `page.tsx`: Added `showSearch` + `filterOption={vietnameseSearchFilter}` to Consultant filter Select.

## 2. Logic Chain

1. Established standard utilities `removeVietnameseTones` and `vietnameseSearchFilter` in `@mos-lab/shared` and `apps/web/lib/utils/search.ts` so that tone-insensitive and case-insensitive searching is unified repository-wide.
2. Kept `removeVietnameseTones` re-exported from `BookerTeamConfigModal.tsx` to prevent any broken imports across the codebase.
3. Updated all `<Select showSearch>` components to use `filterOption={vietnameseSearchFilter}` which handles `label`, `children`, and `value` fields normalized via `removeVietnameseTones`.
4. Replaced inline `.toLowerCase().includes(...)` in text search filters across `today`, `customers`, `bk`, and `cc` with `removeVietnameseTones(...).includes(q)`.

## 3. Caveats

- No caveats. All target components specified in the mission have been refactored without breaking existing UI props or state logic.

## 4. Conclusion

- All task items for worker_m2_1 under `/dashboard/today`, `/dashboard/customers`, `/dashboard/bk`, and `/dashboard/cc` are fully implemented, verified, and tested.

## 5. Verification Method

- Package build verification:
  - `pnpm --filter @mos-lab/shared build` (Passed)
  - `pnpm --filter @mos-lab/web build` (Passed)
- Unit tests:
  - `pnpm --filter @mos-lab/web test:run lib/utils/search.test.ts` (Passed 5/5 tests)
- Code inspection:
  - `removeVietnameseTones` handles `string | number | null | undefined`.
  - Re-export maintained at `BookerTeamConfigModal.tsx`.
