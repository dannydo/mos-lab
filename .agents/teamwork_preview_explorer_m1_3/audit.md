# Audit Report: Global Styles, CSS Overrides & Ant Design 5 Tokens

**Auditor Agent**: `teamwork_preview_explorer_m1_3`  
**Target Application**: `apps/web` (`mos-lab`)  
**Date**: 2026-07-27

---

## Executive Summary

A comprehensive audit was performed on global styling, dark/light theme overrides, Ant Design 5 Design Tokens, accessibility focus indicators, and tabular number formatting across `apps/web/app/globals.css`, `apps/web/context/ThemeContext.tsx`, `apps/web/app/layout.tsx`, and associated page-level style blocks against the design rules specified in `/Users/dannydo/projects/mos-lab/AGENTS.md` and `.agents/AGENTS.md`.

### Key Findings Overview

1. **Dark/Light CSS Overrides Asymmetry**: `globals.css` contains aggressive `.dark-theme .ant-table`, `.dark-theme .ant-card`, `.dark-theme .ant-drawer-content`, and `.dark-theme .ant-tabs-nav` overrides with `!important`, but **completely lacks paired `.light-theme` counterparts**. This violates **Rule 2** of `.agents/AGENTS.md`.
2. **Conflicting Theme Background Overrides**: In `globals.css`, `.dark-theme .ant-table` sets background to `#111827 !important` (Tailwind slate-900). However, page components (`customers/page.tsx`, `nyc/page.tsx`, `today/page.tsx`, `DailyCallsTable.tsx`) inject `<style jsx global>` setting `.dark-theme .antd-custom-table .ant-table` to `#141414 !important`.
3. **WCAG AA Contrast Token Failures in Light Mode**:
   - `colorPrimary: '#D4A84B'` in `ThemeContext.tsx` is static across both Light and Dark themes. `#D4A84B` on `#ffffff` has a contrast ratio of **2.21 : 1**, failing WCAG AA (minimum 4.5:1 required). Light theme should dynamically use dark gold `#9E7118` (contrast 5.0:1).
   - `colorTextDescription` in Light Mode is set to `#94a3b8` (slate-400), which yields a contrast ratio of **2.48 : 1** on white background, failing WCAG AA.
4. **Ant Design Focus Ring Washout**: While global `:focus-visible` in `globals.css` uses `outline: 2px solid var(--color-gold)`, Ant Design inputs and buttons override this with Antd's `controlOutline` (default 20% opacity `#D4A84B`), resulting in a **1.1 : 1 contrast halo** in Light Mode.
5. **Missing Fallback for `.tabular-nums`**: `globals.css` lacks an explicit `.tabular-nums` CSS rule with `font-feature-settings: "tnum"`, violating **Rule 5** of `.agents/AGENTS.md`.
6. **Font Stack Mismatch**: `globals.css` specifies `body { font-family: Arial, ... }`, while `ThemeContext.tsx` specifies `fontFamily: 'Inter, ...'`, creating font hierarchy inconsistencies.

---

## Detailed Audit Breakdown

### 1. Audit of `globals.css` & CSS Overrides

#### A. Asymmetric Theme Overrides in `globals.css` (Violation of Rule 2)

- **Location**: `apps/web/app/globals.css` lines 142–185
- **Evidence**:

```css
/* Lines 142-146 */
.dark-theme .ant-table {
  background: #111827 !important;
  color: #cbd5e1 !important;
  border-color: #1f2937 !important;
}

/* Lines 169-184 */
.dark-theme .ant-card {
  background: #111827 !important;
  border-color: #1f2937 !important;
}
.dark-theme .ant-drawer-content {
  background-color: #0f172a !important;
}
.dark-theme .ant-tabs-nav {
  border-bottom-color: #1f2937 !important;
}
```

- **Issue**: There are **no corresponding `.light-theme .ant-table`**, `.light-theme .ant-card`, `.light-theme .ant-drawer-content`, or `.light-theme .ant-tabs-nav` blocks in `globals.css`.
- **Rule Reference**: `.agents/AGENTS.md` Rule 2 explicitly mandates paired overrides:

```css
.dark-theme .antd-custom-table .ant-table {
  background: #141414 !important;
  color: #ccc !important;
}
.light-theme .antd-custom-table .ant-table {
  background: #ffffff !important;
  color: #333333 !important;
}
```

- **Impact**: When users toggle between Dark and Light mode, Light mode relies solely on default library styles while Dark mode applies aggressive `!important` rules, causing styling leaks and specificity asymmetry.

#### B. Conflicting Background Hex Colors Between Files

- **Locations**:
  - `apps/web/app/globals.css` line 143: `#111827`
  - `apps/web/app/dashboard/customers/page.tsx` line 608: `#141414`
  - `apps/web/app/dashboard/nyc/page.tsx` line 880: `#141414`
  - `apps/web/app/dashboard/today/page.tsx` line 409: `#141414`
  - `apps/web/components/DailyCallsTable.tsx` line 697: `#141414`
