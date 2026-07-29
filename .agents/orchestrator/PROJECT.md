# Project: mos-lab SMS Action Feature for "Chạm 17 (ngày)" (LoCa / NYC)

## Architecture

- Frontend: Next.js 15 + Ant Design 5 + Tailwind v4 (`apps/web`).
  - Customer Management: `apps/web/app/dashboard/loca` and `apps/web/app/dashboard/nyc` ("Chạm 17 (ngày)" tab).
  - Component: SMS Action Modal (`apps/web/components/sms/SMSModal.tsx` or similar) featuring dual-pane layout: Left pane for customer SMS history from `user_sms`, Right pane for Template selection, Variable Tag buttons (`{ten_khach}`, `{han_dung}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`), Custom Editor, Live Preview, Admin template save, and Send SMS.
  - SDK: `apiClient` in `apps/web/lib/api-client.ts`.
- Backend: Fastify 5 + TypeScript (`apps/api`).
  - Routes: `/api/sms/templates` (GET/POST for template management), `/api/sms/send` (POST for sending SMS, logging to legacy `user_sms` & `crm_call_logs`), `/api/sms/history/:customerId` (GET for customer SMS history).
  - Database: Legacy DB `management` (`user_sms` table) & CRM DB `mos_lab` (`crm_config` or template storage & `crm_call_logs`).
- Shared Types: `@mos-lab/shared` (`packages/shared/src/types/sms.ts`).

## Milestones

| #   | Name                                | Scope                                                                                                                                                                                                  | Dependencies | Status |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------ |
| 1   | M1_sms_exploration_and_architecture | Audit customer care tables (LoCa/NYC "Chạm 17"), legacy `user_sms` & `crm_call_logs` DB schemas, template storage in `crm_config`, and existing modal/component architecture.                          | None         | DONE   |
| 2   | M2_sms_feature_implementation       | Implement shared types, Fastify backend routes (`/api/sms/templates`, `/api/sms/send`, `/api/sms/history`), web `apiClient`, SMS Modal UI, and "Gửi SMS" button in "Chạm 17 (ngày)" tab. Verify build. | M1           | DONE   |
| 3   | M3_review_and_adversarial_challenge | Independent review by 2 Reviewers & empirical stress testing by 2 Challengers for template variable replacement, SMS sending, history logging, and UI theme compliance.                                | M2           | DONE   |
| 4   | M4_forensic_integrity_audit         | Forensic integrity verification by `teamwork_preview_auditor` to ensure authentic DB reads/writes (`user_sms`, `crm_call_logs`) without hardcoding or test bypasses.                                   | M3           | DONE   |
| 5   | M5_synthesis_and_reporting          | Final synthesis of implementation results, verification confirmation, build confirmation, and completion report.                                                                                       | M4           | DONE   |

## Code Layout

- `packages/shared/src/types/sms.ts`: Shared DTOs for SMS templates, variable tags, send request/response, history.
- `apps/api/src/modules/sms/`: Fastify SMS routes and services.
- `apps/web/lib/api-client.ts`: Web API Client methods for SMS.
- `apps/web/components/sms/`: SMS Modal UI components.
- `apps/web/app/dashboard/loca/` & `apps/web/app/dashboard/nyc/`: Customer management views with "Chạm 17 (ngày)" tab action column integration.
