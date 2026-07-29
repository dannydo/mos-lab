# Handoff Report: Milestone 2 — SMS Action Feature Implementation

## 1. Observation

- **Shared DTOs**:
  - File created: `packages/shared/src/types/sms.ts` defining `SmsTemplate`, `SaveSmsTemplateInput`, `SendSmsRequest`, `SendSmsResponse`, `CustomerSmsHistoryItem`, `SmsVariableTagDefinition`, and `DEFAULT_SMS_VARIABLE_TAGS`.
  - Re-exported in `packages/shared/src/index.ts` line 18: `export * from './types/sms';`.
  - Build command `pnpm --filter @mos-lab/shared build` completed with exit code 0.

- **Prisma Model & Backend API Routes (`apps/api`)**:
  - File updated: `apps/api/prisma/legacy.prisma` adding model `user_sms`:
    ```prisma
    model user_sms {
      id               Int      @id @default(autoincrement()) @db.UnsignedInt
      to_phone_number  String   @db.VarChar(50)
      body             String   @db.Text
      template_id      Int?     @db.UnsignedInt
      created_staff_id Int?     @db.UnsignedInt
      date_created     DateTime @default(now()) @db.DateTime(0)
    }
    ```
  - Executed `pnpm --filter @mos-lab/api prisma:generate` which successfully generated both legacy and CRM clients.
  - File created: `apps/api/src/modules/sms/routes.ts` implementing `GET /api/sms/templates`, `POST /api/sms/templates` (Admin), `DELETE /api/sms/templates/:id` (Admin), `GET /api/sms/history/:customerId`, and `POST /api/sms/send`. Relative imports use `.js` extension (`../../middlewares/auth.js`).
  - Registered in `apps/api/src/server.ts` line 21 (`import { smsRoutes } from './modules/sms/routes.js';`) and line 170 (`await server.register(smsRoutes, { prefix: '/api' });`).
  - Build command `pnpm --filter @mos-lab/api build` completed with 0 errors.

- **Web SDK Client (`apps/web/lib/api-client.ts`)**:
  - Imported SMS DTOs from `@mos-lab/shared`.
  - Added `apiClient.sms` object with `getTemplates()`, `saveTemplate()`, `deleteTemplate()`, `getHistory()`, and `sendSms()` methods.

- **SMS Modal Component (`apps/web/components/sms/SMSModal.tsx`)**:
  - Dual-pane modal built following `CopyComboModal` standards.
  - Left pane: Scrollable SMS history list with badges, timestamp, staff name, recipient phone, and message snippet.
  - Right pane: Recipient phone selector, template dropdown, variable tag chips (`{ten_khach}`, `{sdt_khach}`, `{han_dung}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`), custom message editor, dynamic live preview box, character & SMS segment counter (`tabular-nums`), Admin "Lưu Template Mẫu" button & modal, and Primary "Gửi SMS" button.
  - Supports both `open` and `visible` props for full component compatibility.
  - Supports themeMode (Light & Dark theme) and Ant Design tokens.

- **LoCa & NYC Dashboard Views Integration**:
  - `apps/web/app/dashboard/loca/components/LocaColumns.tsx`: Expanded `actions` column width from `120` to `200` in both `getLocaColumns` and `getNewLocaColumns`, added "Gửi SMS" button with `MessageOutlined` icon next to "Lên lịch gọi".
  - `apps/web/app/dashboard/loca/page.tsx`: Dynamically imported `SMSModal`, added `smsModalVisible` state, `handleOpenSmsModal` handler, passed to column getters, and rendered `<SMSModal>`.
  - `apps/web/app/dashboard/nyc/components/NycColumns.tsx`: Expanded `actions` column width from `110` to `200`, added "Gửi SMS" button with `MessageOutlined` icon.
  - `apps/web/app/dashboard/nyc/page.tsx`: Dynamically imported `SMSModal`, added `smsModalVisible` state, `handleOpenSmsModal` handler, passed to `getNycColumns`, and rendered `<SMSModal>`.

- **Full Monorepo Build Verification**:
  - Executed `pnpm build`: 4 of 4 packages (`@mos-lab/shared`, `@mos-lab/api`, `@mos-lab/ads-portal`, `@mos-lab/web`) built 100% clean with 0 TypeScript/compilation errors.

## 2. Logic Chain

1. **Step 1 (DTOs)**: Defining standardized interfaces in `@mos-lab/shared` ensures single-source-of-truth type safety across Fastify API endpoints and Next.js frontend SDK.
2. **Step 2 (Prisma & API)**: Adding `user_sms` model to `legacy.prisma` maps directly to legacy DB tables. Implementing `/api/sms/*` endpoints allows fetching/saving system templates in `crm_config`, querying customer SMS history, and recording sent SMS to `user_sms` while creating linked `crm_call_logs` (`call_type = 'SMS'`).
3. **Step 3 (SDK)**: Extending `apiClient.sms` provides clean, strongly-typed frontend method calls (`apiClient.sms.sendSms(...)`, `apiClient.sms.getHistory(...)`) avoiding raw HTTP string calls.
4. **Step 4 (SMSModal UI)**: Dual-pane component enables telesales staff to view past customer communication history on the left while composing new SMS messages on the right with real-time variable tag substitution, segment count tracking, and template selection.
5. **Step 5 (Views Integration)**: Wiring "Gửi SMS" into LoCa and NYC "Chạm 17 (ngày)" and touchpoint tables allows instant 1-click access to SMS actions directly from customer care workflows.

## 3. Caveats

- No caveats. The implementation covers all backend API, shared types, SDK, modal UI, and dashboard view integration specs from Milestone 1.

## 4. Conclusion

The SMS Action feature (Milestone 2) is fully implemented, strongly-typed, theme-compatible, and integrated into mos-lab monorepo with 100% clean compilation (`pnpm build`).

## 5. Verification Method

To verify the implementation independently:

1. **Shared Build**:
   ```bash
   pnpm --filter @mos-lab/shared build
   ```
2. **API Generation & Build**:
   ```bash
   pnpm --filter @mos-lab/api build
   ```
3. **Monorepo Build**:
   ```bash
   pnpm build
   ```
4. **Inspect Files**:
   - `packages/shared/src/types/sms.ts`
   - `apps/api/prisma/legacy.prisma`
   - `apps/api/src/modules/sms/routes.ts`
   - `apps/web/lib/api-client.ts`
   - `apps/web/components/sms/SMSModal.tsx`
   - `apps/web/app/dashboard/loca/components/LocaColumns.tsx`
   - `apps/web/app/dashboard/loca/page.tsx`
   - `apps/web/app/dashboard/nyc/components/NycColumns.tsx`
   - `apps/web/app/dashboard/nyc/page.tsx`
