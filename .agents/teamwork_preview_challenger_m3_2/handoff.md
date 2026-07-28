# Handoff Report — Challenger M3-2: Vietnamese Tone Normalization & Web Build Verification

## 1. Observation

### Build & Type Verification

- **Command**: `pnpm --filter @mos-lab/web build`
- **Exit Code**: `0`
- **Total Build Time**: `17.1s` (Compilation: `10.5s`, TypeScript check: `6.2s`, Static page generation: `414ms`)
- **Type Errors**: `0` (TypeScript check finished with zero errors across all 19 routes including 11 CRM dashboard modules).

### Static Scan of `<Select showSearch>` and Search Controls

- **Scope**: Scanned 161 `.tsx`/`.ts` files across `apps/web/app/dashboard/` and `apps/web/components/`.
- **`<Select showSearch>` Components**:
  - `18` `<Select showSearch>` components explicitly use `filterOption={vietnameseSearchFilter}`:
    1. `apps/web/app/dashboard/appointments/page.tsx:317`
    2. `apps/web/app/dashboard/catalog/page.tsx:1750`
    3. `apps/web/app/dashboard/cc/page.tsx:356`
    4. `apps/web/app/dashboard/customers/components/CustomerFilters.tsx:508`
    5. `apps/web/app/dashboard/customers/components/RevokeAssignmentModal.tsx:164`
    6. `apps/web/app/dashboard/cv/page.tsx:232`
    7. `apps/web/app/dashboard/loca/page.tsx:317`
    8. `apps/web/app/dashboard/nyc/page.tsx:288`
    9. `apps/web/app/dashboard/omicall/page.tsx:627`
    10. `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx:212`
    11. `apps/web/app/dashboard/staff/page.tsx:1174`
    12. `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx:246`
    13. `apps/web/app/dashboard/today/components/TodayBookingsTable.tsx:347`
    14. `apps/web/app/dashboard/today/components/TodayCalendarSummary.tsx:261`
    15. `apps/web/components/BookingWizardDrawer.tsx:736`
    16. `apps/web/components/BookingWizardDrawer.tsx:898`
    17. `apps/web/components/DailyCallsTable.tsx:600`
    18. `apps/web/components/RescheduleBookingModal.tsx:403`
  - `1` `<Select showSearch>` in `apps/web/components/BookingWizardDrawer.tsx:679` uses `filterOption={false}` because search is delegated asynchronously to backend server API `apiClient.customers.list({ search: val })`.
  - `0` `<Select showSearch>` components use default `optionFilterProp="children"` without tone normalization.

- **Unnormalized Client-Side Search Filters Found**:
  1. **`apps/web/app/dashboard/kpi/components/AppointmentsAuditDrawer.tsx` (Line 97)**:
     ```tsx
     const query = drillSearchText.toLowerCase();
     const nameMatch = (item.clientName || '').toLowerCase().includes(query);
     ```
  2. **`apps/web/app/dashboard/referrals/page.tsx` (Line 175)**:
     ```tsx
     (r.referrerName || '').toLowerCase().includes(term) || (r.referrerPhone || '').toLowerCase().includes(term);
     ```

### Empirical Test Harness Results (`test_harness.js`)

- Executed `node /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/test_harness.js`:
  - **Query "diep" vs Target "Ngọc Điệp"**:
    - `removeVietnameseTones("diep")` => `"diep"`
    - `removeVietnameseTones("Ngọc Điệp")` => `"ngoc diep"`
    - Includes match: `true` ✅
    - `vietnameseSearchFilter("diep", { label: "Ngọc Điệp" })`: `true` ✅
    - Unnormalized `.toLowerCase().includes()`: `false` ❌ (MISSED)
  - **Query "hang" vs Target "Hằng Ni"**:
    - `removeVietnameseTones("hang")` => `"hang"`
    - `removeVietnameseTones("Hằng Ni")` => `"hang ni"`
    - Includes match: `true` ✅
    - `vietnameseSearchFilter("hang", { label: "Hằng Ni" })`: `true` ✅
    - Unnormalized `.toLowerCase().includes()`: `false` ❌ (MISSED)
  - **Query "thuy" vs Target "Thuỳ Trang 🌸"**:
    - `removeVietnameseTones("thuy")` => `"thuy"`
    - `removeVietnameseTones("Thuỳ Trang 🌸")` => `"thuy trang 🌸"`
    - Includes match: `true` ✅
    - `vietnameseSearchFilter("thuy", { label: "Thuỳ Trang 🌸" })`: `true` ✅
    - Unnormalized `.toLowerCase().includes()`: `false` ❌ (MISSED)

---

## 2. Logic Chain

1. **Step 1 (Tone Normalization Core)**: `removeVietnameseTones` strips NFD diacritics and converts `đ/Đ` to `d/D`, transforming `"Ngọc Điệp"` -> `"ngoc diep"`, `"Hằng Ni"` -> `"hang ni"`, and `"Thuỳ Trang 🌸"` -> `"thuy trang 🌸"`. `vietnameseSearchFilter` utilizes this function to compare option labels against input queries tone-insensitively.
2. **Step 2 (Select Component Scan)**: 100% of active client-side `<Select showSearch>` elements across all 11 CRM dashboard modules (`/dashboard/*`) and shared components use `filterOption={vietnameseSearchFilter}`.
3. **Step 3 (Custom Client Filter Gaps)**: Two client-side text filtering functions in `AppointmentsAuditDrawer.tsx` (line 97) and `referrals/page.tsx` (line 175) use raw `.toLowerCase().includes()` without `removeVietnameseTones`. As demonstrated empirically, searching "diep" in these two components fails to match "Ngọc Điệp".
4. **Step 4 (Build Verification)**: Running `pnpm --filter @mos-lab/web build` compiles Turbopack assets in 10.5s and completes TypeScript type checking in 6.2s with 0 errors and exit code 0.

---

## 3. Caveats

- **Server-Side Search Queries**: Asynchronous customer search (such as in `BookingWizardDrawer.tsx` line 677 using `apiClient.customers.list`) delegates string matching to MySQL. Backend SQL queries rely on MySQL table collation (`utf8mb4_unicode_ci` / `utf8mb4_general_ci`) for tone-insensitive `LIKE %query%` matching.
- **Review Scope Constraint**: Under role constraints, implementation code was not modified directly; findings are reported here for implementer resolution.

---

## 4. Conclusion

- **Build Quality**: PASSED. `pnpm --filter @mos-lab/web build` succeeds with zero TypeScript type errors.
- **Select Components (`showSearch`)**: PASSED (100% compliant). All `<Select showSearch>` in dashboard modules use `vietnameseSearchFilter`.
- **Search Test Cases**: PASSED for `@mos-lab/shared` utilities ("diep" matches "Ngọc Điệp", "hang" matches "Hằng Ni", "thuy" matches "Thuỳ Trang 🌸").
- **Actionable Gap Identified**:
  - `AppointmentsAuditDrawer.tsx` (line 97) and `referrals/page.tsx` (line 175) should be updated to wrap target text and query with `removeVietnameseTones(...)` to prevent unaccented queries from missing accented client/referrer names.

---

## 5. Verification Method

To re-verify build and tone normalization independently:

1. **Run Production Build**:

   ```bash
   pnpm --filter @mos-lab/web build
   ```

   _Expected Output_: `Exit code: 0`, `Finished TypeScript in X.Xs` with 0 type errors.

2. **Run Empirical Test Harness**:
   ```bash
   node /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/test_harness.js
   ```
   _Expected Output_: 3/3 utility tests PASS ✅; raw `.toLowerCase().includes()` MISSED ❌.
