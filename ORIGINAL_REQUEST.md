# Original User Request

## Initial Request — 2026-08-08T01:51:53Z

<USER_REQUEST>
Xây dựng **CV Lash Extension Speed Model** — mô hình phân tích tốc độ nối mi phi tuyến cho từng CV (Chuyên viên/Kỹ thuật viên), bao gồm backend API tính toán, bảng CRM lưu trữ, và dashboard hiển thị trên CRM web. Mục đích: (1) Coaching CV yếu ở khâu nào sẽ cải thiện khâu đó, (2) Dự đoán thời gian booking chính xác hơn.

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Existing System Context

> [!IMPORTANT]
> Hệ thống ĐÃ CÓ các thành phần sau, phải tận dụng và mở rộng thay vì viết lại:

| Component                         | File                                                              | Purpose                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `LashBenchmarkService`            | `apps/api/src/modules/catalog/services/lash-benchmark.service.ts` | Benchmark toàn cục P25/P50/P75, 3-layer ETA, `parseLashSpecs()`                                             |
| `crm_lash_type_benchmarks`        | `apps/api/prisma/crm.prisma` L724-739                             | Bảng benchmark theo (lashStyle, serviceType, lashCount)                                                     |
| `report_order_service`            | Legacy DB `management`                                            | Thời gian thực tế iPad: `preparation_minute`, `pre_servicing_minute`, `cleaning_minute`, `servicing_minute` |
| `order_service_progress`          | Legacy DB `management`                                            | Timestamps 3 bước: `ServiceStart` → `ServiceCleaned` → `ServiceEnd`                                         |
| `report_staff_technician_service` | Legacy DB `management`                                            | Pre-aggregated per-CV per-service speed (avg/last servicing_minute)                                         |
| `order_service.assigned_staff_id` | Legacy DB `management`                                            | CV assignment per service                                                                                   |
| CV Xoay routes                    | `apps/api/src/modules/kpi/routes/cv.routes.ts`                    | Existing CV reporting tab                                                                                   |
| CV Paystub routes                 | `apps/api/src/modules/kpi/routes/cv-paystub.routes.ts`            | CV pay tracking                                                                                             |
| Shared types                      | `packages/shared/src/types/cv.ts`, `catalog.ts`                   | `LASH_STYLES`, `LashEtaEstimate`, etc.                                                                      |

## Requirements

### R1. Logarithmic Speed Model (Self-Correcting)

Build a **per-CV speed profile model** that predicts lash extension completion time using a non-linear (logarithmic) regression:

$$\text{time}_{phase}(n) = a_{phase} + b_{phase} \times \ln(n)$$

Where $n$ = lash count (number of lashes), $a$ = base intercept, $b$ = log-rate coefficient. This reflects the real-world observation that finding natural lashes gets harder as more extensions are applied (first 10 lashes fast → last 10 lashes slow because fewer natural lashes remain).

**Model dimensions** — each CV gets coefficients per:

- **Lash Style**: Classic, Mink, Volume 3D/4D/5D, Ultralight, Hyperlight, Flawless, Ivylight variants, Under Mink (use `parseLashSpecs()` from existing `LashBenchmarkService`)
- **Service Mode** (3 types):
  - `normal_clean` — Customer has NO prior lash extensions (no order with lash service in past 2 months)
  - `normal_removal` — Customer HAS prior lash extensions (has completed order with lash service in past 2 months, detected via `order` history check)
  - `retain` — Refill service (`service_type = 'Retain'`)
- **Phase** (4 phases tracked separately):
  - `cleaning` — `cleaning_minute` from `report_order_service` (Hình2 - Hình1)
  - `extension` — `servicing_minute` from `report_order_service` (Hình3 - Hình2)
  - `prep_qc` — `preparation_minute + pre_servicing_minute` (setup + quality check)
  - `total` — Sum of all phases

**Self-correcting 3-layer estimation**:

1. **Layer 1 (Direct Data)**: CV has ≥5 data points for this exact (lashStyle, serviceMode, lashCount) → use actual P50
2. **Layer 2 (Regression Interpolation)**: CV has ≥3 data points across different lash counts for this (lashStyle, serviceMode) → fit logarithmic curve, interpolate for the target lash count
3. **Layer 3 (Global Benchmark Fallback)**: CV has <3 data points → use global benchmark from `crm_lash_type_benchmarks` (existing P50), adjusted by CV's known speed ratio vs global average for other styles they DO have data for

**Monotonicity constraint (self-correcting invariant)**: Classic 390 (60 sợi) MUST always predict faster than Classic 440 (70 sợi) for the same CV and service mode. If regression produces a non-monotonic result, fall back to Layer 3 with a warning flag.

**Adaptive rolling window**:

- Junior CV (< 6 months working OR < 200 total lash cases): use 3-month rolling window
- Senior CV (≥ 12 months working): use 6-month rolling window
- Mid-level CV (6-12 months): use 4-month rolling window
- Determine CV seniority from their first `staff_bonus` record date

### R2. CRM Storage & Nightly Seeding

Create new CRM database table `crm_cv_speed_profile` to store model results:

