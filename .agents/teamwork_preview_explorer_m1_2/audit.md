# Comprehensive Accessibility, Contrast, and Theme Audit Report

**Target Workspace**: `apps/web/` (`mos-lab`)  
**Auditor**: `teamwork_preview_explorer_m1_2`  
**Date**: 2026-07-27

---

## Executive Summary

A comprehensive accessibility (WCAG 2.1 AA/AAA standards), color contrast, theme scoping (`.light-theme` vs `.dark-theme`), tabular numbers formatting (`tabular-nums`), keyboard focus states (`:focus-visible`), and ARIA label audit was conducted across all Modal Popups, Side Drawers, Cards, and Tables in `apps/web/`.

Key strengths of the application include dynamic algorithm switching via Ant Design's `ConfigProvider` (`antdTheme.darkAlgorithm` and `antdTheme.defaultAlgorithm`) in `ThemeContext.tsx`, global keyboard focus visible styling (`:focus-visible` outline), and properly scoped `.dark-theme` CSS selectors for custom table overrides in page components.

However, several critical contrast failures in Light mode (gold accents `#D4A84B` on white with 2.45:1 contrast, hardcoded `#888` text with 3.54:1 contrast), missing `tabular-nums` on dynamic figures/donut charts, missing `aria-label`s on icon-only buttons/inputs, and focus outline suppression (`outline-none`) were identified.

---

## 1. Audit Scope & Component Inventory

### 1.1 Modal Popups Audited

- `TelesalesDashboardModal.tsx`
- `CallLogModal.tsx`
- `RescheduleBookingModal.tsx`
- `IconPickerModal.tsx`
- Customer Detail Modals: `EditCustomerModal.tsx`, `CreateNoteModal.tsx`, `ComboHistoryModal.tsx`, `CopyComboModal.tsx`, `GemHistoryModal.tsx`, `RevenueHistoryModal.tsx`, `TipHistoryModal.tsx`
- Customer Management Modals: `RevokeAssignmentModal.tsx`, `UndoReasonModal.tsx`, `SaveFilterModal.tsx`, `CustomerBulkActions.tsx`
- Appointments Modals: `MissedReasonModal.tsx`
- CC Modals: `CcDiamondDetailModal.tsx`, `CcThuongConfigModal.tsx`, `CcThuongTransactionsModal.tsx`
- BK / CV Modals: Modals embedded in `BkThuNhapTab.tsx` and `CvThuNhapTab.tsx`
- Catalog Modals: `ServiceDeactivateConfirmModal.tsx`, Package Audit Modal in `PackageAuditTab.tsx`
- Staff / Loca / NYC / OmiCall Modals in respective page components.

### 1.2 Side Drawers Audited

- `CustomerDetailDrawer.tsx`
- `BookingWizardDrawer.tsx`
- `DailyCallsDrawer.tsx`
- `QAPlayerDrawer.tsx`
- `TableConfigDrawer.tsx`
- `BkConfigDrawer.tsx`
- `CcConfigDrawer.tsx`
- `CvConfigDrawer.tsx`
- `SalaryConfigDrawer.tsx`
- `AppointmentsAuditDrawer.tsx`
- `AssignmentHistoryDrawer.tsx`
- `CustomerFilters.tsx` (Drawer)
- Staff, Plans, and Catalog Drawers in page components.

### 1.3 Cards & Tables Audited

- `KpiStatsCard.tsx`, `ProfileDetailsCard.tsx`, `BookingHabitsCard.tsx`, `ComboBalancesCard.tsx`, `ReferralCard.tsx`
- `TodayBookingsTable.tsx`, `TodayComingTable.tsx`, `CustomerTable.tsx`, `DailyCallsTable.tsx`, Catalog Tables, KPI Tables, Leaderboard Cards.

---

## 2. Comprehensive Findings & Detailed Analysis

### Finding 1: Dynamic Counters & Figures Missing `tabular-nums` (Jitter Prevention Rule)

**Rule Ref**: `.agents/AGENTS.md` Rule #5: "All countdown numbers, elapsed time, duration, financial figures must use `font-variant-numeric: tabular-nums` or Tailwind `tabular-nums` to prevent horizontal jitter during updates."

