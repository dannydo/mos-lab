# BRIEFING — 2026-07-28T09:21:20+07:00

## Mission

Empirically test and stress-verify `removeVietnameseTones` and `vietnameseSearchFilter` against all user acceptance criteria and edge cases.

## 🔒 My Identity

- Archetype: critic / specialist
- Roles: critic, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1
- Original parent: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Milestone: M3_testing_and_verification
- Instance: 1 of 1

## 🔒 Key Constraints

- Review-only — do NOT modify implementation code (report findings in handoff report, do NOT fix code directly)
- Empirical verification required: must run test harness script and report exact results

## Current Parent

- Conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Updated: 2026-07-28T09:21:20+07:00

## Review Scope

- **Files to review**: `packages/shared/src/utils/search.ts`, `apps/web/lib/utils/search.ts`
- **Interface contracts**: `removeVietnameseTones`, `vietnameseSearchFilter`
- **Review criteria**: Tone-insensitive & case-insensitive matching, handling of null, undefined, 0, numbers, emojis, uppercase, whitespace, array children in option objects.

## Key Decisions Made

- Built standalone Node.js test runner script `test-harness.ts` in workspace directory to execute unit test suite against `removeVietnameseTones` and `vietnameseSearchFilter`.
- Identified empirical failure mode in `vietnameseSearchFilter` when handling Array `children` (e.g. `{ children: ['Thuỳ Trang ', '🌸'] }`).

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/ORIGINAL_REQUEST.md` — User request copy
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/test-harness.ts` — Verification test harness
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_1/handoff.md` — Handoff and empirical test report

## Attack Surface

- **Hypotheses tested**:
  - `removeVietnameseTones` handles Vietnamese diacritics removal, uppercase conversion, whitespace trimming, numbers, null, undefined, emojis. (CONFIRMED PASS)
  - `vietnameseSearchFilter` handles option object formats: `{ label: string }`, `{ children: string }`, `{ children: Array }`, `{ value: number, label: string }`. (ARRAY CHILDREN FAILED)
- **Vulnerabilities found**:
  - `vietnameseSearchFilter` returns `false` when option `children` or `label` is an Array of strings/elements because `typeof` checks exclude Arrays.
- **Untested angles**:
  - Deeply nested React element trees.

## Loaded Skills

- None
