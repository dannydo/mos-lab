# Independent Code Review Report: Vietnamese Search Refactoring

## 1. Observation

### Implementation Files Inspected

- `packages/shared/src/utils/search.ts` (lines 1-32):
  ```typescript
  export const removeVietnameseTones = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  };

  export const vietnameseSearchFilter = (
    input: string,
    option?: { label?: unknown; children?: unknown; value?: unknown } | Record<string, unknown> | null
  ): boolean => {
    if (!input) return true;
    const normalizedInput = removeVietnameseTones(input);
    if (!option) return false;

    const opt = option as Record<string, unknown>;
    const label =
      typeof opt.label === 'string' || typeof opt.label === 'number'
        ? String(opt.label)
        : typeof opt.children === 'string' || typeof opt.children === 'number'
          ? String(opt.children)
          : typeof opt.value === 'string' || typeof opt.value === 'number'
            ? String(opt.value)
            : '';

    return removeVietnameseTones(label).includes(normalizedInput);
  };
  ```
- `apps/web/lib/utils/search.ts` (lines 1-2):
  Re-exports `removeVietnameseTones` and `vietnameseSearchFilter` from `@mos-lab/shared`.
- `apps/web/lib/utils/search.test.ts` (lines 1-43): Unit test suite covering diacritic stripping, null/undefined/number safety, empty string handling, and Ant Design option matching.

### Route Audit

1. **/dashboard/today**:
   - `BookerTeamConfigModal.tsx` (line 246): `<Select showSearch filterOption={vietnameseSearchFilter} options={selectableStaffOptions} />`
   - `TodayBookingsTable.tsx` (line 347): `<Select showSearch filterOption={vietnameseSearchFilter} options={groupedBookerOptions} />`
   - `TodayCalendarSummary.tsx` (line 261): `<Select showSearch filterOption={vietnameseSearchFilter} options={groupedBookerOptions} />`
2. **/dashboard/customers**:
   - `CustomerFilters.tsx` (line 508): `<Select showSearch filterOption={vietnameseSearchFilter} ... />`
   - `RevokeAssignmentModal.tsx` (line 164): `<Select showSearch filterOption={vietnameseSearchFilter}>` with `<Select.Option>` children.
3. **/dashboard/bk**:
   - `BkBookingTab.tsx` (line 130), `BkConfigDrawer.tsx` (line 91), `BkDoneTab.tsx` (line 139), `BkRevenueTab.tsx` (line 124), `BkTipTab.tsx` (line 127): Custom array filtering using `const q = removeVietnameseTones(searchText)` applied against client name, order key, client phone, booker name, service name, and store.
4. **/dashboard/cc**:
   - `CcConfigDrawer.tsx` (line 48), `CcDiamondDetailModal.tsx` (line 91), `CcDiamondTab.tsx` (line 76), `CcThuNhapTab.tsx` (line 232), `CcThuongTab.tsx` (line 312), `CcTipTab.tsx` (line 176), `CcXoayTab.tsx` (line 25): Custom array filters using `removeVietnameseTones`.
   - `page.tsx` (line 356): `<Select showSearch filterOption={vietnameseSearchFilter} ... />` for consultant filter.
5. **/dashboard/cv**:
   - `CvConfigDrawer.tsx` (line 52), `CvThuNhapTab.tsx` (line 405), `CvTipTab.tsx` (line 149), `CvXoayTab.tsx` (line 172): Custom array filters using `removeVietnameseTones`.
   - `page.tsx` (line 232): `<Select showSearch filterOption={vietnameseSearchFilter} ... />` for consultant filter.
6. **/dashboard/catalog**:
   - `page.tsx` (line 1750): `<Select showSearch filterOption={vietnameseSearchFilter} options={...} />` for service selection in Combo Package Modal.

### Build Executions

- `pnpm --filter @mos-lab/shared build`: Succeeded (exit code 0). `tsc` compiled cleanly.
- `pnpm --filter @mos-lab/web build`: Succeeded (exit code 0). `next build` compiled cleanly, TypeScript passed in 6.0s, and all 21 static pages generated successfully.

---

## 2. Logic Chain

1. **Correctness & Accent Handling**:
   - Vietnamese diacritics (grave, acute, hook, tilde, dot below, circumflex, breve, horn) decompose in Unicode NFD. The regex `[\u0300-\u036f]` strips combining diacritical marks. `đ` (U+0111) and `Đ` (U+0110) do not decompose in NFD, so explicit `.replace(/đ/g, 'd').replace(/Đ/g, 'D')` correctly handles d-with-stroke.
   - Empirical Node.js execution verified that `ơ -> o`, `ư -> u`, `Ơ -> o`, `Ư -> u`, `đ -> d`, `Đ -> d`, `Ngọc Điệp -> ngoc diep`, `Thuỳ Trang 🌸 -> thuy trang 🌸`.

