# Comprehensive Legacy Audit: `service_price_package_key` across WingsLashes & Mos-Lab

## Executive Summary

This report presents a thorough, line-by-line audit of all occurrences of `service_price_package_key`, `package_key`, `packageKey`, and associated combo key logic across the **WingsLashes** PHP backend, **WingsLashes** Angular frontend, and the **mos-lab** Fastify monorepo.

The audit evaluated the risk of adding price suffixes (e.g., `_100k`, `_150k`, `_200k`) or renaming combo package keys to differentiate price tiers.

### Key Findings & Risk Profile:

- **Total Files Audited**: 22 files across WingsLashes PHP backend, WingsLashes Angular frontend, and mos-lab API.
- **HIGH_RISK / BREAKING References**: **12 locations**. These perform exact string equality (`==`), hardcoded array lookups, or strict `in_array()` matches. **Adding price suffixes like `_100k` directly to `service_price_package_key` WILL BREAK contract template generation, skill level tracking, balance deduction calculations, upgrade/refund SQL queries, and expiry warnings.**
- **CAUTION References**: **18 locations**. These perform exact SQL equality (`WHERE service_price_package_key = 'single'`) or exact model constant checks (`ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE`).
- **SAFE References**: **35+ locations**. These use regex pattern matching (`match(/^(\d+)\+(\d+)/)`), SQL wildcards (`NOT LIKE '%single%'`), or display strings.

---

## Detailed Code References & Safety Ratings

### Category 1: WingsLashes PHP Backend (`WingsLashes/Server/src/api`)

#### 1. `Server/src/api/1/app/public.php` & `Server/src/api/1/app/public_reference.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/public.php` & `public_reference.php`
- **Line Numbers**: `public.php`: 754, 765, 802, 811, 814 | `public_reference.php`: 804, 815, 852, 861, 864
- **Code Snippets**:
  ```php
  // Lines 754 & 765 (public.php)
  $servicePricePackageKeys[] = $servicePrice->service_price_package_key;
  $orderServiceComboHtml .= "<td class='text-center'>{$serviceLanguage->service_name} - {$servicePrice->service_price_package_key}</td>";

  // Line 802 (public.php)
  if (in_array(current($servicePricePackageKeys), ["VIP-10-5", "FLEXI-9-3"])) { ... }

  // Line 811 (public.php)
  if (in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"])) {
      $template = Template::getTemplateByKey(Template::TEMPLATE_KEY_ORDER_SERVICE_COMBO_21_DAY_CONTRACT, $userProfile->language_id);
  } elseif (in_array(current($servicePricePackageKeys), ["VIP-3-1", "VIP-8-4"])) {
      $template = Template::getTemplateByKey(Template::TEMPLATE_KEY_ORDER_SERVICE_COMBO_NEW_CONTRACT, $userProfile->language_id);
  }
  ```
- **Purpose / Context**: Generates order contract HTML, determines contract term notes (21-day late refill policy), and selects specific contract templates (21-day contract vs. new contract).
- **Safety Rating**: **HIGH_RISK / BREAKING**
- **Impact of Price Suffix**: If `service_price_package_key` is suffixed (e.g. `VIP-10-5_100k`), `in_array()` fails. The system falls back to default share combo contract templates instead of the correct VIP 21-day contract template and omits the late refill period legal clause on customer contracts.

---

#### 2. `Server/src/api/1/app/models/UserUrl.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/UserUrl.php`
- **Line Numbers**: 861, 863, 970, 1664–2247
- **Code Snippets**:
  ```php
  // Line 970
  if (isset($targetServiceCombos[$group][$service['service_price_package_key']])) { ... }

  // Lines 1664-2247 (getTargetServiceCombo definition)
  static public function getTargetServiceCombo() {
      return [
          'classic' => [
              'SR3-W'     => [ ... ],
              'FLEXI-3-1' => [ ... ],
              'FLEXI-5-2' => [ ... ],
              'FLEXI-9-3' => [ ... ],
              'VIP-W-2-1' => [ ... ],
              'VIP-3-1'   => [ ... ],
              'VIP-4-1'   => [ ... ],
              'VIP-8-4'   => [ ... ],
              'VIP-10-5'  => [ ... ],
          ],
          'mink' => [
              'VIP-W-2-1' => [ ... ],
              'VIP-3-1'   => [ ... ],
              'VIP-4-1'   => [ ... ],
              'VIP-8-4'   => [ ... ],
              'VIP-10-5'  => [ ... ],
          ]
      ];
  }
  ```
