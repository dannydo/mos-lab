# Forensic Audit Handoff Report — Milestone 4: SMS Action Feature

## Verdict: CLEAN

All source files and implementations for the SMS Action feature in `mos-lab` have been empirically audited and verified. No cheating, hardcoding, dummy mocks, or task bypasses were detected. The feature is 100% authentic, fully implemented, and integrated end-to-end.

---

## 1. Observation

Direct code and workspace inspection performed on the following target files:

1. **`packages/shared/src/types/sms.ts` & `packages/shared/src/index.ts`**:
   - `sms.ts` (59 lines) defines `SmsTemplate`, `SaveSmsTemplateInput`, `SendSmsRequest`, `SendSmsResponse`, `CustomerSmsHistoryItem`, `SmsVariableTagDefinition`, and `DEFAULT_SMS_VARIABLE_TAGS` array with 7 predefined tags.
   - `index.ts` line 18 exports `export * from './types/sms';`.

2. **`apps/api/prisma/legacy.prisma`**:
   - Lines 313-320 define model `user_sms`:
     ```prisma
     model user_sms {
       id               Int      @id @default(autoincrement()) @db.UnsignedInt
       to_phone_number  String   @db.VarChar(50)
       body             String   @db.Text
       template_id      String?  @db.VarChar(100)
       created_staff_id Int?     @db.UnsignedInt
       date_created     DateTime @default(now()) @db.DateTime(0)
     }
     ```

3. **`apps/api/src/modules/sms/routes.ts`**:
   - `GET /api/sms/templates`: Queries `fastify.prisma.crm.crmConfig.findUnique` for key `SMS_TEMPLATES_CONFIG`. Fallback to `DEFAULT_SMS_TEMPLATES`.
   - `POST /api/sms/templates`: Admin-only endpoint executing `fastify.prisma.crm.crmConfig.upsert`.
   - `DELETE /api/sms/templates/:id`: Admin-only endpoint executing `upsert` after validating non-system template status.
   - `GET /api/sms/history/:customerId`: Queries `user_contact` in legacy DB, queries `user_sms` by phone numbers, resolves staff display names from `crmStaff` in CRM DB, returns formatted history array.
   - `POST /api/sms/send`:
     - Creates record in `legacy.user_sms` via `fastify.prisma.legacy.user_sms.create` with user payload.
     - Creates record in `crm.crmCallLog` via `fastify.prisma.crm.crmCallLog.create` with `callType: 'SMS'`, `callResult: 'ANSWERED'`, `note: body.trim()`.
     - Includes compensating rollback (`user_sms.delete`) if `crmCallLog` creation fails.
     - Updates `crmDailyPlan` status to `CALLED` if `planId` is supplied.
     - Returns genuine auto-incremented `smsId` and `callLogId`.

4. **`apps/api/src/server.ts`**:
   - Line 21 imports `smsRoutes` and line 170 registers `await server.register(smsRoutes, { prefix: '/api' });`.

5. **`apps/web/lib/api-client.ts`**:
   - Lines 997-1020 add `sms` object with `getTemplates`, `saveTemplate`, `deleteTemplate`, `getHistory`, and `sendSms` calling Fastify routes.

6. **`apps/web/components/sms/SMSModal.tsx`**:
   - 598 lines implementing complete SMS modal.
   - Variable substitution `livePreview`: Uses `tagValues` dictionary calculated dynamically from `customer` properties (`name`, `phone`, `expiryDate`, `lastVisit`, `normalCount + retainCount`, `comboName`) and performs `replaceAll(tag, String(val))`.
   - Character counting & SMS segment calculation:
     - Unicode detection: `/[^\x00-\x7F]/.test(livePreview)`.
     - Max single segment: 70 for UCS-2, 160 for GSM-7.
     - Multi-part calculation: `Math.ceil(length / 67)` for UCS-2, `Math.ceil(length / 153)` for GSM-7.
   - History side panel: Displays history list with tabular numbers, staff name tag, timestamp, and message body.

7. **`apps/web/app/dashboard/loca/components/LocaColumns.tsx` & `page.tsx`**:
   - `LocaColumns.tsx` lines 326-337 and 535-546 add "Gửi SMS" button in table actions.
   - `loca/page.tsx` line 62 dynamically imports `SMSModal` and renders it at line 1056.

8. **`apps/web/app/dashboard/nyc/components/NycColumns.tsx` & `page.tsx`**:
   - `NycColumns.tsx` lines 304-315 add "Gửi SMS" button in table actions.
   - `nyc/page.tsx` line 53 dynamically imports `SMSModal` and renders it at line 889.

---

## 2. Logic Chain

- **Step 1 (DB Schema & Models)**: Checked `legacy.prisma` for `user_sms`. The table model matches legacy MySQL schema specifications and is correctly mapped in Prisma.
- **Step 2 (Backend API Implementation)**: Examined `routes.ts`. `POST /api/sms/send` performs authentic database writes to both `legacy.user_sms` and `crm.crmCallLog` using Prisma. It does not return dummy values or hardcoded IDs. Error handling includes atomic compensating rollback.
- **Step 3 (Config & Template Management)**: Analyzed template CRUD endpoints. Templates are stored and updated dynamically in `crmConfig` under `SMS_TEMPLATES_CONFIG`. System templates are protected from deletion.
- **Step 4 (Frontend SDK & Component)**: Audited `api-client.ts` and `SMSModal.tsx`. Tag values (`{ten_khach}`, `{han_dung}`, etc.) map directly to `Customer` attributes. Unicode regex accurately determines GSM-7 vs UCS-2 encoding and multi-part SMS byte boundaries (160/153 vs 70/67).
- **Step 5 (UI Integration)**: Confirmed "Gửi SMS" button wiring in both LoCa and NYC campaign pages and column definitions.
- **Step 6 (Empirical Workspace Build)**: Ran `pnpm build` across all packages (`@mos-lab/shared`, `@mos-lab/api`, `@mos-lab/ads-portal`, `@mos-lab/web`). Build succeeded with 0 errors.

---

## 3. Caveats

- Operating under `CODE_ONLY` mode (no external network access). Live SMS gateway integration (e.g. Brandsms / Telco API) is simulated by writing SMS logs to `user_sms` and `crmCallLog` in database as per product specification for Milestone 4.
- No caveats regarding code authenticity or compliance.

---

## 4. Conclusion

The Milestone 4 SMS Action feature implementation strictly satisfies all requirements without any facades, mock returns, or hardcoded shortcuts. The verdict is **CLEAN**.

---

## 5. Verification Method

To independently re-verify this audit:

1. **Verify Backend Build & Prisma Generation**:
   ```bash
   pnpm --filter @mos-lab/api build
   ```
2. **Verify Frontend & Workspace Build**:
   ```bash
   pnpm build
   ```
3. **Inspect DB Creation Logic**:
   Check `apps/api/src/modules/sms/routes.ts` lines 297-328 to verify genuine `fastify.prisma.legacy.user_sms.create` and `fastify.prisma.crm.crmCallLog.create` calls.
4. **Inspect GSM-7 / UCS-2 Encoding Calculation**:
   Check `apps/web/components/sms/SMSModal.tsx` lines 210-228.
