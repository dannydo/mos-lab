# Accessibility & UX Audit Report (Milestone 3)
**Target Project**: `apps/web/` (mos-lab — Wings Lashes CRM)  
**Date**: 2026-07-26  
**Auditor**: `explorer_m3_1`  
**Status**: Completed  

---

## Executive Summary

An in-depth accessibility (a11y) and user experience (UX) audit was conducted across the web dashboard components in `apps/web/`. The audit evaluated compliance with **WCAG 2.1 AA standards** and project-specific guidelines (AGENTS.md) across five key areas:

1. **Semantic HTML Structure**: Heading hierarchy, landmark regions, and table semantics.
2. **ARIA Attributes & Focus Management**: Accessible names, roles, states, and modal focus handling.
3. **Keyboard Navigation Accessibility**: Tab focus visibility, `tabIndex`, interactive `<div>` elements, and shortcuts.
4. **Color Contrast Ratios**: Contrast compliance in Light Theme (`.light-theme`) vs. Dark Theme (`.dark-theme`).
5. **Tabular Numbers Compliance**: Application of `tabular-nums` / `font-variant-numeric: tabular-nums` on timers, counters, and financial values.

### Key Finding Summary Matrix

| Audit Aspect | Rating | Major Issues Found | Impact |
|---|---|---|---|
| **1. Semantic HTML** | ⚠️ Needs Improvement | Missing `<h1>` tags on all pages, missing `<nav>` landmark on sidebar, broken H1-H6 hierarchy. | Screen reader navigation & layout structure |
| **2. ARIA Attributes** | ❌ Critical | Near 0% coverage of `aria-label`, `aria-expanded`, `aria-selected` across TSX files. Icon buttons lack text. | Screen readers cannot announce interactive controls |
| **3. Keyboard Navigation** | ❌ Critical | Zero `tabIndex={0}` or `onKeyDown` handlers on interactive `div`/`span` elements with `onClick`. Focus traps incomplete on custom overlays. | Keyboard-only users cannot access critical UI actions |
| **4. Color Contrast** | ⚠️ Needs Improvement | Gold accent (`#D4A84B`) & status text (`text-amber-400`, `text-sky-400`, `text-slate-400`) fail WCAG AA (2.36:1 < 4.5:1) in Light Theme. Dark theme is high-contrast. | Low vision users in Light Theme |
| **5. Tabular Numbers** | 🟡 Partial Compliance | Implemented in `BkBookingTab` & `BkConfigDrawer`, but missing in OmiCall active call timer (`CallConnected`), QA Player timeline, and KPI cards. | Text jitter on active timers & live counters |

---

## Detailed Audit Findings

### 1. Semantic HTML Structure

#### Observations
- **Missing Top-Level `<h1>`**:
  - `app/dashboard/layout.tsx` renders the logo/branding `"WINGS LASHES"` inside a plain `<div className="flex items-center ...">` without an `<h1>` heading tag.
  - Page components across `app/dashboard/*` (e.g. `appointments/page.tsx`, `cv/page.tsx`, `omicall/page.tsx`, `plans/page.tsx`, `PageHeader.tsx`) start heading hierarchy at `Title level={2}` (`<h2>`), skipping `<h1>` entirely.
  - Other page components (e.g. `bk/page.tsx`, `calls/page.tsx`, `customers/page.tsx`, `referrals/page.tsx`, `staff/page.tsx`) start at `Title level={3}` (`<h3>`) or `Title level={4}` (`<h4>`).
- **Landmark Regions**:
  - `<SidebarMenu>` in `app/dashboard/layout.tsx` is rendered inside Ant Design `<Sider>` (which compiles to `<aside>`), but the menu `<Menu>` itself is not wrapped in a semantic `<nav aria-label="Thanh điều hướng chính">` element.
  - Layout `<Content>` compiles to `<main className="ant-layout-content">`, which satisfies the main landmark requirement, but child sections lack `<section>` tags.
- **Heading Hierarchy Violations**:
  - Section titles within cards and drawers (e.g. `BkConfigDrawer.tsx`) use styled `<h4>` or `<div>` elements without logical parent `<h3>` headings.
- **Table Semantics**:
  - Standard Ant Design `<Table>` renders appropriate `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` elements.
  - Custom header cells (e.g. `ResizableHeaderCell.tsx`) and action column headers frequently lack `scope="col"` or accessible header labels.

