# Handoff Report — Adversarial Verification: Tabular Numbers & Keyboard Focus / ARIA Accessibility

**Challenger**: `teamwork_preview_challenger_m3_2`  
**Milestone**: Milestone 3.2 Challenger Verification  
**Scope**: `apps/web/`  
**Verdict**: **FAIL**  
**Date**: 2026-07-27

---

## 1. Observation

Direct empirical observations across `apps/web/`:

### A. Tabular Numbers (`tabular-nums`) Deficiencies

1. **`LocaColumns.tsx:195`**: Total Spent column renderer `render: (val: number) => formatVND(val)` returns a raw string without `<span className="tabular-nums">` or `fontVariantNumeric: 'tabular-nums'`.
2. **`NycColumns.tsx:182`**: Total Spent column renderer `render: (val: number) => formatVND(val)` returns a raw string without `tabular-nums` wrapping.
3. **`DailyCallsTable.tsx:312`**: Lifetime Value column renderer `render: (spent: number) => formatVND(spent)` returns a raw string without `tabular-nums` wrapping.
4. **`AppointmentColumns.tsx:362`**: Main service price text `Giá: {formatVND(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%` lacks `fontVariantNumeric: 'tabular-nums'`.
5. **`AppointmentColumns.tsx:386, 388`**: Promotion discount percentage `Giảm {pct}%` and discount amount `Giảm {formatVND(amt)}` in the promotion column renderer lack `fontVariantNumeric: 'tabular-nums'`.

### B. Keyboard Focus & ARIA Accessibility Gaps on Custom Triggers and Icon Buttons

1. **Interactive `<span>` / `<div>` / `<Space>` triggers lacking `role="button"`, `tabIndex={0}`, or `onKeyDown` keyboard listeners**:
   - `BkDoneTab.tsx:216-224`: Missed count `<span className="tabular-nums font-semibold ... cursor-pointer" onClick={(e) => handleSelectBookerMissed(...)}>` lacks `role="button"`, `tabIndex={0}`, `aria-label`, and `onKeyDown`.
   - `BkDoneTab.tsx:298-305`: Client detail `<div className="cursor-pointer group ... " onClick={(e) => setSelectedCustomerId(...)}>` lacks `role="button"`, `tabIndex={0}`, `aria-label`, and `onKeyDown`.
   - `BkBookingTab.tsx:161-168`: Booker selector `<Space className="cursor-pointer group ..." onClick={(e) => handleSelectBooker(...)}>` lacks `role="button"`, `tabIndex={0}`, `aria-label`, and `onKeyDown`.
   - `BkBookingTab.tsx:280-290`: Customer trigger `<div className="cursor-pointer group ..." role="button" tabIndex={0} onClick=...>` has `role="button"` and `tabIndex={0}` but lacks an `onKeyDown` (Enter/Space) keyboard handler.
   - `CcThuNhapTab.tsx:320, 349, 374`: Detail modal triggers `<Space className="group cursor-pointer" onClick=...>` and `<div className="cursor-pointer ..." onClick=...>` lack `role="button"`, `tabIndex={0}`, `aria-label`, and `onKeyDown`.
   - `LocaColumns.tsx:83, 374`: Detail link triggers `<span className="hover:underline cursor-pointer ..." onClick=...>` lack `role="button"`, `tabIndex={0}`, `aria-label`, and `onKeyDown`.
2. **Icon-only `<Button>` components lacking `aria-label` / `title`**:
   - `AppointmentColumns.tsx:268`: `<Button type="text" shape="circle" danger icon={<CloseCircleOutlined />} />` lacks `aria-label` or `title`.
   - `appointments/page.tsx:319, 335`: Date navigation `<Button icon={<LeftOutlined />} onClick=... />` and `<Button icon={<RightOutlined />} onClick=... />` lack `aria-label` or `title`.
   - `bk/page.tsx:219, 223`: Date navigation `<Button icon={<LeftOutlined />} onClick=... />` and `<Button icon={<RightOutlined />} onClick=... />` lack `aria-label` or `title`.
   - `BkBookingTab.tsx:506`, `BkDoneTab.tsx:574`, `BkRevenueTab.tsx:405`, `BkTipTab.tsx:385`: Reload buttons `<Button icon={<ReloadOutlined />} size="small" onClick=... />` lack `aria-label` or `title`.
   - `catalog/page.tsx:988`: Delete action `<Button type="text" danger icon={<DeleteOutlined />} />` lacks `aria-label` or `title`.

