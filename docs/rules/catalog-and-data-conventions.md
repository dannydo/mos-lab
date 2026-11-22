# Catalog, Combo Recognition & Cross-Cutting Data Conventions

> Extracted from root/legacy `AGENTS.md` in Wave 0. Covers Single Source of Truth services, local `wingslashes` inspection, Combo recognition & date bounds, VND integer rounding, search normalization, React hook stability, and centralized constants.

---

## 1. Unified Business Logic & External API Inspection

- **Single Source of Truth**: Whenever 2+ pages, tabs, leaderboards, or exports compute the same business metric, never duplicate SQL queries or frontend `.reduce()` math. Implement one Fastify service under `apps/api/src/modules/**/services` with shared DTOs in `@mos-lab/shared`.
- **Inspect Local `wingslashes` Source Code**: When a user shares an external URL (`https://api.wingslashes.com/...` or `https://api.orb/...`), never call the external endpoint directly — inspect the local `wingslashes` codebase to verify exact SQL and formulas.

---

## 2. Unified Combo Recognition, Bounds & Combo Live

- **Combo Sale Definition**: Requires (1) `order.order_state = 'Completed'`, (2) `order_service_combo` (`total_price > 0`, key excluding `%single%`, `%refill%`, `%balance%`) OR `order_service` (`user_service_type = 'combo'` or `service_group = 'combo'`), and (3) `user_service_balance` updated.
- **Date Range Parsing**: Always use `parseComboDateBounds` so `dateFrom` -> `YYYY-MM-DD 00:00:00` and `dateTo` -> `YYYY-MM-DD 23:59:59`. Never truncate with `.slice(0, 19)`.
- **Central Service**: CC, New LoCa, Booker, and Customer filters MUST share `ComboRecognitionService` (`apps/api/src/modules/customers/services/combo-recognition.service.ts`).
- **Pure Combo & 4 Count Fields**: Combo lists/forms filter `service_price_type = 'Combo'` (excluding `Fix`/`Adjust`/`Log`) and split 4 counts: `normalCount`, `bonusNormalCount`, `retainCount`, `bonusRetainCount` (parsing legacy `X+Y` names).
- **Combo Live Done Bonus (1.000đ) & Telesale KPI**: Customers with remaining live combo sessions (`normal + retain > 0` and unexpired at `order.date_created`, via `checkHasLiveCombo` / `buildComboLiveAtBookingSql`) earn BK a flat **1.000đ** upon `Completed` and show `Combo Live` (not `Giảm: 0%`). Only non-Combo-Live orders count toward official Telesale Done KPI; Combo Live Done is tracked separately.

---

## 3. Catalog Stock, VND Rounding, Hidden Filter & Authorization

- **VND Whole Number Invariant**: All VND prices, API responses, displays, and exports MUST be integers (`Math.round(...)`), never decimals (`681818.1818` from pre-VAT legacy floats). Filter `product_price` and `service_price` by `currency_id = 2` (VND).
- **Product Stock**: Link `product.inventory_item_id` → `inventory_warehouse_item.inventory_item_id` where `item_state = 'New'` for `inStockCount`.
- **Auto-Suggested Combo Price**: $\text{Retail Price} \times \text{Purchased Count}$ (bonus turns `bonusNormalCount`/`bonusRetainCount` are 0đ); auto-fill on selection while permitting admin override.
- **Exclusive Hidden Items Filter**: Toggle OFF = active only (`!record.isDisabled`); toggle ON = exclusively hidden items (`record.isDisabled`).
- **Catalog Write Auth & Language Fallback**: `requireCatalogAdmin` allows `admin` role or approved admin usernames/emails (`admin`, `danhdo@gmail.com`) inside `$transaction`. On `PUT /catalog/services/:id`, look up `service_language` by `service_id` flexibly (don't hardcode `language_id = 1`) and create a fallback row if missing.

---

## 4. Monday-First Calendar & Tone-Insensitive Vietnamese Search

- **Monday-First Weeks**: Both frontend (`dayjs`) and backend week presets MUST run Monday `00:00:00` → Sunday `23:59:59`. Never use `dayjs().startOf('week')` (US Sunday); always use `dayjs().startOf('isoWeek')` / `endOf('isoWeek')`.
- **Tone-Insensitive Vietnamese Search**: Every search input and `<Select showSearch>` MUST match without Vietnamese diacritics using `removeVietnameseTones` from `@mos-lab/shared`:
  ```typescript
  filterOption={(input, option) =>
    removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
  }
  ```

---

## 5. Hook Stability, Tab/Bucket Alignment & Staff Infinite Scroll

- **Hook Dependency Stability**: Never pass whole returned hook objects (e.g., `[currentUser, filtersHook]`) into `useEffect` / `useCallback` deps — destructure primitive values first (`const { activeTab, selectedBatchId } = filtersHook`) to prevent infinite re-render/loading loops.
- **UI Tab vs DB Bucket (`useCustomerList.ts`)**: UI-only tabs like `'ALLOCATION'` are NOT DB buckets (`COMBO_LIVE`, `NOT_COMBO_LIVE`, `SINGLE`). Never assign `params.bucket = 'ALLOCATION'`; check `activeTab !== 'ALL' && activeTab !== 'ALLOCATION'` and pass `params.allocationBatchId`.
- **Staff Dropdown Dedup & Infinite Scroll Safety**: Deduplicate `/api/customers/staff` by trimmed case-insensitive `displayName`. All `IntersectionObserver` loaders MUST maintain `hasMore` (`false` when `< pageSize` or `>= total`) and an `isFetchingRef` guard.

---

## 6. Centralized System Constants, `user_service_type`, Lash Styles & Legacy URLs

- **System Constants (`packages/shared/src/constants/system-constants.ts`)**: Always reuse `CC_GAMIFICATION_SYSTEM_CONFIG`, `LASH_TOUCHUP_SYSTEM_CONFIG`, `OPERATIONAL_SHIFT_SYSTEM_CONFIG`, `CATALOG_CURRENCY_SYSTEM_CONFIG`, and `UI_PAGINATION_SYSTEM_CONFIG`. Never hardcode KTV hourly rate `21500` on UI — read dynamically from `staff_payroll.working_hour_rate`.
- **Dynamic `user_service_type`**: On booking create/reschedule, always call `UserServiceTypeService.determineUserServiceType(fastify, customerId, bookingDateStart)` (`new`, `combo`, `combo_last`, `combo_expired`, `combo_over`, `lapser`, `long_time`) — never hardcode `'new'`.
- **Lash Style Domain Terminology**: `Classic`, `Mink`, `Volume`, `Ultralight`, `Hyperlight`, `Flawless`, `Ivylight`, `Under Mink` are **Dòng Mi / Dáng Mi** (`LASH_STYLES` / `LashStyle` in `packages/shared/src/types/catalog.ts`, parsed via `LashBenchmarkService.parseLashSpecs()`). Never confuse `lashStyle` with `serviceType` (`Normal`/`Retain`/`Fix`/`Adjust`/`Removal`) or `serviceGroup` (`LashesTop`/`LashesUnder`/`Sauna`).
- **Legacy Customer Profile URL**: Link to `/admin/online-consultant/user/customer?phone=<number>` (supports `phone`, `phone_number`, `keyword`, `search` — never `search_keyword`).
