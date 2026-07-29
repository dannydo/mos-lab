# Handoff Report — Explorer 3 (Milestone 1: SMS Shared Types & SDK Client Design)

## 1. Observation

1. **Shared Types Structure (`packages/shared/src/types/`)**:
   - `packages/shared/src/index.ts` lines 1-18 re-export all domain type files (`customer`, `auth`, `call`, `catalog`, etc.) using `export * from './types/<module>'`.
   - `packages/shared/package.json` specifies `"main": "./src/index.ts"` and `"scripts": { "build": "tsc" }`.

2. **SDK API Client Pattern (`apps/web/lib/api-client.ts`)**:
   - `apps/web/lib/api-client.ts` exports `const apiClient = { ... }` containing modules (`auth`, `catalog`, `customers`, `plans`, `calls`, `kpi`, `staff`, `roles`, `tableConfig`, etc.).
   - `AGENTS.md` Rule #2 requires: "Never use raw Axios strings: Do not call `api.get('/some-route')` directly. Use the SDK: Always use `apiClient` located in `apps/web/lib/api-client.ts`."

3. **Backend Fastify Module Import Pattern (`apps/api/src/modules/`)**:
   - `apps/api/src/modules/calls/routes.ts` line 2: `import { requireAuth } from '../../middlewares/auth.js';`
   - `AGENTS.md` Rule #3 requires: "Relative imports in `apps/api` **MUST** end with `.js` (e.g. `import prismaPlugin from './plugins/prisma.js'`). This is required by `NodeNext` TypeScript configuration."

4. **Legacy DB Schema & CRM DB Schema**:
   - Legacy DB `management` contains `order` table with `user_sms_id` column (`apps/api/prisma/legacy.prisma` line 45) and `user_sms` table for SMS logging.
   - CRM DB `mos_lab` contains `crm_call_logs` table (`apps/api/prisma/crm.prisma` line 62) where contact logs are recorded with `call_type = 'SMS'`.

5. **UI & Theme Rules**:
   - `AGENTS.md` Rule #4 & Rule #5: Theme support for Light and Dark themes (`.light-theme` / `.dark-theme`), inline styles using `themeMode === 'dark' ? ... : ...` or `theme.useToken()`, and mandatory `tabular-nums` for all counters, timestamps, duration, and time displays to prevent jitter.

---

## 2. Logic Chain

1. **Observation 1 -> DTO Location**: Since `packages/shared/src/index.ts` re-exports module files in `packages/shared/src/types/`, creating `packages/shared/src/types/sms.ts` and exporting it from `index.ts` seamlessly exposes SMS DTOs (`SmsTemplate`, `SendSmsRequest`, `SendSmsResponse`, `CustomerSmsHistoryItem`, `PreviewSmsRequest`, `PreviewSmsResponse`) to both `@mos-lab/api` and `@mos-lab/web`.
2. **Observation 2 -> SDK Extension**: Following the established `apiClient` pattern in `apps/web/lib/api-client.ts`, adding an `sms` property object with typed methods (`getTemplates`, `saveTemplate`, `deleteTemplate`, `sendSms`, `getCustomerSmsHistory`, `previewSms`) satisfies Rule #2 and prevents raw axios calls across frontend components.
3. **Observation 3 -> Fastify Relative Imports**: Any new Fastify module created in `apps/api/src/modules/sms/` (such as `routes.ts`, `services/sms.service.ts`) must strictly append `.js` to relative import paths to comply with `NodeNext` module resolution.
4. **Observation 4 -> Backend Dual DB Operations**: When sending SMS via `POST /api/sms/send`, the backend must perform two database operations: (a) insert record into legacy DB `user_sms` via `fastify.prisma.legacy`, and (b) insert record into CRM DB `crm_call_logs` (`call_type = 'SMS'`) via `fastify.prisma.crm`.
5. **Observation 5 -> Role Access & UI Compliance**: System template modifications (`POST /api/sms/templates`) must enforce `requireRole(['admin'])`, whereas sending SMS (`POST /api/sms/send`) allows staff/bookers (`requireAuth`). UI components in `SMSModal.tsx` must apply `tabular-nums` on segment/character counters and adapt colors based on `themeMode`.

---

## 3. Caveats

1. **SMS Gateway Provider**: The actual SMS Brandname gateway HTTP API (e.g. Vietguys / OmiCall SMS / Telco gateway) will be mocked or integrated depending on production configuration. The DTOs account for returning `userSmsId` and delivery status.
2. **Dynamic Variable Data Availability**: If a customer record lacks certain optional fields (e.g. `comboBalance`), the variable substitution logic must safely fall back to default strings without throwing runtime errors.
3. **No Code Implementation in M1**: Explorer 3 operates under a read-only investigation mandate. File changes for `packages/shared`, `api-client.ts`, and backend routes are specified in `analysis.md` and reserved for Milestone 2 implementation.

---

## 4. Conclusion

The SMS feature DTO design, SDK client layout, variable tag specifications, and compliance checklist have been fully documented in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3/analysis.md`.

- Shared DTOs: `packages/shared/src/types/sms.ts`
- SDK Client: `apiClient.sms` in `apps/web/lib/api-client.ts`
- Fastify Backend: `/api/sms/templates`, `/api/sms/send`, `/api/sms/history/:customerId` using `.js` imports.
- Compliance: 100% compliant with Fastify `.js` import rule, SDK apiClient requirement, RBAC role checks, Light/Dark theme support, and `tabular-nums` formatting.

---

## 5. Verification Method

1. **Inspect Analysis Report**:
   ```bash
   cat /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3/analysis.md
   ```
2. **Verify Shared Package Buildability**:
   ```bash
   pnpm --filter @mos-lab/shared build
   ```
3. **Verify Compliance Rule References**:
   - Check `packages/shared/src/index.ts` for export pattern.
   - Check `apps/web/lib/api-client.ts` for `apiClient` structure.
   - Check `apps/api/src/modules/calls/routes.ts` for `.js` relative imports.
