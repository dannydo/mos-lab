# Handoff Report — SMS Backend Audit & Specification (Explorer 2)

## 1. Observation

- **Legacy Prisma Schema**: In `apps/api/prisma/legacy.prisma`, line 45 contains `user_sms_id` in `model order`, but `model user_sms` is **missing** from `legacy.prisma`.
- **Legacy Table Schema**: Verified against `WingsLashes/Server/src/admin/apps/models/DbTable/UserSmsDbTable.php` lines 13-176. The legacy table `user_sms` contains fields: `id`, `client_id`, `client_business_id`, `created_staff_id`, `from_phone_number`, `to_phone_number`, `from_user_contact_id`, `to_user_contact_id`, `from_user_id`, `to_user_id`, `to_language_id`, `template_id`, `order_id`, `sales_lead_id`, `provider`, `title`, `body`, `data`, `post_param`, `message_id`, `sent_result`, `ip_address`, `date_sent`, `date_created`.
- **CRM Prisma Schema**: In `apps/api/prisma/crm.prisma`, `CrmCallLog` (lines 62-81) and `CrmConfig` (lines 97-104) are defined. `CrmCallLog` contains `callType` (`@map("call_type")`), `legacyUserId`, `staffId`, `note`, `callResult`, `outcome`, `callUuid`, `createdAt`.
- **Existing Fastify Server Routes**: In `apps/api/src/server.ts` lines 8-20 & 156-168, modules for health, auth, customer, plan, call, kpi, staff, roles, tableConfig, omicall, gamification, catalog, and team are registered, but no `/api/sms` routes exist yet.
- **Existing Call Logging Patterns**: In `apps/api/src/modules/calls/routes.ts` lines 92-105, `fastify.prisma.crm.crmCallLog.create` is used with `preHandler: [requireAuth]`.

## 2. Logic Chain

1. **Observation 1 & 2** show that while `user_sms` exists in the legacy MySQL database `management`, it is not yet mapped in `apps/api/prisma/legacy.prisma`. Therefore, to enable `fastify.prisma.legacy.user_sms.create` and typed queries, `model user_sms` must be added to `legacy.prisma` and generated via Prisma CLI.
2. **Observation 3 & 5** show that `CrmCallLog` supports logging SMS interactions by setting `callType = 'SMS'`, `outcome = 'SMS_SENT'`, and referencing the legacy `user_sms` record ID via `callUuid = 'USER_SMS_<id>'`.
3. **Observation 3** shows `CrmConfig` key-value pairs are ideal for system-wide SMS templates (`key = 'SMS_TEMPLATES_CONFIG'`) storing a JSON array of template objects.
4. **Observation 4** indicates that a new route plugin `apps/api/src/modules/sms/routes.ts` should be created and registered in `server.ts` with prefix `/api` to expose `/api/sms/send`, `/api/sms/templates`, and `/api/sms/history/:customerId`.

## 3. Caveats

- No real SMS gateway (e.g. VietGuys/SpeedSMS/Twilio) integration is requested or needed at this stage; SMS actions log directly to legacy `user_sms` DB and `crm_call_logs`.
- Customer phone resolution assumes active entries in `user_contact` (`is_disabled = 0`); fallback logic to request body `toPhoneNumber` must be enforced.

## 4. Conclusion

The backend architecture for SMS Action is fully defined and documented in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_2/analysis.md`. Adding `user_sms` to `legacy.prisma`, creating `apps/api/src/modules/sms/routes.ts` for `/api/sms/send`, `/api/sms/templates`, `/api/sms/history/:customerId`, and adding shared types to `packages/shared` will ensure 100% legacy compatibility and clean CRM integration.

## 5. Verification Method

1. Inspect `analysis.md` in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_2/analysis.md`.
2. Verify `legacy.prisma` model definition for `user_sms` against `WingsLashes/Server/src/admin/apps/models/DbTable/UserSmsDbTable.php`.
3. Verify route signatures for `/api/sms/send`, `/api/sms/templates`, `/api/sms/history/:customerId` against Fastify route conventions in `apps/api/src/modules/calls/routes.ts`.
