# Comprehensive Accessibility, Contrast, and Theme Audit Synthesis Report

**Project**: `mos-lab`  
**Location**: `/Users/dannydo/projects/mos-lab/.agents/orchestrator/accessibility_audit_report.md`  
**Date**: 2026-07-27  
**Orchestrator**: Project Orchestrator  
**Audit Coverage**: 3 Parallel Explorers (`m1_1`: Pages & Sub-modules, `m1_2`: Modals, Drawers & Cards, `m1_3`: Global CSS & Antd Tokens)

---

## Executive Summary

A thorough accessibility audit was performed across all Pages (`/dashboard`, `/login`, `/customers`, `/kpi`, `/catalog`, `/orders`, `/reports`, `/booker`, etc.), Modal Popups (KPI, Order Detail, Edit Customer, Reschedule, Telesales, etc.), Side Drawers (Customer Detail, Booking Wizard, QA Player, Daily Calls, etc.), and Global Theme Token infrastructure in `apps/web`.

All findings were assessed against WCAG 2.1 AA standards, Ant Design 5 token rules, and project rules in `AGENTS.md` and `.agents/AGENTS.md`.

---

## 1. Summary of Audit Findings by Risk Level

### Critical / High Priority (WCAG AA Failures & Theme Leaks)

1. **Ant Design 5 Token Contrast Failure (`ThemeContext.tsx`)**:
   - `colorPrimary` & `colorInfo` statically set to `#D4A84B` (gold). On white (`#ffffff`), contrast ratio is **2.21:1** (FAIL WCAG AA min 4.5:1). Must use dynamic gold: `isDark ? '#D4A84B' : '#9E7118'` (Dark gold `#9E7118` on white = **5.0:1 PASS**).
   - `colorTextDescription` in Light mode set to `#94a3b8` (Slate-400), yielding **2.48:1 - 2.76:1** contrast (FAIL WCAG AA min 4.5:1). Must set `isDark ? '#94a3b8' : '#64748b'` (Slate-500 `#64748b` on white = **4.57:1 PASS**).
   - Omitted `controlOutline` tokens causing washed-out Antd control focus halos (**1.1:1 contrast**).

2. **Hardcoded Un-prefixed Light/Slate Classes in Light Mode**:
   - `CatalogComboLiveTab.tsx`, `CcXoayTab.tsx`, `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `BkTipTab.tsx`, `CvThuNhapTab.tsx`, `CvXoayTab.tsx`, `PackageAuditTab.tsx` hardcode `text-slate-200` (#e2e8f0, **1.16:1 contrast**) and `text-slate-300` (#cbd5e1, **1.45:1 contrast**) without `dark:` prefixes.
   - Result: In Light Theme, all these table text elements become invisible/unreadable.
   - Fix: Replace with `text-slate-700 dark:text-slate-200` or `text-slate-600 dark:text-slate-300`.

3. **Asymmetric Theme Overrides & Background Inconsistencies (`globals.css`)**:
   - `globals.css` defines `.dark-theme .ant-table`, `.ant-card`, `.ant-drawer-content`, `.ant-tabs-nav` with `!important` but **completely lacks paired `.light-theme` counterparts**, violating Rule 2 of `.agents/AGENTS.md`.
   - `globals.css` defines table background as `#111827 !important`, whereas page files (`customers/page.tsx`, `nyc/page.tsx`, `today/page.tsx`, `DailyCallsTable.tsx`) inject `<style jsx global>` setting background to `#141414 !important`.
   - `login/page.tsx` hardcodes `#141414` in React inline styles.

