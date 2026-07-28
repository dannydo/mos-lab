## 2026-07-28T02:11:48Z

You are worker_m2_3. Your working directory is /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_3.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Refactor search controls across `/dashboard/nyc`, `/dashboard/omicall`, `/dashboard/staff`, and shared dashboard components (`BookingWizardDrawer.tsx`, `RescheduleBookingModal.tsx`, `DailyCallsTable.tsx`) using `removeVietnameseTones` / `vietnameseSearchFilter`, then verify web build.

1. `/dashboard/nyc`:
   - `apps/web/app/dashboard/nyc/page.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Booker/Telesales Select dropdown (line 286).
2. `/dashboard/omicall`:
   - `apps/web/app/dashboard/omicall/page.tsx`: refactor Staff filter `<Select showSearch>` line 621 to use `filterOption={vietnameseSearchFilter}`.
3. `/dashboard/staff`:
   - `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx`: refactor Legacy Wings Lashes Staff Select line 208 to use `filterOption={vietnameseSearchFilter}` (remove `optionFilterProp="children"`).
   - `apps/web/app/dashboard/staff/page.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Target Merge Staff Select (line 1168).
4. Shared Components:
   - `apps/web/components/BookingWizardDrawer.tsx`: refactor Service (line 735) and Promotion (line 897) `<Select showSearch>` to use `filterOption={vietnameseSearchFilter}`.
   - `apps/web/components/RescheduleBookingModal.tsx`: refactor Service `<Select showSearch>` (line 402) to use `filterOption={vietnameseSearchFilter}`.
   - `apps/web/components/DailyCallsTable.tsx`: add `showSearch` + `filterOption={vietnameseSearchFilter}` to Booker filter Select (line 598).
5. Build Verification:
   - Execute `pnpm --filter @mos-lab/web build` to verify clean TypeScript compilation and static page generation without any type or build errors.

Output & Verification:

- Document all changes and build output in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_3/handoff.md`.
- Send a message to orchestrator (ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6) upon completion.