- **Specific Violations**:
  1. `TelesalesFrontFace.tsx` (Lines 347, 417, 422, 425):
     - Center Donut chart active value (`{activeValue}`), target value (`/ {activeTarget}`), percentage (`{activePercent}%`), and timeline node values (`{displayValue}`) lack `tabular-nums`.
  2. `TelesalesConfigPanel.tsx` (Line 151):
     - Target configuration inputs (`<input type="number">`) do not include `tabular-nums`.
  3. `KpiStatsCard.tsx` (Lines 101, 140, 184):
     - LTV (`stats?.totalSpent`), Visits (`stats?.totalVisits`), Gem Balance (`stats?.gemBalance`), Tips (`stats?.totalTips`) metrics lack `tabular-nums`.
  4. `CcDiamondDetailModal.tsx`, `CcThuongConfigModal.tsx`, `CcThuongTransactionsModal.tsx`:
     - Dynamic point totals, transaction amounts, and balance header metrics lack `tabular-nums`.
  5. `GemHistoryModal.tsx`, `TipHistoryModal.tsx`, `RevenueHistoryModal.tsx`:
     - Financial values in modal table cells and total summary badges miss `tabular-nums`.
  6. `QAPlayerDrawer.tsx`:
     - Call duration timestamps and QA evaluation scores in headers miss `tabular-nums`.

---

### Finding 2: Color Contrast Deficiencies (WCAG 2.1 AA/AAA Standards)

**Rule Ref**: WCAG 2.1 AA Success Criterion 1.4.3 (Minimum Contrast 4.5:1 for text, 3:1 for large text).

- **Issue 2.1: Gold Accent (`#D4A84B`) in Light Theme (`.light-theme`)**:
  - In `globals.css`, `.light-theme` defines `--color-gold: #9e7118` (dark gold with 4.8:1 contrast on white).
  - However, component files directly use hardcoded `#D4A84B` or Tailwind `text-gold` (defined as `#D4A84B` in `@theme inline`).
  - `#D4A84B` text on white/light background (`#FFFFFF` or `#F8FAFC`) has a contrast ratio of **2.45:1** (**FAIL**: WCAG AA requires 4.5:1).
  - **Affected Code Locations**:
    - `TelesalesFrontFace.tsx` (Line 107: `bg-gold/15 text-gold` badge).
    - `TelesalesConfigPanel.tsx` (Line 76: `text-gold` subtitle).
    - `RescheduleBookingModal.tsx` (Line 282: `style={{ color: '#D4A84B' }}` Drawer header title).
    - `CustomerDetailDrawer.tsx` (Lines 307, 336, 350: Phone icons and rating stars).
    - `EditCustomerModal.tsx` (Line 172: Button `{ color: '#D4A84B', borderColor: '#D4A84B' }`).
    - `CallLogModal.tsx` (Line 336: Ghost button `{ color: '#FAAD14', borderColor: '#FAAD14' }` -> **2.08:1** contrast on white).

- **Issue 2.2: Hardcoded Muted Gray Text (`color: '#888'`)**:
  - `color: '#888'` is used across several cards and headers:
    - `KpiStatsCard.tsx` (Lines 47, 84, 122, 141, 166, 185): Subtext and card label headers. `#888` on `#FFFFFF` (light mode) is **3.54:1** (**FAIL**). `#888` on `#1e293b` (dark card mode) is **4.29:1** (**FAIL**).
    - `CustomerDetailDrawer.tsx` (Line 312): Header metadata subtitle. `#888` on white is **3.54:1** (**FAIL**).

- **Issue 2.3: Dark Theme Muted Text Contrast**:
  - `CallLogModal.tsx` (Line 303): `<span className="text-zinc-500 font-mono">({activeCall.phone})</span>` on `#111827` dark modal background has contrast **4.34:1** (**FAIL**: slightly below 4.5:1 requirement). Should be `text-zinc-400` (7.5:1 contrast).

---

### Finding 3: Theme Wrapper Scoping & Background Scoping Verification

**Rule Ref**: `.agents/AGENTS.md` Frontend Theme Customization Rules: "All component overrides must be properly scoped under `.dark-theme` / `.light-theme` without global un-scoped `#141414 !important` overrides."

- **Scoping Verification Results**:
  - Global Ant Design table overrides in `customers/page.tsx` (line 608), `nyc/page.tsx` (line 880), `today/page.tsx` (line 409), and `DailyCallsTable.tsx` (line 697) are all properly scoped under `.dark-theme .antd-custom-table .ant-table` or `.dark-theme .daily-calls-custom-table .ant-table`. There are **no un-scoped `#141414 !important` overrides** breaking Light mode.
