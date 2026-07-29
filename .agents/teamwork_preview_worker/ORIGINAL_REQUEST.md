## 2026-07-29T07:43:30Z

You are the Implementation Worker for Milestone 2 of the SMS Action feature in mos-lab.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the full SMS Action feature according to the specs from Milestone 1:

1. **Shared DTOs (`packages/shared/src/types/sms.ts`)**:
   - Create `packages/shared/src/types/sms.ts` and re-export in `packages/shared/src/index.ts`.
   - Define interfaces: `SmsTemplate`, `SaveSmsTemplateInput`, `SendSmsRequest`, `SendSmsResponse`, `CustomerSmsHistoryItem`, `SmsVariableTagDefinition`.
   - Run build: `pnpm --filter @mos-lab/shared build`

2. **Prisma Model & Backend Fastify Routes (`apps/api`)**:
   - Update `apps/api/prisma/legacy.prisma`: add model `user_sms` mapping to `user_sms` table in legacy DB (`id`, `to_phone_number`, `body`, `template_id`, `created_staff_id`, `date_created`).
   - Run `pnpm --filter @mos-lab/api prisma:generate`.
   - Create `apps/api/src/modules/sms/routes.ts` and register in `apps/api/src/server.ts`. Note: Relative imports MUST end with `.js`.
   - Routes:
     - `GET /api/sms/templates`: Return system templates from `crm_config` (key `SMS_TEMPLATES_CONFIG`) plus default legacy templates (`Reminder 17 - Single`).
     - `POST /api/sms/templates`: Save/update system templates in `crm_config`. Protected by `requireRole(['admin'])`.
     - `DELETE /api/sms/templates/:id`: Remove system template from `crm_config`. Protected by `requireRole(['admin'])`.
     - `GET /api/sms/history/:customerId`: Query customer's SMS history from `fastify.prisma.legacy.user_sms` matching phone number.
     - `POST /api/sms/send`: Save record to `user_sms` (legacy) AND create log in `crm_call_logs` (`call_type = 'SMS'`). Return `{ success: true, smsId, callLogId }`.

3. **Web SDK Client (`apps/web/lib/api-client.ts`)**:
   - Add `apiClient.sms` object with methods: `getTemplates`, `saveTemplate`, `deleteTemplate`, `getHistory`, `sendSms`.

4. **SMS Modal Component (`apps/web/components/sms/SMSModal.tsx`)**:
   - Build dual-pane SMS Modal adhering to `CopyComboModal` standards.
   - Left Pane: Scrollable list of customer's SMS history (from `user_sms`).
   - Right Pane: Template selector dropdown, Variable Tag clickable chips (`{ten_khach}`, `{sdt_khach}`, `{han_dung}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`, etc.), custom message editor, Live Preview box with dynamic variable substitution, character & SMS segment counter (using `tabular-nums`), Admin "Lưu Template Mẫu" button, and Primary "Gửi SMS" button.
   - Light/Dark theme compatibility (`themeMode` or Antd `theme.useToken()`).

5. **Customer Management Views Integration (`LoCa` & `NYC`)**:
   - In `apps/web/app/dashboard/loca` and `apps/web/app/dashboard/nyc`:
   - Update "Thao tác" column width to 180px-200px.
   - Add "Gửi SMS" button with `MessageOutlined` icon next to "Lên lịch gọi" in the "Chạm 17 (ngày)" tab table.
   - Wire `smsModalVisible` and `selectedCustomer` state, and render `<SMSModal>` component.

6. **Build Verification**:
   - Run `pnpm build` (or `pnpm --filter @mos-lab/shared build`, `pnpm --filter @mos-lab/api build`, `pnpm --filter @mos-lab/web build`) and verify 100% clean compilation.

Working directory: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker`
Document your implementation and build results in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker/handoff.md`. Communicate status via `send_message`.
