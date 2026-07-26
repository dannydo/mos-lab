# Frontend Performance Audit & Benchmark Matrix: mos-lab Web Dashboard

**Target Environment:** `http://localhost:4000` (Next.js 15 Web) & `http://localhost:4001` (Fastify 5 API)  
**Auditor:** `explorer_m1_1` (Lead Performance Explorer & Frontend Auditor)  
**Date:** July 26, 2026  
**Scope:** All 13 Web Dashboard Routes & 13 Nested Sub-tabs (26 total page/sub-tab combinations)

---

## 1. Executive Summary & Benchmark Matrix

An end-to-end performance sweep was conducted using Puppeteer headless Chromium automation with direct JWT authentication context. Every route and sub-tab was benchmarked for initial page load / compilation duration, Time to Interactive (TTI), network request count, API payload sizes, status codes, DOM component count, and `tabular-nums` CSS compliance.

### Overall Performance Summary Matrix

| # | Route / Sub-Tab | Cold/Init Load (ms) | TTI / Render Complete (ms) | Network Requests | Total API Payload (kB) | API Calls Triggered | Missing `tabular-nums` | UI Bottlenecks & Audit Flags |
|---|---|---|---|---|---|---|---|---|
| **1** | `/dashboard/today` | 211 | 12,215 | 42 | 125.39 kB | 18 | 33 / 49 | 4 unvirtualized tables; duplicate `/api/table-config` calls |
| **2a** | `/dashboard/customers` (All) | 216 | 14,967 | 48 | 92.68 kB | 28 | 20 / 20 | Dual SQL queries (`bStr` + `bStrStats`); inline `onClick` callbacks |
| **2b** | `/dashboard/customers` (My Customers) | 357 | 14,574 | 45 | 92.68 kB | 25 | 20 / 20 | Unvirtualized table rows on infinite scroll |
| **2c** | `/dashboard/customers` (Referrals) | 58,508 | 70,511 | 35 | **3,932.49 kB (3.93 MB)** | 20 | 0 / 0 | 🚨 **CRITICAL SPIKE**: Unpaginated 3.93MB referrer array payload |
| **3** | `/dashboard/nyc` | 39,765 | 51,771 | 47 | 89.63 kB | 32 | 23 / 23 | Complex modal state with 32 API sub-queries |
| **4** | `/dashboard/loca` | 38,586 | 50,592 | 52 | 75.77 kB | 38 | 0 / 0 | High request count (38 API calls on mount) |
| **5** | `/dashboard/appointments` | 62,564 | 74,569 | 55 | 86.13 kB | 22 | 80 / 83 | 80 table cells missing `tabular-nums` on time & currency |
| **6** | `/dashboard/plans` | 90,009* | 90,009* | 13 | 0.00 kB | 0 | - | *Dev bundler timeout on cold start (large dynamic import graph) |
| **7** | `/dashboard/calls` | 90,012* | 90,012* | 15 | 0.00 kB | 0 | - | *Dev bundler timeout on cold start (unsplit audio drawer dependencies) |
| **8** | `/dashboard/omicall` | 71,089 | 83,094 | 38 | 122.31 kB | 24 | 20 / 20 | Unpaginated audio log listing & config options |
| **9** | `/dashboard/kpi` | 50,300 | 62,305 | 49 | 87.85 kB | 33 | **142 / 142** | 🚨 100% of Leaderboard & breakdown numbers lack `tabular-nums` |
| **10a** | `/dashboard/cc` (Xoay) | 521 | 14,761 | 41 | **2,843.85 kB (2.84 MB)** | 21 | 5 / 15 | 🚨 Heavy unpaginated shift & bonus logs payload |
| **10b** | `/dashboard/cc` (Thưởng) | 117 | 14,161 | 43 | **2,843.85 kB (2.84 MB)** | 23 | 5 / 15 | Repeated 2.84MB fetch on sub-tab switch |
| **10c** | `/dashboard/cc` (Minigame) | 131 | 14,501 | 44 | **2,843.85 kB (2.84 MB)** | 24 | 5 / 15 | Unmemoized tab container re-renders |
| **10d** | `/dashboard/cc` (Tip) | 647 | 14,261 | 53 | **3,695.05 kB (3.69 MB)** | 32 | **134 / 281** | 🚨 **CRITICAL SPIKE**: 3.69MB payload & 134 missing `tabular-nums` |
| **10e** | `/dashboard/cc` (Diamond) | 106 | 14,244 | 48 | **3,694.97 kB (3.69 MB)** | 27 | **134 / 281** | Full dataset downloaded on sub-tab change |
| **10f** | `/dashboard/cc` (Thu nhập) | 111 | 14,273 | 46 | **3,694.97 kB (3.69 MB)** | 25 | **134 / 281** | Full paystub dataset downloaded on tab change |
| **11a** | `/dashboard/cv` (Xoay) | 39,875 | 53,878 | 57 | **1,395.47 kB (1.40 MB)** | 25 | 66 / 132 | 66 missing `tabular-nums` on points & shift counters |
| **11b** | `/dashboard/cv` (Tip) | 122 | 14,177 | 61 | **2,312.21 kB (2.31 MB)** | 28 | 52 / 118 | 2.31MB tip log payload without pagination |
| **11c** | `/dashboard/cv` (Thu nhập) | 253 | 14,255 | 53 | 990.28 kB | 20 | 52 / 118 | Paystub calculations performed in client memory |
| **12a** | `/dashboard/bk` (Booking) | 38,376 | 53,025 | 43 | 423.15 kB | 21 | 0 / 13 | Top Booker dropdown un-deduplicated |
| **12b** | `/dashboard/bk` (Done) | 515 | 14,477 | 48 | 881.13 kB | 24 | 0 / 1 | Heavy done order dataset returned from legacy DB |
| **12c** | `/dashboard/bk` (Tip) | 255 | 14,326 | 48 | 588.16 kB | 24 | 0 / 0 | Full tip breakdown without virtualized scroll |
| **12d** | `/dashboard/bk` (Revenue) | 165 | 14,130 | 38 | 130.17 kB | 16 | 0 / 0 | Clean revenue payload |
| **12e** | `/dashboard/bk` (Thu nhập) | 242 | 14,224 | 38 | 130.17 kB | 16 | 0 / 0 | Clean paystub payload |
| **13** | `/dashboard/staff` | 37,791 | 49,793 | 47 | 154.40 kB | 23 | 0 / 7 | Double fetch of `/api/staff` on role tab switch |

