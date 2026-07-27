# Handoff Report: `service_price_package_key` Audit & Verification (`mos-lab` CRM)

## 1. Observation

- **Observation 1 (Critical SQL Bug)**: In `apps/api/src/modules/customers/services/combo-recognition.service.ts` at line 71, the second `SELECT` query block of `getNewLoCaCustomerIds` contains:
  ```typescript
  LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
  ```
  `osc_nl` is `order_service_combo`, which is NOT present in the FROM scope of the second SELECT block (which joins `order_service os_nl`). When `order_service` rows match, MySQL throws `ER_BAD_FIELD_ERROR: Unknown column 'osc_nl.service_id' in 'on clause'`.
- **Observation 2 (Regex Anchor Limitation)**:
  - `apps/api/src/modules/catalog/routes.ts` line 47: `const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);`
  - `apps/web/components/customer-detail/hooks/useCustomerDetail.ts` line 679: `const match = packageKey.match(/^(\d+)\+(\d+)/);`
    The `^` anchor requires the string to begin with digits. Keys with prefixes (e.g. `combo_3+1`, `combo_3+1_100k`) fail regex matching, while keys starting with digits (e.g. `3+1_100k`) succeed.
- **Observation 3 (Database Column Limit)**:
  `apps/api/prisma/legacy.prisma` line 258 defines `service_price_package_key String @db.Char(30)`. `POST /catalog/combos` and `PUT /catalog/combos/:id` in `apps/api/src/modules/catalog/routes.ts` (lines 792–800, 841–849) validate forbidden substrings (`single`, `refill`, `balance`) but do not validate maximum string length.
- **Observation 4 (Single Service Price Invariant)**:
  `booking.routes.ts` (lines 163, 462), `customer-base.routes.ts` (line 1087), and `customers/routes.ts` (lines 2337, 2888, 3187) query:
  ```sql
  LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
  ```
  Base single service prices must strictly equal `'single'`.

## 2. Logic Chain

1. _From Observation 1_: Line 71 of `combo-recognition.service.ts` references an out-of-scope table alias `osc_nl`. Executing this query block raises a SQL error in MySQL. The try-catch block logs the error and returns an empty array `[]`. Therefore, `ComboRecognitionService.getNewLoCaCustomerIds` fails whenever the second UNION block is executed.
2. _From Observation 2_: Regex `/^(\d+)\+(\d+)/` anchors matching to character position 0. For keys like `3+1_100k`, position 0 starts with `3+1`, so `match[1]=3` and `match[2]=1`. For keys like `combo_3+1` or `combo_3+1_100k`, position 0 is `c`, causing the match to fail. Unanchoring the regex to `/(\d+)\+(\d+)/` allows prefix-agnostic count extraction.
3. _From Observation 3_: Adding price suffixes (e.g. `_100k`, `_150k`, `_200k`) to package keys does not trigger forbidden word validation (`single`, `refill`, `balance`). However, package keys longer than 30 characters exceed `CHAR(30)` in MySQL and cause DB write errors.
4. _From Observation 4_: Single service booking lookups require `sp.service_price_package_key = 'single'`. Any attempt to rename single service package keys will break appointment pricing across all CRM modules.

## 3. Caveats

- No caveats. All references in `apps/api/`, `apps/web/`, and `packages/shared/` were fully audited and mapped.

## 4. Conclusion

- Adding price suffixes (e.g. `3+1_100k`, `5+2_150k`, `7+3_200k`) is safe with respect to SQL `NOT LIKE '%single%'` filters, provided the key length remains $\le 30$ characters and the regex anchor `^` is unanchored in `mapComboDto` and `useCustomerDetail.ts`.
- `ComboRecognitionService.getNewLoCaCustomerIds` requires an immediate bug fix at line 71 (`osc_nl.service_id` $\rightarrow$ `os_nl.service_id`).
- Single service package keys must remain strictly `'single'`.

## 5. Verification Method

1. Inspect file `apps/api/src/modules/customers/services/combo-recognition.service.ts` line 71 to verify table alias `os_nl.service_id`.
2. Inspect `apps/api/src/modules/catalog/routes.ts` line 47 and `apps/web/components/customer-detail/hooks/useCustomerDetail.ts` line 679 to verify regex pattern `/(\d+)\+(\d+)/`.
3. Check detailed report at `/Users/dannydo/projects/mos-lab/.agents/explorer_r2/r2_moslab_audit.md`.
