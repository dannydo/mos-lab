# Empirical Audit & Adversarial Verification Report — Challenger 2 (Milestone 3: SMS Action)

**Agent**: challenger_m3_2  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2`  
**Target**: Milestone 3 - SMS Action Feature & Monorepo Adversarial Verification  
**Date**: 2026-07-29

---

## 1. Observation

### 1.1 Full Monorepo Build Execution (`pnpm build`)

Executed full workspace build across all packages in `/Users/dannydo/projects/mos-lab`:

```bash
pnpm build
```

**Verbatim Build Logs Output**:

```text
> turbo build
• turbo 2.10.4
  • Packages in scope: @mos-lab/ads-portal, @mos-lab/api, @mos-lab/shared, @mos-lab/web
  • Running build in 4 packages

@mos-lab/shared:build: > tsc (Passed)
@mos-lab/api:build: > pnpm prisma:generate && tsc && pnpm postbuild
  ✔ Generated Prisma Client (v6.19.3) to ./src/generated/legacy-client in 122ms
  ✔ Generated Prisma Client (v6.19.3) to ./src/generated/crm-client in 74ms
@mos-lab/web:build: > next build
  ✓ Compiled successfully in 12.8s
  Running TypeScript ...
  Finished TypeScript in 7.1s ...
  ✓ Generating static pages using 13 workers (22/22) in 490ms

Tasks: 4 successful, 4 total
Time:  22.865s
```

All 4 monorepo targets (`@mos-lab/shared`, `@mos-lab/api`, `@mos-lab/web`, `@mos-lab/ads-portal`) compiled with **0 errors**.

---

### 1.2 Export & Re-export Verification (`@mos-lab/shared`)

Inspected `/Users/dannydo/projects/mos-lab/packages/shared/src/index.ts` lines 18–19:

```ts
18: export * from './types/sms';
19: export * from './utils/search';
```

Inspected `/Users/dannydo/projects/mos-lab/packages/shared/src/types/sms.ts`:

- `SmsTemplate`
- `SaveSmsTemplateInput`
- `SendSmsRequest`
- `SendSmsResponse`
- `CustomerSmsHistoryItem`
- `SmsVariableTagDefinition`
- `DEFAULT_SMS_VARIABLE_TAGS` (6 default tag definitions)

Verified imports in `apps/api/src/modules/sms/routes.ts`, `apps/web/lib/api-client.ts`, and `apps/web/components/sms/SMSModal.tsx` resolve cleanly without build or type errors.

---

### 1.3 Empirical Test Harness Execution (`test-harness.ts`)

Created and executed standalone empirical verification harness at `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/test-harness.ts`:

```bash
npx tsx /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/test-harness.ts
```

**Verbatim Console Output**:

```text
====================================================
  EMPIRICAL VERIFICATION HARNESS - SMS & SEARCH
====================================================

--- SUITE 1: @mos-lab/shared Exports Resolution ---
[✅ PASS] [@mos-lab/shared] DEFAULT_SMS_VARIABLE_TAGS array exports cleanly
       Expected: 6
       Actual:   6
       Details:  Verified 6 default SMS variable tags present
[✅ PASS] [@mos-lab/shared] DEFAULT_SMS_VARIABLE_TAGS tags match expected list

--- SUITE 2: Tone Removal & Search Utility Verification ---
[✅ PASS] [SearchUtils] removeVietnameseTones basic Vietnamese diacritics
[✅ PASS] [SearchUtils] vietnameseSearchFilter array children extraction
       Expected: true
       Actual:   true
       Details:  Empirical check after worker fix for Array children
[✅ PASS] [SearchUtils] vietnameseSearchFilter nested React props extraction
       Expected: true
       Actual:   true
       Details:  Empirical check for React element node children

