# Analysis Report: Frontend & Shared Types Architecture for CV Lash Extension Speed Model

**Author**: `survey_explorer_3`  
**Date**: 2026-08-08  
**Scope**: `apps/web` (Next.js 15 + Ant Design 5 + Tailwind v4) and `packages/shared` (`@mos-lab/shared`)

---

## 1. Overview & Requirements Synthesis

The objective is to establish the frontend dashboard UI and shared TypeScript interfaces for the **CV Lash Extension Speed Model** (Mô hình phân tích tốc độ nối mi phi tuyến cho từng Chuyên viên/Kỹ thuật viên).

### Core Business Objectives:

1. **Targeted CV Coaching**: Identify phase bottlenecks (`cleaning`, `extension`, `prep_qc`) per CV to focus skill development.
2. **Accurate Booking ETA Prediction**: Provide realistic completion time estimates based on CV skill profile, lash style, service mode, and lash count.

---

## 2. Requirements Analysis (`ORIGINAL_REQUEST.md`)

### R1. Non-Linear Logarithmic Speed Model Requirements

- **Formula**: $\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$, where $n$ = lash count, $a$ = intercept, $b$ = log-rate coefficient.
- **Dimensions**:
  - **Lash Style**: Classic, Mink, Volume 3D/4D/5D, Ultralight, Hyperlight, Flawless, Ivylight variants, Under Mink (using `parseLashSpecs()` from `LashBenchmarkService`).
  - **Service Mode**: `normal_clean` (no prior lash order in 2 months), `normal_removal` (has completed lash order in past 2 months), `retain` (refill service `service_type = 'Retain'`).
  - **Phases**: `cleaning` (`cleaning_minute`), `extension` (`servicing_minute`), `prep_qc` (`preparation_minute + pre_servicing_minute`), `total` (sum of phases).
- **Self-Correcting 3-Layer Fallback**:
  - **Layer 1 (Direct Data)**: CV has $\ge 5$ data points for exact (lashStyle, serviceMode, lashCount) $\rightarrow$ actual P50.
  - **Layer 2 (Regression Interpolation)**: CV has $\ge 3$ data points across different lash counts $\rightarrow$ logarithmic fit $\text{time} = a + b \cdot \ln(n)$.
  - **Layer 3 (Global Benchmark Fallback)**: CV has $< 3$ data points $\rightarrow$ global benchmark from `crm_lash_type_benchmarks`, adjusted by CV speed ratio.
- **Monotonicity Invariant**: Classic 60 sợi < Classic 70 sợi < Classic 80 sợi for the same CV. If non-monotonic, fall back to Layer 3 with warning.
- **Adaptive Rolling Window**: Junior (<6 mo or <200 cases) = 3 months; Mid-level (6-12 mo) = 4 months; Senior ($\ge 12$ mo) = 6 months.

### R2. Database Schema (`crm_cv_speed_profile`)

Key columns: `staff_id`, `staff_name`, `lash_style`, `service_mode`, `lash_count`, `cleaning_minutes`, `extension_minutes`, `prep_qc_minutes`, `total_minutes`, `model_layer`, `sample_size`, `confidence`, `reg_a`, `reg_b`, `reg_r_squared`, `benchmark_total_minutes`, `speed_delta_percent`, `speed_rating` (`fast` / `normal` / `slow`), `updated_at`, `created_at`. Unique index on `(staff_id, lash_style, service_mode, lash_count)`.

### R3. API Endpoints (Fastify Backend `/api/kpi/cv-speed/*`)

1. `GET /api/kpi/cv-speed/profiles`: Filterable by `staffId`, `lashStyle`, `serviceMode`.
2. `GET /api/kpi/cv-speed/matrix`: Matrix data (rows = CVs, cols = lash types/counts, cells = `total_minutes` + rating color).
3. `GET /api/kpi/cv-speed/ranking`: Ranked fastest $\rightarrow$ slowest for specific `(lashStyle, lashCount, serviceMode)`.
4. `GET /api/kpi/cv-speed/trend/:staffId`: Monthly trend data points vs benchmark line.
5. `GET /api/kpi/cv-speed/detail/:staffId`: Per-case timeline breakdown with phase duration bars.
6. `GET /api/kpi/cv-speed/predict`: Predict booking ETA for `(staffId, lashStyle, serviceMode, lashCount)`.
7. `POST /api/kpi/cv-speed/seed`: Nightly recalculation trigger.

