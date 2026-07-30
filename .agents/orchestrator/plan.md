# Implementation Plan: Graphify PoC & Knowledge Graph Generator

## Objectives

1. Audit and compare Graphify (and graphify-code / knowledge graph concepts) vs existing tools (`pnpm turbo graph`, `dependency-cruiser`, `madge`, custom AST parsers) for `mos-lab`.
2. Implement PoC graph generator script accessible via `pnpm graph`.
3. Auto-generate visual interactive graph `graph.html` and structured markdown report `GRAPH_REPORT.md`.
4. Ensure zero side-effects on monorepo build (`pnpm build`) and dev server (`pnpm dev`).

## Phase Breakdown

### Phase 1: Exploration & Comparative Analysis (M1)

- Dispatch 3 parallel Explorers:
  - Explorer 1: Evaluate `graphify` / `graphify-code` concept & package availability, python vs TS tools, AST graph capabilities for TS, Fastify routes, Prisma schemas, AI Agent context optimization.
  - Explorer 2: Audit `pnpm turbo graph`, `dependency-cruiser`, `madge` on `mos-lab` monorepo, test their outputs, performance, limitations.
  - Explorer 3: Audit `mos-lab` codebase structure (`apps/web`, `apps/api`, `packages/shared`, Prisma schemas, Fastify routes) to map all node types and edge relations needed for graph extraction.

### Phase 2: PoC Implementation (M2)

- Worker implements graph generator script in `scripts/generate-graph.ts` (or `scripts/generate_graph.sh`) and adds `"graph"` script to root `package.json`.
- Script scans TypeScript imports across monorepo, Fastify route registrations, Prisma models, and workspace package links.
- Script outputs interactive HTML visualization `graph.html` and Markdown report `GRAPH_REPORT.md`.
- Ensures output files are properly gitignored or stored cleanly.

### Phase 3: Review & Adversarial Validation (M3)

- Reviewers inspect code cleanliness, typing, error handling, HTML self-containment, and report accuracy.
- Challengers test execution of `pnpm graph`, `pnpm build`, and `pnpm dev` to guarantee 100% build pass and zero side effects.

### Phase 4: Forensic Integrity Audit (M4)

- Forensic Auditor verifies genuine graph parsing and absence of hardcoded dummy outputs.

### Phase 5: Synthesis & Reporting (M5)

- Aggregate all results and present the comprehensive summary report to the user.
