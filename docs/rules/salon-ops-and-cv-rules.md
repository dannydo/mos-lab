# Salon Operations, CC/CV Gamification, Payroll & Order Lifecycle Rules

> Extracted from root/legacy `AGENTS.md` in Wave 0. Covers CC Bonus/Tip/Daily Sales/Wheel Hardcap, VAT 8%, FAL & 02:00 AM regeneration, Order Lifecycle SOP, Touch-up windows, CV Servicing Speed, CV Leave Pay, Active Salons, and Staff Branch/Schedule DB-first rules.

---

## 1. CC Gamification, Level Bonus & DB Sync

- **Level Formula**: $100\text{ pts} = 1\text{ Level}$, $\text{Level} = \lfloor \text{prevPoints} / 100 \rfloor + 1$. Resets to Level `1` (`0` pts) on the 1st of every month (`YYYY-MM-01 00:00:00`).
- **Shift Bonus**: $\text{CC Bonus (đ)} = \text{Level CC} \times 65\text{đ}$. When `CC IN != CC OUT`, split **50/50** for both `+pts` and `CC Bonus (đ)`.
- **Ordering & Accumulation**: Sort shifts newest-first (`ORDER BY ro.actual_booking_date_start DESC, os.id DESC`) and accumulate `Points Accu` chronologically from oldest to newest per CC. Leaderboard totals MUST reconcile 100% with shift-level rows.
- **Primary Data Source & Fallback**: Query finalized accounting cash bonuses directly from legacy `staff_bonus` (`bonus_type = 'Cash'`, `staff_bonus_rule_id = 248`), populated by `OrderRegenerationService.php`. Keep `calculateCcBonus(level, isSplit)` in `CcKpiService` solely as a fallback when valid shifts lack `Cash` rows.
- **Active CC Config & Paystub Live**: All CC tabs MUST filter by `crmConfig` key `ACTIVE_CC_STAFF_CONFIG`. Live Paystub formula: `Lương Giờ + Thưởng CC Xoay + Thưởng Combo & SP + Thưởng Minigame + Thưởng CC Tip (20%)`.
- **No Monthly Sales Bonus for CC**: CC has NO monthly sales commission — only CC Xoay Shift Bonus, CC Daily Bonus, and CC Tip (20%).

---

## 2. CC Tip Bonus, 20K Threshold & Heart Symbol (Kinh Thánh `TIP-001`)

- **20K Tip-Visit Threshold**: Only tips **$\ge 20.000\text{đ}$** per bill count as a tipped visit (`totalTippedVisits` + 1 and `% Tip Rate`).
- **Small Change ($< 20.000\text{đ}$)**: Still paid out 100% into staff income (CV 70%, CC 20%, CS 3%) but MUST NOT increment `totalTippedVisits` or `% Tip Rate`. Support 4 filters: `ALL` | `TIPPED` | `SMALL_CHANGE` | `NO_TIP`.
- **CC Share & Split**: CC receives 20% (`staff_tip.tip_percentage = 20`); when `CC IN != CC OUT`, split **50/50** (`tip_percentage = 10` each).
- **Completed Only & No SQL Duplication**: Count tips only from `order_state = 'Completed'`. Never `JOIN order_service` or `JOIN staff_bonus` when summing `staff_tip.tip_amount` (multi-service orders would duplicate tips) — query `staff_tip` JOIN `order` directly.
- **Official Tip Icon**: Always use **`♥`** (Heart) across all lists, checkout screens, thermal receipts, and reports (`♥ 50K`, `♥ Tiền tip chuyên viên`).

---

## 3. Checkout VAT 8% Standard (Kinh Thánh `VAT-001`)

- **All Revenue Subject to 8% VAT (Except Tip)**: Single services, combo upgrade fees (`upgrade_price`), new combo packages, and retail products incur 8% VAT.
- **Grand Total Formula**:
  `Grand Total = Tạm tính (Subtotal) + Math.round(subtotal * 0.08) + Tiền Tip (♥) - Cấn trừ Kim Cương (💎)`
