# Sales, Booker, Telesales, LoCa & OmiCall Rules

> Extracted from root/legacy `AGENTS.md` in Wave 0. Covers Booker metrics, allocation batches, LoCa touchpoint schedules, callback sync, and OmiCall diagnostics.

---

## 1. Booker Salary API Configuration & Privacy

- **No External Shared API**: Never call external `api.wingslashes.com` endpoints from CRM tools or reports.
- Always route Booker salary exports through the internal Fastify endpoint with its integration key:
  `GET /api/kpi/export-booker-salary?key=FDC0D0A177694777A&booker=...&date_from=...&date_to=...`

---

## 2. Booker "Booked / Tạo Lịch" Productivity Metric

- All Booker/Telesales reports, KPI widgets, modals, and leaderboards counting **"Booked / Đặt lịch / Tạo lịch"** MUST filter by **order creation timestamp (`order.date_created`)** within the selected period (measuring booking labor productivity).
- Never combine `order.date_created` with `OR order.booking_date_start` (appointment arrival date) when counting Booked productivity.

---

## 3. Telesales Leaderboard Ranking & Default Selection

- **Ranking Metric**: Backend (`/api/kpi/leaderboard`) and frontend leaderboard sorting MUST rank Telesales by actual productivity (`totalBooked` / `booked` count or `totalCheckin` / `done` count), NEVER by `totalEarnings` (base salary + allowances would push 0-booking staff without missed-call penalties to #1).
- **Default Selection**: When opening the Telesales Dashboard modal without an active selection (or if the selected person is absent in the filtered period), automatically select the **Top 1 Booker by Booked count** instead of array index `0` or hardcoded initials like `'TN'`.

---

## 4. Booker Selector Option & Chạm 24h Invariants

- **Booker Selector Label/Value**: Every Booker/Telesales `<Select>` on campaign pages (LoCa, NYC) MUST use option value `'ALL'` with display label **`All Bookers`** (never `'all'`, raw `'ALL'`, or `'Tất cả nhân sự'`).
- **Chạm 24h Yesterday-Only (`key: 'now'`)**: In LoCa campaigns, `Chạm 24h` MUST strictly filter customers who visited **yesterday only** (`daysMin: 1, daysMax: 1`, `DATEDIFF(NOW(), last_visit) = 1`) — strictly excluding today's visitors (`0 days`).

---

## 5. Booker Allocation Batch Workflow & Intersecting Queries

- **Auto-Select Latest Batch**: When a Booker opens `/dashboard/customers?assignedStaffId=me` and selects the `⚡ Đợt phân bổ` tab, automatically select the newest (or today's) batch so work starts immediately.
- **Real-Time Call Progress**:
  $$\text{Completion \%} = \frac{\text{Customers with interaction/call log since acceptedAt/createdAt}}{\text{Total customers in batch}} \times 100\%$$
  Display clearly as `Đã gọi: X KH | Còn lại: Y KH (Tổng Z KH)`.
- **URL F5 Persistence**: Sync active tab and batch onto URL as `?tab=ALLOCATION&batchId=<ID>&assignedStaffId=me` via `window.history.replaceState` so refreshing restores the exact active batch.
- **Call Outcome Badging & 1-Click Call**: Each row MUST display latest call outcome (`Chưa gọi`, `Đã nghe máy`, `Không nhấc máy` / `Máy bận`, `Hẹn gọi lại`) with a 1-click OmiCall action.
- **Intersecting Batch Query (`bStr` & `bStrStats`)**: In `GET /api/customers` and `/stats`, when `allocationBatchId` is supplied, query `customerId` from `crmAllocationBatchItem` (`where: { batchId }`) and **intersect** with `allowedUserIds` using a `Set` (`bSet.has(id)`). Never overwrite or bypass the Booker's permission set (`allowedUserIds`).

---

## 6. LoCa Campaign 8-Touchpoint Customer Care Schedule

- **Goal**: Help customers with active Combo Live packages complete all remaining new/touch-up visits before expiry and convert repeat visits.
- **8 Standard Touchpoints**:
  1. `Chạm 24h`: Post-visit satisfaction check (visited yesterday).
  2. `Chạm 17n`: First touch-up reminder (optimal touch-up window is within 21 days).
  3. `Chạm 19n`: Second reminder if not yet booked by day 17.
  4. `Chạm 21n`: Final day for 21-day touch-up pricing (single-visit customers).
  5. `Chạm 23n`: Reminder for Combo holders (who get 25 days for touch-up deductions).
  6. `Chạm 25n`: Final day for Combo holders to use a package touch-up visit.
  7. `Chạm 30n`: 5 days past the 25-day touch-up window; advise using a full new-set visit from their Combo.
  8. `Chạm 30n+`: Assist customer in consuming remaining new-set visits before Combo expiry.
- **1-Click Interaction (`LocaTouchpointCell.tsx`)**: Clicking a cell toggles the flag and opens `<Popover>` for customer feedback notes using high-contrast buttons (Gold `#D4A84B`, Emerald `#059669`, Red dashed `#EF4444`).

---

## 7. Unified Touchpoint Callback & Daily Plan Synchronization

- **Unified Callback Recognition (`has_callback = 1`)**: A customer qualifies for the **Callback Tab** if ANY of the 3 conditions holds:
  1. Touchpoint status = `'CALLBACK'` (`crm_loca_touchpoints.status = 'CALLBACK'`).
  2. `crm_daily_plans.planned_date >= CURDATE()`.
  3. `crm_call_logs.callback_date >= CURDATE()`.
- **Auto-Sync Daily Plan**: Selecting `'CALLBACK'` from `LocaTouchpointCell` or `CampaignTouchpointCell` MUST `upsert` a `crm_daily_plans` record with `plannedDate = callbackDate` under `'LOCA_CALLBACK'` / `'CAMPAIGN_CALLBACK'`, populating `callbackDate` so the UI renders the glowing purple `#a855f7` clock badge 🕒.
- **3-Way Dual-Query Alignment**: In `apps/api/src/modules/customers/routes.ts`, always update `bStr` (Listing), `bStrStats` (Stats), and `count_CALLBACK` (Count subquery) together so tab counts and table rows match 100%.

---

## 8. Proactive OmiCall SIP & Gateway Diagnostics

- Whenever users report call setup failures (`00:00 KHÔNG BẮT MÁY`, immediate hangup, trunk errors), do NOT assume it is a UI-only bug.
- Test SIP WebSocket `REGISTER` & `INVITE` directly against `wss://sig.omicrm.com` with CRM extension credentials (e.g., Ext `106` / realm `quangnguyen2`) to inspect `200 OK` vs `401/407` vs `480 Temporarily Unavailable` / `Q.850 cause 16` (depleted OmiCall balance / carrier trunk lock).
- **Simulation Fallback**: All CRM OmiCall widgets MUST support toggling between `SIP Thực tế` and `Mô phỏng (Test)` and auto-fallback gracefully to Simulation Mode when carrier credit/SIP fails so Call Wrapup & AI Analysis QA are unblocked.
