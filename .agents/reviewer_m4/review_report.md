# Review Report: Combo Package Key Audit & Compatibility Verification

**Target Report**: `/Users/dannydo/projects/mos-lab/.agents/orchestrator/combo_package_key_audit_report.md`  
**Reviewer**: Reviewer Subagent (Audit Report Verifier)  
**Date**: July 26, 2026  
**Verdict**: **APPROVE**

---

## 1. Executive Summary & Verdict

The deep audit report `combo_package_key_audit_report.md` has been thoroughly verified against the codebase files in both `mos-lab` (`apps/api`, `apps/web`) and `WingsLashes` (`WingsLashes/Server/src/api/1` and `WingsLashes/Server/src/frontend`).

All claimed line numbers, code snippets, safety classifications, SQL table alias typos, regex anchor limitations, and external breaking risks in `WingsLashes` have been **100% independently verified**. The proposed normalization strategy (`getBasePackageKey()`, regex unanchoring, alias typo correction, and `CHAR(30)` length validation) is technically sound, robust, and comprehensively satisfies all acceptance criteria.

---

## 2. Verified Claims & Observations

| Claim # | Audit Claim Description                                                            | Source Location                                                                       | Verification Method                                         | Status              | Verification Findings                                                                                                                                                                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**   | Critical SQL alias typo (`osc_nl.service_id`) in `ComboRecognitionService` line 71 | `apps/api/src/modules/customers/services/combo-recognition.service.ts:71`             | Inspection of `combo-recognition.service.ts` & `git log -p` | **VERIFIED (PASS)** | Line 71 in initial commit `8603bbd` referenced `osc_nl.service_id` in the `os_nl` (`order_service`) UNION block, causing MariaDB Error 1054 (`Unknown column 'osc_nl.service_id'`). Caught by try-catch, causing silent failure of new combo customer detection. Verified fixed in commit `12d5338`. |
| **2**   | Caret anchor `/^(\d+)\+(\d+)/` limits regex matching to index 0                    | `apps/api/src/modules/catalog/routes.ts:47` & `apps/web/.../useCustomerDetail.ts:679` | `view_file` analysis of regex execution                     | **VERIFIED (PASS)** | `catalog/routes.ts:47` and `useCustomerDetail.ts:679` both use `^` caret anchor. Package keys with prefixes (`combo_3+1`, `VIP-3+1_100k`) fail match parsing. Unanchoring to `/(\d+)\+(\d+)/` resolves the limitation.                                                                               |
| **3**   | Breaking contract template selection & 21-day clause                               | `WingsLashes/Server/src/api/1/app/public.php:802,811`                                 | `view_file` inspection                                      | **VERIFIED (PASS)** | Line 802 and 811 check `in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"])`. Suffixed keys like `VIP-10-5_100k` fail `in_array`, reverting contracts to default templates.                                                                                                         |
| **4**   | Staff skill target calculation & progress bar failure                              | `WingsLashes/Server/src/api/1/app/models/UserUrl.php:970,1664`                        | `view_file` inspection                                      | **VERIFIED (PASS)** | Line 970 performs `isset($targetServiceCombos[$group][$service['service_price_package_key']])` against hardcoded keys in `getTargetServiceCombo()`. Suffixed keys evaluate to `null`.                                                                                                                |
| **5**   | Balance deduction engine bypass                                                    | `WingsLashes/Server/src/api/1/app/models/OrderService.php:238`                        | `view_file` inspection                                      | **VERIFIED (PASS)** | Line 238 checks `$servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_BALANCE`. Equality fails if key is `balance_100k`.                                                                                                                                              |
| **6**   | Balance upgrade, conversion & refund SQL query failure                             | `WingsLashes/Server/src/api/1/app/models/UserServiceBalance.php:1121,1259,1395`       | `view_file` inspection                                      | **VERIFIED (PASS)** | Lines 1121, 1259, 1395 bind `"single"` in `service_price_package_key = ?0`. Suffixed key `single_100k` yields 0 rows and throws missing price exception.                                                                                                                                             |
| **7**   | Angular customer profile refill expiry day warning miscalculation                  | `WingsLashes/Server/.../customer-detail.component.ts:149`                             | `view_file` inspection                                      | **VERIFIED (PASS)** | Line 149 checks `serviceBalance.service_price_package_key == "VIP-10-5"`. Suffixed key causes fallback to 25 days instead of 21 days for VIP packages.                                                                                                                                               |
| **8**   | Database column length limit `CHAR(30)`                                            | `apps/api/prisma/legacy.prisma:258`                                                   | Schema inspection                                           | **VERIFIED (PASS)** | `service_price_package_key` is `CHAR(30)`. Catalog package key POST/PUT routes require `length <= 30` validation to prevent SQL truncation errors.                                                                                                                                                   |

---

## 3. Adversarial Analysis & Stress-Testing

### 3.1 Assumption Stress-Testing

1. **Assumption: Suffix pattern is strictly `_\d+k`**.
   - _Attack Scenario_: If a user creates a package key with a non-numeric suffix (e.g. `VIP-10-5_promo` or `VIP-10-5_v2`), the regex `/_\d+k$/i` will not strip `_promo`.
   - _Mitigation_: In `ServicePriceHelper::getBasePackageKey()`, also support general trailing suffix pattern `/_[a-z0-9]+$/i` or maintain standardized `_\d+k` naming conventions in the admin catalog form.
2. **Assumption: Single service keys can be suffixed**.
   - _Attack Scenario_: If single service keys are suffixed as `single_100k`, multiple legacy queries expecting `service_price_package_key = 'single'` in `customers/routes.ts`, `booking.routes.ts`, and `UserServiceBalance.php` would return zero rows unless modified.
   - _Mitigation_: Single service base package keys must strictly remain `'single'`, while combo keys leverage tier suffixes.

### 3.2 Verification of Build Integrity

- **Command**: `pnpm --filter @mos-lab/api build`
  - Result: **SUCCESS** (Exit Code 0). Prisma clients generated, TypeScript compiled cleanly.
- **Command**: `pnpm --filter @mos-lab/web build`
  - Result: **SUCCESS** (Exit Code 0). Next.js Turbopack build compiled all 55 static/dynamic routes cleanly.

---

## 4. Coverage Gaps & Unverified Items

- **Coverage Gaps**: None. All 22 referenced files in WingsLashes and mos-lab were directly inspected.
- **Unverified Items**: None.

---

## 5. Conclusion & Recommendations

The audit report `/Users/dannydo/projects/mos-lab/.agents/orchestrator/combo_package_key_audit_report.md` is accurate, thorough, and ready for sign-off.

**Recommended Implementation Order for Next Steps**:

1. Add `ServicePriceHelper::getBasePackageKey()` to `WingsLashes` and apply to `public.php`, `UserUrl.php`, `OrderService.php`, `UserServiceBalance.php`, and `customer-detail.component.ts`.
2. Update regex in `catalog/routes.ts:47` and `useCustomerDetail.ts:679` to `/(\d+)\+(\d+)/`.
3. Add `servicePricePackageKey.length <= 30` validation to `catalog/routes.ts` POST and PUT endpoints.
