## 2026-07-29T14:49:42+07:00

You are the Fix Worker for Milestone 3 of the SMS Action feature in mos-lab.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to fix the 5 critical bugs identified by Challenger 1 and Challenger 2:

1. **[CRITICAL] UCS-2 vs GSM-7 SMS Segment Calculation (`apps/web/components/sms/SMSModal.tsx`)**:
   - Detect non-GSM characters (e.g. Vietnamese accents `/[^\x00-\x7F]/`).
   - If message contains non-GSM characters (Unicode), use UCS-2 limits: 70 chars for 1 segment, 67 chars per segment for multi-part (e.g., <=70 -> 1 segment; >70 -> `Math.ceil(length / 67)` segments).
   - If pure GSM-7, use 160 chars for 1 segment, 153 chars per segment for multi-part (<=160 -> 1 segment; >160 -> `Math.ceil(length / 153)` segments).

2. **[HIGH] `templateId` String Storage (`apps/api/src/modules/sms/routes.ts`)**:
   - Do NOT use `parseInt(templateId, 10)` when `templateId` is a string key like `"tpl_reminder_17"`.
   - Store `String(templateId)` directly into `user_sms.template_id` field in legacy DB so template tracking analytics are preserved.

3. **[HIGH] `legacyUserId = 0` Validation (`apps/api/src/modules/sms/routes.ts`)**:
   - Change `if (!legacyUserId)` check to `if (legacyUserId === undefined || legacyUserId === null)` so that valid integer `0` is not rejected as `400 Bad Request`.

4. **[MEDIUM] Date Formatting & Variable Replacement Fallbacks (`apps/web/components/sms/SMSModal.tsx`)**:
   - Ensure date formatting (for `{han_dung}` and `{ngay_lam_near}`) checks `dayjs(val).isValid()`. If invalid or missing, replace with clean fallback string (e.g. `""` or `"N/A"`), never returning `"Invalid Date"`.

5. **[MEDIUM] Safeguard System Templates (`apps/api/src/modules/sms/routes.ts`)**:
   - In `DELETE /api/sms/templates/:id`, verify if template ID matches built-in system template (e.g., `id.startsWith('tpl_system_')` or `tpl_reminder_17`). Reject deletion of default system templates with `400 Bad Request` ("Cannot delete built-in system template").

6. **Build Verification**:
   - Run `pnpm build` and ensure clean compilation with 0 errors across `@mos-lab/shared`, `@mos-lab/api`, and `@mos-lab/web`.

Working directory: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix`
Document your fixes and build verification in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix/handoff.md`. Communicate via `send_message`.
