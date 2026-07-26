# Context Memory — Catalog Management Implementation Audit

## Overview

This document records key context, findings, file locations, and decisions during the Catalog Management audit review for `mos-lab`.

## Key Workspace Locations

- Project Root: `/Users/dannydo/projects/mos-lab`
- Legacy Prisma Schema: `/Users/dannydo/projects/mos-lab/apps/api/prisma/legacy.prisma`
- WingsLashes Codebase Models: `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/`
- Existing Routes & Middlewares: `/Users/dannydo/projects/mos-lab/apps/api/src/`
- Frontend Lib & Shared Types: `/Users/dannydo/projects/mos-lab/apps/web/lib/`, `/Users/dannydo/projects/mos-lab/packages/shared/`
- Guidelines & Rules: `/Users/dannydo/projects/mos-lab/.agents/AGENTS.md`, `/Users/dannydo/projects/mos-lab/AGENTS.md`

## Audit Objectives & Subagent Assignments

- R1: Schema Correctness Audit (`.agents/teamwork_preview_explorer_r1/`)
- R2: API Design & Completeness Review (`.agents/teamwork_preview_explorer_r2/`)
- R3: Business Logic Gaps & Edge Cases (`.agents/teamwork_preview_explorer_r3/`)
- R4: Security & Data Integrity (`.agents/teamwork_preview_explorer_r4/`)
- R5: Frontend UX & Compliance (`.agents/teamwork_preview_explorer_r5/`)
