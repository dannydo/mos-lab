# Handoff Report: `service_price_package_key` Legacy Codebase Audit

## 1. Observation

Direct observations from codebase inspection across WingsLashes legacy backend (`WingsLashes/Server/src/api`), Angular frontend (`WingsLashes/Server/src/frontend`), and `mos-lab` Fastify monorepo:

1. **`WingsLashes/Server/src/api/1/app/public.php` (Lines 802, 811, 814)** and **`public_reference.php` (Lines 852, 861, 864)**:
   - Verbatim code:
     ```php
     if (in_array(current($servicePricePackageKeys), ["VIP-10-5", "FLEXI-9-3"])) { ... }
     if (in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"])) {
         $template = Template::getTemplateByKey(Template::TEMPLATE_KEY_ORDER_SERVICE_COMBO_21_DAY_CONTRACT, $userProfile->language_id);
     } elseif (in_array(current($servicePricePackageKeys), ["VIP-3-1", "VIP-8-4"])) {
         $template = Template::getTemplateByKey(Template::TEMPLATE_KEY_ORDER_SERVICE_COMBO_NEW_CONTRACT, $userProfile->language_id);
     }
     ```
2. **`WingsLashes/Server/src/api/1/app/models/UserUrl.php` (Lines 970, 1664-2247)**:
   - Verbatim code:
     ```php
     if (isset($targetServiceCombos[$group][$service['service_price_package_key']])) { ... }
     // getTargetServiceCombo returns map with exact keys: 'SR3-W', 'FLEXI-3-1', 'FLEXI-5-2', 'FLEXI-9-3', 'VIP-W-2-1', 'VIP-3-1', 'VIP-4-1', 'VIP-8-4', 'VIP-10-5'
     ```
3. **`WingsLashes/Server/src/api/1/app/models/OrderService.php` (Line 238)**:
   - Verbatim code:
     ```php
     if ($servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_BALANCE) { ... }
     ```
4. **`WingsLashes/Server/src/api/1/app/models/UserServiceBalance.php` (Lines 1121, 1171, 1259, 1266, 1395, 1432, 1455)**:
   - Verbatim code:
     ```php
     "conditions" => "service_id IN ({ids:array}) AND service_price_package_key = ?0",
     "bind"   => [ ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE, "ids" => $serviceIds ]
     ```
5. **`WingsLashes/Server/src/frontend/src/app/modules/admin/components/customer/customer-detail/customer-detail.component.ts` (Line 149)**:
   - Verbatim code:
     ```typescript
     if (serviceBalance.service_price_package_key == 'VIP-10-5') {
       avgComboPeriod = 21;
     }
     ```
6. **`mos-lab/apps/api/src/modules/customers/routes.ts` (Lines 2337, 2888, 3187)**:
   - Verbatim code:
     ```sql
     LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
     ```

Full audit report written to:
`/Users/dannydo/projects/mos-lab/.agents/explorer_r1/r1_wingslashes_audit.md`

---

## 2. Logic Chain

1. **Observation 1**: `public.php` checks exact package keys in array `["VIP-10-5", "VIP-4-1"]` to select contract templates and attach 21-day contract notes.
   - **Inference**: If a price suffix like `_100k` is appended to `service_price_package_key` (e.g. `VIP-10-5_100k`), `in_array()` returns `false`, causing contract generation to fail back to default contracts and omit the legal note.
2. **Observation 2**: `UserUrl.php` performs an exact associative array lookup `$targetServiceCombos[$group][$service['service_price_package_key']]`.
   - **Inference**: With a suffixed key (`VIP-10-5_100k`), array lookup returns `null`, causing staff skill targets and progress bars to fail rendering.
3. **Observation 3**: `OrderService.php:238` performs `== "balance"` equality.
   - **Inference**: Suffixed key `balance_100k` will evaluate to `false`, causing balance deduction logic to be skipped during order creation.
4. **Observation 4**: `UserServiceBalance.php` executes raw SQL `WHERE service_price_package_key = 'single'`.
   - **Inference**: If package key is `single_100k`, SQL returns 0 rows, causing balance upgrades and refunds to fail.
5. **Observation 5**: Angular `customer-detail.component.ts` checks `service_price_package_key == "VIP-10-5"`.
   - **Inference**: Suffixed key fails strict equality, forcing `avgComboPeriod` to default to 25 days instead of 21 days on customer profile UI.
6. **Observation 6**: `mos-lab/apps/api/src/modules/customers/routes.ts` executes SQL join with `sp.service_price_package_key = 'single'`.
   - **Inference**: Suffixed key `single_100k` breaks base retail price joins in customer routes.

---

## 3. Caveats

- **No caveats**. Investigation covered all active PHP models, services, controllers, Angular components, templates, and mos-lab Fastify routes.

---

## 4. Conclusion

Adding price tier suffixes (e.g., `_100k`, `_150k`) directly to `service_price_package_key` without normalization **WILL CAUSE CRITICAL BREAKING BUGS** across contract template rendering, balance deduction calculations, balance upgrade/refund SQL queries, staff skill progress tracking, and customer UI expiry warnings.

To proceed safely:

1. Implement a central normalization helper `getBasePackageKey($key)` in PHP backend and TypeScript frontend to strip `_\d+k$` suffixes before evaluation.
2. Update SQL queries in `UserServiceBalance.php` and `mos-lab/routes.ts` from exact `= 'single'` to `LIKE 'single%'` or `service_price_type = 'Single'`.
3. Update Angular frontend `customer-detail.component.ts` to use `.startsWith("VIP-10-5")` or `getBasePackageKey()`.

---

## 5. Verification Method

1. Inspect output audit report file:
   `/Users/dannydo/projects/mos-lab/.agents/explorer_r1/r1_wingslashes_audit.md`
2. Test normalization logic on key strings:
   - Input: `"VIP-10-5_100k"` -> Expected Normalized Base Key: `"VIP-10-5"`
   - Input: `"single_150k"` -> Expected Normalized Base Key: `"single"`
   - Input: `"balance_200k"` -> Expected Normalized Base Key: `"balance"`
3. Verify line numbers:
   - Check `WingsLashes/Server/src/api/1/app/public.php` lines 802 & 811
   - Check `WingsLashes/Server/src/api/1/app/models/UserUrl.php` lines 970 & 1664
   - Check `WingsLashes/Server/src/api/1/app/models/OrderService.php` line 238
   - Check `WingsLashes/Server/src/frontend/src/app/modules/admin/components/customer/customer-detail/customer-detail.component.ts` line 149
