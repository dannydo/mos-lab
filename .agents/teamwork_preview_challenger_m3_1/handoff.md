# Empirical Test & Stress Verification Handoff Report

**Agent**: challenger_m3_1  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1`  
**Target Milestone**: M3 - Empirical Testing & Verification of `removeVietnameseTones` & `vietnameseSearchFilter`  
**Date**: 2026-07-28

---

## 1. Observation

### 1.1 Test Harness Execution Command & Raw Output

Ran standalone ts-node/tsx test harness at `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/test-harness.ts`:

**Command Executed**:

```bash
npx tsx /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/test-harness.ts
```

**Verbatim Console Output**:

```text
====================================================
   EMPIRICAL VERIFICATION HARNESS - SEARCH UTILS
====================================================

--- TASK 1: removeVietnameseTones ---

--- TASK 2: vietnameseSearchFilter Option Objects ---

====================================================
                 SUMMARY RESULTS
====================================================
[1] [Task 1 - Matching] "diep" matching "Ngọc Điệp"
    Status:   ✅ PASS
    Expected: true
    Actual:   true
    Details:  str: "ngoc diep", query: "diep"

[2] [Task 1 - Matching] "hang" matching "Hằng Ni"
    Status:   ✅ PASS
    Expected: true
    Actual:   true
    Details:  str: "hang ni", query: "hang"

[3] [Task 1 - Matching] "thuy" matching "Thuỳ Trang 🌸"
    Status:   ✅ PASS
    Expected: true
    Actual:   true
    Details:  str: "thuy trang 🌸", query: "thuy"

[4] [Task 1 - Matching] "nhat" matching "Nhật"
    Status:   ✅ PASS
    Expected: true
    Actual:   true
    Details:  str: "nhat", query: "nhat"

[5] [Task 1 - Matching] "DONG" matching "Đồng Bằng"
    Status:   ✅ PASS
    Expected: true
    Actual:   true
    Details:  str: "dong bang", query: "dong"

[6] [Task 1 - Edge] null input
    Status:   ✅ PASS
    Expected: ""
    Actual:   ""

[7] [Task 1 - Edge] undefined input
    Status:   ✅ PASS
    Expected: ""
    Actual:   ""

[8] [Task 1 - Edge] 0 (number)
    Status:   ✅ PASS
    Expected: "0"
    Actual:   "0"

[9] [Task 1 - Edge] 12345 (number)
    Status:   ✅ PASS
    Expected: "12345"
    Actual:   "12345"

[10] [Task 1 - Edge] strings with emojis ("Thuỳ Trang 🌸")
    Status:   ✅ PASS
    Expected: "thuy trang 🌸"
    Actual:   "thuy trang 🌸"

[11] [Task 1 - Edge] uppercase ("ĐỒNG BẰNG")
    Status:   ✅ PASS
    Expected: "dong bang"
    Actual:   "dong bang"

[12] [Task 1 - Edge] leading/trailing whitespace ("  Hằng Ni  ")
    Status:   ✅ PASS
    Expected: "hang ni"
    Actual:   "hang ni"

[13] [Task 2 - Filter] Filter { label: "Ngọc Điệp" } with "diep"
    Status:   ✅ PASS
    Expected: true
    Actual:   true

[14] [Task 2 - Filter] Filter { children: "Hằng Ni" } with "hang"
    Status:   ✅ PASS
    Expected: true
    Actual:   true

[15] [Task 2 - Filter] Filter { children: ["Thuỳ Trang ", "🌸"] } with "thuy"
    Status:   ❌ FAIL
    Expected: true
    Actual:   false
    Details:  Array children fail string type check

[16] [Task 2 - Filter] Filter { value: 123, label: "Đồng Bằng" } with "DONG"
    Status:   ✅ PASS
    Expected: true
    Actual:   true

[17] [Task 2 - Extended] Filter with null option
    Status:   ✅ PASS
    Expected: false
    Actual:   false

[18] [Task 2 - Extended] Filter trailing whitespace
    Status:   ✅ PASS
    Expected: false
    Actual:   false

[19] [Task 2 - Extended] Filter with empty string input
    Status:   ✅ PASS
    Expected: true
    Actual:   true

[20] [Task 2 - Extended] Filter { value: 123 } without label/children with input "123"
    Status:   ✅ PASS
    Expected: true
    Actual:   true

[21] [Task 2 - Stress] Filter { label: ["Đồng ", "Bằng"] } with "dong"
    Status:   ❌ FAIL
    Expected: true
    Actual:   false
    Details:  Array label fails string type check

[22] [Task 2 - Stress] Filter React Node children
    Status:   ❌ FAIL
    Expected: true
    Actual:   false
    Details:  React element children fail type check

