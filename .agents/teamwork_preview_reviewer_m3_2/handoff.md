# Handoff Report — Reviewer M3-2

## 1. Observation

Direct code inspections across all assigned modules and shared components were conducted to verify the Vietnamese search refactoring:

### Target Module 1: `/dashboard/appointments`

- `apps/web/app/dashboard/appointments/page.tsx`:
  - Line 42: `import { MissedSummaryStats, Appointment, vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 316-317: `<Select showSearch filterOption={vietnameseSearchFilter} value={selectedStaffId} ... />` for Booker selection.
- `components/MissedReasonModal.tsx`, `components/MissedDateNavigator.tsx`: Small fixed options without `showSearch`.
- No unnormalized `.toLowerCase().includes(...)` in Select option filters.

### Target Module 2: `/dashboard/loca`

- `apps/web/app/dashboard/loca/page.tsx`:
  - Line 64: `import { Customer, CALL_RESULT_LABELS, vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 315-317: `<Select showSearch filterOption={vietnameseSearchFilter} placeholder="Chọn Booker/Telesales" ... />` for Booker selection.
- No unnormalized `.toLowerCase().includes(...)` in Select option filters.

### Target Module 3: `/dashboard/nyc`

- `apps/web/app/dashboard/nyc/page.tsx`:
  - Line 55: `import { Customer, CALL_RESULT_LABELS, vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 286-288: `<Select showSearch filterOption={vietnameseSearchFilter} placeholder="Chọn Booker/Telesales" ... />` for Booker selection.
- No unnormalized `.toLowerCase().includes(...)` in Select option filters.

### Target Module 4: `/dashboard/omicall`

- `apps/web/app/dashboard/omicall/page.tsx`:
  - Line 38: `import { vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 626-627: `<Select ... showSearch filterOption={vietnameseSearchFilter} options={[ { value: 'ALL', label: 'Tất cả nhân viên' }, ...staffList.map(...) ]} />` for staff filtering.
- No unnormalized `.toLowerCase().includes(...)` in Select option filters.

### Target Module 5: `/dashboard/staff`

- `apps/web/app/dashboard/staff/page.tsx`:
  - Line 56: `import { Staff, Role, vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 1173-1174: `<Select ... showSearch filterOption={vietnameseSearchFilter}>` for primary staff merge selection modal.
- `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx`:
  - Line 20: `import { Staff, Role, vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 211-212: `<Select placeholder="Chọn tài khoản Wings Lashes liên kết" allowClear showSearch filterOption={vietnameseSearchFilter}>` for legacy staff account linking.
- No unnormalized `.toLowerCase().includes(...)` in Select option filters.

### Target Module 6: Shared Dashboard Components

- `apps/web/components/BookingWizardDrawer.tsx`:
  - Line 9: `import { vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 677: `<Select showSearch filterOption={false} onSearch={handleSearchCustomers} ... />` — Async server-side customer lookup (valid standard pattern).
  - Line 735-736: `<Select showSearch filterOption={vietnameseSearchFilter} ... />` for Service selection.
  - Line 896-898: `<Select showSearch allowClear filterOption={vietnameseSearchFilter} ... />` for Promotion selection.
  - `components/booking/TechnicianSelector.tsx`: Uses custom `removeAccents` normalization (`str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')`) and lowercase matching for KTV filtering.
- `apps/web/components/RescheduleBookingModal.tsx`:
  - Line 9: `import { vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 402-403: `<Select showSearch filterOption={vietnameseSearchFilter} ... />` for Service selection.
- `apps/web/components/DailyCallsTable.tsx`:
  - Line 38: `import { DailyCallEntry, vietnameseSearchFilter } from '@mos-lab/shared';`
  - Line 599-600: `<Select showSearch filterOption={vietnameseSearchFilter} ... />` for Booker selection.

### Build Verification Command & Result:

- Executed `pnpm --filter @mos-lab/web exec tsc --noEmit`: 0 errors.
- Executed `pnpm --filter @mos-lab/web build`: Completed successfully. Next.js Turbopack compiled in 9.9s, TypeScript finished in 5.4s, 21 static pages generated with 0 errors or warnings.

---

## 2. Logic Chain

1. **Requirement Check**:
   - The mission required checking that every `<Select showSearch>` in `/dashboard/appointments`, `/dashboard/loca`, `/dashboard/nyc`, `/dashboard/omicall`, `/dashboard/staff`, `BookingWizardDrawer.tsx`, `RescheduleBookingModal.tsx`, and `DailyCallsTable.tsx` applies `filterOption={vietnameseSearchFilter}` or tone normalization (`removeVietnameseTones`).
2. **Analysis of Findings**:
   - Every single local-filtering `<Select showSearch>` across the assigned modules correctly imports and configures `vietnameseSearchFilter`.
   - The only exception is the async customer search in `BookingWizardDrawer.tsx`, which correctly sets `filterOption={false}` because filtering is performed server-side via `onSearch={handleSearchCustomers}` API requests.
   - `TechnicianSelector.tsx` implements explicit NFD diacritic stripping + `đ`/`Đ` mapping before substring matching.
3. **Absence of Regressions / Anti-Patterns**:
   - Grep searches for `toLowerCase` and `includes` confirmed that no `<Select showSearch>` uses raw, tone-sensitive `.toLowerCase().includes(...)` for option filtering.
4. **Integrity & Build Validation**:
   - Independent build execution (`pnpm --filter @mos-lab/web build`) verified type safety, bundle optimization, and zero compiler failures across all 21 app routes.

---

## 3. Caveats

No caveats. All target routes, components, and build targets were fully inspected and verified.

---

## 4. Conclusion

**Verdict**: **APPROVE**

The Vietnamese search refactoring across `/dashboard/appointments`, `/dashboard/loca`, `/dashboard/nyc`, `/dashboard/omicall`, `/dashboard/staff`, and shared dashboard components (`BookingWizardDrawer.tsx`, `RescheduleBookingModal.tsx`, `DailyCallsTable.tsx`) is 100% complete, fully compliant with diacritic normalization standards, and compiles cleanly with zero errors.

---

## 5. Verification Method

To independently verify this report:

1. **Verify `filterOption={vietnameseSearchFilter}` in code**:

   ```bash
   grep -rn "vietnameseSearchFilter" apps/web/app/dashboard/appointments/
   grep -rn "vietnameseSearchFilter" apps/web/app/dashboard/loca/
   grep -rn "vietnameseSearchFilter" apps/web/app/dashboard/nyc/
   grep -rn "vietnameseSearchFilter" apps/web/app/dashboard/omicall/
   grep -rn "vietnameseSearchFilter" apps/web/app/dashboard/staff/
   grep -rn "vietnameseSearchFilter" apps/web/components/
   ```

2. **Verify TypeScript compilation & build**:
   ```bash
   pnpm --filter @mos-lab/web build
   ```
