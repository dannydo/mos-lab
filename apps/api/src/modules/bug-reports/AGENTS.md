# Scoped Guide: mOS Mission / Bug Inbox API & Workers (`apps/api/src/modules/bug-reports`)

> **Always read this guide before editing `bug-reports`, `mission-bridge`, `types/bug-report`, or `request-classifier-worker`.** Read the slice files you change; avoid blindly editing barrels or legacy monoliths.

## 1. Modular Map (Wave 3A + 3B-1)

| Layer                       | Entry / Barrel                                           | Slices                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared Contracts**        | `packages/shared/src/types/bug-report.ts`                | `bug-report/{ticket-core,execution-timing,implementation-gates,worker-jobs}.ts`                                                                                                                                                                                                                                                  |
| **Core Ticket Service**     | `bug-report.service.ts`                                  | `service/bug-report-{dto,filters,crud,lifecycle,transitions,progress,next-action,agent}.ts`                                                                                                                                                                                                                                      |
| **HTTP Routes**             | `routes.ts`                                              | `routes/bug-report-{route-guards,reporter.routes,inbox-admin.routes,ide-bridge.routes,worker-agent.routes,worker-impl.routes}.ts`                                                                                                                                                                                                |
| **Timing & Health**         | `inbox-execution-time.service.ts`                        | `service/inbox-execution-time-{calc,dashboard}.ts`                                                                                                                                                                                                                                                                               |
|                             | `request-classifier-worker-health.service.ts`            | `service/request-classifier-worker-health-rules.ts`                                                                                                                                                                                                                                                                              |
| **Chat <-> Mission**        | `chat/chat-mission-bridge.service.ts`                    | `chat/mission-bridge/mission-bridge-{create,actions,summary,sync}.ts`                                                                                                                                                                                                                                                            |
| **Classifier Worker CLI**   | `scripts/request-classifier-worker.ts`                   | `scripts/workers/classifier/{codex-cli,codex-runner,worker-transport,worktree-and-deploy,private-visual-qa,codex-schemas,job-processors-intake,job-processor-implementation}.ts`                                                                                                                                                 |
| **Mission UI (`apps/web`)** | `app/dashboard/bug-reports/` & `components/bug-reports/` | `useBugReportDetail{,.helpers}.ts`, `BugReportDetail{Drawer,HeaderActions,TriageSection}.tsx`, `MyBugReports{Panel,ListPane,DetailPane}.tsx` + `my-bug-reports.helpers.ts`, `BugReport{Surface,RequestForm}.tsx` + `useRequestClassification.ts`, `FrontendTelemetry{Drawer,KpiRow,ClustersTab,IssuesTab,IssueDetailDrawer}.tsx` |

## 2. Core Invariants

1. **3-Gate Danny Authority (`UI-007`)**: Follow `docs/rules/inbox-and-ide-bridge.md` strictly: Intake -> Clarification -> Danny Sign-Off Plan -> Danny-triggered Implementation -> QA/Commit -> Deploy -> Done.
2. **Fail-Closed Legacy Impl Claim**: `worker-impl.routes.ts` claim endpoints return `410 IDE_EXECUTION_REQUIRED`; IDE execution goes via `bug-report-ide-bridge.routes.ts`.
3. **Timing Privacy (`UI-008`)**: Execution timing metrics (`inbox-execution-time-*`) and admin queue views are strictly `admin` / `super_admin` only.
4. **Module Boundaries & `.js` Extensions**: Keep every slice `<= 650 LOC` (`pnpm check:code-health`). Relative imports in `apps/api/src/` and `scripts/workers/classifier/` MUST end in `.js` (`NodeNext`). In `scripts/workers/classifier/codex-cli.ts`, `configuredWorkspace()` resolves 3 levels up (`..`, `..`, `..`) to repo root.
5. **Re-export Compatibility**: `bug-report.service.ts`, `packages/shared/src/types/bug-report.ts`, `chat-mission-bridge.service.ts`, and `scripts/request-classifier-worker.ts` act as compatibility barrels — preserve public symbols for callers and tests.

## 3. Recipe & Verification

1. Update shared DTOs/gates in `packages/shared/src/types/bug-report/` first, then run `pnpm --filter @mos-lab/shared build`.
2. Edit only the relevant `service/`, `routes/`, `mission-bridge/`, or `scripts/workers/classifier/` slice (`<= 550` pre-Prettier LOC).
3. Run verification before commit:

```bash
pnpm --filter @mos-lab/shared build && pnpm --filter @mos-lab/api typecheck
(cd apps/api && pnpm exec tsx --test src/modules/bug-reports/*.test.ts src/modules/chat/chat-mission-bridge.service.test.ts)
pnpm exec tsx --test scripts/request-classifier-worker.test.ts
pnpm exec prettier --check scripts/request-classifier-worker.ts scripts/workers/classifier/*.ts
pnpm --filter @mos-lab/api lint && pnpm check:code-health
```
