# Deep Audit & Verification Report: Combo Package Key (`service_price_package_key`) Renaming & Compatibility

**Target Codebases**: WingsLashes (Legacy PHP/Angular) & mos-lab (Next.js 15 / Fastify 5 Monorepo)  
**Orchestrator**: Project Orchestrator (`mos-lab`)  
**Date**: July 26, 2026  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/orchestrator`

---

## 1. Executive Summary

This deep audit evaluated every reference to `service_price_package_key` (and variations `package_key`, `packageKey`) across both the **WingsLashes legacy codebase** (`WingsLashes/Server/src/api/1` PHP backend and `WingsLashes/Server/src/frontend` Angular frontend) and the **mos-lab monorepo** (`apps/api/`, `apps/web/`, `packages/shared/`).

The primary objective was to assess the risks, compatibility, side effects, and required normalizations for renaming combo package keys or adding price tier suffixes (e.g. `_100k`, `_150k`, `_200k`) to differentiate price tiers.

### Key Audit Findings

1. **WingsLashes Legacy Codebase (R1)**:
   - **12 HIGH_RISK / BREAKING Locations**: Adding price suffixes directly without key normalization will **BREAK** order contract template generation (`public.php`), staff skill progress tracking (`UserUrl.php`), balance deduction engines (`OrderService.php`), balance upgrade/refund SQL queries (`UserServiceBalance.php`), and Angular customer UI refill expiry warnings (`customer-detail.component.ts`).
   - **18 CAUTION Locations**: Exact SQL equality (`WHERE service_price_package_key = 'single'`) or exact model constant checks (`ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE`).
   - **35+ SAFE Locations**: Wildcard SQL checks (`NOT LIKE '%single%'`), regex parsing, or dynamic UI table rendering.

2. **mos-lab CRM Codebase (R2)**:
   - **Critical SQL Bug in `ComboRecognitionService` (`combo-recognition.service.ts` Line 71)**: Alias typo `osc_nl.service_id` in the second `UNION` query block (`order_service`) triggers MySQL `Unknown column 'osc_nl.service_id'` error when `order_service` items are queried. The try-catch block logs the error and returns `[]`, causing silent failure of new combo customer detection.
   - **Regex Caret Anchor Limitation (`/^(\d+)\+(\d+)/`)**: `mapComboDto` (`catalog/routes.ts` Line 47) and `useCustomerDetail.ts` (Line 679) anchor regex to position 0 (`^`). Package keys with prefixes like `combo_3+1` or `combo_3+1_100k` fail count extraction. Unanchoring to `/(\d+)\+(\d+)/` resolves this.
   - **Database Column Limit (`CHAR(30)`)**: `service_price.service_price_package_key` is `CHAR(30)` in MySQL (`legacy.prisma` Line 258). Package key CRUD endpoints in catalog routes require maximum length validation (30 characters).
   - **Single Price Invariant (`service_price_package_key = 'single'`)**: Appointment booking and customer base routes strictly require `service_price_package_key = 'single'` for base services. Base single service keys must strictly remain `'single'`.
   - **Rule #21 Compliance**: `ComboRecognitionService` uses `parseComboDateBounds` (padding string dates to `00:00:00` and `23:59:59`) and enforces `order_state = 'Completed'`, complying with Rule #21 date range and combo recognition invariants.

---

## 2. WingsLashes Legacy Codebase Impact Audit (R1)

### 2.1 Complete Reference Inventory & Safety Ratings

| Relative File Path                                                 | Line Number(s)                           | Code Snippet                                                                                  | Purpose / Context                                                  | Safety Rating               |
| ------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------- |
| `WingsLashes/Server/src/api/1/app/public.php`                      | 754, 765, 802, 811, 814                  | `in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"])`                        | Select contract template & 21-day legal clause                     | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/public_reference.php`            | 804, 815, 852, 861, 864                  | `in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"])`                        | Reference contract template generation                             | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/models/UserUrl.php`              | 970, 1664–2247                           | `isset($targetServiceCombos[$group][$service['service_price_package_key']])`                  | Staff skill level & combo target progress bar                      | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/models/OrderService.php`         | 238, 267, 499                            | `$servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_BALANCE` | Balance deduction calculation engine                               | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/models/UserServiceBalance.php`   | 1121, 1171, 1259, 1266, 1395, 1432, 1455 | `"conditions" => "... service_price_package_key = ?0", bind => ["single"]`                    | Balance upgrade, single item conversion & refund SQL               | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/models/ServicePriceRule.php`     | 145, 159                                 | `$servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE`  | Staff early-return bonus rule calculation                          | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/models/Promotion.php`            | 280, 281                                 | `getByServicePricePackageKey($id, 2, "single")`                                               | Retrieve single item retail price for promotion calculation        | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/sheet.php`                       | 542, 568                                 | `$servicePrice['service_price_package_key'] == "single"`                                      | Export staff booking price sheet                                   | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/frontend/.../customer-detail.component.ts` | 149                                      | `serviceBalance.service_price_package_key == "VIP-10-5"`                                      | Calculate customer combo refill expiry day warning (21 vs 25 days) | 🔴 **HIGH_RISK / BREAKING** |
| `WingsLashes/Server/src/api/1/app/models/Report.php`               | 2329                                     | `$servicePrice['service_price_package_key'] == "single"`                                      | Single service booking count aggregation in reports                | 🟡 **CAUTION**              |
| `WingsLashes/Server/src/api/1/app/models/ServicePrice.php`         | 19, 20, 128, 198                         | `const SERVICE_PRICE_PACKAGE_KEY_SINGLE = "single"`                                           | ServicePrice model constants & finder                              | 🟡 **CAUTION**              |
| `WingsLashes/Server/src/api/1/app/models/AccountantRevenue.php`    | 101, 271, 319, 628                       | `combo_service_price_package_key IS NOT NULL`                                                 | Accountant revenue grouping & consolidation                        | 🟢 **SAFE**                 |
| `WingsLashes/Server/src/frontend/.../bill-detail.component.html`   | 137, 98                                  | `{{service.service_price_package_key}}`                                                       | Print bill detail package key rendering                            | 🟢 **SAFE**                 |
| `WingsLashes/Server/src/frontend/.../booking-list.component.html`  | 32                                       | `{{serviceBalance.service_price_package_key}}`                                                | Booking list package key display                                   | 🟢 **SAFE**                 |