- **Tip Exemption**: Tips incur **0% VAT** and allocate 100% to staff pools (CV 70%, In/Out 20%, Fund 10%).
- **Thermal Receipt (Screen 14)**: MUST print `Thuế VAT (8%)` explicitly between Subtotal and Tip.

---

## 4. CC Daily Sales Bonus Pipeline & Wheel 1.5x Hardcap

- **4 Qualifying Revenue Categories**: (1) New Combo Sales (`order_service_combo`), (2) Retail Products (`order_product`), (3) Debt Collection (`user_debt_payment`), (4) Combo Upgrades (`order_service.upgrade_price > 0`).
- **Owner & Date Anchor**: Owner is `COALESCE(check_out_staff_id, check_in_staff_id)`; date anchor is `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` (NEVER `staff_bonus.date_created` or `order.date_created`).
- **Immutable 4-Step Pipeline**:
  1. **Split 50/50 FIRST**: When `CC IN != CC OUT`, split each order's revenue 50/50 (applied to ALL 4 categories); if equal, 100%.
  2. **Aggregate Per-CC Per-Day** on the post-split revenue.
  3. **Lookup Daily Tier Rate**: `<5M: 0.5%` | `5-10M: 1%` | `10-15M: 1.5%` | `15-20M: 2%` | `≥20M: 2.5%`.
  4. **Compute Bonus**: `daily_bonus = Math.round((total_sales * tier_rate) / 100)`.
  - _Warning_: Do NOT copy WingsLashes PHP (`generate-staff-payroll-user-group.php` L348-350), which adds raw `check_in_amount + check_out_amount` and double-counts when `CC IN = CC OUT`.
- **Cash-Based Combo & Debt Collection**: New combo revenue with debt (`user_debt.debt_amount > 0`) counts only actual cash collected (`net_price - unpaid_debt_amount`). Subsequent payments in `user_debt_payment` credit **Debt Collection** for the CC IN/OUT of that collection shift (split 50/50 if different).
- **Combo Package JOIN Rule (`order_service_combo`)**: 99.3% of `order_service_combo.check_in_staff_id` / `check_out_staff_id` rows are `NULL` in legacy DB. Always `JOIN order_service os ON os.id = osc.order_service_id` and read `os.check_in_staff_id` / `os.check_out_staff_id`.
- **CC Xoay (Wheel Bonus) 1.5x Hardcap**: Total monthly Wheel/Minigame bonus cannot exceed $1.5 \times \text{monthlyDailyBonus}$. Always compute via `calculateWheelBonusCap(monthlyDailyBonus, rawWheelBonus)` in `packages/shared/src/utils/wheel-cap.ts` (`NORMAL < 80%`, `WARNING 80–99% ⚠️`, `HARDCAPPED ≥ 100% ⛔`).

---

## 5. FAL (Fix, Adjust, Log, Replace) & 02:00 AM Batch Regeneration

