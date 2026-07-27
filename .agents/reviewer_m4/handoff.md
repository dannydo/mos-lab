# Handoff Report: Combo Package Key Audit & Verification

**From**: Reviewer Subagent (`reviewer_m4`)  
**To**: Parent / Orchestrator (`c3872400-e461-49fa-8107-1db52b27732f`)  
**Date**: July 26, 2026  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/reviewer_m4`

---

## 1. Observation

1. **`ComboRecognitionService` SQL Bug (`combo-recognition.service.ts`)**:
   - Initial commit `8603bbd` line 71: `LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1` inside the `order_service` (`os_nl`) subquery block of `getNewLoCaCustomerIds`.
   - `osc_nl` was out-of-scope in the second UNION block, causing MariaDB Error 1054 (`Unknown column 'osc_nl.service_id' in 'on clause'`). Caught by try-catch on line 95, returning `[]` and silently dropping new combo customer detection.
   - Commit `12d5338` fixed this by changing `osc_nl.service_id` to `os_nl.service_id`.

2. **Regex Caret Anchor Limitation (`/^(\d+)\+(\d+)/`)**:
   - `apps/api/src/modules/catalog/routes.ts:47` (`mapComboDto`): `const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);`
   - `apps/web/components/customer-detail/hooks/useCustomerDetail.ts:679`: `const match = packageKey.match(/^(\d+)\+(\d+)/);`
   - Caret `^` forces string index 0 match. Package keys with prefixes (`combo_3+1`, `VIP-3+1_100k`) fail regex match. Unanchoring to `/(\d+)\+(\d+)/` resolves this.

3. **WingsLashes Legacy Breaking References**:
   - `WingsLashes/Server/src/api/1/app/public.php:802,811`: `in_array(current($servicePricePackageKeys), ["VIP-10-5", "VIP-4-1"])`. Exact array match fails with price suffixes (`VIP-10-5_100k`), falling back to default contracts and omitting 21-day legal clause.
   - `WingsLashes/Server/src/api/1/app/models/UserUrl.php:970,1664`: `isset($targetServiceCombos[$group][$service['service_price_package_key']])` against hardcoded keys in `getTargetServiceCombo()`. Returns `null` if suffixed.
   - `WingsLashes/Server/src/api/1/app/models/OrderService.php:238`: `$servicePrice->service_price_package_key == ServicePrice::SERVICE_PRICE_PACKAGE_KEY_BALANCE`. Equality fails if key is `balance_100k`.
   - `WingsLashes/Server/src/api/1/app/models/UserServiceBalance.php:1121,1259,1395`: SQL queries bind `"single"` for `service_price_package_key = ?0`. Suffixed `single_100k` yields 0 rows.
   - `WingsLashes/Server/src/frontend/.../customer-detail.component.ts:149`: `serviceBalance.service_price_package_key == "VIP-10-5"`. Defaults `avgComboPeriod` to 25 days instead of 21 days for suffixed VIP packages.

4. **Build Verification**:
   - `pnpm --filter @mos-lab/api build`: Exit code 0.
   - `pnpm --filter @mos-lab/web build`: Exit code 0 (21 static routes compiled).

---

## 2. Logic Chain

1. **Observation**: Code inspection of `public.php`, `UserUrl.php`, `OrderService.php`, `UserServiceBalance.php`, and `customer-detail.component.ts` confirms exact string matching / SQL equality on `service_price_package_key`.
2. **Step 1**: If package keys are renamed or suffixed with price tiers (`_100k`), exact string equality fails.
3. **Step 2**: Failure of string equality causes contracts, skill bars, balance deductions, refunds, and UI warnings to execute fallback/error paths.
4. **Step 3**: Introducing a central helper `ServicePriceHelper::getBasePackageKey()` in PHP and JS regex unanchoring `/(\d+)\+(\d+)/` strips the `_\d+k` suffix before comparison, restoring 100% backward compatibility.
5. **Conclusion**: The audit findings and proposed normalization strategy in `combo_package_key_audit_report.md` are valid, complete, and verified.

---

## 3. Caveats

- **Single Service Key Invariant**: Base single service keys should strictly remain `'single'` to prevent breaking legacy single item lookups across WingsLashes and `mos-lab` APIs.
- **Suffix Naming Standard**: Suffix normalization helper `ServicePriceHelper::getBasePackageKey()` targets `_\d+k$` suffixes (`_100k`, `_150k`, `_200k`). Admin catalog package key creation must adhere to this suffix convention.

---

## 4. Conclusion

**Verdict**: **APPROVE**.
The audit report `/Users/dannydo/projects/mos-lab/.agents/orchestrator/combo_package_key_audit_report.md` has been verified across all 4 verification steps.

---

## 5. Verification Method

To independently verify these findings:

1. Check `git log -p -n 2 apps/api/src/modules/customers/services/combo-recognition.service.ts` to inspect commit `12d5338`.
2. Inspect `apps/api/src/modules/catalog/routes.ts` line 47 and `apps/web/components/customer-detail/hooks/useCustomerDetail.ts` line 679 for `/^(\d+)\+(\d+)/`.
3. Inspect `WingsLashes/Server/src/api/1/app/public.php` lines 802 & 811, `UserUrl.php` lines 970 & 1664, `OrderService.php` line 238, `UserServiceBalance.php` lines 1121, 1259, 1395, and `customer-detail.component.ts` line 149.
4. Run `pnpm --filter @mos-lab/api build` and `pnpm --filter @mos-lab/web build` to verify clean build compilation.
