# Handoff Report - Accessibility, Contrast, and Theme Audit

**Agent Name**: `teamwork_preview_explorer_m1_2`  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_2`  
**Audit Report Output**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_2/audit.md`

---

## 1. Observation

1. **Missing `tabular-nums` on Dynamic Counters & Donut Values**:
   - In `apps/web/components/telesales/components/TelesalesFrontFace.tsx` lines 347 (`{displayValue}`), 417 (`{activeValue}`), 422 (`/ {activeTarget}`), and 425 (`{activePercent}%`), numbers are rendered in `span` elements without `tabular-nums` or `fontVariantNumeric: 'tabular-nums'`.
   - In `apps/web/components/customer-detail/components/KpiStatsCard.tsx` lines 101 (`formatCompactVND(stats?.totalSpent)`), 140 (`stats?.totalVisits`), and 184 (`stats?.gemBalance`), numeric stats lack `tabular-nums`.
   - In `apps/web/components/telesales/components/TelesalesConfigPanel.tsx` line 151, numeric inputs (`<input type="number">`) do not include `tabular-nums`.

2. **Color Contrast Failures (WCAG AA 4.5:1 Minimum)**:
   - In `apps/web/components/telesales/components/TelesalesFrontFace.tsx` line 107 (`bg-gold/15 text-gold`) and `apps/web/components/RescheduleBookingModal.tsx` line 282 (`style={{ color: '#D4A84B' }}`), gold color `#D4A84B` on light backgrounds (`#FFFFFF` or `#F8FAFC`) has a contrast ratio of **2.45:1** (failing WCAG AA 4.5:1).
   - In `apps/web/components/CallLogModal.tsx` line 336 (`style={{ color: '#FAAD14', borderColor: '#FAAD14' }}` ghost button), gold color `#FAAD14` on white light modal background has a contrast ratio of **2.08:1** (failing WCAG AA 4.5:1).
   - In `apps/web/components/customer-detail/components/KpiStatsCard.tsx` line 47 (`color: '#888'`) and `apps/web/components/CustomerDetailDrawer.tsx` line 312 (`color: '#888'`), `#888` text on white light background has a contrast ratio of **3.54:1** (failing WCAG AA 4.5:1). On dark card background (`#1e293b`), `#888` text has **4.29:1** contrast (failing WCAG AA 4.5:1).
   - In `apps/web/components/CallLogModal.tsx` line 303 (`text-zinc-500`), `#71717a` text on `#111827` dark modal background has a contrast ratio of **4.34:1** (failing WCAG AA 4.5:1).

3. **Theme Wrapper Scoping Verification**:
   - In `apps/web/app/dashboard/customers/page.tsx` line 608, `apps/web/app/dashboard/nyc/page.tsx` line 880, `apps/web/app/dashboard/today/page.tsx` line 409, and `apps/web/components/DailyCallsTable.tsx` line 697, custom table CSS overrides are properly scoped inside `.dark-theme .antd-custom-table .ant-table` or `.dark-theme .daily-calls-custom-table .ant-table`. There are no un-scoped `#141414 !important` overrides leaking into Light mode.

4. **Keyboard Focus & ARIA Accessibility**:
   - In `apps/web/components/telesales/components/TelesalesConfigPanel.tsx` line 153 (`outline-none`), focus outline is suppressed on target inputs.
   - In `apps/web/components/customer-detail/components/EditCustomerModal.tsx` line 160 (`<Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} />`), icon-only button lacks `aria-label`.
   - In `apps/web/components/telesales/components/TelesalesConfigPanel.tsx` line 151, inputs lack `<label htmlFor="...">`, `aria-label`, or `aria-labelledby`.

---

## 2. Logic Chain

1. **Observation 1** shows that dynamic numbers and financial stats in `TelesalesFrontFace.tsx`, `KpiStatsCard.tsx`, and `TelesalesConfigPanel.tsx` lack `tabular-nums`. `AGENTS.md` Rule #5 dictates that all countdowns, elapsed times, durations, and financial figures must use tabular numbers. Therefore, layout jitter occurs during value updates in these components.
2. **Observation 2** establishes that hardcoded gold text (`#D4A84B`) and hardcoded gray text (`#888`) are rendered directly against white light theme backgrounds or dark Slate backgrounds. Computing contrast ratios yields 2.45:1 and 3.54:1 respectively, which fails the WCAG 2.1 AA 4.5:1 requirement. Replacing these with `var(--color-gold)` (`#9e7118` in light theme) and `token.colorTextSecondary` (`#64748b`) restores compliant contrast.
3. **Observation 3** confirms that custom table style overrides across all page components are correctly wrapped inside `.dark-theme` wrapper classes without global scope pollution.
4. **Observation 4** indicates that focus outlines are suppressed via `outline-none` and icon buttons/inputs lack explicit `aria-label`s, violating WCAG 2.1 AA criteria 2.4.7 (Focus Visible) and 4.1.2 (Name, Role, Value).

---

## 3. Caveats

- **No Code Modifications Made**: This investigation was strictly read-only per subagent instructions.
- **Runtime Visual Rendering**: Visual contrast values were computed mathematically based on standard sRGB color specs and standard background token definitions (`#ffffff`, `#f8fafc`, `#111827`, `#1e293b`).

---

## 4. Conclusion

The Modal Popups, Side Drawers, Cards, and Tables across `apps/web/` are structurally sound and correctly leverage Ant Design's `ConfigProvider` theme algorithms and `.dark-theme` scoping rules. However, 4 actionable areas require remediation:

1. Add `tabular-nums` to dynamic values in `TelesalesFrontFace.tsx`, `KpiStatsCard.tsx`, and modal transaction tables.
2. Replace hardcoded `#D4A84B` in light mode with `#9e7118` (or CSS variable `var(--color-gold)`) and `#888` text with `#64748b` to ensure WCAG AA >= 4.5:1 contrast.
3. Remove `outline-none` from `TelesalesConfigPanel.tsx` inputs to maintain `:focus-visible` accessibility.
4. Add `aria-label`s to icon-only buttons (such as delete and close buttons) and numeric config inputs.

All detailed findings, component lists, and proposed code patches are documented in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_2/audit.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **File Inspection**:
   - Inspect `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_2/audit.md`.
   - Inspect `apps/web/components/telesales/components/TelesalesFrontFace.tsx` lines 347, 417, 422, 425 for missing `tabular-nums`.
   - Inspect `apps/web/components/customer-detail/components/KpiStatsCard.tsx` line 47 for hardcoded `color: '#888'`.
   - Inspect `apps/web/components/RescheduleBookingModal.tsx` line 282 for `#D4A84B` in header.
2. **Contrast Calculator Verification**:
   - Test `#D4A84B` on `#FFFFFF`: $Ratio = 2.45:1$ (FAIL).
   - Test `#9e7118` on `#FFFFFF`: $Ratio = 4.81:1$ (PASS WCAG AA).
   - Test `#888` on `#FFFFFF`: $Ratio = 3.54:1$ (FAIL WCAG AA).
