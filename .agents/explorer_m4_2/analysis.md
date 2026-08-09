# Technical Analysis & UI Component Architecture: M4 KPI Dashboard UI & Booking Predictor Widget

## Executive Summary

Milestone 4 (M4) delivers the Next.js CRM KPI page tab **"CV Speed / Tốc Độ CV"** (`key: 'speed'`) and its 4 core UI sections located in `apps/web/app/dashboard/kpi/components/cv-speed/`. This document presents the comprehensive component architecture, state management plan, theme compatibility design, and AGENTS.md rule enforcement strategy for M4.

---

## 1. KPI Page Integration (`apps/web/app/dashboard/kpi/page.tsx`)

### Tab Configuration

In `apps/web/app/dashboard/kpi/page.tsx`, the tab item is dynamically registered with lazy loading to ensure zero impact on initial page bundle size:

```tsx
// Dynamic Import with fallback loader
const CvSpeedTab = dynamic(() => import('./components/cv-speed/CvSpeedTab').then((m) => m.CvSpeedTab), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin size="large" />
    </div>
  ),
});

// Tab Item Definition in Ant Design <Tabs>
{
  key: 'speed',
  label: (
    <span>
      <ThunderboltOutlined /> ⚡ Tốc Độ CV
    </span>
  ),
  children: <CvSpeedTab />,
}
```

---

## 2. Component Modularization Plan (`apps/web/app/dashboard/kpi/components/cv-speed/`)

To maintain clean separation of concerns and adherence to monorepo architectural standards, the tab UI is structured into 1 container component and 4 dedicated section components:

```
apps/web/app/dashboard/kpi/components/cv-speed/
├── CvSpeedTab.tsx             # Main container & orchestrator component
├── CvSpeedMatrixSection.tsx   # Section 1: Overview Speed Matrix Table
├── CvSpeedRankingSection.tsx  # Section 2: CV Speed Ranking Table
├── CvSpeedDetailModal.tsx     # Section 3: CV Speed & History Detail Modal
└── CvSpeedPredictorWidget.tsx # Section 4: Interactive Booking Predictor (ETA Calculator) Widget
```

### Component Responsibility Breakdown

