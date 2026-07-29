# Milestone 3 SMS Action Feature — Adversarial Empirical Challenge Report

**Agent**: Challenger 1 (`teamwork_preview_challenger_m3_1`)  
**Role**: Critic, Specialist (Empirical Challenger)  
**Date**: 2026-07-29  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1`

---

## 1. Observation

Direct observations from source code inspection and execution of empirical test scripts (`run_all_tests.ts`):

### A. SMS Variable Tag Substitution Logic

- **File**: `apps/web/components/sms/SMSModal.tsx` (Lines 147–172)
- **Verbatim Code**:
  ```typescript
  const expiryDateStr = customer.comboBalance?.expiryDate
    ? dayjs(customer.comboBalance.expiryDate).format('DD/MM/YYYY')
    : customer.newComboDetails?.purchaseDate
      ? dayjs(customer.newComboDetails.purchaseDate).add(30, 'day').format('DD/MM/YYYY')
      : '25/08/2026';

  const totalRemaining = customer.comboBalance
    ? (customer.comboBalance.normalCount || 0) + (customer.comboBalance.retainCount || 0)
    : 14;

  return {
    '{ten_khach}': customer.name || 'Khách hàng',
    '{sdt_khach}': selectedPhone || customer.phone || '',
    '{han_dung}': expiryDateStr,
    '{so_ngay_dam}': `${totalRemaining} ngày`,
    '{ten_combo}': comboNameStr,
    '{sdt_cua_hang}': '0987654321',
  };
  ```
- **Observed Outputs**:
  - `customer.comboBalance.expiryDate = "not-a-date"` $\rightarrow$ `{han_dung}` evaluates to `"Invalid Date"`. Output: `"Chao Nguyễn Văn A, han dung Invalid Date"`.
  - `customer.comboBalance = { normalCount: 2, retainCount: 1 }` $\rightarrow$ `{so_ngay_dam}` evaluates to `"3 ngày"`. (2 normal + 1 retain = 3 service turns, NOT 3 days).
  - `customer.comboBalance = null` $\rightarrow$ `{so_ngay_dam}` evaluates to `"14 ngày"`. Fallback hardcoded to 14.
  - Missing date fields fall back to hardcoded date `'25/08/2026'` for all customers regardless of actual purchase/expiry dates.

### B. SMS Character Count & Segment Calculation Logic

- **File**: `apps/web/components/sms/SMSModal.tsx` (Lines 184–190)
- **Verbatim Code**:
  ```typescript
  const characterCount = livePreview.length;
  const smsSegments = useMemo(() => {
    if (characterCount === 0) return 0;
    if (characterCount <= 160) return 1;
    return Math.ceil(characterCount / 153);
  }, [characterCount]);
  ```
- **Observed Outputs vs Standard Telco Specification**:
  - Vietnamese UCS-2 text (75 chars): `"Chào chị Mai, gói combo Nối Mi Premium của chị sắp hết hạn vào ngày 25/08/2026."`
    - `SMSModal.tsx` result: `1 SMS` (`Math.ceil(75 / 153)`)
    - Telco UCS-2 standard: `2 SMS` (`Math.ceil(75 / 67)`)
  - Full Vietnamese SMS template (175 chars UCS-2):
    - `SMSModal.tsx` result: `2 SMS` (`Math.ceil(175 / 153)`)
    - Telco UCS-2 standard: `3 SMS` (`Math.ceil(175 / 67)`)
  - Discrepancy: `SMSModal.tsx` under-estimates SMS segment counts for accented Vietnamese text by 1 to 2 segments.

### C. Fastify API Payload Validation & Error Responses

- **File**: `apps/api/src/modules/sms/routes.ts` (Lines 263–274, 273–284)
- **Verbatim Code**:
  ```typescript
  const { legacyUserId, toPhoneNumber, body, templateId, planId } = request.body as SendSmsRequest;

  if (!legacyUserId || !toPhoneNumber || !body || !body.trim()) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'legacyUserId, toPhoneNumber, and non-empty body are required',
    });
  }

  const parsedTemplateId = templateId ? parseInt(String(templateId), 10) : null;
  ```
- **Observed Outputs**:
  - `legacyUserId = 0` $\rightarrow$ `!0` evaluates to `true`. API returns `400 Bad Request: "legacyUserId, toPhoneNumber, and non-empty body are required"` despite `0` being a valid Fastify integer.
  - `templateId = "tpl_reminder_17"` $\rightarrow$ `parseInt("tpl_reminder_17", 10)` yields `NaN`. `user_sms.template_id` is saved as `NULL` in legacy database, losing template association for string IDs.
  - `POST /api/sms/templates` with `{ title: "   ", content: "" }` $\rightarrow$ Returns `200 OK` and saves empty template to `crmConfig`.
  - `DELETE /api/sms/templates/tpl_reminder_17` $\rightarrow$ Returns `200 OK` and deletes system default template.

---

## 2. Logic Chain

1. **Tag Substitution Logic**:
   - Observation A shows `{so_ngay_dam}` is computed by adding `normalCount` (service turns) and `retainCount` (service turns) and suffixing `" ngày"`.
   - In salon business logic, `normalCount` (e.g. 2 lượt làm) and `retainCount` (e.g. 1 lượt dặm) represent **remaining service count/lượt**, NOT days. Formatted string `"2 ngày"` communicates to the customer that they have 2 days left to use the service rather than 2 service turns.
   - Observation A shows invalid date strings (e.g. `"not-a-date"`) passed to `dayjs(...)` result in `"Invalid Date"`. Since there is no validation check on `dayjs().isValid()`, `"Invalid Date"` is formatted directly into the customer's SMS text.

2. **SMS Segment Calculation**:
   - Observation B shows `SMSModal.tsx` applies GSM-7 limits (160 single / 153 multi-part) universally to all strings.
   - According to 3GPP TS 23.038 / GSM 03.38 SMS standard, any text containing non-GSM-7 characters (specifically Vietnamese accented characters like `à, á, ả, ã, ạ, ê, ô, ơ, ư, đ`) forces UCS-2 encoding.
   - UCS-2 limits are **70 characters** for single SMS and **67 characters per segment** for multi-part SMS.
   - Therefore, a 175-character Vietnamese SMS message will be billed by SMS brandname gateways as 3 SMS segments, whereas the CRM UI displays 2 SMS segments. This creates financial ambiguity and unexpected Telco billing costs.

3. **API Validation & Endpoint Robustness**:
   - Observation C shows JavaScript falsy check `!legacyUserId`. In JavaScript, `0` is falsy. If legacy user ID is 0, the API erroneously rejects legitimate requests with HTTP 400.
   - Observation C shows `parseInt(String(templateId), 10)` for string template IDs (like `"tpl_reminder_17"`) results in `NaN`. The code converts `NaN` to `null` before inserting into `user_sms.template_id`. As a result, sending an SMS with system template `"tpl_reminder_17"` fails to record the template ID in DB history.
   - Observation C shows Fastify schema for `/api/sms/templates` specifies `{ type: 'string' }` for `title` and `content`, but lacks string minLength/pattern constraints. Blank or whitespace-only titles are accepted and saved to DB.

---

## 3. Caveats

- Tests were run using Fastify in-memory `.inject()` runner with mocked Prisma layer to isolate route schema & handler logic. Real database performance under heavy concurrent SQL loads was not benchmarked.
- External SMS Gateway (e.g. Brandname SMS provider HTTP webhook / API) integration was simulated based on standard GSM-7 vs UCS-2 3GPP TS 23.038 specifications; specific vendor-dependent UDH header byte variations were not tested.

---

## 4. Conclusion

The Milestone 3 SMS Action feature implementation contains **3 high-priority bugs** and **2 medium-priority edge cases**:

1. **[CRITICAL BUG] Incorrect SMS Segment Counter for Unicode Text**: `SMSModal.tsx` under-calculates SMS segments for Vietnamese text (using 160/153 instead of 70/67 for UCS-2), displaying incorrect green segment counts to users while telcos bill up to 50% more SMS units.
2. **[HIGH BUG] Broken Template ID Tracking for System Templates**: `/api/sms/send` parses `templateId` with `parseInt(...)`, turning string IDs like `"tpl_reminder_17"` into `NaN` and recording `template_id = null` in the database.
3. **[HIGH BUG] Falsy `legacyUserId = 0` Rejection**: `/api/sms/send` checks `if (!legacyUserId)` which rejects `legacyUserId = 0` with 400 Bad Request.
4. **[MEDIUM BUG] Confusing Tag Label & Missing Date Validation**: `{so_ngay_dam}` formats remaining service count as `"X ngày"` (e.g., 2 service turns becomes "2 ngày"), and invalid dates format as `"Invalid Date"`.
5. **[MEDIUM BUG] Unprotected System Templates & Empty Template Titles**: `/api/sms/templates` allows saving whitespace-only titles and deleting default system templates.

---

## 5. Verification Method

To verify these findings independently, run the empirical test harness in the workspace:

```bash
cd /Users/dannydo/projects/mos-lab/apps/web
npx tsx ../../.agents/teamwork_preview_challenger_m3_1/test-harness/run_all_tests.ts
```

### Invalidation Conditions:

- Test 2.7 passes if `SMSModal.tsx` accurately calculates 3 SMS segments for 175-character Vietnamese text.
- Test 3.10 passes if `legacyUserId = 0` returns 200 OK instead of 400 Bad Request.
- Test 3.12 passes if `templateId = "tpl_reminder_17"` retains string/numeric template tracking without coercing to `null`.
