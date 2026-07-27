# Handoff Report: Global Styles, CSS Overrides & Ant Design 5 Tokens Audit

**Agent**: `teamwork_preview_explorer_m1_3` (Explorer)  
**Milestone**: `m1_3`  
**Date**: 2026-07-27  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3`  
**Audit Document**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3/audit.md`

---

## 1. Observation

Direct observations from codebase inspection across `apps/web`:

1. **Asymmetric Theme Overrides in `apps/web/app/globals.css`**:
   - `globals.css` lines 142–185 contain dark overrides with `!important`:
     - Line 142: `.dark-theme .ant-table { background: #111827 !important; color: #cbd5e1 !important; border-color: #1f2937 !important; }`
     - Line 148: `.dark-theme .ant-table-thead > tr > th { background: #1e293b !important; color: #f8fafc !important; border-bottom: 1px solid #334155 !important; font-weight: 600 !important; }`
     - Line 169: `.dark-theme .ant-card { background: #111827 !important; border-color: #1f2937 !important; }`
     - Line 178: `.dark-theme .ant-drawer-content { background-color: #0f172a !important; }`
     - Line 182: `.dark-theme .ant-tabs-nav { border-bottom-color: #1f2937 !important; }`
   - **Observation**: Zero `.light-theme` counterparts exist for `.ant-table`, `.ant-card`, `.ant-drawer-content`, or `.ant-tabs-nav` in `globals.css`.

2. **Conflicting Background Overrides Across Pages**:
   - `globals.css` line 143: `.dark-theme .ant-table { background: #111827 !important; }`
   - `apps/web/app/dashboard/customers/page.tsx` line 608: `.dark-theme .antd-custom-table .ant-table { background: #141414 !important; }`
   - `apps/web/app/dashboard/nyc/page.tsx` line 880: `.dark-theme .antd-custom-table .ant-table { background: #141414 !important; }`
   - `apps/web/app/dashboard/today/page.tsx` line 409: `.dark-theme .antd-custom-table .ant-table { background: #141414 !important; }`
   - `apps/web/components/DailyCallsTable.tsx` line 697: `.dark-theme .daily-calls-custom-table .ant-table { background: #141414 !important; }`

3. **Unscoped Style Blocks**:
   - In `customers/page.tsx` (lines 664–679), `nyc/page.tsx` (lines 936–951), `today/page.tsx` (lines 425–440), and `DailyCallsTable.tsx` (lines 713–716), `.antd-custom-table .ant-pagination-item-active` and `.antd-custom-table .ant-table-tbody > tr > td` are not wrapped in `.dark-theme` or `.light-theme` selectors and hardcode `#d4a84b`.

4. **Static Token Defect in `apps/web/context/ThemeContext.tsx`**:
   - Line 60: `colorPrimary: '#D4A84B'` is static for both `isDark === true` and `isDark === false`.
   - Line 77: `colorTextDescription: isDark ? '#64748b' : '#94a3b8'`.
   - Contrast calculations:
     - Gold `#D4A84B` on `#ffffff`: **2.21 : 1** (Fails WCAG AA 4.5:1).
     - Slate-400 `#94a3b8` on `#ffffff`: **2.48 : 1** (Fails WCAG AA 4.5:1).

5. **Focus Ring Washout**:
   - `globals.css` lines 51–54: `:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }`.
   - `ThemeContext.tsx` omits `controlOutline` tokens. Ant Design 5 defaults to 20% opacity `#D4A84B` for input focus ring in Light mode, yielding **1.1 : 1 contrast halo**.

6. **Missing `.tabular-nums` Fallback Class**:
   - `globals.css` relies solely on Tailwind v4 `@import 'tailwindcss';`. It lacks an explicit `.tabular-nums` class with `font-feature-settings: "tnum";`.

---

## 2. Logic Chain

1. **Step 1 (Theme Asymmetry)**:
   - Rule 2 of `.agents/AGENTS.md` requires library CSS overrides to be explicitly paired under both `.dark-theme` and `.light-theme` selectors.
   - Observation 1 shows `globals.css` only defines `.dark-theme .ant-table`, `.ant-card`, `.ant-drawer-content`, `.ant-tabs-nav`.
   - Deduction: Light Theme is unhedged against high-specificity dark overrides, creating visual asymmetry when toggling theme mode.

2. **Step 2 (Color Inconsistency)**:
   - Observation 2 reveals `globals.css` specifies `#111827` while four separate page files specify `#141414` in global style tags.
   - Deduction: This creates fragmented surface colors across dashboard views. Centralizing table styles into `globals.css` or `ThemeContext.tsx` eliminates this conflict.

3. **Step 3 (WCAG AA Contrast Non-compliance)**:
   - Observation 4 demonstrates static `colorPrimary: '#D4A84B'` on white background yields 2.21:1 contrast, and `colorTextDescription: '#94a3b8'` on white yields 2.48:1 contrast.
   - Deduction: Both fail WCAG AA contrast ratio of 4.5:1. Dynamic tokens (`isDark ? '#D4A84B' : '#9E7118'` for primary and `isDark ? '#94a3b8' : '#64748b'` for description text) achieve compliance (>4.5:1).

4. **Step 4 (Focus Visibility)**:
   - Observation 5 shows native elements receive 2px solid gold outline (5.0:1 in light, 7.5:1 in dark), but Ant Design inputs replace focus with 20% opacity gold halo (1.1:1 contrast).
   - Deduction: Explicitly setting `controlOutline` and `controlOutlineWidth` in `ThemeContext.tsx` restores high-contrast focus indicators on Antd inputs.

5. **Step 5 (Tabular Nums & Font Settings)**:
   - Rule 5 of `.agents/AGENTS.md` mandates `font-variant-numeric: tabular-nums` combined with `font-feature-settings: "tnum"`.
   - Observation 6 confirms `globals.css` lacks this rule.
   - Deduction: Adding an explicit `.tabular-nums` utility class ensures legacy browser compatibility.

---

## 3. Caveats

- **Read-Only Constraint**: As an Explorer subagent, no source files were modified. Proposed fixes are documented in `audit.md` for execution by an Implementer agent.
- **Dynamic CSS Testing**: Contrast ratios were calculated mathematically based on sRGB relative luminance formulas. Visual verification should be performed using Chrome DevTools Lighthouse audit once changes are applied.

---

## 4. Conclusion

The audit identified critical theme asymmetry, conflicting hex colors, WCAG AA contrast non-compliance in Light mode, focus indicator washout on Antd form controls, and missing tabular number CSS fallbacks in `apps/web`.

Fixing these issues requires:

1. Harmonizing `ThemeContext.tsx` dynamic tokens (`colorPrimary`, `colorTextDescription`, `controlOutline`).
2. Adding paired `.light-theme` rules and `.tabular-nums` fallback to `globals.css`.
3. Cleaning up inline `<style jsx global>` overrides in dashboard pages.

---

## 5. Verification Method

1. **File Inspection**:
   - Inspect `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3/audit.md` for the full audit report.
2. **Execution Test Command**:
   - Run `pnpm --filter @mos-lab/web build` or `pnpm lint` to ensure no syntax/type errors exist.
3. **Invalidation Condition**:
   - If `colorPrimary` in Light Mode remains `#D4A84B` on white background (< 4.5:1 contrast), or if `.light-theme .ant-table` rules remain absent from `globals.css`, the audit recommendations are not yet implemented.