- **Adjust (`next_adjust_order_service_id`)**: Consultation error — **original CC** forfeits 100% of original points & bonus regardless of duration; **original CV keeps 100%**. For the new Adjust shift (duration = `servicing_minute + cleaning_minute`): if positive $\le 25$ min → CV gets **15 Chuối**, CC gets **5 Chuối** (50/50 if CC IN ≠ CC OUT), placed at **head of queue (tua đầu)**; if $> 25$ min → treated as **Normal** shift at **tail of queue (tua cuối)**. Zero/missing duration requires review (no auto FAL). Keep forfeiture ledger & new-shift reward ledger strictly separate (`staff_bonus` is source of truth; do not infer/zero CV bonuses).
- **Log (`next_log_order_service_id` / service price `Log`)**: Customer changed mind (removal/check), NOT a Fix/Adjust error. Original CV/CC keep 100% of original ledger. Any new Cash/BonusPoint/Chuối reward for a new Log shift MUST wait for manual **Admin / Manager / CHO approval** with logged explanation (submitter, customer reason summary, channel, approver, timestamp, `Approved`/`Rejected`). Once `Approved`: $\le 25$ min → CV **15 Chuối**, CC **5 Chuối** (50/50 split) at **tua đầu** without Normal bonus; $> 25$ min → **Normal** at **tua cuối**. Pending/Rejected/0-min → no reward ledger.
- **Fix (`next_fix_order_service_id` / service price `Fix`)**: Technical defect — **original CV** forfeits 100% of original points/bonus regardless of duration; **original CC keeps 100%** (no makeup bonus). New Fix shift: positive $\le 25$ min → CV **15 Chuối**, CC **5 Chuối** (50/50 split) at **tua đầu**; $> 25$ min → **Normal** at **tua cuối**. Separate forfeiture & reward ledgers.
- **Replace**: Full lash removal & re-application (0đ) earns full Normal bonus for the new CV while penalizing original CV under technical rules.
- **SQL Extraction**: KTV Xoay & CC Xoay queries MUST parse `falRule` (`Fix`, `Adjust`, `Log`, `Replace`) from `next_fix_order_service_id`, `next_adjust_order_service_id`, `service_type`, and `tracking_key`.
- **Midnight Cronjob**: Prod `regenerate-order-batch.php` runs at **02:00, 02:10, 02:20 ICT** scanning `1..3 days ago` to resolve 21h–23h level-inflation race conditions.

---

## 6. EOM Run-Rate Forecast & Actual Check-in Recognition

- **Shift Window**: Real store hours `09:00 – 21:00` (12h) shifted `+2h` checkout buffer to **`11:00 – 23:00`**:
  - `fractionToday = 0` (`hour < 11`), `1` (`hour > 22`), `(HOUR(NOW()) - 11 + 1) / 12` (`11 <= hour <= 22`).
  - `E = min(1.0, max(0.001, (daysElapsedBeforeToday + fractionToday) / totalDaysInPeriod))`.
  - `Projected Metric = Actual Metric / E`.
  - UI Display: Active month ($E < 1.0$) uses `Dự kiến cuối tháng:` (`text-emerald-400`, `~` prefix); past closed month ($E \ge 1.0$) uses `Thực tế chốt tháng:` (`text-slate-400 opacity-70`, no `~`).
- **Actual Check-in Anchor (`actual_booking_date_start`)**: All revenue, Combo sales, Single sales, Product sales, CC points, and CC income MUST use `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` via `LEFT JOIN report_order ro ON o.id = ro.order_id` AND `order_state = 'Completed'`. Never use `order.date_created` for revenue/combo recognition.
- **Dual-Query Alignment**: Updates to customer filters in `apps/api/src/modules/customers/routes.ts` MUST update both Listing (`bStr`) and Stats (`bStrStats`) queries together.

---

## 7. Order State Lifecycle, Touch-up Windows & Strict Staff Recognition

- **14 Order States (`Order.php` / `Config.swift`)**:
  - BK: `New`, `Confirmed`, `Cancelled`. Guard: `Parking`. Auto: `Completed`, `Missed`.
  - CC (5): `CheckIn`, `Consultation`, `Preparation` (starts pickup timer), `ServiceStart` (CV picked up customer; target $< 3$ min), `CheckOut`.
  - CV (4): `ServiceStart` (`before_attribute_value`), `ServiceCleaned` (`cleaned_attribute_value`), `ServiceEnd` (`after_attribute_value`), `ServiceCompleted` (`/order/service/done` → notifies CC for checkout and **immediately returns CV to Queue**).
  - KPIs: `Service Duration = ServiceCompleted - Preparation`; `Pickup Time = ServiceStart - Preparation` (`< 3m`); `ACTIVE_SERVICING_STATES = ['ServiceStart', 'ServiceCleaned', 'Consultation', 'Preparation', 'CheckIn', 'ServiceCompleted', 'ServiceEnd']`.
