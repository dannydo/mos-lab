# BRIEFING — 2026-07-29T14:49:33+07:00

## Mission

Stress-test SMS Action feature (Milestone 3): variable substitution logic, SMS segment calculation (GSM vs Unicode), and Fastify API endpoints validation/error responses.

## 🔒 My Identity

- Archetype: empirical_challenger
- Roles: critic, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1
- Original parent: 4c6eb061-9916-414f-80ff-2f233bc9429f
- Milestone: Milestone 3 SMS Action
- Instance: 1 of 1

## 🔒 Key Constraints

- Review-only & Empirical testing — do NOT modify implementation code (report findings as bugs/recommendations).
- Run verification code empirically; do not trust unverified claims.

## Current Parent

- Conversation ID: 4c6eb061-9916-414f-80ff-2f233bc9429f
- Updated: 2026-07-29T14:49:33+07:00

## Review Scope

- **Files to review**: `apps/api/src/modules/sms/*`, `apps/web/components/sms/*`, `packages/shared/src/types/sms.ts`
- **Interface contracts**: Fastify SMS routes `/api/sms/send`, `/api/sms/templates`, helper/utility functions for SMS formatting & segment calculation
- **Review criteria**: Tag substitution fallback robustness, GSM/Unicode segment calculation accuracy, input validation & error handling

## Key Decisions Made

- Executed 35 empirical tests across 3 automated test scripts (`test_tag_substitution.ts`, `test_segment_calculation.ts`, `test_api_validation.ts`).
- Discovered 3 Critical/High bugs and 2 Medium bugs in tag substitution, segment calculation, and Fastify route handling.

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/ORIGINAL_REQUEST.md` — Original Request
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/BRIEFING.md` — Agent Briefing
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/progress.md` — Progress tracker
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/test-harness/run_all_tests.ts` — Test Runner
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/handoff.md` — Final Handoff Report

## Attack Surface

- **Hypotheses tested**:
  1. Tag substitution gracefully handles null/undefined values and invalid dates. (Result: Failed - invalid dates output "Invalid Date", count tag mislabelled as days).
  2. Character counting handles GSM-7 vs Unicode (UCS-2) segment calculation. (Result: Failed - UI under-estimates Unicode SMS segments by up to 50%).
  3. Fastify endpoints properly validate inputs and error responses. (Result: Failed - `legacyUserId = 0` rejected, string template IDs coerced to null, empty string titles allowed).
- **Vulnerabilities found**:
  - SMS segment count under-estimation for Vietnamese text.
  - Template ID lost in DB when sending SMS with string template IDs (e.g. `"tpl_reminder_17"`).
  - `legacyUserId = 0` rejected due to `!legacyUserId` falsy check.
  - `{so_ngay_dam}` formats remaining service count as "X ngày".
  - Missing date check causes `"Invalid Date"` in SMS body.
- **Untested angles**: Hardware SMS modem latency & Telco gateway Webhook status callbacks.

## Loaded Skills

- None
