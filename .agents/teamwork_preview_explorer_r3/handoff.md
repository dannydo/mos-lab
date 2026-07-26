# Handoff Report: R3 — Business Logic Gaps & Edge Cases Review for Catalog Management

## 1. Observation

### 1.1 Source Code & DB Schema Locations Examined

1. **`apps/api/src/modules/customers/services/combo-recognition.service.ts`**:
   - Lines 48-64:
     ```typescript
     LEFT JOIN service_price sp_nl ON osc_nl.service_price_id = sp_nl.id
     LEFT JOIN service s_nl ON osc_nl.service_id = s_nl.id
     LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
     WHERE o_nl.order_state = 'Completed'
       AND osc_nl.total_price > 0
       AND (sp_nl.service_price_package_key IS NULL OR (
         LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%'
         AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%refill%'
         AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%balance%'
       ))
     ```
   - Lines 77-86: Similar check for single/refill/balance exclusion on `os_nl.user_service_type = 'combo'` or `s_nl.service_group = 'combo'`.

2. **`apps/api/src/modules/customers/routes.ts`**:
   - Lines 922-925, 972-975, 1014-1017, 4809-4812:
     ```sql
     AND (sp.service_price_package_key IS NULL OR (
       LOWER(sp.service_price_package_key) NOT LIKE '%single%'
       AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
       AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
     ))
     ```
   - Lines 2337, 2888, 3187:
     ```sql
     LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
     ```

3. **`apps/api/prisma/legacy.prisma`**:
   - Model `service` (lines 119-151):
     - Line 121: `client_id Int @db.UnsignedInt` (`NOT NULL`)
     - Line 122: `client_business_id Int @db.UnsignedInt` (`NOT NULL`)
     - Line 123: `parent_service_id Int? @db.UnsignedInt` (`Nullable`)
     - Line 125: `service_type String @db.Char(30)` (`NOT NULL`)
     - Line 126: `service_group String @db.Char(30)` (`NOT NULL`)
     - Line 147: `is_disabled Boolean`
   - Model `order` (lines 23-64):
     - Line 25: `client_id Int @db.UnsignedInt`
     - Line 26: `client_business_id Int @db.UnsignedInt`
     - Line 33: `currency_id Int @db.UnsignedInt`
   - Model `user_service_balance` (lines 225-248):
     - Lines 227-228: `client_id`, `client_business_id` (`NOT NULL`)
     - Lines 234-235: `service_price_id Int?`, `service_price_group String?`

4. **WingsLashes Legacy PHP Codebase**:
   - `Server/src/api/1/app/models/Service.php`:
     - Lines 10-16: `TYPE_NORMAL = "Normal"`, `TYPE_RETAIN = "Retain"`, `TYPE_FIX = "Fix"`, `TYPE_ADJUST = "Adjust"`, `TYPE_REMOVAL = "Removal"`, `TYPE_LOG = "Log"`, `TYPE_PRODUCT = "Product"`
     - Lines 18-22: `GROUP_LASHES = "Lashes"`, `GROUP_LASHES_TOP = "LashesTop"`, `GROUP_LASHES_UNDER = "LashesUnder"`, `GROUP_SAUNA = "Sauna"`, `GROUP_PRODUCT = "Product"`
     - Lines 171: `Service.parent_service_id IS NULL` for top-level services
     - Lines 496-501: `getServiceRetain($serviceId)` queries `parent_service_id = $serviceId AND service_type = 'Retain'`
   - `Server/src/api/1/app/models/ServicePrice.php`:
     - Lines 8-12: `SERVICE_PRICE_TYPE_COMBO = "Combo"`, `SERVICE_PRICE_TYPE_LOG = "Log"`, `SERVICE_PRICE_TYPE_FIX = "Fix"`, `SERVICE_PRICE_TYPE_ADJUST = "Adjust"`, `SERVICE_PRICE_TYPE_SINGLE = "Single"`
     - Lines 15-17: `SERVICE_PRICE_GROUP_SINGLE_COMBO = "single_combo"`, `SERVICE_PRICE_GROUP_SHARE_COMBO = "share_combo"`, `SERVICE_PRICE_GROUP_FIX_COMBO = "fix_combo"`
     - Lines 19-20: `SERVICE_PRICE_PACKAGE_KEY_SINGLE = "single"`, `SERVICE_PRICE_PACKAGE_KEY_BALANCE = "balance"`
   - `Server/src/admin/apps/models/DbTable/CurrencyDbTable.php`:
     - Lines 27, 55, 62: `currency_code`, `is_default`, `is_disabled`
   - `Server/src/admin/apps/modules/admin/controllers/ServiceController.php`:
     - Lines 180-199: `ajaxEditStatusAction` toggles `service.is_disabled` without updating child `service_price` records.