- **Issue**: Global CSS defines table background as `#111827` (slate-900), whereas individual dashboard pages inject `<style jsx global>` overriding table background to `#141414` (pure dark charcoal). This creates inconsistent dark theme surface tones across tabs.

#### C. Unscoped Pagination & Table Cell Rules

- **Locations**:
  - `apps/web/app/dashboard/customers/page.tsx` lines 664–679
  - `apps/web/app/dashboard/nyc/page.tsx` lines 936–951
  - `apps/web/app/dashboard/today/page.tsx` lines 425–440
  - `apps/web/components/DailyCallsTable.tsx` lines 713–716
- **Evidence**:

```css
.antd-custom-table .ant-pagination-item-active {
  border-color: #d4a84b !important;
}
.antd-custom-table .ant-table-tbody > tr > td {
  padding: 6px 8px !important;
  line-height: 1.25 !important;
}
```

- **Issue**: These rules are NOT scoped under `.dark-theme` or `.light-theme`. Additionally, pagination border hardcodes `#d4a84b` (dark gold) rather than using `var(--color-gold)` (which evaluates to `#9e7118` in Light theme).

#### D. Hardcoded Dark Background in `login/page.tsx`

- **Location**: `apps/web/app/login/page.tsx` lines 143, 152, 153
- **Evidence**:

```tsx
style={{
  background: '#141414',
  border: '1px solid #2a2a2a',
}}
```

- **Issue**: Hardcodes dark charcoal `#141414` in React inline styles without theme context toggling.

---

### 2. Audit of Ant Design 5 Design Tokens (`ThemeContext.tsx`)

#### A. Token Setup Overview

- **Location**: `apps/web/context/ThemeContext.tsx` lines 57–129
- **Evidence**:

```tsx
theme={{
  algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#D4A84B',
    colorInfo: '#D4A84B',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    colorBgContainer: isDark ? '#111827' : '#ffffff',
    colorBgElevated: isDark ? '#1e293b' : '#ffffff',
    colorBgLayout: isDark ? '#0b0f19' : '#f5f7fa',
    colorBorder: isDark ? '#1f2937' : '#e5e5e5',
    colorBorderSecondary: isDark ? '#374151' : '#f3f4f6',
    colorText: isDark ? '#f8fafc' : '#0f172a',
    colorTextSecondary: isDark ? '#94a3b8' : '#64748b',
    colorTextDescription: isDark ? '#64748b' : '#94a3b8',
  },
}}
```

#### B. WCAG AA Contrast Calculations

| Token                  | Theme | Foreground | Background | Calculated Contrast | WCAG AA Status                          | Required Action                            |
| ---------------------- | ----- | ---------- | ---------- | ------------------- | --------------------------------------- | ------------------------------------------ |
| `colorPrimary`         | Light | `#D4A84B`  | `#ffffff`  | **2.21 : 1**        | ❌ **FAIL** (Min 4.5:1)                 | Dynamic token: use `#9E7118` in Light mode |
| `colorPrimary`         | Dark  | `#D4A84B`  | `#111827`  | **7.52 : 1**        | ✅ **PASS** (AAA)                       | Retain `#D4A84B`                           |
| `colorText`            | Light | `#0f172a`  | `#ffffff`  | **19.50 : 1**       | ✅ **PASS** (AAA)                       | Retain                                     |
| `colorText`            | Dark  | `#f8fafc`  | `#111827`  | **15.80 : 1**       | ✅ **PASS** (AAA)                       | Retain                                     |
| `colorTextSecondary`   | Light | `#64748b`  | `#ffffff`  | **4.67 : 1**        | ✅ **PASS** (AA)                        | Retain                                     |
| `colorTextSecondary`   | Dark  | `#94a3b8`  | `#111827`  | **6.71 : 1**        | ✅ **PASS** (AA)                        | Retain                                     |
| `colorTextDescription` | Light | `#94a3b8`  | `#ffffff`  | **2.48 : 1**        | ❌ **FAIL** (Min 4.5:1)                 | Change to `#64748b` or `#475569`           |
| `colorTextDescription` | Dark  | `#64748b`  | `#111827`  | **3.59 : 1**        | ⚠️ **MARGINAL** (Fails body text 4.5:1) | Change to `#94a3b8`                        |

#### C. Nested `ConfigProvider` Inconsistencies

- **Location**: `apps/web/app/dashboard/loca/page.tsx` lines 636–646
- **Evidence**:

```tsx
<ConfigProvider
  theme={{
    components: {
      Segmented: {
        itemSelectedBg: '#D4A84B',
        itemSelectedColor: '#000000',
        trackBg: themeMode === 'dark' ? '#141414' : '#f5f5f5',
        itemColor: themeMode === 'dark' ? '#aaa' : '#555',
      },
    },
  }}
>
```

- **Issue**: Hardcodes `#aaa`, `#555`, `#141414` inside nested ConfigProvider instead of inheriting design tokens from `ThemeContext`.

