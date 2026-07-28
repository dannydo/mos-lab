# Progress Log

Last visited: 2026-07-28T02:13:15Z

- [x] Initialized workspace and briefing.
- [x] Created/exported `removeVietnameseTones` and `vietnameseSearchFilter` in `@mos-lab/shared` and `apps/web/lib/utils/search.ts`.
- [x] Refactored `/dashboard/cv`:
  - `apps/web/app/dashboard/cv/page.tsx`: Consultant Select uses `filterOption={vietnameseSearchFilter}`.
  - `apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx`: `filteredStaff` uses `removeVietnameseTones`.
  - `apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx`: `filteredData` uses `removeVietnameseTones`.
  - `apps/web/app/dashboard/cv/components/CvTipTab.tsx`: `filteredRecords` uses `removeVietnameseTones`.
  - `apps/web/app/dashboard/cv/components/CvXoayTab.tsx`: `filteredData` uses `removeVietnameseTones`.
- [x] Refactored `/dashboard/catalog`:
  - `apps/web/app/dashboard/catalog/page.tsx`: Combo Drawer Applicable Service Select uses `filterOption={vietnameseSearchFilter}`.
- [x] Refactored `/dashboard/appointments`:
  - `apps/web/app/dashboard/appointments/page.tsx`: Booker Select uses `showSearch` + `filterOption={vietnameseSearchFilter}`.
- [x] Refactored `/dashboard/loca`:
  - `apps/web/app/dashboard/loca/page.tsx`: Booker/Telesales Select uses `showSearch` + `filterOption={vietnameseSearchFilter}`.
- [ ] Verify build completion and linting.
- [ ] Write `handoff.md` and notify orchestrator.