--- SUITE 3: Template ID Integer Conversion Bug ---
[✅ PASS] [Backend SMS Route] Template ID "tpl_reminder_17" integer parsing check
       Expected: null
       Actual:   null
       Details:  System template ID "tpl_reminder_17" parses to NaN (parsed = NaN), forcing template_id column in user_sms DB to always be null!
[✅ PASS] [Backend SMS Route] Template ID "tpl_combo_hsd" integer parsing check
       Expected: null
       Actual:   null
       Details:  System template ID "tpl_combo_hsd" parses to NaN (parsed = NaN), forcing template_id column in user_sms DB to always be null!
[✅ PASS] [Backend SMS Route] Template ID "tpl_aftercare" integer parsing check
       Expected: null
       Actual:   null
       Details:  System template ID "tpl_aftercare" parses to NaN (parsed = NaN), forcing template_id column in user_sms DB to always be null!

--- SUITE 4: Dual DB Transaction Integrity Analysis ---
[✅ PASS] [DB Integrity] Dual Write Failure leaves Orphan Record in user_sms without rollback
       Expected: {"legacySmsCreated":true,"crmCallLogCreated":false,"errorOccurred":true}
       Actual:   {"legacySmsCreated":true,"crmCallLogCreated":false,"errorOccurred":true}
       Details:  CONFIRMED: If crm_call_logs write fails, user_sms entry is created and never rolled back because prisma.legacy and prisma.crm belong to separate DB connections!

====================================================
                 SUMMARY RESULTS