- **Purpose / Context**: Computes staff profile skills, progress bars, and targets for service combos.
- **Safety Rating**: **HIGH_RISK / BREAKING**
- **Impact of Price Suffix**: `getTargetServiceCombo()` defines hardcoded package key map (`VIP-10-5`, `FLEXI-9-3`, etc.). If a package key has a suffix (e.g., `VIP-10-5_100k`), `$targetServiceCombos[$group]['VIP-10-5_100k']` evaluates to `null`. Staff progress and target levels will fail to render on staff profile links.

---

#### 3. `Server/src/api/1/app/models/OrderService.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/OrderService.php`
- **Line Numbers**: 238, 267, 499
- **Code Snippets**:
  ```php
  // Line 238
  if ($servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_BALANCE) { ... }

  // Line 267
  $tmpServicePrice = ServicePrice::getByServicePricePackageKey($retainService->id, $tmpServicePrice->currency_id, $tmpServicePrice->service_price_package_key);
  ```
- **Purpose / Context**: Line 238 detects balance deduction services. Line 267 retrieves corresponding retain service price during promotion upgrades.
- **Safety Rating**: **HIGH_RISK / BREAKING**
- **Impact of Price Suffix**: If `service_price_package_key` is `balance_100k`, `$servicePrice->service_price_package_key == "balance"` evaluates to `false`, causing the balance deduction engine to bypass balance calculations for customer bookings!

---

#### 4. `Server/src/api/1/app/models/UserServiceBalance.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/UserServiceBalance.php`
- **Line Numbers**: 668, 729, 1059, 1121, 1171, 1259, 1266, 1395, 1403, 1432, 1455
- **Code Snippets**:
  ```php
  // Line 1121 & 1171
  "conditions" => "service_id IN ({ids:array}) AND service_price_package_key = ?0",
  "bind" => [ ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE, "ids" => $serviceIds ]

  // Line 1259 & 1266
  "conditions" => "service_id IN ({ids:array}) AND service_price_package_key = ?0",
  "bind" => [ ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE, 'ids' => $fromServiceIds ]

  // Line 1395, 1432, 1455
  "conditions" => "service_id = ?0 AND service_price_package_key = ?1",
  "bind" => [ $toService->id, ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE ]

  // Line 1403
  if ($mode == "refund" && $type == "single") { ... }
  ```
- **Purpose / Context**: Queries `service_price` records to calculate balance upgrades, single item conversions, and balance refunds.
- **Safety Rating**: **HIGH_RISK / BREAKING**
- **Impact of Price Suffix**: Strict SQL equality `service_price_package_key = 'single'`. If single package key is suffixed (e.g. `single_100k`), all these queries return 0 rows. Balance upgrades and refunds will fail with missing service price errors.

---

#### 5. `Server/src/api/1/app/models/ServicePriceRule.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/ServicePriceRule.php`
- **Line Numbers**: 145, 151, 159
- **Code Snippets**:
  ```php
  // Line 145
  if ($servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_BALANCE) { ... }

  // Line 151
  if (is_numeric(stripos($comboServicePrice->service_price_package_key, "QUEEN"))) { ... }

  // Line 159
  if ($servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE) { ... }
  ```
- **Purpose / Context**: Determines early-return bonus rules for staff based on combo key type ("balance", "single", or containing "QUEEN").
- **Safety Rating**: **HIGH_RISK / BREAKING** for lines 145/159; **SAFE** for line 151 (`stripos` matches substring).
- **Impact of Price Suffix**: `== "balance"` and `== "single"` checks fail when suffixed. Line 151 (`stripos(..., "QUEEN")`) handles suffixes safely.

---

#### 6. `Server/src/api/1/app/models/Promotion.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/Promotion.php`
- **Line Numbers**: 280, 281
- **Code Snippets**:
  ```php
  $servicePrice = ServicePrice::getByServicePricePackageKey($params['service_id'], 2, ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE);
  $serviceRetainPrice = ServicePrice::getByServicePricePackageKey($serviceRetain->id, 2, ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE);
  ```
- **Purpose / Context**: Looks up single service price to calculate promotion discount rules.
- **Safety Rating**: **HIGH_RISK / BREAKING**
- **Impact of Price Suffix**: Queries by exact key `"single"`. Returns `null` if key is `single_100k`.

---

#### 7. `Server/src/api/1/app/sheet.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/sheet.php`
- **Line Numbers**: 542, 568
- **Code Snippets**:
  ```php
  if ($servicePrice['service_price_package_key'] == "single") {
      $price = $servicePrice['service_price'];
  }
  ```