---

## 3. Shared Type Definitions (`packages/shared/src/types/cv-speed.ts`)

Existing constants in `packages/shared/src/types/catalog.ts`:

- `LASH_STYLES`: `['Classic', 'Mink', 'Volume 3D', 'Volume 4D', 'Volume 5D', 'Ultralight', 'Hyperlight', 'Flawless', 'Ivylight', 'Ivylight 3L', 'Ivylight 4L', 'Ivylight 5L', 'Under Mink'] as const`
- `LashStyle`: `(typeof LASH_STYLES)[number]`

### Proposed New Types (`cv-speed.ts`):

```typescript
import { LashStyle } from './catalog.js';

export type CvSpeedServiceMode = 'normal_clean' | 'normal_removal' | 'retain';
export type CvSpeedRating = 'fast' | 'normal' | 'slow';
export type CvSpeedConfidence = 'high' | 'medium' | 'low';
export type CvSpeedTrendDirection = 'improving' | 'declining' | 'stable';

export interface CvSpeedPhaseMinutes {
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  totalMinutes: number;
}

export interface CvSpeedProfile extends CvSpeedPhaseMinutes {
  id?: number;
  staffId: number;
  staffName: string;
  lashStyle: LashStyle;
  serviceMode: CvSpeedServiceMode;
  lashCount: number;
  modelLayer: 1 | 2 | 3;
  sampleSize: number;
  confidence: CvSpeedConfidence;
  regA?: number | null;
  regB?: number | null;
  regRSquared?: number | null;
  benchmarkTotalMinutes?: number | null;
  speedDeltaPercent?: number | null;
  speedRating: CvSpeedRating;
  updatedAt?: string;
  createdAt?: string;
}

export interface CvSpeedMatrixCell {
  lashStyle: LashStyle;
  lashCount: number;
  totalMinutes: number;
  speedRating: CvSpeedRating;
  modelLayer: 1 | 2 | 3;
  confidence: CvSpeedConfidence;
  sampleSize: number;
}

export interface CvSpeedMatrixRow {
  staffId: number;
  staffName: string;
  avatar?: string | null;
  store?: string;
  overallSpeedScore?: number;
  cells: CvSpeedMatrixCell[];
}

export interface CvSpeedMatrixResponse {
  success: boolean;
  data: CvSpeedMatrixRow[];
  lashStyles: LashStyle[];
  standardLashCounts: number[];
}

export interface CvSpeedRankingEntry {
  rank: number;
  staffId: number;
  staffName: string;
  avatar?: string | null;
  store?: string;
  predictedTotalMinutes: number;
  sampleSize: number;
  confidence: CvSpeedConfidence;
  speedRating: CvSpeedRating;
  modelLayer: 1 | 2 | 3;
  trendDirection: CvSpeedTrendDirection;
  speedDeltaPercent?: number;
}

export interface CvSpeedCaseDetail {
  orderId: number;
  orderServiceId: number;
  checkinTime: string;
  clientName: string;
  store: string;
  serviceName: string;
  lashStyle: LashStyle;
  lashCount: number;
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  totalMinutes: number;
}

export interface CvSpeedDetail {
  staffId: number;
  staffName: string;
  avatar?: string | null;
  store?: string;
  totalCases: number;
  avgSpeedVsBenchmarkPercent: number;
  overallSpeedScore: number;
  phaseBreakdownByStyle: Record<string, CvSpeedPhaseMinutes>;
  recentCases: CvSpeedCaseDetail[];
}

export interface CvSpeedTrendPoint {
  month: string; // YYYY-MM
  avgTotalMinutes: number;
  benchmarkMinutes: number;
  sampleCount: number;
}

export interface CvSpeedTrendResponse {
  staffId: number;
  staffName: string;
  lashStyle?: string;
  dataPoints: CvSpeedTrendPoint[];
}

export interface CvSpeedPrediction extends CvSpeedPhaseMinutes {
  staffId: number;
  staffName: string;
  lashStyle: LashStyle;
  serviceMode: CvSpeedServiceMode;
  lashCount: number;
  modelLayer: 1 | 2 | 3;
  confidence: CvSpeedConfidence;
  source: string;
  isMonotonicValid: boolean;
}

export interface CvSpeedSeedResult {
  success: boolean;
  message: string;
  insertedProfiles: number;
  updatedProfiles: number;
  totalActiveCvCount: number;
  timestamp: string;
}
```