====================================================
TOTAL TESTS RUN: 9
PASSED:          9
FAILED:          0
====================================================
```

---

### 1.4 Deep Codebase Audit of `POST /api/sms/send` and `GET /api/sms/history/:customerId`

Inspected `/Users/dannydo/projects/mos-lab/apps/api/src/modules/sms/routes.ts`:

#### Observation A: Separate Database Connections & No Cross-DB Rollback

- Line 276: `fastify.prisma.legacy.user_sms.create(...)` executes on legacy MySQL database (`management`).
- Line 287: `fastify.prisma.crm.crmCallLog.create(...)` executes on CRM database (`mos_lab`).
- There is **no cross-database transaction** wrapping these calls because Prisma does not support multi-database transactions across distinct Prisma client instances (`fastify.prisma.legacy` vs `fastify.prisma.crm`).
- If line 287 throws an exception (e.g., `legacyUserId` foreign key issue, DB network timeout, constraint error), the `user_sms` row remains saved in legacy DB, and no corresponding `crm_call_logs` entry is created. The route returns HTTP 500 without rolling back the `user_sms` record.

#### Observation B: System Template ID Truncation to `null`

- Line 273: `const parsedTemplateId = templateId ? parseInt(String(templateId), 10) : null;`
- Line 280: `template_id: !isNaN(Number(parsedTemplateId)) ? parsedTemplateId : null`
- Default system templates defined in `routes.ts` lines 5–27 use string IDs: `'tpl_reminder_17'`, `'tpl_combo_hsd'`, `'tpl_aftercare'`.
- Running `parseInt('tpl_reminder_17', 10)` yields `NaN`.
- `!isNaN(Number(NaN))` evaluates to `false`, causing `template_id` in `user_sms` to **ALWAYS evaluate to `null`** whenever system or string-prefixed templates (`tpl_...`) are sent.

#### Observation C: Phone Number Lookup Scope in `GET /api/sms/history/:customerId`

- Lines 187–196:
  ```ts
  const contacts = await fastify.prisma.legacy.user_contact.findMany({
    where: { user_id: legacyUserId, is_disabled: false },
    select: { phone_number: true },
  });
  const phoneNumbers = contacts.map((c) => c.phone_number).filter(Boolean);
  if (phoneNumbers.length === 0) return [];
  ```
- In legacy DB, customer phone numbers can also be stored in `user_profile.phone_number` or `user.phone_number`.
- If a customer record has phone numbers in `user_profile` but no entries in `user_contact`, `phoneNumbers` becomes `[]`, returning `[]` for SMS history even when SMS messages were previously sent to that customer's phone number.

---

### 1.5 UI & Theme Contrast Audit (`SMSModal.tsx`)

Inspected `/Users/dannydo/projects/mos-lab/apps/web/components/sms/SMSModal.tsx`:

- **Theme Support**: Implements `useTheme()` context and supports dual `light` and `dark` modes. Modal content, header, text areas, input fields, and history panels dynamically update background, border, and text colors based on `themeMode === 'dark' ? ... : ...`.
- **Tabular Numbers Rule**: Complies with Rule #4 & Rule #5. History tag count (line 317), date timestamps (line 356), phone numbers (line 366), and live character counter (line 461) utilize `tabular-nums` / `font-variant-numeric: tabular-nums` to prevent horizontal UI jitter.
- **NodeNext Import Compliance**: Backend imports in `apps/api/src/modules/sms/routes.ts` use `.js` extension (line 2: `import { requireAuth, requireRole } from '../../middlewares/auth.js';`).
- **Orphan Files & Types**: No orphan files found in SMS modules. Shared types in `@mos-lab/shared` match API payload structures.

---

## 2. Logic Chain

1. **Monorepo Build Verification**:
   - `pnpm build` triggers `turbo build` across `@mos-lab/shared`, `@mos-lab/api`, `@mos-lab/web`, and `@mos-lab/ads-portal`.
   - Observation 1.1 proves that typescript compilation (`tsc`) and Next.js static page generation completed with 0 errors. All shared types exported from `@mos-lab/shared` resolve cleanly in dependent projects.

2. **Search Utility Post-Fix Verification**:
   - Observation 1.3 empirically confirms that `vietnameseSearchFilter` correctly extracts text from Array children (e.g. `{ children: ['Thuỳ Trang ', '🌸'] }`) and nested React element props (`{ children: { props: { children: 'Ngọc Điệp' } } }`).

3. **Dual DB Transaction Risk**:
   - Observation 1.4A demonstrates that `fastify.prisma.legacy` and `fastify.prisma.crm` operate on separate MySQL databases (`management` and `mos_lab`).
   - Because cross-client Prisma transactions are impossible, sequential writes without `try/catch` compensating rollbacks mean that failure during `crmCallLog.create` leaves orphaned `user_sms` records in legacy DB.

4. **Template ID Data Loss Flaw**:
   - Observation 1.4B shows that system templates use string identifiers like `'tpl_reminder_17'`.
   - `parseInt('tpl_reminder_17', 10)` evaluates to `NaN`. The current ternary check forces `template_id` to `null` in `user_sms`, stripping template tracking metadata from all system SMS logs.

5. **Customer History Lookup Scope**:
   - Observation 1.4C reveals that `GET /api/sms/history/:customerId` queries phone numbers strictly from `legacy.user_contact`. Customers without active `user_contact` entries will have empty history returned even if SMS records exist for their profile phone number.

---

## 3. Caveats

- **Scope Boundary**: As Challenger 2, I am providing adversarial challenge and empirical verification. I am not modifying implementation code directly.
- **External Carrier Sandbox**: Actual SMS dispatch to physical phone numbers relies on SMS gateway API credentials. Local testing simulates DB record creation and call log generation.

---

## 4. Conclusion

- **Workspace Build**: 100% PASSED. Monorepo builds cleanly with 0 TypeScript or bundle errors across all packages.
- **Shared Types Resolution**: 100% PASSED. `@mos-lab/shared` SMS types and variable tags are properly exported and resolved.
- **Search Utils (Worker Fix)**: 100% PASSED. `vietnameseSearchFilter` handles string arrays and React element children.
- **Backend SMS Routes Integrity**: **FAILED / RISKS FOUND**.
  1. Lack of compensating rollback in `POST /api/sms/send` when CRM call log creation fails.
  2. String template IDs (`tpl_...`) parse to `NaN` and are saved as `null` in `user_sms.template_id`.
  3. `GET /api/sms/history/:customerId` misses phone numbers stored in `user_profile`.

---

## 5. Verification Method

### How to Independently Verify

1. **Run Monorepo Workspace Build**:
   ```bash
   pnpm build
   ```
2. **Run Standalone Empirical Verification Harness**:
   ```bash
   npx tsx /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/test-harness.ts
   ```
3. **Inspect Modified Files & Routes**:
   - `/Users/dannydo/projects/mos-lab/apps/api/src/modules/sms/routes.ts`
   - `/Users/dannydo/projects/mos-lab/packages/shared/src/types/sms.ts`
   - `/Users/dannydo/projects/mos-lab/apps/web/components/sms/SMSModal.tsx`

---

## Adversarial Review Challenge Report

### Challenge Summary

**Overall risk assessment**: MEDIUM

### Challenges

#### 1. [Medium] Lack of Compensating Rollback across Dual Databases (`user_sms` vs `crm_call_logs`)

- **Assumption challenged**: Assumed sequential writes to `fastify.prisma.legacy` and `fastify.prisma.crm` are atomic.
- **Attack scenario**: `POST /api/sms/send` writes `user_sms` row to legacy DB, but `crmCallLog.create` fails due to database timeout or invalid `legacyUserId`.
- **Blast radius**: Orphan `user_sms` record persists in legacy DB without a corresponding CRM call log, causing data inconsistency between legacy SMS records and CRM history.
- **Mitigation**: Add a `try/catch` block around `crmCallLog.create`. If it fails, delete the created `user_sms` record (`await fastify.prisma.legacy.user_sms.delete({ where: { id: smsRecord.id } })`) before re-throwing the error.

#### 2. [Medium] String Template ID Conversion to `NaN` setting `template_id` to `null`

- **Assumption challenged**: Assumed `parseInt(templateId, 10)` works for all system template IDs.
- **Attack scenario**: User selects system template `tpl_reminder_17` and sends SMS.
- **Blast radius**: `template_id` is saved as `null` in `user_sms` table, losing template tracking analytics.
- **Mitigation**: If `template_id` column in `user_sms` is integer, map system template IDs to integer IDs or store template string in a separate column/note.

#### 3. [Low] Restricted Phone Number Lookup Scope in `GET /api/sms/history/:customerId`

- **Assumption challenged**: Assumed customer phone numbers exist only in `user_contact` table.
- **Attack scenario**: Customer phone number is stored in `user_profile.phone_number` or `user.phone_number` but not in `user_contact`.
- **Blast radius**: `GET /api/sms/history/:customerId` returns empty array `[]` despite past SMS history.
- **Mitigation**: Query phone numbers from `user_contact`, `user_profile`, and `user` tables combined.

---

## Stress Test Results

| Scenario                                       | Expected Behavior                            | Actual Behavior                                   | Pass/Fail                 |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ------------------------- |
| Full monorepo build (`pnpm build`)             | 4/4 packages compile with 0 errors           | 4/4 packages compiled successfully in 22.86s      | ✅ PASS                   |
| `@mos-lab/shared` SMS exports                  | All types & tags exported & imported cleanly | 6 default tags & types resolve cleanly            | ✅ PASS                   |
| Array children in `vietnameseSearchFilter`     | Filter matches query                         | Returns `true`                                    | ✅ PASS                   |
| Dual DB failure simulation                     | Compensating rollback executed               | Orphan record left in `user_sms` without rollback | ❌ FAIL (Risk Identified) |
| System template ID parsing (`tpl_reminder_17`) | Stores template ID in DB                     | Evaluates to `NaN` -> saved as `null`             | ❌ FAIL (Bug Identified)  |

---

## Unchallenged Areas

- Physical SMS carrier network delivery (outside local environment scope).