```
crm_cv_speed_profile:
  id              INT PK AUTO_INCREMENT
  staff_id        INT NOT NULL          -- CV staff ID from legacy
  staff_name      VARCHAR(100)          -- Cached display name
  lash_style      VARCHAR(50) NOT NULL  -- 'Classic', 'Mink', 'Volume 3D', etc.
  service_mode    VARCHAR(20) NOT NULL  -- 'normal_clean', 'normal_removal', 'retain'
  lash_count      INT NOT NULL          -- Target lash count (60, 70, 80, 90, 100, 120, 140)
  -- Phase times (predicted, in minutes)
  cleaning_minutes     FLOAT NOT NULL
  extension_minutes    FLOAT NOT NULL
  prep_qc_minutes      FLOAT NOT NULL
  total_minutes        FLOAT NOT NULL
  -- Model metadata
  model_layer     INT NOT NULL          -- 1=direct, 2=regression, 3=benchmark fallback
  sample_size     INT NOT NULL          -- Number of data points used
  confidence      VARCHAR(10) NOT NULL  -- 'high', 'medium', 'low'
  reg_a           FLOAT NULL            -- Regression intercept (if layer 2)
  reg_b           FLOAT NULL            -- Regression log-rate (if layer 2)
  reg_r_squared   FLOAT NULL            -- Regression fit quality (if layer 2)
  -- Comparison to benchmark
  benchmark_total_minutes  FLOAT NULL   -- Global P50 benchmark for comparison
  speed_delta_percent      FLOAT NULL   -- (predicted - benchmark) / benchmark × 100
  speed_rating    VARCHAR(10) NOT NULL  -- 'fast' (green), 'normal' (yellow), 'slow' (red)
  -- Timestamps
  updated_at      DATETIME NOT NULL
  created_at      DATETIME NOT NULL
  UNIQUE(staff_id, lash_style, service_mode, lash_count)
```

Implement a seed/refresh service that:

- Runs nightly (triggered by API endpoint `POST /api/kpi/cv-speed/seed`)
- Queries `report_order_service` for all active CVs
- Fits logarithmic model per CV per (lashStyle, serviceMode)
- Generates predictions for standard lash counts: [30, 60, 70, 80, 90, 100, 120, 140]
- Calculates speed rating: Green (<-10% vs benchmark), Yellow (-10% to +10%), Red (>+10%)

### R3. Backend API Endpoints

Create new route file `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` with:

| Method | Endpoint                            | Purpose                                                                    |
| ------ | ----------------------------------- | -------------------------------------------------------------------------- |
| `GET`  | `/api/kpi/cv-speed/profiles`        | List all CV speed profiles (filterable by staffId, lashStyle)              |
| `GET`  | `/api/kpi/cv-speed/matrix`          | Speed matrix: rows=CVs, columns=lash types, cells=total_minutes with color |
| `GET`  | `/api/kpi/cv-speed/ranking`         | Ranking CVs by speed for a specific (lashStyle, lashCount, serviceMode)    |
| `GET`  | `/api/kpi/cv-speed/trend/:staffId`  | Monthly trend for a specific CV — are they getting faster or slower?       |
| `GET`  | `/api/kpi/cv-speed/detail/:staffId` | Detailed per-case breakdown for a CV with phase bar chart data             |
| `GET`  | `/api/kpi/cv-speed/predict`         | Predict ETA for a new booking (staffId, lashStyle, serviceMode, lashCount) |
| `POST` | `/api/kpi/cv-speed/seed`            | Trigger nightly model recalculation                                        |

All endpoints must:

- Use `ACTIVE_CV_STAFF_CONFIG` from `crmConfig` to filter active CVs
- Support `dateFrom` / `dateTo` query params with `parseComboDateBounds` padding
- Follow Rule #15: use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` for date filtering
- Return data typed in `@mos-lab/shared` with proper TypeScript interfaces

### R4. Dashboard UI (New Tab in KPI Page)

Add a new tab **"CV Speed / Tốc Độ CV"** in the KPI page alongside existing CV Xoay, CV Tip, CV Paystub tabs.

**Tab layout** (4 sections):

**Section 1 — Speed Matrix (Overview)**:

- Rows: Each active CV
- Columns: Each lash style × standard lash counts
- Cells: Total predicted minutes with color coding (Green/Yellow/Red)
- Click on a cell → opens CV detail modal

**Section 2 — Ranking Table**:

- Filterable by lash style, lash count, service mode
- Shows CVs ranked fastest → slowest
- Columns: Rank, CV Name, Predicted Time, Sample Size, Confidence Level, Speed Rating, Trend Arrow (↑ improving / ↓ declining / → stable)

**Section 3 — CV Detail Modal** (when clicking a CV):

- **Summary Card**: CV name, total cases, average speed vs benchmark, overall speed score
- **Phase Breakdown Chart**: Stacked/grouped bar showing cleaning vs extension vs prep_qc per lash type
- **Per-Case Timeline**: List of recent cases with horizontal bar chart showing 4 phases:
  ```
  |=== Vệ sinh (8p) ===|======== Nối mi (45p) ========|= QC (5p) =| Tổng: 58p
  ```
