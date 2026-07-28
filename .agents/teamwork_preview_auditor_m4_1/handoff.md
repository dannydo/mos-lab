# Forensic Audit Handoff Report

## Forensic Audit Report

**Work Product**: Vietnamese tone-insensitive search refactoring across `packages/shared/src/utils/search.ts`, `apps/web/lib/utils/search.ts`, and 11 CRM dashboard modules
**Profile**: General Project
**Verdict**: CLEAN

---

## 1. Observation

### Implementation Files Inspected

- `packages/shared/src/utils/search.ts` (Lines 1–42):

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

  function extractText(node: unknown): string {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (typeof node === 'object' && node !== null) {
      const obj = node as { props?: { children?: unknown } };
      if (obj.props && obj.props.children !== undefined) {
        return extractText(obj.props.children);
      }
    }
    return '';
  }

  export const vietnameseSearchFilter = (
    input: string,
    option?: { label?: unknown; children?: unknown; value?: unknown } | Record<string, unknown> | null
  ): boolean => {
    if (!input) return true;
    const normalizedInput = removeVietnameseTones(input);
    if (!normalizedInput) return true;
    if (!option) return false;

    const opt = option as Record<string, unknown>;
    const labelText = extractText(opt.label);
    const childrenText = extractText(opt.children);
    const valueText = extractText(opt.value);

    const combinedText = `${labelText} ${childrenText} ${valueText}`;
    return removeVietnameseTones(combinedText).includes(normalizedInput);
  };
  ```

- `apps/web/lib/utils/search.ts` (Lines 1–2):

  ```typescript
  export { removeVietnameseTones, vietnameseSearchFilter } from '@mos-lab/shared';
  ```

- `packages/shared/src/index.ts` (Line 16):
  ```typescript
  export * from './utils/search';
  ```

### Unit Test Execution

Command executed: `pnpm --filter @mos-lab/web test:run`
Result:

```
 ✓ lib/utils/search.test.ts (5 tests) 2ms
 Test Files  3 passed (3)
      Tests  21 passed (21)