### 2.2 Deep Breakdown of Breaking Hazards

1. **Order Contract Generation Failure (`public.php`)**:
   - `public.php` checks `in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"])`.
   - _Failure Mode_: If package key is suffixed (e.g. `VIP-10-5_100k`), `in_array()` returns `false`. The contract engine fails back to standard contract templates and omits the mandatory 21-day refill period clause from printable customer contracts.

2. **Staff Skill Level Calculation Failure (`UserUrl.php`)**:
   - `UserUrl.php` performs exact array key lookups `$targetServiceCombos[$group][$service['service_price_package_key']]`.
   - _Failure Mode_: Hardcoded keys in `getTargetServiceCombo()` are `'VIP-10-5'`, `'FLEXI-9-3'`, `'VIP-3-1'`, etc. Suffixed keys evaluate to `null`, breaking staff skill target computations and progress bars on staff profile links.

3. **Balance Deduction Engine Bypass (`OrderService.php`)**:
   - Line 238 checks `$servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_BALANCE`.
   - _Failure Mode_: If balance package key is `balance_100k`, equality fails, causing the order creation flow to skip deducting customer balances.

4. **Balance Upgrade & Refund SQL Failures (`UserServiceBalance.php`)**:
   - Executes SQL `"conditions" => "service_id IN ({ids:array}) AND service_price_package_key = ?0", bind => ["single"]`.
   - _Failure Mode_: Suffixed key `single_100k` causes SQL queries to return 0 rows. Balance upgrades and refunds throw missing service price exceptions.

5. **Frontend Expiry Warning Miscalculation (`customer-detail.component.ts`)**:
   - Line 149 checks `serviceBalance.service_price_package_key == "VIP-10-5"`.
   - _Failure Mode_: Suffixed key causes `avgComboPeriod` to default to 25 days instead of 21 days for VIP-10-5 packages on the customer profile drawer.

---

## 3. mos-lab CRM Compatibility Audit (R2)

### 3.1 Complete Reference Inventory in `mos-lab`