5. **Project Rules (`AGENTS.md`)**:
   - Rule #13: FAL (Fix, Adjust, Log) Rules ($\le 25$ min service rules, bonus/punishment tracking).
   - Rule #16: Eyelash Touch-up Expiration Window Rules (Single/Non-combo: max 21 days; Combo package: max 25 days).
   - Rule #21: Unified Combo Recognition & Date Range Parsing Invariant.

---

## 2. Logic Chain

### 2.1 Multi-Currency Handling Audit

- **Observation**: Legacy schema `service_price` and `product_price` define `currency_id` as `NOT NULL`. In `mos-lab` API, queries implicitly hardcode `currency_id = 3` (for diamond/credit points balance) or `currency_id = 1` (for fiat VND).
- **Reasoning Step 1**: If a single-tenant Catalog API creates a `service_price` or `product_price` record without providing `currency_id`, MySQL will reject the query with `Field 'currency_id' doesn't have a default value`.
- **Reasoning Step 2**: Legacy data contains multiple currency records (`1` = VND, `3` = Credit Points). Failing to assign or filter `currency_id` when querying prices causes multi-currency mixing, corrupting financial totals.
- **Risk Rating**: **HIGH**

### 2.2 Multi-Store / Client Tenancy Audit

- **Observation**: Legacy tables `service`, `product`, `order`, and `user_service_balance` require `client_id` and `client_business_id` as `NOT NULL` columns. Key KPI routes (`export.routes.ts`, `bk.routes.ts`) filter `WHERE client_business_id = 1`.
- **Reasoning Step 1**: Inserting new services or products without `client_id` or `client_business_id` causes immediate database write failures.
- **Reasoning Step 2**: If catalog items are created with `client_business_id` set to `0` or `NULL`, all backend KPI reports, Leaderboards, and Combo Recognition queries with `WHERE client_business_id = 1` will ignore these items.
- **Risk Rating**: **HIGH**

### 2.3 Parent-Child Service Hierarchy Audit

