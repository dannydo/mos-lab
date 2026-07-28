## 2026-07-28T02:11:47Z

Refactor search controls across `/dashboard/cv`, `/dashboard/catalog`, `/dashboard/appointments`, `/dashboard/loca` to support tone-insensitive & case-insensitive Vietnamese search (`removeVietnameseTones` / `vietnameseSearchFilter` from `@mos-lab/shared` or `apps/web/lib/utils/search.ts`).

1. `/dashboard/cv`:
   - `apps/web/app/dashboard/cv/page.tsx`: refactor Consultant `<Select showSearch>` line 227 to use `filterOption={vietnameseSearchFilter}` or `filterOption={(input, option) => removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))}`.
   - `apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx`: refactor `filteredStaff` line 50 to use `removeVietnameseTones`.
   - `apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx`: refactor `filteredData` line 403 to use `removeVietnameseTones`.
   - `apps/web/app/dashboard/cv/components/CvTipTab.tsx`: refactor `filteredRecords` line 147 to use `removeVietnameseTones`.
   - `apps/web/app/dashboard/cv/components/CvXoayTab.tsx`: refactor `filteredData` line 166 to use `removeVietnameseTones`.
2. `/dashboard/catalog`:
   - `apps/web/app/dashboard/catalog/page.tsx`: refactor Combo Drawer Applicable Service `<Select showSearch>` line 1746 to use `filterOption={vietnameseSearchFilter}`.
3. `/dashboard/appointments`:
   - `apps/web/app/dashboard/appointments/page.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Booker Select line 315.
4. `/dashboard/loca`:
   - `apps/web/app/dashboard/loca/page.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Booker/Telesales Select line 315.

Output & Verification:

- Document all changes in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_2/handoff.md`.
- Send a message to orchestrator (ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6) upon completion.
