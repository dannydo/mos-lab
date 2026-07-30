# Project Scope: Graphify PoC & Knowledge Graph Generator

## Architecture Overview

- Monorepo: `mos-lab`
  - `apps/web`: Next.js 15 + Ant Design 5 (Port 4000)
  - `apps/api`: Fastify 5 + TypeScript + Prisma CRM (`crm.prisma`) & Legacy DB (`legacy.prisma`) (Port 4001)
  - `packages/shared`: Shared DTOs, interfaces, and constants (`@mos-lab/shared`)
  - Tooling: Turborepo (`turbo.json`), pnpm workspaces
- Goal: Implement Graphify (or equivalent Knowledge Graph solution) to analyze dependency graphs across AST (TypeScript imports, Fastify routes, Prisma schemas, Next.js pages) and produce visualization artifacts (`graph.html`, `GRAPH_REPORT.md`) without breaking `pnpm dev` or `pnpm build`.

## Milestones

| #   | Name                                             | Scope                                                                                                                                                                                                    | Dependencies | Status      |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| M1  | Architectural Exploration & Comparative Analysis | Research Graphify, `pnpm turbo graph`, `dependency-cruiser`, `madge`, and custom TypeScript/AST graph extraction. Evaluate suitability for AI Agent context & mos-lab stack.                             | none         | DONE        |
| M2  | PoC Script Implementation & Artifact Generator   | Implement `scripts/generate-graph.ts` (and npm wrapper `pnpm graph`), scanner for TypeScript imports, Fastify routes, Prisma schemas, package dependencies. Generate `graph.html` and `GRAPH_REPORT.md`. | M1           | DONE        |
| M3  | Review & Adversarial Validation                  | Review code implementation, test HTML graph generation, verify zero side-effects on `pnpm dev` and `pnpm build`.                                                                                         | M2           | DONE        |
| M4  | Forensic Integrity Audit                         | Perform independent forensic audit on implementation, verifying genuine graph extraction logic.                                                                                                          | M3           | DONE        |
| M5  | Synthesis & Completion Reporting                 | Aggregate findings, verify acceptance criteria, deliver final user report.                                                                                                                               | M4           | IN_PROGRESS |

## Interface Contracts & Artifact Specifications

- Command: `pnpm graph` (or `pnpm --silent graph`) in root `package.json`
- Generator Script: `scripts/generate-graph.ts` (executed via `tsx scripts/generate-graph.ts`)
- Visual Artifact: `graph.html` (interactive HTML visualization using offline Canvas force-directed renderer with search & filter controls, node inspector, dark/light toggle)
- Documentation Artifact: `GRAPH_REPORT.md` (detailed markdown report summarizing module counts, node types, edge dependencies, Fastify routes, Prisma models, and AI agent context efficiency score)
- Gitignore Safety: `graph.html`, `GRAPH_REPORT.md`, `graph.json`, `.graph/` added to `.gitignore`.

## Code Layout

```
mos-lab/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── scripts/
│   └── generate-graph.ts
├── graph.html (generated artifact, gitignored)
├── GRAPH_REPORT.md (generated artifact, gitignored)
├── graph.json (generated artifact, gitignored)
└── package.json (includes "graph" script)
```