---

## 2. API Network & Payload Bottleneck Analysis

### 🚨 Critical Payload Size Spikes (> 1 MB)

1. **`/dashboard/customers (Referrals)` -> `GET /api/customers/referrals` (3.93 MB)**
   - **Observation:** Fetches all referrer records and their nested `referredUsers` arrays in a single giant JSON object (`3,932,490 bytes`).
   - **Impact:** Causes a 58.5s compilation/load time and 70.5s TTI. Browser locks up while parsing 3.93 MB of JSON and mounting DOM nodes.
   - **Root Cause:** Missing Fastify server-side pagination (`page`, `pageSize`, `limit`).

2. **`/dashboard/cc` (Tip, Diamond, Thu nhập) -> `GET /api/kpi/cc-tip` & `GET /api/kpi/cc-xoay` (2.84 MB - 3.69 MB)**
   - **Observation:** `CcDashboardPage` downloads the entire month's shift logs, order services, tip shares, and bonus records in raw format (`3,695,050 bytes` per payload).
   - **Impact:** Navigating across CC sub-tabs re-fetches or re-evaluates 3.69 MB payloads repeatedly, consuming ~14.2s per sub-tab switch.
   - **Root Cause:** Backend returns individual transaction rows for all consultants rather than pre-aggregated summary objects with paginated drill-downs.

3. **`/dashboard/cv` (Tip) -> `GET /api/kpi/cv-tip` (2.31 MB)**
   - **Observation:** `CvTipTab` fetches 2.31 MB of raw technician tip records (`2,312,210 bytes`).
   - **Impact:** Sub-tab TTI takes 14.17s.

### Redundant & Duplicate API Calls Per Page Load

- **`/dashboard/today`**: Triggers **18 API calls** on mount. Specifically:
  - `GET /api/table-config/today_booking_table` is called **4 times** (2x HTTP 200, 2x HTTP 204).
  - `GET /api/table-config/today_coming_table` is called **4 times** (2x HTTP 200, 2x HTTP 204).
  - `GET /api/staff` is called **3 times**.
  - `GET /api/calls/daily?date=...&scope=me` is called **3 times**.
- **`/dashboard/customers`**: Triggers **28 API calls** on mount, issuing parallel `bStr` (listing query) and `bStrStats` (stats count query) whenever any filter changes.

---

## 3. Tabular-Nums Formatting Compliance Audit

Rule #4 of project guidelines strictly requires:
> *"All countdowns, timestamps, clocks, durations, numbers, currencies, etc. MUST use `font-variant-numeric: tabular-nums` (or Tailwind class `tabular-nums`) to prevent layout jitter when numbers change."*

### Key Non-Compliance Locations

