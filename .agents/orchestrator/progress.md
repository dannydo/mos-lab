# Execution Progress: Combo Package Key Audit

## Current Status

Last visited: 2026-07-26T23:58:00+07:00

## Milestone Checklist

- [x] Initial Assessment & Plan Formulation
- [x] M1: WingsLashes Legacy Codebase Impact Audit (R1) - Audit Complete
- [x] M2: mos-lab CRM Compatibility Audit (R2) - Audit Complete
- [x] M3: Comprehensive Audit Report Synthesis - Report Created (`combo_package_key_audit_report.md`)
- [x] M4: Review & Verification - Review Approved (`review_report.md`)

## Subagent Log

| Conv ID                              | Role / Target                          | Status    | Dispatched At             | Completed At              |
| ------------------------------------ | -------------------------------------- | --------- | ------------------------- | ------------------------- |
| 4e0b6289-34c0-499b-957a-a11ab404da7a | explorer_r1 / WingsLashes Legacy Audit | completed | 2026-07-26T23:52:34+07:00 | 2026-07-26T23:55:52+07:00 |
| b93959ae-a223-493c-8ba8-7385780e8433 | explorer_r2 / mos-lab CRM Audit        | completed | 2026-07-26T23:52:34+07:00 | 2026-07-26T23:53:36+07:00 |
| c447334c-0bb2-429b-92c6-bc6f2877e05d | reviewer_m4 / Review & Verification    | completed | 2026-07-26T23:56:21+07:00 | 2026-07-26T23:57:42+07:00 |

## Key Findings Summary

1. **WingsLashes Legacy Codebase Impact**:
   - 12 HIGH_RISK / BREAKING locations found (contract generation `public.php:802,811`, staff skill progress `UserUrl.php:970,1664`, balance deduction `OrderService.php:238`, balance SQL queries `UserServiceBalance.php:1121,1259,1395`, and UI expiry warnings `customer-detail.component.ts:149`).
   - Suffixes like `_100k` break exact string equality, requiring `ServicePriceHelper::getBasePackageKey()` normalization.
2. **mos-lab CRM Compatibility**:
   - Critical SQL bug in `combo-recognition.service.ts` L71 (`osc_nl.service_id` table alias typo in `os_nl` subquery block) causes `Unknown column` error in MySQL.
   - Caret anchor regex limitation `/^(\d+)\+(\d+)/` in `catalog/routes.ts` L47 and `useCustomerDetail.ts` L679 breaks prefix keys (e.g. `combo_3+1_100k`).
   - `service_price_package_key` is `CHAR(30)` in MySQL; max length validation required.
   - Base single service keys strictly require `service_price_package_key = 'single'`.
3. **Verification**: Approved by `reviewer_m4`. Both `@mos-lab/api` and `@mos-lab/web` compile with 0 errors.