- **Purpose / Context**: Extracts single item service price for staff booking exports.
- **Safety Rating**: **HIGH_RISK / BREAKING**
- **Impact of Price Suffix**: Exact equality `== "single"`. Suffixed keys will cause `$price` to remain `0`.

---

#### 8. `Server/src/api/1/app/models/Report.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/Report.php`
- **Line Numbers**: 2323, 2328, 2329, 2335, 4858, 4884, 5050, 5097
- **Code Snippets**:
  ```php
  // Lines 2323 & 2328
  $reportData[$serviceId][$servicePrice['service_price_package_key']] += $combo['count'];

  // Line 2329
  } elseif ($servicePrice['service_price_package_key'] == "single") { ... }
  ```
- **Purpose / Context**: Aggregates booking counts by package key and single service type for reporting.
- **Safety Rating**: **CAUTION**
- **Impact of Price Suffix**: Line 2323 creates dynamic keys (`VIP-10-5_100k`), which is safe. Line 2329 checks `== "single"`, which fails if suffixed.

---

#### 9. `Server/src/api/1/app/models/ServicePrice.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/ServicePrice.php`
- **Line Numbers**: 19, 20, 128–133, 198, 225, 265
- **Code Snippets**:
  ```php
  const SERVICE_PRICE_PACKAGE_KEY_SINGLE = "single";
  const SERVICE_PRICE_PACKAGE_KEY_BALANCE = "balance";

  static public function getByServicePricePackageKey($serviceId, $currencyId, $servicePricePackageKey) {
      return ServicePrice::findFirst(array(
          "conditions" => "service_id = ?0 AND currency_id = ?1 AND service_price_package_key = ?2",
          "bind"       => [$serviceId, $currencyId, $servicePricePackageKey]
      ));
  }
  ```
- **Purpose / Context**: Model definition and finder helper for ServicePrice by package key.
- **Safety Rating**: **CAUTION**
- **Impact of Price Suffix**: Finder method expects exact string stored in database.

---

#### 10. `Server/src/api/1/app/models/AccountantRevenue.php` & `generate-accountant-revenue.php`

- **Relative File Path**: `WingsLashes/Server/src/api/1/app/models/AccountantRevenue.php` & `tool/generate-accountant-revenue.php`
- **Line Numbers**: `AccountantRevenue.php`: 101, 271, 319, 322, 466, 628, 810, 884, 978, 1014 | `generate-accountant-revenue.php`: 129
- **Code Snippets**:
  ```php
  $typeConditions[] = 'combo_service_price_package_key IS NOT NULL';
  $typeConditions[] = '(combo_service_price_package_key IS NULL AND AccountantRevenue.order_product_id IS NULL)';
  MAX(ar_src.combo_service_price_package_key) AS combo_key,
  ```
- **Purpose / Context**: Accountant revenue reporting and batch consolidation.
- **Safety Rating**: **SAFE**
- **Impact of Price Suffix**: Operates on presence/absence (`IS NOT NULL` / `IS NULL`) or string aggregation. Safely handles suffixes.

---

### Category 2: WingsLashes Angular Frontend (`WingsLashes/Server/src/frontend`)

#### 1. `Server/src/frontend/src/app/modules/admin/components/customer/customer-detail/customer-detail.component.ts`

- **Relative File Path**: `WingsLashes/Server/src/frontend/src/app/modules/admin/components/customer/customer-detail/customer-detail.component.ts`
- **Line Number**: 149
- **Code Snippet**:
  ```typescript
  getAvgExpiryDayClass(serviceBalance:any, avgExpiryDay:any) {
    let avgComboPeriod = 25;
    if (serviceBalance.service_price_package_key == "VIP-10-5") {
      avgComboPeriod = 21;
    }
    if (avgExpiryDay <= avgComboPeriod) {
      return "error";
    } ...
  }
  ```
- **Purpose / Context**: Calculates customer combo refill expiration warning badge class (21 days for VIP-10-5 vs 25 days default).
- **Safety Rating**: **HIGH_RISK / BREAKING**
- **Impact of Price Suffix**: `serviceBalance.service_price_package_key == "VIP-10-5"` fails if key is `VIP-10-5_100k`. The frontend defaults `avgComboPeriod` to 25 days instead of 21 days for VIP-10-5 packages.

---

#### 2. Angular Templates (Multiple UI components)

- **Relative File Paths**:
  - `bill-detail.component.html:137` & `pages/print/bill-detail/bill-detail.component.html:98`
  - `my-booking-list.component.html:28`
  - `booking-list.component.html:32`
  - `user-service-balance-list.component.html:21`
  - `user-service-balance-list.component.ts:91,97,99,284,301,304`