| Component                    | Responsibility                                                                                                                               | Inputs / Props                                                                                                                                                          | API Call (`apiClient.kpi.cvSpeed`)   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `CvSpeedTab.tsx`             | Main container orchestrating sub-component layout, shared state (active CV options, modal state, global refresh triggers)                    | None                                                                                                                                                                    | Indirectly coordinates child fetches |
| `CvSpeedMatrixSection.tsx`   | Section 1: Matrix grid of CVs vs Lash Styles/Counts with Green/Yellow/Red indicators, name search, style/mode filters, seed button           | `onSelectCv: (staffId: number) => void`, `cvOptions: Array<{value: number, label: string}>`, `onCvOptionsUpdate: (opts: Array<{value: number, label: string}>) => void` | `getMatrix()`, `seed()`              |
| `CvSpeedRankingSection.tsx`  | Section 2: Ranking table (fastest to slowest) with rank badges (#1 gold, #2 silver, #3 bronze), speed rating, confidence layer, trend arrows | `onSelectCv: (staffId: number) => void`                                                                                                                                 | `getRanking()`                       |
| `CvSpeedDetailModal.tsx`     | Section 3: Modal displaying summary cards, 3-phase bar chart, 6-month speed trend, 10 recent cases timeline                                  | `open: boolean`, `staffId: number \| null`, `onClose: () => void`                                                                                                       | `getDetail(staffId)`                 |
| `CvSpeedPredictorWidget.tsx` | Section 4: ETA Calculator widget predicting total completion time, confidence layer, phase breakdown (Cleaning, Extension, Prep & QC, Total) | `cvOptions: Array<{value: number, label: string}>`, `defaultCvId?: number`                                                                                              | `predict(params)`                    |

---

## 3. Detailed Component Designs & Specifications

### Section 1: `CvSpeedMatrixSection.tsx` (Overview Speed Matrix)

- **Header Controls**:
  - `Input`: Search CV name with `removeVietnameseTones` filter support.
  - `Select`: Lash Style filter (`ALL` or specific style e.g., `Classic`, `Mink`, `Volume 3D`, etc.).
  - `Select`: Service Mode filter (`normal_clean`, `normal_removal`, `retain`).
  - `Button`: "Tính Lại Mẫu Tốc Độ" (Seed endpoint trigger with loading spin state).
- **Table Grid**:
  - Fixed left column: CV Name (clickable link triggering `onSelectCv(staffId)`).
  - Dynamic cell columns: Lash Style $\times$ Lash Count.
  - Cell rendering: Displays predicted total minutes (`totalMinutes`) formatted with `tabular-nums`.
  - Color Badge Styling:
    - **Fast** (`rating === 'fast'`): Green text (`#52c41a`), background tint (`rgba(82, 196, 26, 0.2)` in Dark theme, `#f6ffed` in Light theme), border `#b7eb8f`.
    - **Normal** (`rating === 'normal'`): Yellow text (`#faad14`), background tint (`rgba(250, 173, 20, 0.2)` in Dark theme, `#fffbe6` in Light theme), border `#ffe58f`.
    - **Slow** (`rating === 'slow'`): Red text (`#ff4d4f`), background tint (`rgba(255, 77, 79, 0.2)` in Dark theme, `#fff2f0` in Light theme), border `#ffccc7`.
  - Cell Tooltip: Shows details on hover (`Thời gian: Xp | Layer Y (confidence) | Mẫu: Z ca`).
- **Pagination**:
  - Controlled state with `current: matrixPage`, `pageSize: 10`, `pageSizeOptions: ['10', '20', '50']`, saving to `localStorage` key `'cv_speed_matrix_page'`.

### Section 2: `CvSpeedRankingSection.tsx` (Speed Ranking Table)

- **Header Controls**:
  - `Select`: Lash Style (default `'Classic'`).
  - `Select`: Lash Count (default `60`).
  - `Select`: Service Mode (default `'normal_clean'`).
- **Columns**:
  1. `Hạng`: Round badge displaying rank number (`#1`, `#2`, `#3`, `#N`) with `tabular-nums`. Rank 1: Gold (`bg-amber-400 text-black`), Rank 2: Silver (`bg-slate-300 text-black`), Rank 3: Bronze (`bg-amber-700 text-white`), Rank >3: Gray (`bg-gray-100 dark:bg-gray-800`).
  2. `Chuyên Viên`: Staff Name link (clickable to open detail modal).
  3. `Dự Đoán Thời Gian`: Bold time string in minutes (e.g. `45 phút`) with `tabular-nums`.
  4. `Đánh Giá Tốc Độ`: Ant Design `<Tag>` color-coded (`success`, `warning`, `error`).
  5. `Độ Tin Cậy`: `<Tag>` with Layer number, confidence level (`HIGH/MEDIUM/LOW`), sample count `(N mẫu)` in `tabular-nums`.
  6. `Xu Hướng (3 Tháng)`:
     - `improving` $\rightarrow$ Green Tag icon `<ArrowUpOutlined />` "Cải thiện ↑"
     - `declining` $\rightarrow$ Red Tag icon `<ArrowDownOutlined />` "Giảm sút ↓"
     - `stable` $\rightarrow$ Default Tag icon `<MinusOutlined />` "Ổn định →"
- **Pagination**:
  - Controlled state saving to `localStorage` key `'cv_speed_ranking_page'`.

### Section 3: `CvSpeedDetailModal.tsx` (CV Speed & History Detail Modal)

- **Modal Props**: `open: boolean`, `staffId: number | null`, `onClose: () => void`.
- **Summary Header**:
  - CV Display Name & icon.
- **Top Summary Cards**:
  1. `TỔNG CA ĐÃ THỰC HIỆN`: `totalCases` count (`tabular-nums`).
  2. `TỐC ĐỘ VS BENCHMARK`: `avgSpeedVsBenchmarkPercent` percent (green text if $\le 0\%$, red text if $> 0\%$, `tabular-nums`).
  3. `ĐIỂM ĐÁNH GIÁ TỐC ĐỘ`: `overallScore / 100` score (`tabular-nums`).
- **Phase Breakdown Horizontal Bar**:
  - Stacked horizontal bar visualizing average minutes per phase:
    - Cleaning: Blue (`#1890ff`)
    - Extension: Green (`#52c41a`)
    - Prep & QC: Yellow (`#faad14`)
  - All durations formatted with `tabular-nums`.
- **Monthly Trend Grid (6 Months)**:
  - Cards displaying `month`, `avgTotalMinutes` (`tabular-nums`), and `benchmarkMinutes` overlay (`tabular-nums`).
- **Recent Cases Timeline (10 Cases)**:
  - List of recent cases with Order ID, Date (`tabular-nums`), Lash Style/Count, Service Mode, phase bar visualization, and total minutes (`tabular-nums`).

### Section 4: `CvSpeedPredictorWidget.tsx` (Booking Predictor Widget)

- **Interactive Form Inputs**:
  - `Select`: Select CV (`predCvId`).
  - `Select`: Select Lash Style (`predStyle`).
  - `Select`: Select Lash Count (`predCount`: 30, 60, 70, 80, 90, 100, 120, 140).
  - `Select`: Select Service Mode (`predMode`: Mi Sạch / Tháo Mi / Dặm Mi).
- **Action**: Button "Dự Đoán Thời Gian Hoàn Thành (ETA)" calling `apiClient.kpi.cvSpeed.predict`.
- **Output Result Box**:
  - Prominent Total Time display (e.g. `58 phút`, text-3xl, `tabular-nums`, blue-500).
  - Confidence Tag & Model Layer badge (Layer 1 / 2 / 3).
  - Benchmark P50 comparison (`tabular-nums`).
  - 4-Phase Breakdown List:
    1. Vệ sinh mi (Cleaning): `X phút` (`tabular-nums`)
    2. Nối mi chính (Extension): `Y phút` (`tabular-nums`)
    3. Chuẩn bị & QC kiểm tra (Prep & QC): `Z phút` (`tabular-nums`)
    4. Tổng thời gian (Total): `T phút` (`tabular-nums`)

---

## 4. Design Rule Enforcement & Strict Compliance Matrix

| Rule                                 | Implementation Requirement                                                                                                                                     | Location / Component                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Tabular Numbers (`tabular-nums`)** | All numeric metrics, minutes, counts, ranks, percentages, and benchmark values MUST include class `tabular-nums`                                               | `CvSpeedMatrixSection`, `CvSpeedRankingSection`, `CvSpeedDetailModal`, `CvSpeedPredictorWidget`                                  |
| **Light & Dark Theme Compatibility** | Use `themeMode` from `useTheme()` and `theme.useToken()` from Ant Design. NEVER hardcode dark backgrounds without theme conditions.                            | All 5 components (`CvSpeedTab`, `CvSpeedMatrixSection`, `CvSpeedRankingSection`, `CvSpeedDetailModal`, `CvSpeedPredictorWidget`) |
| **Controlled Pagination**            | Ant Design `<Table>` pagination using `current`, `pageSize`, `onChange`, `showSizeChanger`, `pageSizeOptions: ['10', '20', '50']`, persisted to `localStorage` | `CvSpeedMatrixSection`, `CvSpeedRankingSection`                                                                                  |
| **Vietnamese Search Normalization**  | Accent-insensitive search for CV names using `removeVietnameseTones()` from `@mos-lab/shared`                                                                  | `CvSpeedMatrixSection`                                                                                                           |
| **Shared API Client Usage**          | Use `apiClient.kpi.cvSpeed.*` for all backend interactions                                                                                                     | All data-fetching components                                                                                                     |
| **Shared TypeScript Types**          | Strictly type API requests and responses using `@mos-lab/shared` exports                                                                                       | All components                                                                                                                   |

---

## 5. Verification & Test Plan

1. **Shared Build Verification**:
   ```bash
   pnpm --filter @mos-lab/shared build
   ```
2. **Web Frontend Build Verification**:
   ```bash
   pnpm --filter @mos-lab/web build
   ```
3. **Manual UI Verification Checklist**:
   - Open CRM Web (`http://localhost:4000/dashboard/kpi`).
   - Switch to tab **"⚡ Tốc Độ CV"**.
   - Verify Speed Matrix section renders with green/yellow/red color cells and tooltip information.
   - Verify Ranking section sorts CVs correctly and displays rank badges (#1 gold, #2 silver, #3 bronze).
   - Test search input in Speed Matrix with Vietnamese tones (e.g. `Ngọc` vs `Ngoc`).
   - Click on a CV link to open `CvSpeedDetailModal` and verify summary cards, phase bar chart, monthly trend, and case timeline.
   - Test `CvSpeedPredictorWidget` by selecting CV, Lash Style, Count, Service Mode, clicking "Dự Đoán", and verifying ETA breakdown.
   - Toggle Light/Dark theme and verify all card backgrounds, text, and tag borders adjust dynamically.
