# Codebase optimization walkthrough — 2026-09-01

## Outcome

The repository now has one canonical verification path, less dead code, fewer always-on browser side effects, synchronized KPI configuration caching, and a shorter onboarding path for engineers and AI agents.

## What changed

- Removed eight unregistered backend route modules and one unused shared type barrel: 6,600+ lines of duplicate or unreachable code.
- Removed expired July 2026 DOM polling and global event interception from `BookingWizardDrawer`.
- Unified Booker salary configuration reads and writes through the salary calculator cache and added a regression test.
- Replaced the Ads Portal Python executor shell command with validated script names, argument-safe process execution, and an explicit `ADS_PORTAL_PYTHON` override.
- Removed tracked local authentication material, added local-cache ignores, and documented environment-based secret loading.
- Added canonical root commands:
  - `pnpm verify:quick` for lint, UI contract checks, type checks, and tests.
  - `pnpm verify` for the quick gate plus production builds for all packages.
- Updated Turbo tasks and CI so API and Ads Portal are no longer skipped by the default build.
- Pruned generated directories before the UI contract scanner descends into them.
- Added `docs/DEVELOPMENT.md` as the concise source of truth for package ownership, ports, commands, and agent workflow.

## Verification

- UI contract: 454 source files scanned.
- API: 196 tests passed.
- Web: 16 test files and 95 tests passed.
- Type checking: Shared, API, Web, and Ads Portal passed.
- Production build: Shared, API, Web, and Ads Portal passed.
- Diff hygiene: `git diff --check` passed.

## Follow-up

Any credential or token that previously existed in Git history must still be rotated or revoked. Removing it from the current tree prevents future reuse but does not rewrite repository history.
