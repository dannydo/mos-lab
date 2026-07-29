# Orchestrator Handoff Report — SMS Action Feature for "Chạm 17 (ngày)" (LoCa / NYC)

## Milestone State

| Milestone | Scope                            | Status | Verification                                                                                                                         |
| --------- | -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| M1        | Exploration & Architecture Audit | DONE   | 3 Explorers audited LoCa/NYC views, legacy `user_sms` DB schema, Fastify backend routes, and shared DTOs                             |
| M2        | SMS Feature Implementation       | DONE   | Implemented shared DTOs, Fastify SMS routes, `apiClient.sms` SDK, dual-pane `SMSModal.tsx`, and action buttons in LoCa & NYC tabs    |
| M3        | Review & Adversarial Challenge   | DONE   | 2 Reviewers APPROVED code quality; 2 Challengers ran stress test harnesses. 5 edge-case bugs identified and remediated by Fix Worker |
| M4        | Forensic Integrity Audit         | DONE   | `teamwork_preview_auditor` verified authentic logic with verdict **CLEAN**                                                           |
| M5        | Synthesis & Completion Reporting | DONE   | All requirements (R1, R2, R3, R4) and acceptance criteria 100% verified; workspace build passing (`pnpm build`)                      |

## Active Subagents

- All subagents completed their tasks cleanly. Total subagents spawned: 10.

## Key Changes & Architecture

1. **Shared DTOs (`packages/shared/src/types/sms.ts`)**:
   - Standardized `SmsTemplate`, `SaveSmsTemplateInput`, `SendSmsRequest`, `SendSmsResponse`, `CustomerSmsHistoryItem`, `SmsVariableTagDefinition`, and `DEFAULT_SMS_VARIABLE_TAGS`.
   - Re-exported in `@mos-lab/shared` (`packages/shared/src/index.ts`).

2. **Prisma Model & Backend API (`apps/api`)**:
   - `apps/api/prisma/legacy.prisma`: Added `user_sms` model (`id`, `to_phone_number`, `body`, `template_id` as `VarChar(100)`, `created_staff_id`, `date_created`).
   - `apps/api/src/modules/sms/routes.ts`:
     - `GET /api/sms/templates`: Retrieves default system templates + custom system templates from `crm_config` (`SMS_TEMPLATES_CONFIG`).
     - `POST /api/sms/templates`: Admin endpoint to save/update system templates. Protected by `requireRole(['admin'])`.
     - `DELETE /api/sms/templates/:id`: Admin endpoint to delete custom templates (safeguards built-in system templates from deletion).
     - `GET /api/sms/history/:customerId`: Retrieves customer SMS history from legacy `user_sms`.
     - `POST /api/sms/send`: Saves SMS record to `legacy.user_sms` AND creates call log in `crm.crmCallLog` (`callType: 'SMS'`) with atomic compensating rollback.
   - Server registration: Registered `smsRoutes` in `apps/api/src/server.ts` with prefix `/api` using NodeNext `.js` imports (`./modules/sms/routes.js`).

3. **Web SDK Client (`apps/web/lib/api-client.ts`)**:
   - Implemented `apiClient.sms` methods: `getTemplates`, `saveTemplate`, `deleteTemplate`, `getHistory`, `sendSms`.

4. **Dual-Pane SMS Modal (`apps/web/components/sms/SMSModal.tsx`)**:
   - Left pane: Scrollable customer SMS history with badges, staff names, timestamps (`tabular-nums`), and phone selector.
   - Right pane: Template selector dropdown, dynamic variable tag chips (`{ten_khach}`, `{sdt_khach}`, `{han_dung}`, `{ngay_lam_near}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`), custom message body editor, live preview box with dynamic tag substitution, character & SMS segment counter (GSM-7 160/153 vs Unicode UCS-2 70/67 byte boundaries with `tabular-nums`), Admin "Lưu Template Mẫu" modal/button, and Primary "Gửi SMS" button.
   - Light/Dark theme compatibility (`.light-theme`, `.dark-theme`, Antd `theme.useToken()`).

5. **LoCa & NYC Dashboard Views Integration (`apps/web/app/dashboard/loca` & `apps/web/app/dashboard/nyc`)**:
   - Expanded "Thao tác" column width to 200px.
   - Added "Gửi SMS" action button (`#D4A84B` styling + `MessageOutlined` icon) next to "Lên lịch gọi" in the "Chạm 17 (ngày)" tab.
   - Wired `smsModalVisible` state and rendered `<SMSModal>`.

6. **Full Workspace Build Verification**:
   - Executed `pnpm build` across all workspace packages (`@mos-lab/shared`, `@mos-lab/api`, `@mos-lab/ads-portal`, `@mos-lab/web`). Build completed successfully with 0 errors.

## Key Artifacts

- `packages/shared/src/types/sms.ts` — Shared SMS DTOs & Variable Tag definitions
- `apps/api/prisma/legacy.prisma` — Updated `user_sms` Prisma model
- `apps/api/src/modules/sms/routes.ts` — Fastify SMS backend routes
- `apps/web/lib/api-client.ts` — SDK `apiClient.sms` methods
- `apps/web/components/sms/SMSModal.tsx` — Dual-pane SMS Modal UI
- `apps/web/app/dashboard/loca/LocaColumns.tsx` & `apps/web/app/dashboard/nyc/NycColumns.tsx` — "Thao tác" column SMS action button integration
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_auditor_m4/handoff.md` — Forensic Audit Report (**CLEAN**)