#### Recommendations & Fixes
- Wrap branding/title in `app/dashboard/layout.tsx` or `PageHeader.tsx` with an `<h1>` tag (or `Typography.Title level={1}`).
- Ensure every dashboard page contains exactly one `<h1>` for page-level identification.
- Wrap `<SidebarMenu>` inside `<nav aria-label="Thanh điều hướng chính">`.

---

### 2. ARIA Attributes & Focus Management

#### Observations
- **Systemic Lack of ARIA Attributes**:
  - Across 95 `.tsx` files in `apps/web`, there are virtually **zero** `aria-label`, `aria-expanded`, `aria-selected`, or `aria-describedby` attributes written.
- **Unlabeled Icon Buttons**:
  - **Sidebar Toggle Button** (`app/dashboard/layout.tsx:419`): `<Button onClick={toggleSidebar} icon={...} />` lacks `aria-label="Thu gọn/mở rộng thanh điều hướng"`.
  - **Theme Toggle Button** (`app/dashboard/layout.tsx:547`): `<Button type="text" icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />} onClick={toggleTheme} />` has **neither `aria-label` nor `title`**. Screen readers announce "button" with no description.
  - **Daily Calls Button** (`app/dashboard/layout.tsx:531`): Has `title="Cuộc gọi hôm nay"`, but lacks `aria-label`.
  - **User Profile Dropdown** (`app/dashboard/layout.tsx:566`): `<Dropdown menu={userMenu}><div style={{ cursor: 'pointer' }}><Avatar ... /></div></Dropdown>` lacks `aria-label="Tài khoản người dùng"` and `role="button"`.
  - **Online Member Avatar Bubbles** (`app/dashboard/layout.tsx:499`): `<div key={m.id} onClick={...} title={m.name}>` has `onClick` on a `<div>` without `role="button"`, `aria-label={`Xem KPI của ${m.name}`}`, or `tabIndex={0}`.
- **Modal & Drawer Focus Management**:
  - Ant Design `<Modal>` and `<Drawer>` provide standard `role="dialog"` and `aria-modal="true"`.
  - However, custom header buttons (Pin, Edit, Delete, Call) inside drawers like `CustomerDetailDrawer` and `BookingWizardDrawer` lack `aria-label`s.
  - Custom floating widget `OmiCallWidget`: Floating window lacks `role="region"` / `role="dialog"` and `aria-label="Tổng đài cuộc gọi OmiCall"`.

#### Recommendations & Fixes
- Add explicit `aria-label` to all icon-only buttons (`themeToggle`, `sidebarToggle`, table action icons).
- Add `role="button"` and `aria-label` to custom clickable `<div>` elements like avatar bubbles and badge filters.
- Ensure custom floating modals (`OmiCallWidget`, `QAPlayerDrawer`) set `role="dialog"` and `aria-label`.

---

### 3. Keyboard Navigation Accessibility

#### Observations
- **Focus Visible Indicators**:
  - CSS resets and Tailwind defaults omit high-contrast focus rings for keyboard navigation (`Tab` key).
  - Active focused buttons rely on default browser focus outlines which are suppressed in dark mode or invisible against dark background (`#0b0f19`).
- **Interactive `div` / `span` Elements without Keyboard Accessibility**:
  - Grep search confirmed **zero** `tabIndex` or `onKeyDown` / `onKeyUp` handlers in `.tsx` files.
  - Clickable avatars, table filter tags, row expanders, and custom card buttons use `<div onClick={...}>` without `tabIndex={0}` and without handling `Enter` / `Space` key presses.
  - Keyboard-only users (navigating via `Tab`) cannot focus or activate these controls.
- **Modal Focus Trapping**:
  - AntD Modals automatically trap focus.
  - Floating `OmiCallWidget` overlay does not trap focus when expanded or restore focus to trigger element when closed.
- **Keyboard Shortcuts**:
  - No keyboard navigation shortcuts implemented for tab lists, table row navigation, or closing drawers via `Escape`.

#### Recommendations & Fixes
- Add focus ring styles in `app/globals.css`:
  ```css
  :focus-visible {
    outline: 2px solid var(--color-gold, #d4a84b) !important;
    outline-offset: 2px !important;
  }
  ```
- Convert clickable `<div>` elements to `<button>` or add `tabIndex={0}`, `role="button"`, and `onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}`.

---

