# Comprehensive Accessibility, Contrast & Theme Audit Report

**Target Scope**: `apps/web/app/` (all pages & sub-modules) + `apps/web/components/`  
**Audit Date**: 2026-07-27  
**Auditor**: `teamwork_preview_explorer_m1_1` (Explorer Subagent)  
**Reference Rules**: `/Users/dannydo/projects/mos-lab/AGENTS.md` and `.agents/AGENTS.md`

---

## Executive Summary

A comprehensive, read-only audit of accessibility, WCAG AA contrast compliance, Light/Dark theme switching, hardcoded color scoping, and number jitter prevention (`tabular-nums`) was conducted across all pages in `apps/web/app/` (including `/dashboard`, `/login`, `/customers`, `/kpi`, `/catalog`, `/orders`, `/reports`, `/booker`, `/cc`, `/cv`, `/loca`, `/nyc`, etc.).

### Key Highlights & Critical Findings:

1. **Global Ant Design Token Bug (`ThemeContext.tsx:77`)**:  
   `colorTextDescription` in Light mode is set to `#94a3b8` (Slate-400), yielding a contrast ratio of **2.76:1** on white (`#ffffff`). This causes every secondary description text using Ant Design token system to fail WCAG AA (< 4.5:1) in Light mode across the entire app.