----------------------------------------------------
TOTAL TESTS RUN: 22
PASSED:          19
FAILED:          3
----------------------------------------------------
```

### 1.2 Inspection of Implementation File

In `/Users/dannydo/projects/mos-lab/packages/shared/src/utils/search.ts` (lines 20–28):

```ts
20:   const opt = option as Record<string, unknown>;
21:   const label =
22:     typeof opt.label === 'string' || typeof opt.label === 'number'
23:       ? String(opt.label)
24:       : typeof opt.children === 'string' || typeof opt.children === 'number'
25:       ? String(opt.children)
26:       : typeof opt.value === 'string' || typeof opt.value === 'number'
27:       ? String(opt.value)
28:       : '';
```

---

## 2. Logic Chain

1. **Task 1 Core & Edge Cases (`removeVietnameseTones`)**:
   - `removeVietnameseTones` normalizes strings using NFD, removes combining diacritical marks (`[\u0300-\u036f]`), replaces `'đ'` -> `'d'` and `'Đ'` -> `'D'`, converts to lowercase, and trims whitespace.
   - Observations [1]–[12] empirically prove that:
     - `"diep"` matches `"Ngọc Điệp"` -> normalized string is `"ngoc diep"`, query is `"diep"`, `.includes()` returns `true`.
     - `"hang"` matches `"Hằng Ni"` -> normalized string is `"hang ni"`, query is `"hang"`, `.includes()` returns `true`.
     - `"thuy"` matches `"Thuỳ Trang 🌸"` -> normalized string is `"thuy trang 🌸"`, query is `"thuy"`, `.includes()` returns `true`.
     - `"nhat"` matches `"Nhật"` -> normalized string is `"nhat"`, query is `"nhat"`, `.includes()` returns `true`.
     - `"DONG"` matches `"Đồng Bằng"` -> normalized string is `"dong bang"`, query is `"dong"`, `.includes()` returns `true`.
     - Edge inputs `null` and `undefined` safely return `""`.
     - Numbers `0` and `12345` safely return `"0"` and `"12345"`.
     - Emojis in strings are preserved (e.g. `"thuy trang 🌸"`).
     - Uppercase and leading/trailing whitespace are properly normalized.

2. **Task 2 Option Object Filtering (`vietnameseSearchFilter`)**:
   - Observations [13], [14], [16], [17]–[20] confirm that `{ label: 'Ngọc Điệp' }`, `{ children: 'Hằng Ni' }`, and `{ value: 123, label: 'Đồng Bằng' }` properly extract single string/number properties and match expected queries.
   - **Observation [15] Failure Mode**: When passed `{ children: ['Thuỳ Trang ', '🌸'] }`, `opt.children` is an Array (`typeof opt.children === 'object'`).
   - Line 24 in `packages/shared/src/utils/search.ts` strictly checks `typeof opt.children === 'string' || typeof opt.children === 'number'`. Because `typeof opt.children` is `'object'`, the check evaluates to `false`.
   - The fallback chain proceeds past `opt.label`, `opt.children`, and `opt.value`, ultimately returning `label = ''`.
   - `removeVietnameseTones('').includes('thuy')` evaluates to `false`, causing an empirical failure for `{ children: ['Thuỳ Trang ', '🌸'] }`.

---

## 3. Caveats

- **Scope Boundary**: As a review-only challenger agent, I am not modifying source implementation files directly. The identified failure mode is documented as an empirical finding.
- **Ant Design JSX Children**: In Ant Design `<Select>`, when options contain JSX children like `<Select.Option><Avatar /> Thuỳ Trang 🌸</Select.Option>`, React converts children to arrays or VNode objects. A robust helper should recursively extract text from string arrays or React children arrays.

---

## 4. Conclusion

- `removeVietnameseTones` **100% PASSED** all user acceptance criteria and edge case requirements (diacritics removal, tone insensitivity, case insensitivity, emojis, numbers, null/undefined safety, whitespace trimming).
- `vietnameseSearchFilter` **PASSED 4 out of 5** standard option object test cases (`label: string`, `children: string`, `value: number + label: string`, empty/null option handling).
- `vietnameseSearchFilter` **FAILED 1 explicit user criteria requirement**: `{ children: ['Thuỳ Trang ', '🌸'] }` (and Array labels/children in general) returns `false` due to `typeof` type checks excluding Arrays.

---

## 5. Verification Method

### How to Independently Verify

1. Run the empirical test harness script:
   ```bash
   npx tsx /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/test-harness.ts
   ```
2. Run web unit tests:
   ```bash
   pnpm --filter @mos-lab/web test:run
   ```
3. Inspect `test-harness.ts` test case #15 to observe the exact failure assertion.

---

## Challenge Summary

**Overall risk assessment**: MEDIUM

### Challenges

#### [Medium] Array Children / React Node Array Filtering Failure in `vietnameseSearchFilter`

- **Assumption challenged**: Assumed `option.children` or `option.label` is always a single primitive string or number.
- **Attack scenario**: Ant Design `<Select>` options with multiple child elements or array children (e.g. `{ children: ['Thuỳ Trang ', '🌸'] }`) passed to `vietnameseSearchFilter`.
- **Blast radius**: Filter fails to match valid options with array children, causing search results to drop items when users type valid tone-free text.
- **Mitigation**: Update `vietnameseSearchFilter` to support Array values for `label` and `children` by checking `Array.isArray(...)` and joining string elements, e.g.:
  ```ts
  const extractText = (val: unknown): string => {
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.map(extractText).join(' ');
    return '';
  };
  ```

---

## Attack Surface

### Hypotheses Tested

- `removeVietnameseTones` handles Vietnamese diacritics removal, uppercase conversion, whitespace trimming, numbers, null, undefined, emojis. (CONFIRMED PASS)
- `vietnameseSearchFilter` handles option object formats: `{ label: string }`, `{ children: string }`, `{ children: Array }`, `{ value: number, label: string }`. (ARRAY CHILDREN FAILED)

### Vulnerabilities Found

- Array `children` or `label` in `vietnameseSearchFilter` (e.g. `{ children: ['Thuỳ Trang ', '🌸'] }`) causes string conversion to fail and returns `false`.

### Untested Angles

- Deeply nested React component instances inside options where text is embedded inside `props.children` object structures.