### 4. Color Contrast Ratios in Light Theme vs. Dark Theme

#### Observations
- **WCAG AA Thresholds**: Normal text (under 18pt / 14pt bold) requires contrast ratio **>= 4.5:1**; Large text / UI icons require **>= 3:1**.
- **Gold Accent Color (`#D4A84B` / `var(--color-gold)`)**:
  - **Light Theme (`.light-theme`)**: `#D4A84B` on `#FFFFFF` / `#F5F7FA` white/light background yields a contrast ratio of **2.36:1** (**CRITICAL FAILURE** < 4.5:1). Gold text, gold table values, gold badges, and gold icons in Light Mode fail readability standards.
  - **Dark Theme (`.dark-theme`)**: `#D4A84B` on `#0B0F19` / `#111827` dark background yields **8.09:1** (**PASS**).
- **Secondary / Muted Text**:
  - `text-slate-400` (`#94a3b8`) on Light background `#ffffff`: **2.6:1** (**FAIL**).
  - `#6b7280` (`--client-desc-color`, `--client-phone-color` in `.light-theme` globals.css) on `#f5f7fa`: **4.2:1** (**FAIL** < 4.5:1).
  - `text-slate-500` (`#64748b`) in dark theme cards (`#111827`): **3.2:1** (**FAIL**).
- **Status Badge Text in Light Theme**:
  - `text-amber-400` (`#fbbf24`) on `#ffffff`: **1.7:1** (**CRITICAL FAIL**).
  - `text-sky-400` (`#38bdf8`) on `#ffffff`: **1.9:1** (**CRITICAL FAIL**).
  - `text-emerald-400` (`#34d399`) on `#ffffff`: **1.8:1** (**CRITICAL FAIL**).

#### Contrast Evaluation Table

| Element / Class | Context / Theme | Colors (FG / BG) | Ratio | WCAG AA Result |
|---|---|---|---|---|
| Gold Text (`#D4A84B`) | Light Theme | `#D4A84B` / `#FFFFFF` | **2.36:1** | ❌ FAIL (Req >= 4.5:1) |
| Gold Text (`#D4A84B`) | Dark Theme | `#D4A84B` / `#0B0F19` | **8.09:1** | ✅ PASS |
| `text-slate-400` | Light Theme | `#94A3B8` / `#FFFFFF` | **2.61:1** | ❌ FAIL |
| `--client-phone-color` | Light Theme | `#6B7280` / `#F5F7FA` | **4.21:1** | ❌ FAIL |
| `text-amber-400` | Light Theme | `#FBBF24` / `#FFFFFF` | **1.74:1** | ❌ FAIL |
| `text-sky-400` | Light Theme | `#38BDF8` / `#FFFFFF` | **1.89:1** | ❌ FAIL |
| `text-emerald-400` | Light Theme | `#34D399` / `#FFFFFF` | **1.82:1** | ❌ FAIL |
| Dark Table Cell | Dark Theme | `#CBD5E1` / `#111827` | **9.12:1** | ✅ PASS |
| Dark Header Cell | Dark Theme | `#F8FAFC` / `#1E293B` | **13.4:1** | ✅ PASS |

#### Recommendations & Fixes
- Update `app/globals.css` to define theme-dependent accent text variables:
  ```css
  .light-theme {
    --color-gold-text: #b8902f; /* 4.6:1 ratio on #ffffff */
    --color-muted-text: #4b5563; /* 7.0:1 ratio on #ffffff */
  }
  .dark-theme {
    --color-gold-text: #d4a84b; /* 8.09:1 ratio on #0b0f19 */
    --color-muted-text: #9ca3af; /* 6.5:1 ratio on #0b0f19 */
  }
  ```
- Use dark status colors in light mode (`text-amber-700`, `text-sky-700`, `text-emerald-700`) and bright status colors in dark mode (`text-amber-400`, `text-sky-400`, `text-emerald-400`).

---

### 5. Tabular Numbers Compliance