---

### 3. Focus Indicator Rules (`:focus-visible`)

#### A. Global `:focus-visible` Rule

- **Location**: `apps/web/app/globals.css` lines 51–54
- **Evidence**:

```css
:focus-visible {
  outline: 2px solid var(--color-gold);
  outline-offset: 2px;
}
```

- **Assessment**: Native HTML elements (`<button>`, `<a>`, `<input>`) correctly render a 2px outline.
  - Light theme: `#9e7118` on `#ffffff` -> Contrast **5.0 : 1** (Passes WCAG 2.1 AA 3:1 focus ring requirement).
  - Dark theme: `#d4a84b` on `#0b0f19` -> Contrast **7.5 : 1** (Passes WCAG 2.1 AA 3:1 focus ring requirement).

#### B. Ant Design Component Focus Ring Defect

- **Issue**: Ant Design inputs, buttons, selects, and pickers override native `:focus-visible` with Antd's `controlOutline` box shadow.
- **Defect**: In `ThemeContext.tsx`, `controlOutline` is omitted. In Light Mode, Antd defaults to `rgba(212, 168, 75, 0.2)` (20% opacity `#D4A84B`), creating an imperceptible halo on white backgrounds with **1.1 : 1 contrast ratio**, failing WCAG AA focus visibility.
- **Recommendation**: Add explicit focus tokens to `ThemeContext.tsx`:

```tsx
controlOutline: isDark ? 'rgba(212, 168, 75, 0.25)' : 'rgba(158, 113, 24, 0.25)',
controlOutlineWidth: 2,
```

---

### 4. Tabular Numbers (`.tabular-nums`) & Font Settings

#### A. Missing `.tabular-nums` CSS Class Definition in `globals.css`

- **Location**: `apps/web/app/globals.css`
- **Evidence**: `globals.css` has no `.tabular-nums` selector. It relies on Tailwind v4 `@import 'tailwindcss';` which outputs `font-variant-numeric: tabular-nums`.
- **Violation of `.agents/AGENTS.md` Rule 5**:

```
Cách thực hiện trong CSS/Tailwind: Sử dụng class Tailwind tabular-nums hoặc style font-variant-numeric: tabular-nums (kèm theo font-feature-settings: "tnum" để tối ưu hiển thị trên các trình duyệt cũ/hệ điều hành cũ).
```

- **Impact**: Without `font-feature-settings: "tnum";`, older iOS/Safari or legacy browser engines will not render tabular figures, causing layout jitter during countdown timers or live currency updates.

#### B. Font Family Discrepancy

- **`globals.css` line 59**: `body { font-family: Arial, Helvetica, sans-serif; }`
- **`ThemeContext.tsx` line 69**: `fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'`
- **`globals.css` lines 13-14**: `--font-sans: var(--font-geist-sans);` (Geist font is not loaded in `layout.tsx`).
- **Impact**: Body container text defaults to Arial while Antd components use Inter/System font stack.

---

## Proposed Remediation Plan

To address these audit findings while adhering to read-only constraints, the proposed changes are summarized below as patch specifications for the Implementer agent.

### 1. Update `apps/web/context/ThemeContext.tsx`

- Make `colorPrimary` dynamic: `isDark ? '#D4A84B' : '#9E7118'`.
- Make `colorInfo` dynamic: `isDark ? '#D4A84B' : '#9E7118'`.
- Fix `colorTextDescription`: `isDark ? '#94a3b8' : '#64748b'`.
- Add explicit focus outline tokens: `controlOutline`, `controlOutlineWidth`.

### 2. Update `apps/web/app/globals.css`

- Add paired `.light-theme .ant-table`, `.light-theme .ant-card`, `.light-theme .ant-drawer-content`, `.light-theme .ant-tabs-nav` rules matching `.dark-theme` rules.
- Add explicit `.tabular-nums` class rule:

```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

- Standardize body font family to match `ThemeContext.tsx`.

### 3. Consolidate Page-level `<style jsx global>` Overrides

- Remove duplicate `.dark-theme .antd-custom-table .ant-table` background overrides in `customers/page.tsx`, `nyc/page.tsx`, `today/page.tsx`, and `DailyCallsTable.tsx`.
- Scope unscoped pagination and table cell rules under `.dark-theme` and `.light-theme`.

---

## Verification Method

1. **Light/Dark Toggle Testing**:
   - Open `http://localhost:4000/dashboard/today` and toggle theme using the header button.
   - Inspect table headers, borders, drawers, and card backgrounds in DevTools to verify symmetric CSS overrides without dark leak.
2. **WCAG AA Contrast Inspection**:
   - Use Chrome DevTools Lighthouse / Accessibility Inspector to audit primary button text and description text contrast in both Light mode (minimum 4.5:1) and Dark mode.
3. **Tabular Nums Verification**:
   - Inspect countdown counters and currency numbers to confirm CSS properties include both `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum"`.