### Export Configuration:

- `packages/shared/src/index.ts`: Add `export * from './types/cv-speed.js';`.

---

## 4. Frontend Architecture & Tab Layout (`apps/web`)

### Location of KPI / CV Page

- **Page File**: `apps/web/app/dashboard/cv/page.tsx` (CV KPI Dashboard).
- **Existing Tabs**:
  - `xoay` ("CV Xoay") $\rightarrow$ `<CvXoayTab />`
  - `tip` ("CV Tip") $\rightarrow$ `<CvTipTab />`
  - `thunhap` ("CV Thu Nhập") $\rightarrow$ `<CvThuNhapTab />`
- **New Tab to Add**:
  - `speed` ("CV Speed / Tốc Độ CV") $\rightarrow$ `<CvSpeedTab />` (dynamic import with `{ ssr: false }`).

### Structure of `CvSpeedTab.tsx` (4 Main Sections):

```
apps/web/app/dashboard/cv/
├── page.tsx                           # Main page housing tab navigation
└── components/
    ├── CvSpeedTab.tsx                 # Main tab orchestrator
    ├── CvSpeedMatrixOverview.tsx      # Section 1: Overview Speed Matrix Table
    ├── CvSpeedRankingTable.tsx        # Section 2: Ranking Table
    ├── CvSpeedDetailModal.tsx          # Section 3: CV Detail Modal (Timeline, Charts)
    └── CvSpeedBookingPredictor.tsx    # Section 4: Booking Predictor Widget
```

#### Section 1 — Speed Matrix (Overview Table):

- **Layout**: Ant Design `<Table>` with rows = active CVs, columns = Lash Styles (Classic, Mink, Volume 3D, etc.) & standard lash counts [30, 60, 70, 80, 90, 100, 120, 140].
- **Cell Display**: Displays predicted `totalMinutes` (e.g. `45p`).
- **Color Coding**:
  - Green (`#52c41a` / Tailwind `bg-emerald-500/20 text-emerald-400`): `speedRating === 'fast'` (<-10% vs benchmark)
  - Yellow (`#faad14` / Tailwind `bg-amber-500/20 text-amber-400`): `speedRating === 'normal'` (-10% to +10%)
  - Red (`#ff4d4f` / Tailwind `bg-rose-500/20 text-rose-400`): `speedRating === 'slow'` (>+10% vs benchmark)
- **Interaction**: Clicking a cell opens `<CvSpeedDetailModal />` pre-filtered for that CV and lash style.

#### Section 2 — Ranking Table:

- **Filters**: Lash Style (`Select`), Lash Count (`Select`), Service Mode (`Select`: `normal_clean`, `normal_removal`, `retain`).
- **Columns**:
  - Hạng (Rank 1 🥇, 2 🥈, 3 🥉, #4...)
  - Chuyên Viên (Avatar + Name + Store + Seniority)
  - Thời Gian Dự Báo (`tabular-nums`, e.g. `42 phút`)
  - Số Mẫu (Sample Size e.g. `15 ca`)
  - Độ Tin Cậy (Confidence `High` / `Medium` / `Low` Tag)
  - Đánh Giá Tốc Độ (Green/Yellow/Red Badge)
  - Xu Hướng (Improvement arrow: `↑ Tăng tốc`, `↓ Chậm lại`, `→ Ổn định`)

#### Section 3 — CV Detail Modal:

- **Trigger**: Activated on clicking any CV row or cell in Matrix/Ranking.
- **Summary Header Card**: CV Name, Avatar, Seniority Months, Overall Speed Score, Avg Delta vs Benchmark.
- **Phase Breakdown Chart**: Grouped bar chart comparing `cleaning`, `extension`, `prep_qc` durations across different lash styles.
- **Per-Case Timeline**: List of recent cases rendered with visual horizontal bar representation:
  ```
  |=== Vệ sinh (8p) ===|======== Nối mi (45p) ========|= QC (5p) =|  Tổng: 58p
  ```
- **Monthly Trend Line Chart**: SVG line chart showing CV's average monthly time over last 6 months overlaid against the benchmark line.

#### Section 4 — Booking Predictor Widget:

- **Inputs**: Select CV (`Select`), Select Lash Style (`Select`), Select Lash Count (`Select`), Select Service Mode (`Select`).
- **Output**:
  - Predicted completion time (`total_minutes`).
  - Model Layer used (Layer 1 Direct, Layer 2 Regression, Layer 3 Benchmark Fallback).
  - Confidence rating (`high`, `medium`, `low`).
  - Breakdown: Vệ sinh (`cleaning_minutes`), Nối mi (`extension_minutes`), Setup & QC (`prep_qc_minutes`).

---

## 5. SDK Extension (`apps/web/lib/api-client.ts`)

Extend `apiClient.kpi` in `apps/web/lib/api-client.ts` to include typed helper methods:

```typescript
cvSpeed: {
  getProfiles: async (params?: {
    staffId?: number;
    lashStyle?: string;
    serviceMode?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CvSpeedProfile[]> => {
    const response = await api.get('/kpi/cv-speed/profiles', { params });
    return response.data;
  },
  getMatrix: async (params?: {
    serviceMode?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CvSpeedMatrixResponse> => {
    const response = await api.get('/kpi/cv-speed/matrix', { params });
    return response.data;
  },
  getRanking: async (params: {
    lashStyle: string;
    lashCount: number;
    serviceMode?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CvSpeedRankingEntry[]> => {
    const response = await api.get('/kpi/cv-speed/ranking', { params });
    return response.data;
  },
  getTrend: async (
    staffId: number,
    params?: { lashStyle?: string; months?: number }
  ): Promise<CvSpeedTrendResponse> => {
    const response = await api.get(`/kpi/cv-speed/trend/${staffId}`, { params });
    return response.data;
  },
  getDetail: async (
    staffId: number,
    params?: { dateFrom?: string; dateTo?: string; limit?: number }
  ): Promise<CvSpeedDetail> => {
    const response = await api.get(`/kpi/cv-speed/detail/${staffId}`, { params });
    return response.data;
  },
  predictEta: async (params: {
    staffId: number;
    lashStyle: string;
    serviceMode: string;
    lashCount: number;
  }): Promise<CvSpeedPrediction> => {
    const response = await api.get('/kpi/cv-speed/predict', { params });
    return response.data;
  },
  seed: async (): Promise<CvSpeedSeedResult> => {
    const response = await api.post('/kpi/cv-speed/seed');
    return response.data;
  },
}
```

---

## 6. Theme, Styling & Best Practice Rules Verification

1. **Light & Dark Theme Support**:
   - Must consume `useTheme()` hook (`themeMode`) from `../../../context/ThemeContext`.
   - Access Ant Design Design Tokens using `theme.useToken()`.
   - Card backgrounds: `themeMode === 'dark' ? '#141414' : '#ffffff'`.
   - Table overrides must use explicit theme scoping (`.dark-theme .antd-custom-table` vs `.light-theme .antd-custom-table`).

2. **Flexbox Alignment Rule**:
   - Strictly use `items-center` for vertical flex centering (NEVER `align-center`).

3. **Number Formatting & Jitter Prevention (`tabular-nums`)**:
   - All time values (`45p`, `08:30`, `58 phút`), percentages (`-12.5%`), and sample counts (`15 ca`) MUST apply `tabular-nums` class or `style={{ fontVariantNumeric: 'tabular-nums' }}`.

4. **Controlled Table Pagination & LocalStorage Persistence**:
   - Tab state (`cv_speed_active_tab`), matrix view settings (`cv_speed_matrix_mode`), and page size (`cv_speed_page_size`) stored in `localStorage`.

5. **Color Standards**:
   - Green (Fast): `#52c41a` / Tailwind `text-emerald-400`
   - Yellow (Normal): `#faad14` / Tailwind `text-amber-400`
   - Red (Slow): `#ff4d4f` / Tailwind `text-rose-400`

---

## 7. Verification Method for Implementer

1. **Shared Build**:
   ```bash
   pnpm --filter @mos-lab/shared build
   ```
2. **Web Frontend Build**:
   ```bash
   pnpm --filter @mos-lab/web build
   ```
3. **Manual UI Verification**:
   - Launch dev servers (`pnpm dev`).
   - Open `http://localhost:4000/dashboard/cv`.
   - Verify presence of tab **"CV Speed / Tốc Độ CV"**.
   - Check matrix view, ranking view, CV detail modal, and booking predictor widget.
   - Toggle theme button in header to verify Light/Dark mode transitions.