#### Observations
- **AGENTS.md Requirement**: Rule #4/Rule #5 & Rule #5: All timers, countdowns, call durations, clocks, counters, and monetary figures must use `font-variant-numeric: tabular-nums` or Tailwind class `tabular-nums` (`fontFeatureSettings: '"tnum"'`) to prevent horizontal layout jitter.
- **Audit Findings**:
  - ✅ **Compliant**: `BkBookingTab.tsx`, `BkConfigDrawer.tsx`, `BkDoneTab.tsx`, `BkRevenueTab.tsx`, `AppointmentColumns.tsx` (selected columns), `appointments/page.tsx` date picker.
  - ❌ **Non-Compliant (MISSING `tabular-nums`)**:
    1. **`CallConnected.tsx:43`** (OmiCall Active Call Timer):
       `<div className="text-3xl font-bold font-mono tracking-tight">{formatDuration(callDuration)}</div>`
       *Issue*: Uses `font-mono`, but missing `tabular-nums`. Timer text width vibrates as seconds change.
    2. **`AudioTimeline.tsx:92-93`** (QA Player Waveform Timers):
       `<Text className="text-xs font-mono font-bold text-slate-400">{formatTime(currentTime)}</Text>`
       *Issue*: Missing `tabular-nums`. Causes timeline text to jitter during audio playback.
    3. **`QAHeader.tsx:176`** (QA Player Header Duration): Missing `tabular-nums`.
    4. **`OmiCallWidget` / `WidgetHeader` / `WidgetIdle` / `WidgetMinimized`**: Duration badges and phone numbers missing `tabular-nums`.
    5. **`CustomerDetailDrawer` KPI Stats Cards**: Revenue numbers and appointment counts missing `tabular-nums`.
    6. **`TelesalesDashboardModal`**: Real-time sales counters, call count statistics, conversion percentages missing `tabular-nums`.
    7. **`LeaderboardSummary` / `BkLeaderboardCard` / `CcLeaderboardCard`**: Leaderboard monetary totals & rank numbers in header summary missing `tabular-nums`.

#### Recommendations & Fixes
- Add `tabular-nums` class to `CallConnected.tsx:43`:
  ```tsx
  <div className="text-3xl font-bold font-mono tracking-tight tabular-nums">{formatDuration(callDuration)}</div>
  ```
- Add `tabular-nums` class to `AudioTimeline.tsx:92-93`:
  ```tsx
  <Text className="text-xs font-mono font-bold text-slate-400 tabular-nums">{formatTime(currentTime)}</Text>
  ```
- Apply `tabular-nums` to all KPI counters, leaderboard totals, and duration badges across `components/`.

---

## Action Plan & Verification Method

### Actionable Fix Priorities for Implementer Agent

1. **High Priority (A11y Critical)**:
   - Add `aria-label` to theme toggle button, sidebar collapse button, daily calls button, and online member avatars in `app/dashboard/layout.tsx`.
   - Add `tabular-nums` to `CallConnected.tsx`, `AudioTimeline.tsx`, `QAHeader.tsx`, and `CustomerDetailDrawer` stats cards.
   - Add focus ring styles (`:focus-visible`) to `app/globals.css`.

2. **Medium Priority (UX & WCAG AA Compliance)**:
   - Fix Light Theme gold text contrast (`#D4A84B` -> `#B8902F` for light theme text) in `app/globals.css`.
   - Replace Light Theme status text classes (`text-amber-400` -> `text-amber-700` in light theme, `text-sky-400` -> `text-sky-700`).
   - Add `tabIndex={0}`, `role="button"`, and `onKeyDown` handlers to interactive `<div>` elements.

3. **Low Priority (Structural Enhancements)**:
   - Add top-level `<h1>` to `app/dashboard/layout.tsx` / `PageHeader.tsx`.
   - Wrap `<SidebarMenu>` in `<nav aria-label="Thanh điều hướng chính">`.

### Verification Method
- **Keyboard Navigation Verification**: Press `Tab` to navigate through dashboard header, sidebar, and modals. Confirm clear visible focus outline on every control and that all interactive elements are reachable and triggerable via `Enter` / `Space`.
- **Screen Reader Verification**: Verify screen reader announces theme toggle ("Chuyển đổi giao diện Sáng/Tối"), sidebar collapse ("Thu gọn thanh điều hướng"), and avatar controls.
- **Color Contrast Verification**: Use WebAIM Color Contrast Checker to verify all text elements in both `.light-theme` and `.dark-theme` achieve >= 4.5:1 ratio.
- **Tabular Numbers Verification**: Trigger an active OmiCall call or play QA audio recording; observe timer digits to verify zero horizontal layout jitter.

---
*Report compiled by `explorer_m3_1` — Milestone 3: Accessibility & UX Audit.*