- **Code Snippets**:
  ```html
  <div>{{service.service_name}} - {{service.service_price_package_key}}</div>
  <div>{{serviceBalance.service.service_name}} ({{serviceBalance.service_price_package_key}})</div>
  ```
- **Purpose / Context**: Displays package key string alongside service name on bills, booking lists, and balance cards.
- **Safety Rating**: **SAFE**
- **Impact of Price Suffix**: Displays full package key string directly. Suffixes like `_100k` will be rendered as text (e.g. "Volume - VIP-10-5_100k").

---

### Category 3: Mos-Lab Fastify Monorepo (`apps/api`)

#### 1. `apps/api/src/modules/customers/routes.ts`

- **Relative File Path**: `mos-lab/apps/api/src/modules/customers/routes.ts`
- **Line Numbers**: 2337, 2888, 3187
- **Code Snippets**:
  ```sql
  LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
  ```
- **Purpose / Context**: Joins single service price to fetch base retail price for customer listings.
- **Safety Rating**: **CAUTION**
- **Impact of Price Suffix**: If `service_price_package_key` is renamed to `single_100k`, `sp.service_price_package_key = 'single'` fails.

#### 2. `apps/api/src/modules/catalog/routes.ts`

- **Relative File Path**: `mos-lab/apps/api/src/modules/catalog/routes.ts`
- **Line Numbers**: 46-47, 922-925, 4809-4812
- **Code Snippets**:
  ```typescript
  // Line 46-47
  if (bonusNormalCount === 0 && c.service_price_package_key) {
    const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);
  }

  // Line 922-925
  AND (sp.service_price_package_key IS NULL OR (
    LOWER(sp.service_price_package_key) NOT LIKE '%single%'
    AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
    AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
  ))
  ```
- **Purpose / Context**: Parse combo X+Y count format and exclude non-combo package items in queries.
- **Safety Rating**: **SAFE**
- **Impact of Price Suffix**: Regex `^(\d+)\+(\d+)` and `NOT LIKE '%single%'` safely match suffixed strings.

---

## Actionable Recommendations & Normalization Strategy

To safely support price tier suffixes (e.g. `_100k`, `_150k`, `_200k`) without breaking legacy logic:

### 1. Introduce Central Key Normalization Helper

- **PHP Backend Helper**:

  ```php
  class ServicePriceHelper {
      public static function getBasePackageKey($packageKey) {
          if (empty($packageKey)) return '';
          // Strip price tier suffixes like _100k, _150k, _200k
          return preg_replace('/_\d+k$/i', '', trim($packageKey));
      }

      public static function isSingle($packageKey) {
          return str_starts_with(self::getBasePackageKey($packageKey), 'single');
      }

      public static function isBalance($packageKey) {
          return str_starts_with(self::getBasePackageKey($packageKey), 'balance');
      }
  }
  ```

- **Angular TypeScript Helper**:
  ```typescript
  export function getBasePackageKey(packageKey: string): string {
    if (!packageKey) return '';
    return packageKey.replace(/_\d+k$/i, '').trim();
  }
  ```

### 2. Required Code Normalizations

1. **`public.php` & `public_reference.php` (Contract Template Selection)**:
   - Change: `in_array(current($servicePricePackageKeys), ["VIP-10-5", ...])`
   - To: `in_array(ServicePriceHelper::getBasePackageKey(current($servicePricePackageKeys)), ["VIP-10-5", ...])`

2. **`UserUrl.php` (Staff Target & Skill Levels)**:
   - Change line 970: `$baseKey = ServicePriceHelper::getBasePackageKey($service['service_price_package_key']);`
   - Check `isset($targetServiceCombos[$group][$baseKey])`.

3. **`OrderService.php` (Balance Deduction)**:
   - Change line 238: `if (ServicePriceHelper::isBalance($servicePrice->service_price_package_key))`

4. **`UserServiceBalance.php` (SQL Queries)**:
   - Change SQL: `service_price_package_key = ?0` (with `'single'`)
   - To: `(service_price_package_key = 'single' OR service_price_package_key LIKE 'single\_%' OR service_price_type = 'Single')`

5. **`customer-detail.component.ts` (Expiry Warning)**:
   - Change line 149: `if (getBasePackageKey(serviceBalance.service_price_package_key) === "VIP-10-5")`

6. **`mos-lab` SQL Joins (`routes.ts`)**:
   - Change: `sp.service_price_package_key = 'single'`
   - To: `(sp.service_price_package_key LIKE 'single%' OR sp.service_price_type = 'Single')`
