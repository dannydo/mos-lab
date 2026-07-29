# BRIEFING — 2026-07-29T14:53:00Z

## Mission

Fix 5 critical/high/medium bugs identified by Challenger 1 and 2 in SMS Action feature (Milestone 3) and verify build.

## 🔒 My Identity

- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix
- Original parent: 4c6eb061-9916-414f-80ff-2f233bc9429f
- Milestone: Milestone 3 - SMS Action Bug Fixes

## 🔒 Key Constraints

- Minimal change principle.
- No hardcoded test results / facade implementations.
- Verify build with `pnpm build`.
- Document findings and verification in handoff.md and send_message to parent.

## Current Parent

- Conversation ID: 4c6eb061-9916-414f-80ff-2f233bc9429f
- Updated: 2026-07-29T14:53:00Z

## Task Summary

- **What to build**:
  1. Fix UCS-2 vs GSM-7 SMS Segment Calculation in `apps/web/components/sms/SMSModal.tsx` [DONE].
  2. Fix `templateId` String Storage in `apps/api/src/modules/sms/routes.ts` & `legacy.prisma` [DONE].
  3. Fix `legacyUserId = 0` Validation in `apps/api/src/modules/sms/routes.ts` [DONE].
  4. Fix Date Formatting & Variable Replacement Fallbacks in `apps/web/components/sms/SMSModal.tsx` [DONE].
  5. Safeguard System Templates in `apps/api/src/modules/sms/routes.ts` [DONE].
  6. Run `pnpm build` and ensure clean compilation [IN PROGRESS].
- **Success criteria**: All 5 bugs fixed cleanly, 0 build errors across monorepo packages.

## Key Decisions Made

- Updated `user_sms.template_id` in `legacy.prisma` to `String? @db.VarChar(100)` and re-generated Prisma clients so string template IDs like `"tpl_reminder_17"` are preserved directly in the DB.
- Replaced hardcoded GSM-7 segment limits in `SMSModal.tsx` with dynamic detection of Unicode characters (`/[^\x00-\x7F]/`), using UCS-2 limits (70 single / 67 multi-part) when Unicode is present.
- Updated `legacyUserId` check in `routes.ts` to `legacyUserId === undefined || legacyUserId === null` to allow integer `0`.
- Added safe date formatting helper `formatSafeDate` with `dayjs(val).isValid()` checks for `{han_dung}` and `{ngay_lam_near}`.
- Added deletion protection in `DELETE /api/sms/templates/:id` returning `400 Bad Request` if template ID is built-in system template.
- Added dual-DB compensating rollback when `crmCallLog.create` fails.

## Artifact Index

- /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix/ORIGINAL_REQUEST.md — Original User/Parent Request
- /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix/BRIEFING.md — Working briefing index
- /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix/progress.md — Liveness heartbeat
- /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix/handoff.md — Handoff report