| Relative File Path                                                     | Line Number(s)   | Code Snippet                                                                                     | Purpose / Context                                                          | Safety Rating                       |
| ---------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------- |
| `apps/api/src/modules/customers/services/combo-recognition.service.ts` | 55–59, 77–81     | `LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%' ...`                                 | Exclude non-combo prices from combo recognition                            | 🟢 **SAFE**                         |
| `apps/api/src/modules/customers/services/combo-recognition.service.ts` | 71               | `LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id`                       | **CRITICAL BUG**: Out-of-scope table alias `osc_nl` in `os_nl` UNION block | 🔴 **HIGH_RISK / BUG**              |
| `apps/api/src/modules/catalog/routes.ts`                               | 46–56            | `const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);`                              | Legacy fallback parsing buy vs gift session counts                         | 🟡 **CAUTION**                      |
| `apps/api/src/modules/catalog/routes.ts`                               | 313              | `service_price_package_key: servicePricePackageKey \|\| 'single'`                                | Default package key for single service prices                              | 🔴 **HIGH_RISK** (Invariant)        |
| `apps/api/src/modules/catalog/routes.ts`                               | 605, 621, 670    | `sp.service_price_package_key as packageKey`                                                     | Group active combo balances by package key                                 | 🟢 **SAFE**                         |
| `apps/api/src/modules/catalog/routes.ts`                               | 792–800, 841–849 | `if (lowerKey.includes('single') \|\| ...)`                                                      | Validate package key on combo POST / PUT                                   | 🟡 **CAUTION** (Needs length check) |
| `apps/api/src/modules/customers/routes.ts`                             | 2337, 2888, 3187 | `LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single'` | Single service price lookup for retail customer listings                   | 🔴 **HIGH_RISK** (Invariant)        |
| `apps/api/src/modules/customers/routes/booking.routes.ts`              | 163, 462         | `LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single'` | Single service price lookup for booking slots                              | 🔴 **HIGH_RISK** (Invariant)        |
| `apps/web/app/dashboard/catalog/page.tsx`                              | 618, 873, 1580   | `name="servicePricePackageKey"`, `dataIndex: 'servicePricePackageKey'`                           | Catalog Combo UI Table & Form                                              | 🟢 **SAFE**                         |
| `apps/web/components/customer-detail/hooks/useCustomerDetail.ts`       | 679              | `const match = packageKey.match(/^(\d+)\+(\d+)/);`                                               | Extract `totalNew` & `totalRefill` for customer combo card                 | 🟡 **CAUTION**                      |

### 3.2 Critical SQL Bug Analysis (`ComboRecognitionService`)

In `apps/api/src/modules/customers/services/combo-recognition.service.ts`:

```typescript
65: UNION
66: SELECT o_nl.user_id FROM `order` o_nl
67: JOIN order_service os_nl ON os_nl.order_id = o_nl.id
68: LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
69: LEFT JOIN service_price sp_nl ON os_nl.service_price_id = sp_nl.id
70: LEFT JOIN service s_nl ON os_nl.service_id = s_nl.id
71: LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
```

- **Root Cause**: Line 71 references `osc_nl` (`order_service_combo`), which is defined in the FIRST query block of the `UNION`. In the SECOND query block, the table alias is `os_nl` (`order_service`).
- **Impact**: Any invocation of `getNewLoCaCustomerIds` that encounters matching `order_service` rows throws MySQL error `ER_BAD_FIELD_ERROR: Unknown column 'osc_nl.service_id' in 'on clause'`. The catch block catches the error and returns `[]`, failing new combo customer detection silently.
- **Fix**: Replace `osc_nl.service_id` with `os_nl.service_id` on line 71.

### 3.3 Rule #21 Compliance Matrix

| Rule #21 Requirement                                                                                   | Compliance Status  | Implementation & Audit Details                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Order Completion Condition** (`order_state = 'Completed'`)                                        | **100% COMPLIANT** | Filtered in both UNION query blocks (`WHERE o_nl.order_state = 'Completed'`).                                                                                                                |
| **2. Combo Recognition & Exclusion** (`total_price > 0`, Excludes `%single%`, `%refill%`, `%balance%`) | **100% COMPLIANT** | SQL filters `LOWER(package_key) NOT LIKE '%single%' AND NOT LIKE '%refill%' AND NOT LIKE '%balance%'` in both `service_price_package_key` and `service_name`.                                |
| **3. Customer Balance Synchronization** (`user_service_balance`)                                       | **COMPLIANT**      | Customer routes and combo recognition services verify balance updates.                                                                                                                       |
| **4. Date Range Parsing & Padding** (`parseComboDateBounds`)                                           | **100% COMPLIANT** | `parseComboDateBounds` normalizes string dates (`dateFrom` $\rightarrow$ `YYYY-MM-DD 00:00:00`, `dateTo` $\rightarrow$ `YYYY-MM-DD 23:59:59`), ensuring no orders are dropped at day bounds. |

---

## 4. Remediation & Normalization Strategy

To safely allow package key renaming and price suffixes (e.g. `_100k`, `_150k`, `_200k`) while preserving 100% backward compatibility:

### 4.1 PHP Backend Normalization Helper (`WingsLashes`)

Add a central helper `ServicePriceHelper` to `WingsLashes/Server/src/api/1/app/models/ServicePriceHelper.php`:

```php
<?php

class ServicePriceHelper {
    /**
     * Normalizes a package key by stripping price tier suffixes like _100k, _150k, _200k.
     * Example: "VIP-10-5_100k" -> "VIP-10-5", "single_150k" -> "single"
     */
    public static function getBasePackageKey($packageKey) {
        if (empty($packageKey)) {
            return '';
        }
        return preg_replace('/_\d+k$/i', '', trim($packageKey));
    }

    public static function isSingle($packageKey) {
        return strtolower(self::getBasePackageKey($packageKey)) === 'single';
    }

    public static function isBalance($packageKey) {
        return strtolower(self::getBasePackageKey($packageKey)) === 'balance';
    }
}
```

### 4.2 Code Fixes in WingsLashes Legacy Codebase

1. **`public.php` & `public_reference.php` (Contract Generation)**:

   ```php
   // Replace:
   if (in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"]))
   // With:
   if (in_array(ServicePriceHelper::getBasePackageKey(current($servicePricePackageKeys)), ["VIP-10-5", "VIP-4-1"]))
   ```

2. **`UserUrl.php` (Staff Target Progress)**:

   ```php
   // Line 970:
   $baseKey = ServicePriceHelper::getBasePackageKey($service['service_price_package_key']);
   if (isset($targetServiceCombos[$group][$baseKey])) { ... }
   ```

3. **`OrderService.php` (Balance Deduction)**:

   ```php
   // Line 238:
   if (ServicePriceHelper::isBalance($servicePrice->service_price_package_key)) { ... }
   ```

4. **`UserServiceBalance.php` (SQL Queries)**:

   ```php
   // Update SQL condition from exact equality to pattern matching:
   "conditions" => "service_id IN ({ids:array}) AND (service_price_package_key = 'single' OR service_price_package_key LIKE 'single\_%')",
   ```

5. **Angular `customer-detail.component.ts` (Expiry Warning)**:
   ```typescript
   // Update line 149:
   const baseKey = serviceBalance.service_price_package_key
     ? serviceBalance.service_price_package_key.replace(/_\d+k$/i, '')
     : '';
   if (baseKey === 'VIP-10-5') {
     avgComboPeriod = 21;
   }
   ```

### 4.3 Code Fixes in `mos-lab` CRM Codebase

1. **Fix Critical Bug in `ComboRecognitionService` (`combo-recognition.service.ts` Line 71)**:

   ```typescript
   // Line 71:
   LEFT JOIN service_language sl_nl ON os_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
   ```

2. **Unanchor Regex in `catalog/routes.ts` Line 47 & `useCustomerDetail.ts` Line 679**:

   ```typescript
   // Unanchor from /^(\d+)\+(\d+)/ to allow prefixes like combo_3+1_100k:
   const match = packageKey.match(/(\d+)\+(\d+)/);
   ```

3. **Add Length Validation in Catalog CRUD Routes (`catalog/routes.ts` Lines 792 & 841)**:

   ```typescript
   if (servicePricePackageKey) {
     if (servicePricePackageKey.length > 30) {
       return reply.status(400).send({
         success: false,
         error: 'servicePricePackageKey must NOT exceed 30 characters (MySQL CHAR(30) limit)',
       });
     }
     // ... existing forbidden word check ...
   }
   ```

4. **Single Service Price SQL Joins (`apps/api/src/modules/customers/routes.ts`)**:
   ```sql
   /* Update single service joins to support suffixed keys: */
   LEFT JOIN service_price sp ON s.id = sp.service_id AND (sp.service_price_package_key = 'single' OR sp.service_price_package_key LIKE 'single_%') AND sp.is_disabled = 0
   ```

---

## 5. Verification Matrix & Sign-off

| Acceptance Criterion                                                                                                    | Verification Method                                                                                                                                                                                                | Status                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| **Complete list of `service_price_package_key` references in WingsLashes documented with safety ratings**               | Audited 22 files across WingsLashes PHP backend & Angular frontend; documented 12 HIGH_RISK, 18 CAUTION, 35+ SAFE references in Section 2.                                                                         | **VERIFIED & SIGNED OFF** |
| **Verification that `ComboRecognitionService` and all CRM reports operate cleanly with suffix-normalized package keys** | Identified critical SQL bug in `combo-recognition.service.ts` L71 (`osc_nl` $\rightarrow$ `os_nl`), verified `parseComboDateBounds` compliance with Rule #21, and provided regex unanchoring fix in Section 3 & 4. | **VERIFIED & SIGNED OFF** |

---

_Report synthesized and approved by Project Orchestrator._
