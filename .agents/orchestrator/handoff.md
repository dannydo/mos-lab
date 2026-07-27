# Handoff Report: Combo Package Key Audit & Verification

## 1. Milestone State

- **M1: WingsLashes Legacy Codebase Audit (R1)**: DONE
- **M2: mos-lab CRM Compatibility Audit (R2)**: DONE
- **M3: Audit Report Synthesis**: DONE
- **M4: Review & Verification**: DONE (APPROVED)

## 2. Active Subagents

- None (All subagents completed and retired).

## 3. Key Findings Summary

1. **WingsLashes Legacy Codebase Impact**:
   - **12 HIGH_RISK / BREAKING Locations**: Identified strict string equality (`==`), array key lookups, and `in_array()` calls. Renaming keys or adding price suffixes like `_100k` directly breaks order contract generation (`public.php`), staff skill level tracking (`UserUrl.php`), balance deduction engines (`OrderService.php`), balance upgrade/refund SQL queries (`UserServiceBalance.php`), and Angular UI expiry warnings (`customer-detail.component.ts`).
   - **18 CAUTION Locations**: Exact SQL equality (`WHERE service_price_package_key = 'single'`) or model constant checks (`ServicePrice::SERVICE_PRICE_PACKAGE_KEY_SINGLE`).
   - **35+ SAFE Locations**: Wildcard SQL checks (`NOT LIKE '%single%'`), regex pattern matching, or dynamic UI table rendering.

2. **mos-lab CRM Codebase Compatibility**:
   - **Critical SQL Bug in `ComboRecognitionService` (`combo-recognition.service.ts` L71)**: Alias typo `osc_nl.service_id` in second `UNION` query block (`order_service`) triggers MySQL `Unknown column 'osc_nl.service_id'` error when `order_service` rows match, silently dropping new combo customer detection. Fixed in `12d5338` (`os_nl.service_id`).
   - **Regex Caret Anchor Limitation (`/^(\d+)\+(\d+)/`)**: `mapComboDto` (`catalog/routes.ts` L47) and `useCustomerDetail.ts` (L679) anchor to string start `^`. Keys with prefixes (e.g. `combo_3+1_100k`) fail count extraction. Unanchoring to `/(\d+)\+(\d+)/` fixes this.
   - **DB Column Length Limit (`CHAR(30)`)**: `service_price_package_key` is `CHAR(30)` in MySQL. Max length validation (30 characters) required in catalog CRUD endpoints.
   - **Single Price Invariant (`service_price_package_key = 'single'`)**: Base single service keys strictly require `service_price_package_key = 'single'`.

3. **Normalization Strategy**:
   - Central `ServicePriceHelper::getBasePackageKey()` in PHP strips `_\d+k$` suffixes before comparisons.
   - Unanchor JS/TS regex to `/(\d+)\+(\d+)/`.
   - Update SQL single joins to `(sp.service_price_package_key LIKE 'single%' OR sp.service_price_type = 'Single')`.

## 4. Key Artifacts

- Final Deliverable Audit Report: `/Users/dannydo/projects/mos-lab/.agents/orchestrator/combo_package_key_audit_report.md`
- WingsLashes Audit Report: `/Users/dannydo/projects/mos-lab/.agents/explorer_r1/r1_wingslashes_audit.md`
- mos-lab CRM Audit Report: `/Users/dannydo/projects/mos-lab/.agents/explorer_r2/r2_moslab_audit.md`
- Reviewer Report: `/Users/dannydo/projects/mos-lab/.agents/reviewer_m4/review_report.md`
