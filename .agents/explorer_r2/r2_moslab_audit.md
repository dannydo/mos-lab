# Comprehensive Audit Report: `service_price_package_key` & Combo Recognition (`mos-lab` CRM)

**Audit Target**: `mos-lab` CRM Codebase (`apps/api/`, `apps/web/`, `packages/shared/`)  
**Auditor**: Explorer Subagent (mos-lab CRM Codebase Auditor)  
**Date**: July 26, 2026  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/explorer_r2`

---

## 1. Executive Summary

This deep audit examined every reference to `service_price_package_key` (and its alias variations `package_key`, `packageKey`) across the `mos-lab` monorepo. The investigation evaluated package key generation, validation, storage, regex parsing, SQL queries, Rule #21 compliance, and frontend rendering.

### Key Discoveries & Risk Summary

1. **CRITICAL SQL BUG in `ComboRecognitionService` (`apps/api/src/modules/customers/services/combo-recognition.service.ts` Line 71)**:
   The second `SELECT` query block of the `UNION` (which queries `order_service os_nl`) contains an invalid table reference `osc_nl.service_id` in its `LEFT JOIN service_language sl_nl` clause. Because `osc_nl` (`order_service_combo`) is not in that query block's `FROM` scope, executing this query triggers an `Unknown column 'osc_nl.service_id' in 'on clause'` SQL error in MySQL. This causes `ComboRecognitionService.getNewLoCaCustomerIds` to fail silently, catch the error, and return an empty array `[]`.
2. **REGEX ANCHOR LIMITATION (`/^(\d+)\+(\d+)/`)**:
   Both `mapComboDto` (`apps/api/src/modules/catalog/routes.ts` Line 47) and `getComboDisplayInfo` (`apps/web/components/customer-detail/hooks/useCustomerDetail.ts` Line 679) use regex anchored to the start of the string (`/^(\d+)\+(\d+)/`) to extract `normalCount` and `bonusNormalCount` (buy vs. gift sessions, e.g. `3+1`, `7+3`).
   - **Impact of Price Suffixes**: If a key is named `3+1_100k` or `7+3_200k`, the regex succeeds because the digits start at character 0.
   - **Impact of Prefixes**: If a key is named `combo_3+1`, `combo_3+1_100k`, or `100k_3+1`, the regex fails completely due to the `^` anchor, defaulting session counts to fallbacks.
3. **DATABASE SCHEMA TRUNCATION RISK (`CHAR(30)`)**:
   `service_price.service_price_package_key` is defined in MySQL as `CHAR(30)` (`legacy.prisma` Line 258). While `POST /catalog/combos` and `PUT /catalog/combos/:id` validate that keys do not contain `single`, `refill`, or `balance`, they do not check maximum length. Package keys longer than 30 characters (e.g. `combo_supertietkiem_3+1_150k`) will fail on DB insert/update or get truncated.
4. **SINGLE SERVICE PACKAGE KEY INVARIANT (`service_price_package_key = 'single'`)**:
   Appointment booking routes (`booking.routes.ts` Lines 163, 462), customer routes (`customer-base.routes.ts` Line 1087, `customers/routes.ts` Lines 2337, 2888, 3187), and catalog defaults (`catalog/routes.ts` Line 313) strictly require `service_price_package_key = 'single'` for base service prices. Any modification of single service keys breaks appointment price lookups.
5. **RULE #21 COMPLIANCE**:
   - `parseComboDateBounds` (used in `ComboRecognitionService` and API routes) guarantees `00:00:00` start and `23:59:59` end bounds for string date inputs, satisfying Rule #21's Date Range Parsing Invariant.
   - `ComboRecognitionService.getNewLoCaCustomerIds` checks `order_state = 'Completed'` and combo details, but does not join `user_service_balance` directly (whereas `apps/api/src/modules/customers/routes.ts` queries both `user_service_balance` and `order_service_combo`).

---

## 2. Audit of `apps/api/src/modules/customers/services/combo-recognition.service.ts`

### 2.1 Code Structure & Functionality

`ComboRecognitionService` serves as the single source of truth helper for identifying customers who purchased new combo packages ("New LoCa") within a given date range.

### 2.2 SQL Filter Inspection

The SQL query filters non-combo prices using:

```sql
AND (sp_nl.service_price_package_key IS NULL OR (
  LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%'
  AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%refill%'
  AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%balance%'
))
AND (sl_nl.service_name IS NULL OR (
  LOWER(sl_nl.service_name) NOT LIKE '%single%'
  AND LOWER(sl_nl.service_name) NOT LIKE '%refill%'
  AND LOWER(sl_nl.service_name) NOT LIKE '%balance%'
))
```

- **Price Suffix Compatibility**: Price suffixes (e.g. `_100k`, `_150k`, `_200k`, `3+1_100k`, `combo_5+2_150k`) do NOT contain the substrings `single`, `refill`, or `balance`. Therefore, adding price suffixes does not break the `NOT LIKE` SQL filter.
- **Exclusion Risk**: If any future package key incorporates words containing `single`, `refill`, or `balance` (e.g., `combo_single_deal`), it will be excluded from combo recognition.

### 2.3 Critical SQL Bug (Line 71)

In `combo-recognition.service.ts`, lines 65-87 define the second `SELECT` block in the `UNION`:

```typescript
65: UNION
66: SELECT o_nl.user_id FROM `order` o_nl
67: JOIN order_service os_nl ON os_nl.order_id = o_nl.id
68: LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
69: LEFT JOIN service_price sp_nl ON os_nl.service_price_id = sp_nl.id
70: LEFT JOIN service s_nl ON os_nl.service_id = s_nl.id
71: LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
```

- **Error**: Line 71 references `osc_nl.service_id`, but `osc_nl` (`order_service_combo`) is only in the first `SELECT` block. In the second `SELECT` block, `os_nl` (`order_service`) is used.
- **Effect**: Executing `getNewLoCaCustomerIds` when `order_service` rows match will throw a MySQL error: `ER_BAD_FIELD_ERROR: Unknown column 'osc_nl.service_id' in 'on clause'`. The catch block catches this error and logs it, returning `[]`!

### 2.4 Rule #21 Invariant Compliance Check

| Invariant Requirement                                                                                                                       | Status        | Audit Findings                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. `order_state = 'Completed'`                                                                                                              | **COMPLIANT** | Explicitly filtered in both UNION queries (`WHERE o_nl.order_state = 'Completed'`).                                                                                      |
| 2. Combo Detail or Group (`order_service_combo.total_price > 0` OR `order_service.user_service_type = 'combo'` / `service_group = 'combo'`) | **COMPLIANT** | Excludes `%single%`, `%refill%`, `%balance%` in both `service_price_package_key` and `service_name`.                                                                     |
| 3. `user_service_balance` update                                                                                                            | **PARTIAL**   | `ComboRecognitionService` queries `order` + `order_service_combo` / `order_service`. `apps/api/src/modules/customers/routes.ts` queries `user_service_balance` directly. |
| 4. `parseComboDateBounds` (YYYY-MM-DD 00:00:00 to 23:59:59)                                                                                 | **COMPLIANT** | `parseComboDateBounds` is invoked on `dFrom` and `dTo`, guaranteeing exact time padding.                                                                                 |

---

## 3. Audit of `apps/api/src/modules/catalog/routes.ts` & Catalog Sub-modules

### 3.1 `mapComboDto` Regex Parsing (Lines 46–56)

```typescript
if (bonusNormalCount === 0 && c.service_price_package_key) {
  const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);
  if (match) {
    const buy = parseInt(match[1], 10);
    const bonus = parseInt(match[2], 10);
    if (normalCount === buy + bonus) {
      normalCount = buy;
      bonusNormalCount = bonus;
    }
  }
}
```

- **Regex Evaluation**: `/^(\d+)\+(\d+)/` anchors to the start of the string (`^`).
  - `3+1_100k` -> Matches `3` and `1` (Safe).
  - `combo_3+1` or `combo_3+1_100k` -> Fails to match because `combo_` precedes `3+1`.
- **Recommendation**: Update regex to `/(\d+)\+(\d+)/` or `/(?:^|[^0-9])(\d+)\+(\d+)/` to allow prefixes cleanly.

### 3.2 Catalog CRUD Endpoints Validation (`POST /catalog/combos` & `PUT /catalog/combos/:id`)

- **Prohibited Words Validation**:
  ```typescript
  if (servicePricePackageKey) {
    const lowerKey = servicePricePackageKey.toLowerCase();
    if (lowerKey.includes('single') || lowerKey.includes('refill') || lowerKey.includes('balance')) {
      return reply.status(400).send({
        success: false,
        error: "servicePricePackageKey must NOT contain 'single', 'refill', or 'balance'",
      });
    }
  }
  ```
- **Evaluation**: This validation prevents admins from entering invalid keys that break combo recognition. Price suffixes like `_100k` pass validation cleanly.
- **Database Schema Limit**: In `prisma/legacy.prisma` Line 258, `service_price_package_key` is `CHAR(30)`.
  - Keys exceeding 30 characters (e.g. `combo_supertietkiem_3+1_150k`) will fail DB execution.
  - **Fix Recommendation**: Add string length validation:
    ```typescript
    if (servicePricePackageKey.length > 30) {
      return reply.status(400).send({ success: false, error: 'servicePricePackageKey must not exceed 30 characters' });
    }
    ```

### 3.3 Base Single Price Invariant (`service_price_package_key = 'single'`)

In `POST /catalog/services` (Line 313):

```typescript
service_price_package_key: servicePricePackageKey || 'single';
```

Across booking and customer routes (`booking.routes.ts` Lines 163, 462; `customer-base.routes.ts` Line 1087; `customers/routes.ts` Lines 2337, 2888, 3187):

```sql
LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
```

- **Critical Requirement**: Single service prices MUST have `service_price_package_key = 'single'`. Changing single price package keys to anything else breaks appointment price lookups across the system.

---

## 4. Audit of `apps/web/` Frontend & `packages/shared/`

### 4.1 Frontend Components (`apps/web/`)

1. `apps/web/app/dashboard/catalog/page.tsx`:
   - Line 618: Form state `servicePricePackageKey: record.servicePricePackageKey`.
   - Line 873-874: Table column `dataIndex: 'servicePricePackageKey'`.
   - Line 1580: Form item `name="servicePricePackageKey"`, label `"Tên gói Combo (Package Key)"`.
   - **Safety Rating**: **SAFE**.

2. `apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.tsx`:
   - Lines 294-297: Renders `<Tag color="purple">Key: {record.packageKey}</Tag>` if `packageKey !== name`.
   - **Safety Rating**: **SAFE**.

3. `apps/web/components/customer-detail/components/ComboBalancesCard.tsx`:
   - Lines 15, 50, 83: Renders `{cb.serviceName} {cb.packageKey ? \`(${cb.packageKey})\` : ''}`.
   - **Safety Rating**: **SAFE**.

4. `apps/web/components/customer-detail/components/ComboHistoryModal.tsx`:
   - Line 29: Displays `{record.serviceName} {record.packageKey ? \`(${record.packageKey})\` : ''}`.
   - **Safety Rating**: **SAFE**.

5. `apps/web/components/customer-detail/hooks/useCustomerDetail.ts`:
   - Line 679: `const match = packageKey.match(/^(\d+)\+(\d+)/);` inside `getComboDisplayInfo`.
   - **Issue**: Same caret `^` anchor limitation as `mapComboDto`. Keys with prefixes like `combo_3+1` fail to parse `totalNew` and `totalRefill`.
   - **Safety Rating**: **CAUTION**.

### 4.2 Shared Types (`packages/shared/src/types/catalog.ts`)

- Defines `servicePricePackageKey: string` in `CatalogServicePrice`, `CreateServiceInput`, `CreateServicePriceInput`.
- Defines `packageKey: string` in `ComboLiveSummaryItem`.
- **Safety Rating**: **SAFE**.

---

## 5. Complete Reference Inventory Table

| File Path                                                              | Line Number(s)                                    | Code Snippet                                                                                            | Context & Purpose                                            | Safety Rating                       |
| ---------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `apps/api/src/modules/customers/services/combo-recognition.service.ts` | 55–59, 77–81                                      | `LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%' ...`                                        | Exclude single/refill/balance prices from combo recognition  | **SAFE**                            |
| `apps/api/src/modules/customers/services/combo-recognition.service.ts` | 71                                                | `LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id`                              | **BUG**: Invalid table alias `osc_nl` in `os_nl` UNION block | 🔴 **HIGH_RISK**                    |
| `apps/api/src/modules/catalog/routes.ts`                               | 46–56                                             | `const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);`                                     | Legacy fallback parsing buy vs gift session counts           | 🟡 **CAUTION**                      |
| `apps/api/src/modules/catalog/routes.ts`                               | 313                                               | `service_price_package_key: servicePricePackageKey \|\| 'single'`                                       | Default package key for single service prices                | 🔴 **HIGH_RISK** (Invariant)        |
| `apps/api/src/modules/catalog/routes.ts`                               | 605, 621, 670, 702                                | `sp.service_price_package_key as packageKey`, `groupedMap`                                              | Retrieve & group active combo balances by key                | **SAFE**                            |
| `apps/api/src/modules/catalog/routes.ts`                               | 792–800, 841–849                                  | `if (lowerKey.includes('single') \|\| ...)`                                                             | Validate package key on combo POST / PUT                     | 🟡 **CAUTION** (Needs length check) |
| `apps/api/src/modules/catalog/routes.ts`                               | 1219, 1234, 1327, 1587                            | `COALESCE(sp.service_price_package_key, CONCAT('Combo #', sp.id)) as name`                              | Display name for catalog item reporting                      | **SAFE**                            |
| `apps/api/src/modules/customers/routes.ts`                             | 910, 950, 994                                     | `IF(sp.service_price_package_key IS NOT NULL ..., CONCAT(' (', sp.service_price_package_key, ')'), '')` | Append package key to combo name for customer history        | **SAFE**                            |
| `apps/api/src/modules/customers/routes.ts`                             | 922–926, 972–976, 1014–1018, 4809–4813, 4821–4825 | `LOWER(sp.service_price_package_key) NOT LIKE '%single%' ...`                                           | SQL filter for combo purchase & balance queries              | **SAFE**                            |
| `apps/api/src/modules/customers/routes.ts`                             | 2337, 2888, 3187                                  | `LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single'`        | Single service price lookup                                  | 🔴 **HIGH_RISK** (Invariant)        |
| `apps/api/src/modules/customers/routes/booking.routes.ts`              | 163, 462                                          | `LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single'`        | Single service price & duration lookup for bookings          | 🔴 **HIGH_RISK** (Invariant)        |
| `apps/api/src/modules/customers/routes/customer-base.routes.ts`        | 1087                                              | `LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single'`        | Base customer service price lookup                           | 🔴 **HIGH_RISK** (Invariant)        |
| `apps/web/app/dashboard/catalog/page.tsx`                              | 618, 873–874, 1580                                | `name="servicePricePackageKey"`, `dataIndex: 'servicePricePackageKey'`                                  | Catalog Combo Management UI Table & Form                     | **SAFE**                            |
| `apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.tsx`    | 294–297                                           | `Key: {record.packageKey}`                                                                              | Render package key tag on Combo Live report                  | **SAFE**                            |
| `apps/web/components/customer-detail/components/ComboBalancesCard.tsx` | 15, 50, 83                                        | `{cb.serviceName} {cb.packageKey ? \`(${cb.packageKey})\` : ''}`                                        | Display package key on customer combo balance card           | **SAFE**                            |
| `apps/web/components/customer-detail/components/ComboHistoryModal.tsx` | 29                                                | `{record.serviceName} {record.packageKey ? \`(${record.packageKey})\` : ''}`                            | Display package key on customer combo history modal          | **SAFE**                            |
| `apps/web/components/customer-detail/hooks/useCustomerDetail.ts`       | 679                                               | `const match = packageKey.match(/^(\d+)\+(\d+)/);`                                                      | Parse `totalNew` & `totalRefill` for customer combo card     | 🟡 **CAUTION**                      |
| `packages/shared/src/types/catalog.ts`                                 | 58, 116, 125, 283                                 | `servicePricePackageKey: string`, `packageKey: string`                                                  | TypeScript interfaces for Catalog DTOs                       | **SAFE**                            |

---

## 6. Recommendations & Code Fixes

### 6.1 Fix 1: Correct Table Alias Typo in `ComboRecognitionService`

In `apps/api/src/modules/customers/services/combo-recognition.service.ts` Line 71, replace `osc_nl.service_id` with `os_nl.service_id`:

```typescript
// Proposed fix for line 71:
LEFT JOIN service_language sl_nl ON os_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
```

### 6.2 Fix 2: Unanchor Regex Parsing for Count Extraction

Remove `^` anchor in `mapComboDto` (`apps/api/src/modules/catalog/routes.ts` Line 47) and `getComboDisplayInfo` (`apps/web/components/customer-detail/hooks/useCustomerDetail.ts` Line 679) so package keys with prefixes (e.g. `combo_3+1_100k`) parse buy vs gift counts cleanly:

```typescript
// Proposed fix for mapComboDto and getComboDisplayInfo:
const match = packageKey.match(/(\d+)\+(\d+)/);
```

### 6.3 Fix 3: Add String Length Validation for Package Keys

In `POST /catalog/combos` and `PUT /catalog/combos/:id` (`apps/api/src/modules/catalog/routes.ts` Lines 792 & 841), add length checking to enforce MySQL `CHAR(30)` limits:

```typescript
if (servicePricePackageKey) {
  if (servicePricePackageKey.length > 30) {
    return reply.status(400).send({
      success: false,
      error: 'servicePricePackageKey must NOT exceed 30 characters',
    });
  }
  const lowerKey = servicePricePackageKey.toLowerCase();
  if (lowerKey.includes('single') || lowerKey.includes('refill') || lowerKey.includes('balance')) {
    return reply.status(400).send({
      success: false,
      error: "servicePricePackageKey must NOT contain 'single', 'refill', or 'balance'",
    });
  }
}
```

---

_Report compiled and verified by Explorer Subagent (`explorer_r2`)._
