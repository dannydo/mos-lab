# Development & AI Agent Quickstart

This is the short, current entrypoint for working in `mos-lab`. Business invariants remain authoritative in the applicable `AGENTS.md` files; this guide explains where to work and how to verify it.

## Workspace map

| Package           | Purpose                                                         | Local runtime           |
| ----------------- | --------------------------------------------------------------- | ----------------------- |
| `packages/shared` | Shared DTOs, constants, roles, theme tokens, and utilities      | TypeScript watcher      |
| `apps/api`        | Fastify 5 API, CRM writes, approved legacy reads/catalog writes | `http://localhost:4001` |
| `apps/web`        | Next.js 16 CRM and operational dashboards                       | `http://localhost:4000` |
| `apps/ads-portal` | Next.js 16 ads/lead portal                                      | `http://localhost:8000` |

Requirements: Node.js 20+, pnpm 9.15.2, and the environment files required by the package being run.

```bash
pnpm install --frozen-lockfile
pnpm --filter @mos-lab/api prisma:generate
pnpm dev
```

## Canonical commands

| Intent                     | Command                               | Coverage                                                                     |
| -------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| Fast feedback              | `pnpm verify:quick`                   | Lint/UI contract, all-package typecheck, API + web tests                     |
| Release confidence         | `pnpm verify`                         | Quick gate plus production builds for all four packages                      |
| Build everything           | `pnpm build`                          | Turborepo build graph, including API and both Next.js apps                   |
| Build only the CRM web app | `pnpm build:web`                      | Shared package then `apps/web`                                               |
| Remove build artifacts     | `pnpm clean`                          | Package `dist`, `.next`, `out`, and Turbo cache; dependencies stay installed |
| API tests only             | `pnpm --filter @mos-lab/api test`     | Source `*.test.ts` files only; never scans `dist` or scratch scripts         |
| Web tests only             | `pnpm --filter @mos-lab/web test:run` | Vitest run mode                                                              |

`scripts/night-shift-runner.sh --quick` and CI delegate to these commands; do not create a second verification recipe.

## Source-of-truth routing

- Cross-package request/response types and system constants: `packages/shared/src` and the `@mos-lab/shared` barrel.
- Frontend HTTP calls: `apps/web/lib/api-client.ts`; avoid raw route strings in components.
- Reused business calculations: one Fastify service under `apps/api/src/modules/**/services`, with shared DTOs.
- Customer endpoints currently run from `apps/api/src/modules/customers/routes.ts` plus the sub-routes imported at its top.
- KPI endpoints currently run from `apps/api/src/modules/kpi/routes.ts` plus its explicitly imported sub-routes.
- OmiCall endpoints currently run from `apps/api/src/modules/omicall/routes.ts`.
- Prisma output under `apps/api/src/generated` and Next.js `.next*` folders are generated; never review or edit them as source.

## Fast agent workflow

1. Run `git status --short` and preserve unrelated user changes.
2. Read the root `AGENTS.md` and the nearest scoped `AGENTS.md` for files in scope.
3. Locate symbols with `rg`; confirm a route/component is imported before editing it.
4. Change the smallest canonical service/component instead of copying logic.
5. Run the narrow package test while iterating, then `pnpm verify:quick` before handoff.
6. Run `pnpm verify` for release, CI, dependency, build-config, or cross-package changes.

## Secrets

Never commit passwords, private keys, session cookies, or JWT caches. Use environment variables, the approved secret manager, or local SSH aliases. `apps/ads-portal/configs/pancake_jwt.json` is a gitignored local cache; `PANCAKE_JWT` may be injected instead. Set `ADS_PORTAL_PYTHON` to use a project-specific Python virtualenv; otherwise Ads Portal uses `python3` from `PATH`.