- **Monthly Trend**: Line chart showing average total time per month (last 6 months) with benchmark line overlay

**Section 4 — Booking Predictor Widget**:

- Inputs: Select CV, Select Lash Style, Select Lash Count, Select Service Mode
- Output: Predicted time (with confidence level and model layer used), phase breakdown

**UI Requirements**:

- Support both Light and Dark theme (per `.agents/AGENTS.md` rules)
- Use Ant Design components (Table, Modal, Select, DatePicker) with Tailwind v4 for layout
- Color coding: Green `#52c41a`, Yellow `#faad14`, Red `#ff4d4f`
- All numbers use `tabular-nums` for jitter prevention
- Controlled pagination with localStorage persistence

### R5. Shared Type Definitions

Define all types in `packages/shared/src/types/cv-speed.ts`:

- `CvSpeedProfile` — Single CV's speed profile for one (lashStyle, serviceMode, lashCount)
- `CvSpeedMatrix` — Full matrix data for the overview table
- `CvSpeedRanking` — Ranking entry with trend indicator
- `CvSpeedDetail` — Detailed per-case data with phase breakdown
- `CvSpeedTrend` — Monthly trend data points
- `CvSpeedPrediction` — Booking prediction result
- `CvSpeedSeedResult` — Seed operation result

Export from shared package barrel and run `pnpm --filter @mos-lab/shared build` after defining.

## Acceptance Criteria

### Model Accuracy & Self-Correction

- [ ] For CVs with ≥10 data points per lash type: predicted time within ±15% of actual P50
- [ ] Monotonicity invariant holds: Classic 60 sợi < Classic 70 sợi < Classic 80 sợi for ALL CVs
- [ ] Layer 2 regression R² > 0.5 (or falls back to Layer 3 with flag)
- [ ] Normal (clean-slate) predicted faster than Normal (has-old-lashes) for same CV and lash type
- [ ] Retain predicted differently from Normal (not just a copy of Normal data)
- [ ] No CV speed profile has total_minutes = 0 or negative values

### Data Integrity

- [ ] All CVs in `ACTIVE_CV_STAFF_CONFIG` have at least Layer 3 fallback profiles
- [ ] Speed ratings correctly computed: Green (<-10%), Yellow (-10% to +10%), Red (>+10%)
- [ ] Rolling window correctly applies: junior CVs use 3 months, senior CVs use 6 months
- [ ] Seed operation is idempotent — running twice produces same results

### API Correctness

- [ ] All 7 API endpoints return valid JSON matching their TypeScript interfaces
- [ ] Matrix endpoint returns data for all active CVs × all lash styles
- [ ] Ranking endpoint correctly sorts fastest → slowest
- [ ] Trend endpoint returns data grouped by month with benchmark comparison
- [ ] Detail endpoint returns per-case phase breakdown with correct timestamps

### UI Rendering

- [ ] Speed Matrix table renders with correct Green/Yellow/Red color coding
- [ ] Phase breakdown horizontal bar chart displays correctly for each case
- [ ] Monthly trend line chart shows CV speed vs benchmark
- [ ] Light/Dark theme both render correctly (no hardcoded dark colors)
- [ ] All tables have controlled pagination with localStorage persistence
- [ ] Tab navigation works alongside existing CV Xoay, CV Tip, CV Paystub tabs

## Verification Plan

### Automated Tests

```bash
# 1. Build shared types
pnpm --filter @mos-lab/shared build

# 2. Build API
pnpm --filter @mos-lab/api build

# 3. Verify API endpoints respond
curl http://localhost:4001/api/kpi/cv-speed/profiles | jq '.length'
curl http://localhost:4001/api/kpi/cv-speed/matrix | jq '.data | length'
curl "http://localhost:4001/api/kpi/cv-speed/ranking?lashStyle=Classic&lashCount=60" | jq '.[0].rank'

# 4. Verify monotonicity: Classic 60 < Classic 80 for first CV
curl http://localhost:4001/api/kpi/cv-speed/matrix | jq '[.data[0].profiles[] | select(.lashStyle=="Classic")] | sort_by(.lashCount) | [.[].totalMinutes] | . as $t | if ($t[0] < $t[1] and $t[1] < $t[2]) then "PASS" else "FAIL" end'

# 5. Seed and verify idempotency
curl -X POST http://localhost:4001/api/kpi/cv-speed/seed
curl http://localhost:4001/api/kpi/cv-speed/profiles | jq 'length' # count1
curl -X POST http://localhost:4001/api/kpi/cv-speed/seed
curl http://localhost:4001/api/kpi/cv-speed/profiles | jq 'length' # count2 should equal count1

# 6. Build web frontend
pnpm --filter @mos-lab/web build
```

### Manual Verification

- Open CRM web → KPI page → "CV Speed / Tốc Độ CV" tab
- Verify Speed Matrix renders with colored cells for all active CVs
- Click on a CV cell → verify Detail Modal opens with phase bar charts
- Toggle Light/Dark theme → verify all colors adapt correctly
- Change date range filter → verify data updates
- Test Booking Predictor: select CV + lash style + count → verify prediction appears
  </USER_REQUEST>