- **Touch-up Expiration**: Single / non-combo customers = **21 days**; Combo holders = **25 days** from last visit (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`). Past threshold = late touch-up (must consult full new set).
- **Strict Staff Recognition & Zero Fallback**: Unchecked/missed/cancelled orders MUST return `ccInName = null`, `ccOutName = null` (UI renders `-`); unassigned technicians (`assigned_staff_id = null`) MUST return `technicianName = null` (UI renders `-`), NEVER `"Kỹ thuật viên"` and NEVER fallback from Booker or CV into CC IN/OUT.
- **MOS API vs iOS App API Reconciliation**: `staff_bonus.date_created` reflects midnight batch timestamps (`23:59:59`/`02:00:00` $D+1$), whereas iOS UI (`ClientConsultantHomeVC`) groups by `booking_date_start` (`ReportOrder.date`). Always group by `DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))`, `SUM(sb.bonus_amount)` across 50/50 split rows, and verify against local PHP endpoints (`POST /1/staff/client-consultant/report` & `/bonus`).

---

## 8. CV Servicing Speed, CV Leave Pay, Active Salons & Staff DB-First Rules

- **CV Servicing Speed (Dynamic 90-Day iPad Benchmark)**: Measure actual iPad minutes from `report_order_service`: `preparation_minute + pre_servicing_minute + cleaning_minute + servicing_minute` (filter `o.order_state = 'Completed'`, `s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')`, `15..200` minutes, last **90 days**). Categorize `Normal -> normalAvg`, `Retain -> retainAvg`, `Removal/Fix -> removalAvg`. Both `/api/customers/ktv-daily-capacities` and `/api/customers/cv-realtime-status` MUST include `avgDurationMinutes`; `CvWorkingStaffCard` displays badges whenever any of the 3 averages exist.
- **CV Leave Pay & Annual Leave Balance**:
  - Monthly paid leave (`staff_day_off` with `request_state = 1` AND `working_minute = 0`) uses **scheduled shift hours (`staff_working_shift`)** on that day: `9h` regular shift vs `11h` full shift (`days * shiftHours * hourlyRate`). If cancelled or worked, pay actual worked hours only (no double pay).
  - Annual leave accrual (`day_off_available`): 12 days/year (1 day/month); new/re-hired contracts accrue from `payroll_date_start` ONLY — never carry over prior closed-contract days; floor remaining balance at `0`.
  - CV Payroll Structure: zero old monthly KPI tiers (delete `tracking_key.level`), keep actual `staff_bonus` wheel shifts, keep separate 2/9 holiday allowance (`+229.500đ`), fixed 200,000đ parking, seniority `%` on wheel shifts, minus 10.5% BHXH (`Net = Gross - 10.5% BHXH`).
- **Active Lash Salons (`ACTIVE_LASH_SALONS`)**: Only 2 physical lash salons operate (`#6 Đề Thám` / `DT`, `#16 Estella Place` / `EP`; excluding `Academy - Đề Thám`, `HQ`, `Phan Xích Long`). All operational booking/report dropdowns MUST read from `ACTIVE_LASH_SALONS` (`@mos-lab/shared`) / `STORES` (`apps/web/components/booking/constants.ts`).
- **Staff Branch & Schedule DB-First**: Never guess staff branches/shifts. Query MySQL `user_profile.client_store_id` JOIN `client_store_language` (`1=CMT8, 2=PXL, 6=Đề Thám, 11=Kỳ Đồng, 15=Him Lam, 16=Estella Place`), `staff_working_shift`, `report_staff`, and `staff_day_off`.
- **Fixed Weekly Off (`staff_day_off_schedule`)**: Query master table `staff_day_off_schedule` (`is_disabled = 0 AND user_id IS NOT NULL`, `weekday` `1=Mon..7=Sun`) first; fall back to 90-day `staff_day_off` / `staff_working_shift_schedule` ONLY when unconfigured. Keep `staff_day_off` distinct as date-specific leave tickets (`approvedOffDates`).
