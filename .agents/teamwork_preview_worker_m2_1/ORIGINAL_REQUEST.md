## 2026-07-27T16:38:06Z

You are teamwork_preview_worker_m2_1, a Worker subagent for mos-lab.

Working Directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1
Project Scope Document: /Users/dannydo/projects/mos-lab/.agents/orchestrator/PROJECT.md
Audit Report: /Users/dannydo/projects/mos-lab/.agents/orchestrator/accessibility_audit_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
Execute the full refactoring and remediation plan specified in `/Users/dannydo/projects/mos-lab/.agents/orchestrator/accessibility_audit_report.md` to fix all contrast, color, theme scoping, `:focus-visible`, and `tabular-nums` accessibility issues in `apps/web/`.

Key Implementation Steps:

1. `apps/web/context/ThemeContext.tsx`:
   - Set dynamic primary gold: `colorPrimary: isDark ? '#D4A84B' : '#9E7118'`, `colorInfo: isDark ? '#D4A84B' : '#9E7118'`.
   - Set dynamic description text token: `colorTextDescription: isDark ? '#94a3b8' : '#64748b'`.
   - Add explicit focus outline tokens: `controlOutline: isDark ? 'rgba(212, 168, 75, 0.25)' : 'rgba(158, 113, 24, 0.25)'`, `controlOutlineWidth: 2`.
2. `apps/web/app/globals.css`:
   - Add paired `.light-theme .ant-table`, `.light-theme .ant-card`, `.light-theme .ant-drawer-content`, `.light-theme .ant-tabs-nav` rules to pair with existing `.dark-theme` rules.
   - Add explicit `.tabular-nums` utility class rule: `.tabular-nums { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }`.
   - Standardize body font family to `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
3. Page-Level Styles & Clean Scoping:
   - In `customers/page.tsx`, `nyc/page.tsx`, `today/page.tsx`, and `DailyCallsTable.tsx`, remove conflicting un-scoped/duplicate `#141414 !important` overrides or scope them under paired `.dark-theme` and `.light-theme` selectors.
   - In `login/page.tsx`, replace hardcoded inline `background: '#141414'` with theme-aware/slate styling.
4. Component Text Contrast Fixes:
   - In `CatalogComboLiveTab.tsx`, `CcXoayTab.tsx`, `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `BkTipTab.tsx`, `CvThuNhapTab.tsx`, `CvXoayTab.tsx`, `PackageAuditTab.tsx`, replace un-prefixed dark classes (`text-slate-200`, `text-slate-300`) with `text-slate-700 dark:text-slate-200` and `text-slate-600 dark:text-slate-300`.
   - Fix hardcoded `#888` inline colors in `CustomerTable.tsx`, `CustomerFilters.tsx`, `AssignmentHistoryDrawer.tsx`, `AppointmentColumns.tsx`, `KpiStatsCard.tsx`, `RescheduleBookingModal.tsx` to use `token.colorTextDescription` or dynamic `themeMode === 'dark' ? '#94a3b8' : '#64748b'`.
5. Tabular Nums Additions:
   - Add `tabular-nums` (Tailwind class or inline style `fontVariantNumeric: 'tabular-nums'`) to financial figures ($ Combo, $ Single, $ Product, Revenue, Price, Salary, Bonus, Tips) and dynamic counters in `CustomerTable.tsx`, `AppointmentColumns.tsx`, `appointments/page.tsx` summary breakdown cards, `TelesalesFrontFace.tsx` donut charts, `KpiStatsCard.tsx`, `CcDiamondDetailModal.tsx`, `QAPlayerDrawer.tsx`, etc.
6. Keyboard Focus & ARIA Labels:
   - In `TelesalesConfigPanel.tsx`, remove `outline-none` on target numeric inputs and add `aria-label`.
   - In `EditCustomerModal.tsx`, `TelesalesDashboardModal.tsx`, `CustomerBulkActions.tsx`, add `aria-label` to icon-only buttons.
   - In custom clickable `<span>`/`<Space>` table triggers, add `tabIndex={0}` and `role="button"`.

Build Verification Requirements:

- Run `pnpm lint` and `pnpm --filter @mos-lab/web build` (or `pnpm build`) to verify 0 TypeScript/ESLint build errors.
- Document exact build commands and outputs in your handoff report.

Write your completion report to `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1/handoff.md` and send a message back to the orchestrator when finished.
