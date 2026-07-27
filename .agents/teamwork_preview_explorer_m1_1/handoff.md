# Handoff Report — Accessibility, Contrast & Theme Audit

**Subagent**: `teamwork_preview_explorer_m1_1`  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1`  
**Audit Report**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/audit.md`

---

## 1. Observation

Direct observations from codebase inspection across `apps/web/`:

1. **`ThemeContext.tsx:77`**:
   `colorTextDescription: isDark ? '#64748b' : '#94a3b8'`
   - In Light mode (`isDark === false`), `colorTextDescription` is assigned `#94a3b8` (Slate-400).
   - `#94a3b8` rendered on `#ffffff` white background has a calculated contrast ratio of **2.76:1** (WCAG AA requires >= 4.5:1 for body/description text).

2. **Un-prefixed Slate Classes in Light Theme**:
   - `CcXoayTab.tsx:56`: `<span className="font-semibold text-slate-200">{val}</span>` -> `#e2e8f0` on `#ffffff` = **1.16:1** contrast.
   - `CcXoayTab.tsx:107`: `<span className="tabular-nums font-semibold text-xs text-slate-300">{val}</span>` -> `#cbd5e1` on `#ffffff` = **1.45:1** contrast.
   - `BkRevenueTab.tsx:252`: `<span className="font-semibold text-xs text-slate-200 whitespace-nowrap">{name || 'Khách hàng'}</span>` -> **1.16:1** contrast.
   - `CatalogComboLiveTab.tsx:168`: `<span className="font-semibold text-slate-200 dark:text-slate-100 ...">` -> **1.16:1** contrast.
   - `CvThuNhapTab.tsx:466`: `<span className="font-semibold text-xs text-slate-200 whitespace-nowrap">` -> **1.16:1** contrast.

3. **Hardcoded Inline Colors & Overrides**:
   - `CustomerTable.tsx:217`: `<Text style={{ color: '#888' }}>Chưa từng đến</Text>` -> `#888` on `#ffffff` = **3.5:1** contrast.
   - `AssignmentHistoryDrawer.tsx:230`: `color: '#ccc'` -> `#ccc` on `#f5f7fa` = **1.6:1** contrast.
   - `customers/page.tsx:608-609` & `nyc/page.tsx:880-881`: `.dark-theme .ant-table { background: #141414 !important; color: #ccc !important; }`.
   - `layout.tsx:441`, `MissedSummaryCards.tsx:35`, `CustomerFilters.tsx:253`: `background: themeMode === 'dark' ? '#141414' : ...` (Hardcodes `#141414`).

4. **Missing `tabular-nums` on Financial Amounts & Salary Summaries**:
   - `CustomerTable.tsx:224`: `render: (spent: number) => formatVND(spent)` (No `tabular-nums` class).
   - `AppointmentColumns.tsx:125, 400, 408, 417`: `formatVND(price)` without `tabular-nums`.
   - `appointments/page.tsx:753, 783, 819, 859, 897, 900, 935, 964`: `{formatVND(summary.baseSalary)}`, `{formatVND(summary.totalTips)}`, `{formatVND(summary.totalSalary)}` rendered in stat cards without `tabular-nums`.

5. **Keyboard Focus & Interactive Triggers**:
   - `globals.css:51-54` defines global `:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }`.
   - Custom clickable elements (`<Space onClick={() => ...}>` in `CatalogLeaderboardCard.tsx:82` and `BkBookingTab.tsx:146`) lack `tabIndex={0}` and keyboard event listeners (`onKeyDown`).

---

## 2. Logic Chain

