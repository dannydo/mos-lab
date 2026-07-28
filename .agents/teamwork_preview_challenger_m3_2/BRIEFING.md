# BRIEFING — 2026-07-28T09:22:00+07:00

## Mission

Adversarial scan and build verification across all 11 CRM dashboard modules in `apps/web/app/dashboard/` and `apps/web/components/`.

## 🔒 My Identity

- Archetype: EMPIRICAL CHALLENGER
- Roles: critic, specialist
- Working directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2
- Original parent: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Milestone: M3 Vietnamese Tone Normalization & Build Verification
- Instance: challenger_m3_2

## 🔒 Key Constraints

- Review-only — do NOT modify implementation code (report findings to handoff)
- Empirically verify claims — run code and tests, do not rely on assumptions

## Current Parent

- Conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Updated: 2026-07-28T09:22:00+07:00

## Review Scope

- **Files to review**: `apps/web/app/dashboard/` and `apps/web/components/`
- **Interface contracts**: Vietnamese tone normalization, `filterOption` / `filterSort` on `<Select>`, search filter logic
- **Review criteria**: Search normalization correctness, build status, zero type errors

## Attack Surface

- **Hypotheses tested**:
  - All `<Select showSearch>` in dashboard modules use `vietnameseSearchFilter` -> CONFIRMED (18/18 active client-side Selects use `vietnameseSearchFilter`, 1 uses async server search `filterOption={false}`).
  - No raw `.toLowerCase().includes()` unnormalized client filters remain -> REFUTED (Found 2 instances in `AppointmentsAuditDrawer.tsx:97` and `referrals/page.tsx:175`).
  - Tone normalization functions match "diep" -> "Ngọc Điệp", "hang" -> "Hằng Ni", "thuy" -> "Thuỳ Trang 🌸" -> CONFIRMED via test harness.
  - `pnpm --filter @mos-lab/web build` succeeds with zero type errors -> CONFIRMED (Exit code 0 in 17.1s).
- **Vulnerabilities found**: Unnormalized client-side search filters in `AppointmentsAuditDrawer.tsx` line 97 and `referrals/page.tsx` line 175.
- **Untested angles**: Server-side MySQL `LIKE` queries rely on database collation for tone sensitivity.

## Loaded Skills

None loaded.

## Key Decisions Made

- Executed empirical test harness (`test_harness.js`) verifying `removeVietnameseTones` and `vietnameseSearchFilter`.
- Executed full web production build (`pnpm --filter @mos-lab/web build`).

## Artifact Index

- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/test_harness.js` — Empirical test harness script
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/scanner.js` — AST & static pattern scanner script
- `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_challenger_m3_2/handoff.md` — Final verification report