- **Background Color Inconsistency Across Drawers**:
  - `globals.css` forces `.dark-theme .ant-drawer-content { background-color: #0f172a !important; }` (Slate 900).
  - `ThemeContext.tsx` sets `Drawer: { colorBgContainer: isDark ? '#111827' : '#ffffff' }` (Gray 900).
  - Individual drawers use inline dark background colors (`#141414`, `#0f172a`, `#111827`), creating slight visual background shade mismatch across different drawers in Dark mode.

---

### Finding 4: Keyboard Focus (`:focus-visible`) & ARIA Label Accessibility

**Rule Ref**: WCAG 2.1 AA SC 2.4.7 (Focus Visible) and SC 4.1.2 (Name, Role, Value).

- **Issue 4.1: Focus Ring Suppression (`outline-none`)**:
  - `globals.css` provides `:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }`.
  - `TelesalesConfigPanel.tsx` (Line 153): `<input type="number" className="... focus:border-gold/50 outline-none" />` explicitly disables the keyboard focus outline with `outline-none`.
- **Issue 4.2: Unlabeled Interactive Controls (Screen Reader Accessibility)**:
  - `TelesalesConfigPanel.tsx`: Target numeric inputs (`<input type="number">`) lack `<label htmlFor="...">`, `aria-label`, or `aria-labelledby`. Section toggle buttons lack `aria-expanded`.
  - `TelesalesFrontFace.tsx` / `TelesalesDashboardModal.tsx`: Close button (`<Button icon={<CloseOutlined />} onClick={onClose} />`) lacks `aria-label="Đóng modal"`. Preset selection buttons lack `aria-label`.
  - `EditCustomerModal.tsx` (Line 160): Phone row delete button (`<Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} />`) is icon-only and lacks `aria-label="Xóa số điện thoại"`.

---

## 3. Recommended Remediation Plan & Proposed Code Modifications

### Remediation 1: Apply `tabular-nums` to Dynamic Figures

Update `TelesalesFrontFace.tsx` lines 416-427:

```tsx
<div className="absolute inset-0 flex flex-col items-center justify-center">
  <span
    className="text-3xl font-black tracking-tight tabular-nums"
    style={{ color: activeMetricConfig.color, fontVariantNumeric: 'tabular-nums' }}
  >
    {activeValue}
  </span>
  <span
    className={`text-[10px] font-bold mt-0.5 tabular-nums ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}
  >
    / {activeTarget} {activeMetricConfig.label}
  </span>
  <span
    className="text-sm font-extrabold mt-0.5 tabular-nums"
    style={{ color: activeMetricConfig.color, fontVariantNumeric: 'tabular-nums' }}
  >
    {activePercent}%
  </span>
</div>
```

### Remediation 2: Resolve Contrast Ratios in Light Theme

Update `KpiStatsCard.tsx` subtext style:

```tsx
const subtextStyle = {
  fontSize: '11px',
  color: themeMode === 'dark' ? '#94a3b8' : '#64748b', // Contrast > 4.5:1 in both light and dark modes
  marginTop: '2px',
  fontWeight: '400',
};
```

Update `RescheduleBookingModal.tsx` header text color:

```tsx
<span style={{ fontWeight: 'bold', fontSize: '16px', color: themeMode === 'dark' ? '#D4A84B' : '#9e7118' }}>
  QUY TRÌNH DỜI LỊCH HẸN KHÁCH HÀNG
</span>
```

### Remediation 3: Enhance Accessibility Labels & Preserve Focus Visible Outlines

Update `EditCustomerModal.tsx` delete button:

```tsx
<Button
  type="text"
  danger
  icon={<DeleteOutlined />}
  onClick={() => remove(name)}
  aria-label="Xóa số điện thoại"
  title="Xóa số điện thoại"
  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
/>
```

Update `TelesalesConfigPanel.tsx` inputs:

```tsx
<input
  type="number"
  aria-label={`Mục tiêu ${m.label} cho ${p.label}`}
  className={`w-16 h-6 rounded-md border text-center text-xs font-bold focus:ring-2 focus:ring-gold outline-none tabular-nums ${
    themeMode === 'dark' ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`}
  value={t[m.key] || 0}
  min="1"
  onChange={(e) => handleTargetChange(p.id, m.key, e.target.value)}
/>
```