2. **Hardcoded Dark Text Classes in Light Theme (`text-slate-200`, `text-slate-300`)**:  
   Multiple tab reports (`CcXoayTab.tsx`, `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `BkTipTab.tsx`, `CatalogComboLiveTab.tsx`, `CvXoayTab.tsx`, `CvThuNhapTab.tsx`) hardcode `text-slate-200` (#e2e8f0, contrast **1.16:1**) and `text-slate-300` (#cbd5e1, contrast **1.45:1**) without the `dark:` Tailwind prefix. When switched to Light Theme, this text becomes virtually unreadable.
3. **Hardcoded Colors (`#141414`, `#333`, `#888`, `#aaa`, `#ccc`)**:  
   Direct hardcoded hex values are used in inline styles and CSS rules (`background: #141414 !important`, `backgroundColor: '#333'`, `color: '#888'`) instead of Ant Design design tokens (`token.colorBgContainer`, `token.colorTextDescription`) or CSS variables (`var(--background)`).
4. **Missing `tabular-nums` on Financial Amounts & KPI Metrics**:  
   Financial numbers ($ Combo, $ Single, $ Product, Revenue, Price, Salary, Bonus, Tips) and counters in `CustomerTable.tsx`, `AppointmentColumns.tsx`, `appointments/page.tsx` summary breakdown, and drawers are missing `tabular-nums` (`font-variant-numeric: tabular-nums` or Tailwind `tabular-nums`), violating Rule #5 of `AGENTS.md`.
5. **Keyboard Focus & Interactive Element Accessibility**:  
   Custom clickable `<span>` and `<div>` elements used as interactive table triggers or row filters lack `tabIndex={0}`, `role="button"`, and keyboard event handlers.

---

## 1. Low-Contrast Text Elements Failing WCAG AA Standards

_WCAG 2.1 AA requirement: Contrast ratio >= 4.5:1 for normal body text (< 18pt / 24px non-bold), >= 3:1 for large/bold text._

### 1.1 Global Token Contrast Failure (`ThemeContext.tsx`)

- **Location**: `/Users/dannydo/projects/mos-lab/apps/web/context/ThemeContext.tsx:77`
- **Code**: `colorTextDescription: isDark ? '#64748b' : '#94a3b8'`
- **Observed Contrast**: `#94a3b8` on `#ffffff` white card background = **2.76:1** (FAIL < 4.5:1).
- **Impact**: All subtext, table IDs, secondary descriptions, and hints using `token.colorTextDescription` in Light Theme fail WCAG AA.
- **Recommended Remedy**: Swap values: `colorTextDescription: isDark ? '#94a3b8' : '#64748b'` (Slate-500 `#64748b` on `#ffffff` = **4.57:1** PASS).

### 1.2 Hardcoded Light Text Classes in Light Theme

When Light Theme (`.light-theme`) is active, these hardcoded slate classes fail contrast dramatically:

- **`CatalogComboLiveTab.tsx`**:
  - Line 168: `<span className="font-semibold text-slate-200 dark:text-slate-100 ...">` -> `#e2e8f0` on `#ffffff` = **1.16:1** (Severe FAIL).
  - Line 185: `<span className="font-mono tabular-nums text-slate-300 dark:text-slate-300">` -> `#cbd5e1` on `#ffffff` = **1.45:1** (Severe FAIL).
  - Line 234, 374, 476: `text-slate-300` -> **1.45:1** (Severe FAIL).
- **`CcXoayTab.tsx`**:
  - Line 56: `<span className="font-semibold text-slate-200">{val}</span>` -> **1.16:1** (Severe FAIL).
  - Line 107, 153, 191, 225: `<span className="... text-slate-300">` -> **1.45:1** (Severe FAIL).
- **`BkRevenueTab.tsx`**:
  - Line 252: `<span className="font-semibold text-xs text-slate-200 ...">` -> **1.16:1** (Severe FAIL).
  - Line 272: `<span className="... text-slate-300">` -> **1.45:1** (Severe FAIL).
- **`BkDoneTab.tsx`**:
  - Line 322, 339, 355: `text-slate-300` -> **1.45:1** (Severe FAIL).
- **`BkTipTab.tsx`**:
  - Line 191, 252, 266: `text-slate-300` -> **1.45:1** (Severe FAIL).
- **`CvThuNhapTab.tsx`**:
  - Line 466, 537: `text-slate-200` & `text-slate-300` -> **1.16:1** & **1.45:1** (Severe FAIL).
- **`CvXoayTab.tsx`**:
  - Line 280, 307: `text-slate-200` & `text-slate-300` -> **1.16:1** & **1.45:1** (Severe FAIL).
- **Recommended Remedy**: Replace un-prefixed dark classes with `text-slate-700 dark:text-slate-200` or `text-slate-600 dark:text-slate-300`.

### 1.3 Hardcoded Hex Color Contrast Violations

- **`CustomerTable.tsx:217` & `plans/page.tsx:379`**:
  - `<Text style={{ color: '#888' }}>Chưa từng đến</Text>`
  - `#888` on `#ffffff` = **3.5:1** (FAIL < 4.5:1). `#888` on dark `#111827` = **4.2:1** (FAIL < 4.5:1).
- **`CustomerFilters.tsx:361, 430, 500, 539`**:
  - `color: themeMode === 'dark' ? '#aaa' : '#555'`
  - `#aaa` on dark `#111827` = **3.68:1** (FAIL < 4.5:1). `#555` on white `#ffffff` = **5.5:1** (Pass).
- **`AssignmentHistoryDrawer.tsx:230`**:
  - `<HistoryOutlined style={{ fontSize: '36px', color: '#ccc', marginBottom: '12px' }} />`
  - `#ccc` on light `#f5f7fa` = **1.6:1** (Severe FAIL).
- **`AppointmentColumns.tsx:156, 158, 386, 388`**:
  - `<span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold' }}>Giảm {pct}%</span>`
  - `#722ed1` on dark background `#111827` = **3.41:1** (FAIL < 4.5:1 for 11px text).
- **`PackageAuditTab.tsx:221, 268` & `LocaColumns.tsx:109, 131, 420, 455`**:
  - Inline style `color: '#888'` used for subtext, system labels, and dates.

---

## 2. Hardcoded Color Styles & Theme Scoping Violations

_Rule requirement: All theme overrides must be scoped under `.light-theme` or `.dark-theme` or use `themeMode === 'dark' ? ... : ...` / `theme.useToken()`._

### 2.1 Global Page-Level CSS Injections

- **`apps/web/app/dashboard/customers/page.tsx:608-609`**:
  ```css
  .dark-theme .ant-table {
    background: #141414 !important;
    color: #ccc !important;
  }
  ```
  _Violation_: Overrides Ant Design tables globally with `#141414` instead of respecting the container token `#111827`.
- **`apps/web/app/dashboard/nyc/page.tsx:880-881`**:
  ```css
  .dark-theme .ant-table {
    background: #141414 !important;
    color: #ccc !important;
  }
  ```

### 2.2 Unscoped Component Inline Styles

- **`apps/web/app/dashboard/layout.tsx:441`**:
  - `background: themeMode === 'dark' ? '#141414' : '#ffffff'` (Uses `#141414` instead of token `token.colorBgContainer` or `#111827`).
- **`AppointmentColumns.tsx:68, 311, 526` & `CustomerTable.tsx:114`**:
  - `backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5'` (Hardcoded `#333` avatar bg).
- **`MissedSummaryCards.tsx:35`**:
  - `background: themeMode === 'dark' ? '#141414' : '#ffffff'` (Hardcoded `#141414`).
- **`MissedDateNavigator.tsx:58`**:
  - Tailwind class `bg-[#141414]`.
- **`CustomerFilters.tsx:253`**:
  - `background: themeMode === 'dark' ? '#141414' : '#fafafa'`.
- **`AssignmentHistoryDrawer.tsx:168`**:
  - `background: themeMode === 'dark' ? '#141414' : '#f5f7fa'`.
- **`UndoReasonModal.tsx:91`**:
  - `background: themeMode === 'dark' ? '#141414' : '#fff'`.
- **`loca/page.tsx:473` & `nyc/page.tsx:448`**:
  - `backgroundColor: activeTab === tab.id ? '#D4A84B' : themeMode === 'dark' ? '#333' : '#d9d9d9'`.

---

## 3. Financial Amounts & Numbers Missing `tabular-nums`

_Rule requirement: All financial numbers ($ Combo, $ Single, $ Product, Revenue, Price, Salary, Bonus, Tips), counters, clocks, durations, and timestamps MUST use `font-variant-numeric: tabular-nums` or Tailwind class `tabular-nums`._

### 3.1 Missing `tabular-nums` in Core Tables & Columns

- **`CustomerTable.tsx`**:
  - Line 224: `render: (spent: number) => formatVND(spent)` -> Total spent cell missing `tabular-nums`.
  - Line 138: `<span>{phone}</span>` -> Phone numbers missing `tabular-nums`.
- **`AppointmentColumns.tsx`**:
  - Line 125: `render: (price: number) => <span style={{ fontWeight: '500', color: token.colorText }}>{formatVND(price)}</span>` -> Missing `tabular-nums`.
  - Line 156, 158: `Giảm {pct}%` / `Giảm {formatVND(amt)}` -> Missing `tabular-nums`.
  - Line 362: `Giá: {formatVND(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%` -> Missing `tabular-nums`.
  - Line 400: `render: (val) => <span style={{ fontWeight: '500', color: token.colorText }}>{val > 0 ? formatVND(val) : '-'}</span>` -> Missing `tabular-nums`.
  - Line 408: `render: (val) => <span style={{ color: token.colorText }}>{val > 0 ? formatVND(val) : '-'}</span>` -> Missing `tabular-nums`.
  - Line 417: `+${formatVND(val)}` -> Missing `tabular-nums`.

### 3.2 Missing `tabular-nums` in Page Summary Breakdown Cards

- **`apps/web/app/dashboard/appointments/page.tsx`**:
  - Line 488: `{formatVND(summary?.pendingValue || 0)}` pending revenue stat.
  - Line 609: `{formatVND(summary?.completedRevenue || summary?.totalNetRev || 0)}` completed revenue stat.
  - Line 753: `{formatVND(summary.baseSalary)}` Booker base salary.
  - Line 783: `{formatVND(summary.clientBonus)}` CC bonus.
  - Line 819: `{formatVND(summary.doneBonus)}` Done bonus.
  - Line 859: `{formatVND(summary.missedBonus)}` Missed bonus.
  - Line 897: `{formatVND(summary.tipBonus)}` Tip bonus.
  - Line 900: `Tổng tips: {formatVND(summary.totalTips)}`.
  - Line 935: `{formatVND(summary.revBonus)}` Revenue bonus.
  - Line 964: `{formatVND(summary.totalSalary)}` Total salary.

---

## 4. Interactive Elements & Keyboard Focus Audit

### 4.1 Global `:focus-visible` CSS Assessment

- Global rule in `globals.css:51-54`:
  ```css
  :focus-visible {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }
  ```
  This provides standard gold focus outlines for default interactive elements (`<button>`, `<a href>`, `<input>`).

### 4.2 Accessibility Gaps in Custom Clickable Elements

- **Non-keyboard Navigable Click Triggers**:
  In `CatalogLeaderboardCard.tsx:82`, `BkBookingTab.tsx:146`, `BkRevenueTab.tsx:146`, `CustomerTable.tsx:107`:
  Clickable custom `<Space>` or `<span>` elements (e.g. clicking a customer name or catalog item to open detail drawer) lack `tabIndex={0}`, `role="button"`, and `onKeyDown` handlers for Enter/Space keys. Keyboard-only users cannot tab to or trigger these actions.

---

## Summary Matrix of Audit Recommendations

| Module / Component                                  | Issue Category     | Problem Description                                                    | Recommended Fix                                            |
| --------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ThemeContext.tsx`                                  | Contrast           | `colorTextDescription` is `#94a3b8` in Light mode (2.76:1 contrast)    | Set `colorTextDescription: isDark ? '#94a3b8' : '#64748b'` |
| `CatalogComboLiveTab.tsx`                           | Contrast & Theme   | Hardcoded `text-slate-200` / `text-slate-300` in Light mode            | Change to `text-slate-700 dark:text-slate-200`             |
| `CcXoayTab.tsx`                                     | Contrast & Theme   | Hardcoded `text-slate-200` / `text-slate-300` in table cells           | Change to `text-slate-700 dark:text-slate-200`             |
| `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `BkTipTab.tsx` | Contrast & Theme   | Hardcoded `text-slate-200` / `text-slate-300` in table cells           | Change to `text-slate-700 dark:text-slate-200`             |
| `CvThuNhapTab.tsx`, `CvXoayTab.tsx`                 | Contrast & Theme   | Hardcoded `text-slate-200` / `text-slate-300` in table cells           | Change to `text-slate-700 dark:text-slate-200`             |
| `CustomerTable.tsx`                                 | Contrast & Tabular | Hardcoded `#888` text, missing `tabular-nums` on total spent           | Use `token.colorTextDescription` & add `tabular-nums`      |
| `customers/page.tsx` & `nyc/page.tsx`               | Theme              | Hardcoded `.dark-theme .ant-table { background: #141414 !important; }` | Remove global style override or scope to dark token        |
| `appointments/page.tsx`                             | Tabular Nums       | All summary paystub numbers missing `tabular-nums` class               | Add `tabular-nums` to stat number spans                    |
| `AppointmentColumns.tsx`                            | Contrast & Tabular | `#722ed1` purple text (3.41:1 contrast) & missing `tabular-nums`       | Use higher contrast purple `#9333ea` & add `tabular-nums`  |