1. **Premise 1**: WCAG AA mandates a minimum contrast ratio of 4.5:1 for normal body and description text on web interfaces.
2. **Step 1**: In `ThemeContext.tsx:77`, `colorTextDescription` is set to `#94a3b8` in Light mode. Since `token.colorTextDescription` is injected into all Ant Design components (tables, statistics, cards, drawers), all subtext and table description cells in Light mode automatically inherit a 2.76:1 contrast ratio, failing WCAG AA across all pages.
3. **Step 2**: In Tailwind CSS, utility classes without the `dark:` prefix apply to BOTH light and dark themes. In `CcXoayTab.tsx`, `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `CatalogComboLiveTab.tsx`, and `CvThuNhapTab.tsx`, developers specified `text-slate-200` (#e2e8f0) and `text-slate-300` (#cbd5e1) directly. When Light Theme is active, light grey text is rendered against white backgrounds (#ffffff), causing 1.16:1 and 1.45:1 contrast ratios which are visually unreadable.
4. **Step 3**: Project rules (`AGENTS.md` & `.agents/AGENTS.md`) require all financial amounts, clocks, counters, and durations to use `tabular-nums` (`font-variant-numeric: tabular-nums` or Tailwind `tabular-nums`) to prevent layout jittering during state updates. Multiple summary cards in `appointments/page.tsx` and table cells in `CustomerTable.tsx` & `AppointmentColumns.tsx` lack `tabular-nums`.
5. **Step 4**: Project rules forbid hardcoding dark background hexes like `background: #141414 !important` globally. `customers/page.tsx` and `nyc/page.tsx` violate theme encapsulation by hardcoding global `.ant-table` rules.
6. **Conclusion**: Modifying `ThemeContext.tsx:77`, replacing un-prefixed slate text classes with `text-slate-700 dark:text-slate-200`, adding `tabular-nums` to financial spans, and removing global `#141414` overrides will resolve all identified accessibility and theme compliance issues.

---

## 3. Caveats

- **Scope Limit**: Audit was performed via static read-only code analysis and regex scanning across `apps/web/app/` and `apps/web/components/`. Runtime DOM tree computed styles under non-standard browser extensions were not audited.
- **Assumptions**: Assumed default browser font rendering and standard Ant Design 5 token inheritance.
- **Unexplored Areas**: Third-party external widgets or external iframe content (if any).

---

## 4. Conclusion

The audit identifies four primary areas requiring remediation:

1. **Critical Global Fix**: In `ThemeContext.tsx:77`, invert `colorTextDescription` so Light mode uses `#64748b` (Slate-500) and Dark mode uses `#94a3b8` (Slate-400).
2. **Tailwind Text Class Refactoring**: Replace un-prefixed `text-slate-200` and `text-slate-300` in table cell renderers across `CcXoayTab.tsx`, `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `BkTipTab.tsx`, `CatalogComboLiveTab.tsx`, `CvThuNhapTab.tsx`, and `CvXoayTab.tsx` with dual-theme classes (`text-slate-700 dark:text-slate-200`).
3. **Number Formatting Compliance**: Add `tabular-nums` class to financial number spans in `appointments/page.tsx` summary breakdown, `CustomerTable.tsx`, and `AppointmentColumns.tsx`.
4. **Theme Encapsulation**: Remove global `.dark-theme .ant-table { background: #141414 !important; }` in `customers/page.tsx` and `nyc/page.tsx`.

Full detailed findings and recommendations matrix are documented in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/audit.md`.

---

## 5. Verification Method

1. **Files to Inspect**:
   - `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/audit.md`
   - `/Users/dannydo/projects/mos-lab/apps/web/context/ThemeContext.tsx` (line 77)
   - `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/cc/components/CcXoayTab.tsx` (line 56, 107)
   - `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/bk/components/BkRevenueTab.tsx` (line 252, 272)
   - `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.tsx` (line 168, 185)
   - `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/customers/components/CustomerTable.tsx` (line 217, 224)
   - `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/appointments/page.tsx` (lines 753-964)
2. **Build & Lint Verification**:
   - `pnpm --filter @mos-lab/web build` or `pnpm lint`
3. **Invalidation Conditions**:
   - If `ThemeContext.tsx` token `colorTextDescription` remains `#94a3b8` in Light mode.
   - If `text-slate-200` remains without `dark:` prefix in table render functions.