```

### Module Integration Observations across 11 CRM Dashboard Modules

1. **`/today`**:
   - `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` (L10, L246): `filterOption={vietnameseSearchFilter}` on HR staff `<Select>`.
   - `apps/web/app/dashboard/today/components/TodayBookingsTable.tsx` (L11, L347): `filterOption={vietnameseSearchFilter}` on Booker filter `<Select>`.
   - `apps/web/app/dashboard/today/components/TodayCalendarSummary.tsx` (L21, L261): `filterOption={vietnameseSearchFilter}` on Team & Booker filter `<Select>`.

2. **`/customers`**:
   - `apps/web/app/dashboard/customers/components/CustomerFilters.tsx` (L16, L508): `filterOption={vietnameseSearchFilter}` on staff assignment `<Select>`.
   - `apps/web/app/dashboard/customers/components/RevokeAssignmentModal.tsx` (L7, L164): `filterOption={vietnameseSearchFilter}` on booker selection `<Select>`.
   - `apps/web/app/dashboard/customers/components/AssignmentHistoryDrawer.tsx` (L19, L82–87): Uses `removeVietnameseTones` for searching staff names, performers, formula summary, and reason text.

3. **`/bk`**:
   - `apps/web/app/dashboard/bk/components/BkBookingTab.tsx` (L21, L130–136): Applies `removeVietnameseTones` to `clientName`, `orderKey`, `clientPhone`, and `bookerName`.
   - `apps/web/app/dashboard/bk/components/BkConfigDrawer.tsx` (L6, L91–96): Applies `removeVietnameseTones` to `displayName`, `username`, and `store`.
   - `apps/web/app/dashboard/bk/components/BkDoneTab.tsx` (L18, L139–146): Applies `removeVietnameseTones` to `clientName`, `orderKey`, `clientPhone`, `bookerName`, and `serviceName`.
   - `apps/web/app/dashboard/bk/components/BkRevenueTab.tsx` (L17, L124–129): Applies `removeVietnameseTones` to `clientName`, `orderKey`, and `store`.
   - `apps/web/app/dashboard/bk/components/BkTipTab.tsx` (L17, L127–132): Applies `removeVietnameseTones` to `clientName`, `bookerName`, and `store`.

4. **`/cc`**:
   - `apps/web/app/dashboard/cc/page.tsx` (L24, L356): `filterOption={vietnameseSearchFilter}` on consultant filter `<Select>`.
   - `apps/web/app/dashboard/cc/components/CcConfigDrawer.tsx` (L7, L48–52): `removeVietnameseTones` on `displayName` and `username`.
   - `apps/web/app/dashboard/cc/components/CcDiamondDetailModal.tsx` (L17, L91–96): `removeVietnameseTones` on referrer and new customer details.
   - `apps/web/app/dashboard/cc/components/CcDiamondTab.tsx` (L17, L76–83): `removeVietnameseTones` on `tenCc`.
   - `apps/web/app/dashboard/cc/components/CcThuNhapTab.tsx` (L36, L232–236): `removeVietnameseTones` on `displayName` and `store`.
   - `apps/web/app/dashboard/cc/components/CcThuongTab.tsx` (L37, L312–317): `removeVietnameseTones` on `consultant_name` and `store_code`.
   - `apps/web/app/dashboard/cc/components/CcTipTab.tsx` (L33, L176–182): `removeVietnameseTones` on `clientName`, `serviceName`, `ccInName`, `ccOutName`, `consultantName`.
   - `apps/web/app/dashboard/cc/components/CcXoayTab.tsx` (L6, L25–31): `removeVietnameseTones` on `clientName`, `serviceName`, `consultantName`, `store`.

5. **`/cv`**:
   - `apps/web/app/dashboard/cv/page.tsx` (L18, L232): `filterOption={vietnameseSearchFilter}` on technician selection `<Select>`.
   - `apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx` (L7, L52–54): `removeVietnameseTones` on `displayName` and `username`.
   - `apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx` (L41, L405–407): `removeVietnameseTones` on `staffName` and `store`.
   - `apps/web/app/dashboard/cv/components/CvTipTab.tsx` (L33, L149–154): `removeVietnameseTones` on `techName`, `clientName`, and `serviceName`.
   - `apps/web/app/dashboard/cv/components/CvXoayTab.tsx` (L18, L172–178): `removeVietnameseTones` on `techName`, `clientName`, `serviceName`, and `store`.

6. **`/catalog`**:
   - `apps/web/app/dashboard/catalog/page.tsx` (L68, L1750): `filterOption={vietnameseSearchFilter}` on applicable service selection `<Select>`.

7. **`/appointments`**:
   - `apps/web/app/dashboard/appointments/page.tsx` (L42, L317): `filterOption={vietnameseSearchFilter}` on Booker selection `<Select>`.

8. **`/loca`**:
   - `apps/web/app/dashboard/loca/page.tsx` (L64, L317): `filterOption={vietnameseSearchFilter}` on Booker/Telesales selection `<Select>`.

9. **`/nyc`**:
   - `apps/web/app/dashboard/nyc/page.tsx` (L55, L288): `filterOption={vietnameseSearchFilter}` on Booker/Telesales selection `<Select>`.

10. **`/omicall`**:
    - `apps/web/app/dashboard/omicall/page.tsx` (L38, L627): `filterOption={vietnameseSearchFilter}` on staff filter `<Select>`.

11. **`/staff`**:
    - `apps/web/app/dashboard/staff/page.tsx` (L56, L1174): `filterOption={vietnameseSearchFilter}` on manager/reports-to `<Select>`.
    - `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx` (L20, L212): `filterOption={vietnameseSearchFilter}` on role/staff select dropdowns.

### Build Executions

- `pnpm --filter @mos-lab/shared build`: Succeeded (`tsc` completed with 0 errors).
- `pnpm --filter @mos-lab/web build`: Succeeded (`next build` compiled successfully in 10.0s, TypeScript check passed in 5.8s, static pages generated).

---

## 2. Logic Chain

1. **Check 1 (No hardcoded outputs)**: `removeVietnameseTones` and `vietnameseSearchFilter` use standard Unicode NFD normalization (`.normalize('NFD')`), diacritic stripping regex (`/[\u0300-\u036f]/g`), mapping for `đ`/`Đ` to `d`/`D`, case lowercasing, and string inclusion logic without any hardcoded input-output match maps or fake branches.
2. **Check 2 (No facade implementations)**: `vietnameseSearchFilter` dynamically extracts node labels, children, or values recursively (`extractText`) and evaluates normalized string containment.
3. **Check 3 (No pre-populated result artifacts)**: No pre-built logs or fabricated attestation outputs predating the audit were used to bypass tests.
4. **Check 4 (Utility functionality)**: Vitest unit tests in `apps/web/lib/utils/search.test.ts` pass 100% (5/5 tests), verifying correct diacritic removal for names such as "Nguyễn Quang Khải" -> "nguyen quang khai" and "Đội Telesales" -> "doi telesales".
5. **Check 5 (Module Integration)**: All 11 CRM dashboard modules (`/today`, `/customers`, `/bk`, `/cc`, `/cv`, `/catalog`, `/appointments`, `/loca`, `/nyc`, `/omicall`, `/staff`) import and invoke `removeVietnameseTones` or `vietnameseSearchFilter` directly without bypassing search filtering logic.
6. **Check 6 (Clean Build)**: Both `@mos-lab/shared` and `@mos-lab/web` build cleanly without TypeScript or compilation errors.

---

## 3. Caveats

No caveats. All checks were verified empirically by direct source inspection, vitest test execution, and full workspace build execution.

---

## 4. Conclusion

The Vietnamese tone-insensitive search refactoring across `packages/shared/src/utils/search.ts`, `apps/web/lib/utils/search.ts`, and all 11 CRM dashboard modules is **CLEAN** with zero integrity violations.

---

## 5. Verification Method

To independently verify this audit:

1. Run unit test suite:
   `pnpm --filter @mos-lab/web test:run`
2. Build shared package:
   `pnpm --filter @mos-lab/shared build`
3. Build web application:
   `pnpm --filter @mos-lab/web build`
4. Inspect search utility source files:
   - `packages/shared/src/utils/search.ts`
   - `apps/web/lib/utils/search.ts`
