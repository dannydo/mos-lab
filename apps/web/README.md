# `@mos-lab/web`

Next.js 16 CRM and operations frontend for `mos-lab`, using Ant Design 5 and Tailwind CSS 4.

Run commands from the repository root:

```bash
pnpm --filter @mos-lab/web dev       # http://localhost:4000
pnpm --filter @mos-lab/web typecheck
pnpm --filter @mos-lab/web test:run
pnpm --filter @mos-lab/web lint
pnpm build:web
```

Use `lib/api-client.ts` for backend calls and import shared contracts from `@mos-lab/shared`. Before editing Next.js behavior, follow [AGENTS.md](AGENTS.md) and read the relevant bundled guide under the installed Next.js package's `dist/docs` directory.

See the repository [Development & AI Agent Quickstart](../../docs/DEVELOPMENT.md) for the complete workspace and verification flow.