4. **Missing `tabular-nums` on Financial & Dynamic Figures (Jitter Rule #5)**:
   - Financial figures ($ Combo, $ Single, $ Product, Revenue, Price, Salary, Bonus, Tips) and dynamic counters in `CustomerTable.tsx`, `AppointmentColumns.tsx`, `appointments/page.tsx` paystub cards, `TelesalesFrontFace.tsx` donut charts, `KpiStatsCard.tsx`, `CcDiamondDetailModal.tsx`, `QAPlayerDrawer.tsx` lack `tabular-nums`.
   - `globals.css` lacks an explicit `.tabular-nums { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }` fallback (violating Rule 5 of `AGENTS.md`).

5. **Accessibility & Focus State Gaps**:
   - `TelesalesConfigPanel.tsx` input uses `outline-none` suppressing keyboard focus ring.
   - Icon-only buttons (`EditCustomerModal.tsx`, `TelesalesDashboardModal.tsx`, `CustomerBulkActions.tsx`) miss `aria-label` or `title`.
   - Custom clickable table triggers lack `tabIndex={0}`, `role="button"`, and keyboard handlers.

6. **Font Stack Hierarchy Mismatch**:
   - `globals.css` body specifies `Arial`, while `ThemeContext.tsx` uses `Inter, -apple-system`.

---

## 2. Comprehensive Remediation Specification for Worker

### Task Scope: `apps/web/`

#### Step 1: Refactor `apps/web/context/ThemeContext.tsx`

- Make `colorPrimary` and `colorInfo` dynamic: `isDark ? '#D4A84B' : '#9E7118'`.
- Fix `colorTextDescription`: `isDark ? '#94a3b8' : '#64748b'`.
- Add explicit focus outline tokens:
  ```tsx
  controlOutline: isDark ? 'rgba(212, 168, 75, 0.25)' : 'rgba(158, 113, 24, 0.25)',
  controlOutlineWidth: 2,
  ```

#### Step 2: Refactor `apps/web/app/globals.css`

- Add paired `.light-theme` rules for every `.dark-theme` override block:
  ```css
  .dark-theme .ant-table {
    background: #111827 !important;
    color: #cbd5e1 !important;
    border-color: #1f2937 !important;
  }
  .light-theme .ant-table {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: #e2e8f0 !important;
  }

  .dark-theme .ant-card {
    background: #111827 !important;
    border-color: #1f2937 !important;
  }
  .light-theme .ant-card {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
  }

  .dark-theme .ant-drawer-content {
    background-color: #111827 !important;
  }
  .light-theme .ant-drawer-content {
    background-color: #ffffff !important;
  }

  .dark-theme .ant-tabs-nav {
    border-bottom-color: #1f2937 !important;
  }
  .light-theme .ant-tabs-nav {
    border-bottom-color: #e2e8f0 !important;
  }
  ```
- Add explicit `.tabular-nums` fallback class:
  ```css
  .tabular-nums {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }
  ```
- Standardize body font family to `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

#### Step 3: Remove Conflicting Page-Level CSS Injections

- In `customers/page.tsx`, `nyc/page.tsx`, `today/page.tsx`, and `DailyCallsTable.tsx`, remove hardcoded `#141414 !important` overrides or convert them to use paired `.dark-theme` / `.light-theme` classes matching the slate token palette (`#111827` / `#ffffff`).
- In `login/page.tsx`, replace hardcoded `background: '#141414'` with theme-aware styling or slate container styling.

#### Step 4: Fix Hardcoded Un-prefixed Tailwind Text Classes in Components

- Update `CatalogComboLiveTab.tsx`, `CcXoayTab.tsx`, `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `BkTipTab.tsx`, `CvThuNhapTab.tsx`, `CvXoayTab.tsx`, `PackageAuditTab.tsx`:
  Replace un-prefixed `text-slate-200` and `text-slate-300` with `text-slate-700 dark:text-slate-200` and `text-slate-600 dark:text-slate-300`.
- Update inline `#888` text styling in `CustomerTable.tsx`, `CustomerFilters.tsx`, `AssignmentHistoryDrawer.tsx`, `AppointmentColumns.tsx`, `KpiStatsCard.tsx`, `RescheduleBookingModal.tsx` to use `token.colorTextDescription` or dynamic `themeMode === 'dark' ? '#94a3b8' : '#64748b'`.

#### Step 5: Add `tabular-nums` to Financial & Dynamic Figures

- Add `tabular-nums` (Tailwind class or inline style `fontVariantNumeric: 'tabular-nums'`) to:
  - `CustomerTable.tsx`: Total spent cells and phone numbers.
  - `AppointmentColumns.tsx`: Price cells, discount badges, and total amounts.
  - `appointments/page.tsx`: All summary paystub card stat figures (pending rev, completed rev, base salary, bonuses, tips, total salary).
  - `TelesalesFrontFace.tsx`: Donut chart center value, target text, and percentage labels.
  - `KpiStatsCard.tsx`: LTV, visits, gem balance, and tips stats.
  - `CcDiamondDetailModal.tsx`, `CcThuongConfigModal.tsx`, `CcThuongTransactionsModal.tsx`, `GemHistoryModal.tsx`, `TipHistoryModal.tsx`, `RevenueHistoryModal.tsx`, `QAPlayerDrawer.tsx`.

#### Step 6: Fix Keyboard Focus & Accessibility Labels

- In `TelesalesConfigPanel.tsx`, remove `outline-none` on target inputs and add `aria-label`.
- In `EditCustomerModal.tsx`, `TelesalesDashboardModal.tsx`, `CustomerBulkActions.tsx`, add `aria-label` to icon-only buttons.
- In custom clickable `<span>`/`<Space>` triggers (`CatalogLeaderboardCard.tsx`, `BkBookingTab.tsx`, `BkRevenueTab.tsx`), add `tabIndex={0}` and `role="button"`.

---

## 3. Verification & Build Criteria

The worker must run:

1. `pnpm --filter @mos-lab/web build` (or `pnpm build`) to verify 0 TypeScript / Next.js compilation errors.
2. `pnpm lint` to verify 0 ESLint errors.