- **Observation**: `service.parent_service_id` links child services (`Retain`, `Fix`, `Removal`) to root services (`Normal`). In `mos-lab`, `parent_service_id` is currently unreferenced in route handlers and DTOs.
- **Reasoning Step 1**: Without parent-child links, the system cannot identify which Dặm mi (Retain) service corresponds to a parent Nối mi (Normal) service when evaluating touch-up eligibility windows (Rule #16: 21-day vs 25-day touch-up rules).
- **Reasoning Step 2**: Admin catalog UI would display child services (Dặm mi, Fix) alongside root services without hierarchy, causing user confusion during service management and booking.
- **Risk Rating**: **MEDIUM**

### 2.4 Enum & Constant Specifications Audit

- **Observation**: WingsLashes PHP defines exact strings: `service_type` (`Normal`, `Retain`, `Fix`, `Adjust`, `Removal`, `Log`, `Product`), `service_group` (`Lashes`, `LashesTop`, `LashesUnder`, `Sauna`, `Product`, `combo`), and `service_price_type` (`Single`, `Combo`, `Log`, `Fix`, `Adjust`).
- **Reasoning Step 1**: If Catalog Management APIs allow casing variations (e.g. `'fix'` instead of `'Fix'`), FAL rules (Rule #13) and KPI calculations that use SQL exact match `service_type = 'Fix'` will silently fail to compute technician bonuses.
- **Reasoning Step 2**: Booking lookup queries rely on exact `sp.service_price_package_key = 'single'`. Any variation (e.g. `'Single'`, `'SINGLE'`, `'single_price'`) breaks single service price retrieval.
- **Risk Rating**: **MEDIUM**

### 2.5 Cascading Disabling & Deletion Effects Audit

- **Observation**: Legacy `ServiceController.php` toggles `service.is_disabled = 1` without modifying `service_price.is_disabled`. Historical orders and balances store `service_id` and `service_price_id`.
- **Reasoning Step 1**: If `service.is_disabled = 1` but `service_price.is_disabled = 0`, standalone queries on `service_price` will treat prices of disabled services as active.
- **Reasoning Step 2**: Hard-deleting a service (`DELETE FROM service`) breaks foreign key constraints and corrupts historical accounting data in `order_service` and `report_order`.
- **Reasoning Step 3**: Blocking all operations on a disabled service prevents customers with active prepaid combo balances (`user_service_balance`) from redeeming sessions they already paid for.
- **Risk Rating**: **HIGH**

### 2.6 Package Key Format Conventions & ComboRecognitionService Audit

- **Observation**: `ComboRecognitionService` and `routes.ts` recognize Combo sales by excluding prices/services containing `%single%`, `%refill%`, or `%balance%` in `service_price_package_key` or `service_name`. Booking routes rely on `sp.service_price_package_key = 'single'`.
- **Reasoning Step 1**: If a single-service base price or refill package is saved with an arbitrary key (e.g., `'standard'`, `'session_1'`), `ComboRecognitionService` will NOT exclude it, misclassifying individual sales as **Combo Sales** and artificially inflating CC KPI revenue.
- **Reasoning Step 2**: If a single-service price uses anything other than `'single'` for its package key, booking APIs will fail to retrieve the service price.
- **Risk Rating**: **HIGH**

---

## 3. Caveats

- **No Source Code Modified**: As required by the Explorer role, no code files in `apps/api` or `apps/web` were modified. This report provides complete actionable specifications for implementers.
- **Legacy Database Constraints**: All proposed fixes operate within the existing schema constraints of `legacy.prisma` and `management` MySQL database without altering legacy table column names.

---

## 4. Conclusion & Actionable Recommendations

### 4.1 Summary of Risk Ratings

| Scope / Feature Area                  | Risk Rating | Core Vulnerability                                                                            |
| :------------------------------------ | :---------: | :-------------------------------------------------------------------------------------------- |
| **1. Multi-Currency Handling**        |  **HIGH**   | Missing `currency_id` causes SQL insert crashes; currency mixing distorts revenue.            |
| **2. Multi-Store / Tenancy Defaults** |  **HIGH**   | Omitted `client_id` / `client_business_id` causes SQL write failures and report invisibility. |
| **3. Parent-Child Hierarchy**         | **MEDIUM**  | Unlinked Retain/Fix services break 21/25-day touch-up expiration rules (Rule #16).            |
| **4. Valid Enum Specifications**      | **MEDIUM**  | Enum casing drift breaks FAL bonus rules (Rule #13) and single-price SQL joins.               |
| **5. Cascading Effects**              |  **HIGH**   | Disabling services leaves orphan active prices; hard deletion corrupts audit logs.            |
| **6. Package Key Conventions**        |  **HIGH**   | Arbitrary package keys trigger false-positive combo recognition in `ComboRecognitionService`. |

### 4.2 Concrete Proposed Fixes & Implementation Specifications

#### Fix 1: Single-Tenant Tenancy & Multi-Currency Defaults

- Define central constants in `@mos-lab/shared`:
  ```typescript
  export const CATALOG_DEFAULTS = {
    CLIENT_ID: 1,
    CLIENT_BUSINESS_ID: 1,
    DEFAULT_CURRENCY_ID: 1, // 1 = VND Fiat
    CREDIT_CURRENCY_ID: 3, // 3 = Diamond/Credit Points
  } as const;
  ```
- Fastify Catalog mutation services MUST automatically inject `client_id: 1`, `client_business_id: 1`, and `currency_id: 1` into all `INSERT INTO service` and `INSERT INTO service_price` operations if omitted.

#### Fix 2: Parent-Child Service Hierarchy Management

- Update Service schema DTOs to include `parent_service_id: number | null`.
- Admin UI must allow selecting a parent service when creating a service of type `Retain`, `Fix`, or `Removal`.
- Implement API query helper `getServiceRetain(parentServiceId)` to resolve child refill services for touch-up expiration checks (Rule #16).

#### Fix 3: Strict TypeScript Enums

- Export strict enums in `@mos-lab/shared`:
  ```typescript
  export enum ServiceType {
    NORMAL = 'Normal',
    RETAIN = 'Retain',
    FIX = 'Fix',
    ADJUST = 'Adjust',
    REMOVAL = 'Removal',
    LOG = 'Log',
    PRODUCT = 'Product',
  }

  export enum ServiceGroup {
    LASHES = 'Lashes',
    LASHES_TOP = 'LashesTop',
    LASHES_UNDER = 'LashesUnder',
    SAUNA = 'Sauna',
    PRODUCT = 'Product',
    COMBO = 'combo',
  }

  export enum ServicePriceType {
    SINGLE = 'Single',
    COMBO = 'Combo',
    LOG = 'Log',
    FIX = 'Fix',
    ADJUST = 'Adjust',
  }
  ```
- Enforce strict validation in Fastify request schemas to block invalid casing or unlisted strings.

#### Fix 4: Safe Soft-Disable & Immutable Audit Trail

- **Soft-Disable Cascade**: When updating a service to `is_disabled = 1`, execute:
  `UPDATE service_price SET is_disabled = 1 WHERE service_id = ?`
- **Hard-Delete Prohibition**: Disable physical SQL `DELETE` queries on catalog tables; enforce soft-disabling (`is_disabled = 1`).
- **Balance Redemption Protection**: Allow package balance redemptions (`user_service_balance`) if `date_expired >= NOW()` and `normal_count > 0`, even if `service.is_disabled = 1`. Block new purchases only.

#### Fix 5: Package Key Naming Standard for `ComboRecognitionService`

- Enforce package key naming rules during `service_price` creation/update:
  1. Base Single Price: `service_price_package_key` MUST BE `'single'`.
  2. Package Balance Key: `service_price_package_key` MUST BE `'balance'`.
  3. Refill / Touch-up Key: `service_price_package_key` MUST contain `'refill'` (e.g. `'refill_21'`).
  4. Combo Package Key: `service_price_package_key` MUST follow `combo_<count>_<descriptor>` (e.g. `combo_3_classic`) and MUST NOT contain `'single'`, `'refill'`, or `'balance'`.

---

## 5. Verification Method

### 5.1 Verification Commands

- Run workspace typecheck & linting:
  ```bash
  pnpm lint
  pnpm --filter @mos-lab/shared build
  pnpm --filter @mos-lab/api build
  ```

### 5.2 Files to Inspect

- `apps/api/src/modules/customers/services/combo-recognition.service.ts`
- `apps/api/src/modules/customers/routes.ts`
- `apps/api/src/modules/customers/routes/booking.routes.ts`
- `packages/shared/src/types/catalog.ts` (when implemented)

### 5.3 Invalidation Conditions

- Any query in `ComboRecognitionService` returning a non-combo single order due to malformed `service_price_package_key`.
- Database write errors on `service` or `service_price` due to missing `client_id`, `client_business_id`, or `currency_id`.
- Incorrect FAL bonus calculations resulting from non-standard `service_type` casing.