2. **Null/Undefined/Number Edge Cases**:
   - `removeVietnameseTones` checks `str === null || str === undefined` first, returning `''`.
   - `String(str)` converts numbers (e.g. `12345` -> `'12345'`).
   - `vietnameseSearchFilter` checks `if (!input) return true`, enabling dropdown controls to render all options when the search input is cleared.
   - `vietnameseSearchFilter` checks `if (!option) return false`, preventing runtime crash when option is missing.

3. **Type Safety & Option Structure**:
   - `vietnameseSearchFilter` uses type checks (`typeof opt.label === 'string' || typeof opt.label === 'number'`, etc.) to safely extract text content from `{ label }`, `{ children }`, or `{ value }`.
   - Re-exports in `apps/web/lib/utils/search.ts` maintain 100% type compatibility with `@mos-lab/shared`.

4. **Integrity & Build Verification**:
   - All build steps were executed independently and confirmed to succeed with 0 exit code.
   - No hardcoded mocks, shortcuts, or integrity violations were detected.

---

## 3. Review Verdict & Findings

**Verdict**: **APPROVE**

### Verified Claims

- `removeVietnameseTones` handles Vietnamese tones, diacritics, `đ/Đ`, `null`, `undefined`, and `number` -> **PASS** (verified via standalone Node execution & unit test suite).
- `vietnameseSearchFilter` works with AntD `<Select showSearch>` option shapes (`label`, `children`, `value`) -> **PASS**.
- All requested dashboard routes (`/today`, `/customers`, `/bk`, `/cc`, `/cv`, `/catalog`) utilize the refactored search utilities -> **PASS**.
- `pnpm --filter @mos-lab/shared build` compiles without errors -> **PASS**.
- `pnpm --filter @mos-lab/web build` compiles without errors -> **PASS**.

### Minor Findings & Observations

1. **Minor (Optimization)**: `removeVietnameseTones` instantiates inline regex literals (`/[\u0300-\u036f]/g`, `/đ/g`, `/Đ/g`) on every function call. While JS engine optimizations mitigate this, compiling top-level static regex constants (`const DIACRITICS_REGEX = /[\u0300-\u036f]/g`, etc.) would eliminate redundant allocations during large-array filtering.
2. **Minor (Clean Code)**: In `apps/web/app/dashboard/today/components/TodayCalendarSummary.tsx`, `removeVietnameseTones` is imported on line 21 but not directly invoked (only `vietnameseSearchFilter` is used).

---

## 4. Adversarial Stress-Test Results (Critic Role)

| Stress-Test Scenario                                               | Expected Outcome                                                                                           | Actual Outcome     | Status |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| `removeVietnameseTones(null)`                                      | `""`                                                                                                       | `""`               | Pass   |
| `removeVietnameseTones(undefined)`                                 | `""`                                                                                                       | `""`               | Pass   |
| `removeVietnameseTones(0)`                                         | `"0"`                                                                                                      | `"0"`              | Pass   |
| `removeVietnameseTones('Thuỳ Trang 🌸')`                           | `"thuy trang 🌸"`                                                                                          | `"thuy trang 🌸"`  | Pass   |
| `vietnameseSearchFilter('ngoc', { label: 'Ngọc Điệp', value: 1 })` | `true`                                                                                                     | `true`             | Pass   |
| `vietnameseSearchFilter('diep', { label: 'Ngọc Điệp', value: 1 })` | `true`                                                                                                     | `true`             | Pass   |
| `vietnameseSearchFilter('', { label: 'Anything' })`                | `true`                                                                                                     | `true`             | Pass   |
| `vietnameseSearchFilter('xyz', { label: 'Ngọc Điệp' })`            | `false`                                                                                                    | `false`            | Pass   |
| `vietnameseSearchFilter('khai', null)`                             | `false`                                                                                                    | `false`            | Pass   |
| High-volume array filter performance (1,000+ items)                | Single-pass search query normalization (`const q = removeVietnameseTones(searchText)`) outside filter loop | Executed in ~0.5ms | Pass   |

---

## 5. Caveats

- **No caveats**: All tasks, edge cases, route usages, and build commands were independently executed and verified without assumption.

---

## 6. Conclusion

The Vietnamese search refactoring across `@mos-lab/shared`, `apps/web/lib/utils/search.ts`, and all dashboard routes (`/today`, `/customers`, `/bk`, `/cc`, `/cv`, `/catalog`) is correct, type-safe, resilient against null/undefined/numbers, and fully buildable. The work is approved.

---

## 7. Independent Verification Method

To verify this report independently:

1. Run `@mos-lab/shared` build:
   `pnpm --filter @mos-lab/shared build`
2. Run `@mos-lab/web` build:
   `pnpm --filter @mos-lab/web build`
3. Run search unit test suite:
   `pnpm --filter @mos-lab/web test` (or execute node against `packages/shared/dist/utils/search.js`).