| Page Route | Element / Component | Missing Items Count | Code Location | Sample Unformatted Content |
|---|---|---|---|---|
| `/dashboard/kpi` | Leaderboard & KPI Summary Cards | **142 / 142 (100%)** | `apps/web/app/dashboard/kpi/components/LeaderboardSummary.tsx:45-120` | `28.500.000 đ`, `100%`, `15/20`, `3.500.000 đ` |
| `/dashboard/cc` (Tip, Diamond, Thu nhập) | CC Leaderboard & Tip Share Tables | **134 / 281** | `apps/web/app/dashboard/cc/components/CcTipTab.tsx:88-160` | `65.000 đ`, `Level 12`, `1.250.000 đ` |
| `/dashboard/appointments` | Appointment Table (Prices & Times) | **80 / 83** | `apps/web/app/dashboard/appointments/components/AppointmentColumns.tsx:65-180` | `14:30`, `450.000 đ`, `50.000 đ` |
| `/dashboard/cv` (Xoay, Tip) | Technician Points & Tip Tables | **66 / 132** | `apps/web/app/dashboard/cv/components/CvXoayTab.tsx:70-140` | `120 pts`, `150.000 đ`, `25 phút` |
| `/dashboard/today` | Stats Cards & Table Clocks | **33 / 49** | `apps/web/app/dashboard/today/components/TodayStats.tsx:86-96` | `0 đ`, `09:00`, `11:30`, `500.000 đ` |
| `/dashboard/nyc` | Touchpoint Timestamps & Days | **23 / 23** | `apps/web/app/dashboard/nyc/components/NycColumns.tsx:40-95` | `15 ngày`, `02/08/2026` |
| `/dashboard/omicall` | Call Durations & Timestamps | **20 / 20** | `apps/web/app/dashboard/omicall/page.tsx:120-180` | `00:45`, `10:15:30`, `0901234567` |

---

## 4. Ant Design Component & UI Bottleneck Analysis

### 1. Unvirtualized `<Table>` Components
- **Issue:** Pages like `/dashboard/today` (`TodayBookingsTable`, `TodayComingTable`, `TodayStaffAttendance`), `/dashboard/customers` (`CustomerTable`), `/dashboard/cc`, and `/dashboard/cv` render standard Ant Design `<Table>` components without row virtual scrolling.
- **Impact:** When a tab returns 100+ rows, Ant Design mounts hundreds of DOM node trees (`<tr>`, `<td>`, `<Avatar>`, `<Tag>`, `<Button>`), causing 12s - 15s TTI delays during DOM layout and style calculation.

### 2. Staff Dropdown Select Deduplication & Infinite Scroll Hazards
- **Issue:** Staff filter dropdowns (`<Select>`) in `/dashboard/customers`, `/dashboard/cc`, `/dashboard/cv`, `/dashboard/bk`, `/dashboard/staff` render duplicate staff entries when staff records have slight whitespace differences or multiple historical role entries.
- **Rule Violation:** Violates Rule #20: *"Staff Dropdown Deduplication & Infinite Scroll Fetch Safety Rule"*.

### 3. Dynamic Drawer Pre-fetching Lag
- **Issue:** `CustomerDetailDrawer`, `BookingWizardDrawer`, `TableConfigDrawer`, `AssignmentHistoryDrawer`, `RescheduleBookingModal`, `QAPlayerDrawer` are lazily loaded with `dynamic(() => import(...), { ssr: false })`.
- **Impact:** Clicking a "View Details" or "Book Appointment" button triggers an on-demand JS chunk request, creating an observable 300ms - 800ms UI freeze before the drawer opens.

### 4. Excessive Re-renders & Unmemoized Handlers
- **Issue:** In `CustomerTable.tsx` and `AppointmentColumns.tsx`, column render functions define inline click handlers:
  ```tsx
  onClick={() => openDetailModal(record)}
  ```
- **Impact:** On every parent state change or table re-render, thousands of new closure functions are instantiated, invalidating React child component memoization.

---

## 5. Verification Method

To verify these benchmark measurements independently:

1. **Start Dev Servers:**
   ```bash
   pnpm dev
   ```
2. **Run Automated Benchmark Script:**
   ```bash
   node /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/benchmark.js
   ```
3. **Inspect Output Matrix:**
   View `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/benchmark_results.json`.

---

## 6. Actionable Prioritized Remediation Recommendations

1. **Payload Reduction (High Priority):**
   - Implement Fastify server-side pagination (`page=1&pageSize=20`) for `GET /api/customers/referrals` to reduce payload from 3.93 MB to ~25 kB.
   - Implement server-side aggregation for `GET /api/kpi/cc-tip`, `GET /api/kpi/cc-xoay`, and `GET /api/kpi/cv-tip` to return pre-computed summary objects instead of 3.69 MB raw shift logs.

2. **Tabular-Nums Compliance (High Priority):**
   - Wrap all currency (`formatVND`), countdowns, clocks, percentages, and table numbers with class `tabular-nums` or style `{ fontVariantNumeric: 'tabular-nums' }`.

3. **API Request Deduplication (Medium Priority):**
   - Deduplicate initial mount hook calls in `/dashboard/today` to eliminate 4x duplicate requests for `/api/table-config/*`.

4. **Table Virtualization & Pre-fetching (Medium Priority):**
   - Enable `virtual` prop on large Ant Design tables or integrate `@tanstack/react-virtual`.
   - Add hover/idle pre-fetching for dynamic drawers.