### C. Focus Suppression (`outline-none`) Check

- Verified via `grep_search`: No `outline-none`, `outline: none`, or `outline: 0` rules exist in source `.tsx` or `.css` files under `apps/web/app` or `apps/web/components`. (Only pre-existing static mockup HTML and 3rd-party vendor JS in `public/` contained `outline-none`).

### D. Build & Compilation Verification

- Ran `pnpm lint && pnpm --filter @mos-lab/web build`:
  - `pnpm lint`: 0 errors across monorepo packages.
  - `pnpm --filter @mos-lab/web build`: Next.js Turbopack compilation succeeded with 0 errors (TypeScript check passed in 5.9s, static page generation 21/21 completed).

---

## 2. Logic Chain

1. **Criterion 1 (Tabular Numbers)**: Financial figures, currency formats, discount percentages, and durations must use `tabular-nums` to prevent horizontal layout jitter during dynamic updates. While worker `teamwork_preview_worker_m2_1` added `tabular-nums` in several core components, table renderer functions in `LocaColumns.tsx:195`, `NycColumns.tsx:182`, `DailyCallsTable.tsx:312`, and `AppointmentColumns.tsx:362, 386, 388` return un-wrapped currency and discount strings without `tabular-nums`.
2. **Criterion 2 (Focus Suppression)**: The codebase was confirmed clean of `outline-none` focus suppression in source components.
3. **Criterion 3 (Keyboard Focus & ARIA Accessibility)**: Non-native interactive elements (`<div>`, `<span>`, `<Space>`) with `onClick` handlers must have `role="button"`, `tabIndex={0}`, an accessible `aria-label`, and `onKeyDown` listeners (Enter/Space) so keyboard-only users can focus and activate them. Furthermore, icon-only `<Button>` controls must provide `aria-label` or `title` for screen reader accessibility. Multiple instances across `BkDoneTab.tsx`, `BkBookingTab.tsx`, `CcThuNhapTab.tsx`, `LocaColumns.tsx`, `AppointmentColumns.tsx`, `appointments/page.tsx`, and `catalog/page.tsx` fail these criteria.
4. **Criterion 4 (Build Verification)**: `pnpm lint && pnpm --filter @mos-lab/web build` compiles cleanly with 0 TypeScript/ESLint errors.

---

## 3. Caveats

- Minified third-party scripts (e.g. `public/core.min.js`, `public/ui.min.js`) and static HTML mockups (`public/mockup-omicall-flow.html`) contain legacy vendor inline styles (`outline:0`) which do not affect the main Next.js web app bundle.

---

## 4. Conclusion

- **Verdict**: **FAIL**
- **Reason**: Although build compilation is clean and focus outline suppression is resolved, multiple financial/numeric table columns lack `tabular-nums` wrapping, and interactive custom triggers/icon-only buttons lack requisite ARIA attributes (`aria-label`), keyboard focusability (`tabIndex={0}`), and keyboard event handlers (`onKeyDown`).

---

## 5. Verification Method

Independent commands and inspection steps to reproduce findings:

1. **Build & Lint Verification**:

   ```bash
   pnpm lint && pnpm --filter @mos-lab/web build
   ```

   _Result_: Clean compilation (0 errors).

2. **Tabular Numbers Inspection**:
   - Inspect `apps/web/app/dashboard/loca/components/LocaColumns.tsx:195`
   - Inspect `apps/web/app/dashboard/nyc/components/NycColumns.tsx:182`
   - Inspect `apps/web/components/DailyCallsTable.tsx:312`
   - Inspect `apps/web/app/dashboard/appointments/components/AppointmentColumns.tsx:362, 386, 388`

3. **Keyboard & ARIA Inspection**:
   - Inspect `apps/web/app/dashboard/bk/components/BkDoneTab.tsx:216-224, 298-305`
   - Inspect `apps/web/app/dashboard/bk/components/BkBookingTab.tsx:161-168, 280-290`
   - Inspect `apps/web/app/dashboard/cc/components/CcThuNhapTab.tsx:320, 349, 374`
   - Inspect `apps/web/app/dashboard/appointments/components/AppointmentColumns.tsx:268`
   - Inspect `apps/web/app/dashboard/appointments/page.tsx:319, 335`
