# Operational Scripts Index (`scripts/`)

> Historical one-off debug, inspection, and bug-specific verification scripts have been archived to `scripts/archive/`.

## Code Quality & Guardrails

- `check-ui-contract.ts` + `ui-legacy-exceptions.ts` — Enforces Assembly Kit usage, iOS-app 700-LOC cap, respectful language, and UI drift checks (`pnpm check:ui-contract`).
- `check-code-health.ts` + `code-health-baseline.json` — Enforces `AGENTS.md` context caps and the 650-LOC file-size ratchet across `apps/web`, `apps/api/src`, and `packages/shared/src` (`pnpm check:code-health`).

## Deployment & Database Operations

- `deploy.sh` / `deploy-production.sh` / `deploy-post-hub-history.sh` / `hotfix.sh` — Production deployment and hotfix scripts.
- `deploy/migration-plan.sh` — Lists pending CRM schema and production data migrations.
- `backup-databases.sh` / `refresh_db.sh` / `create_legacy_indexes.sql` — Database backup, local refresh, and legacy MySQL index DDL.
- `night-shift-runner.sh` — Autonomous verification runner (`--quick` delegates to `pnpm verify:quick`).

## mOS Inbox Workers & IDE Bridges

- `ide-task-bridge.ts` — Gate 1/2/3 handoff, receipt submission, and `--auto-deploy` listener for mOS Inbox tasks.
- `ide-task-provisioner.ts` / `ide-task-provisioner-service.ts` / `install-ide-task-provisioner.ts` — IDE task provisioner daemon and LaunchAgent installer.
- `ag-task-provisioner.ts` / `install-ag-task-provisioner.ts` — Antigravity inbox provisioner daemon & LaunchAgent installer.
- `request-classifier-worker.ts` / `bug-agent.ts` — Automated request classifier and bug agent workers (`launchd/` holds plist examples).

## Audits, Benchmarks & Code Graph

- `responsive/` — Visual regression, accessibility (`axe-core`), input matrix, and performance audit runners.
- `crawler-benchmark/` — Automated E2E crawler and slow-query benchmark suite.
- `generate-graph.ts` / `auto-refresh-graph.mjs` — Codebase dependency graph generators.
