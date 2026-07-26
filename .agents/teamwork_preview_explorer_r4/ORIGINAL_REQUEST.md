# Subagent Task: R4 — Security & Data Integrity Risk Assessment

## Working Directory

/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r4

## Task Description

Audit security architecture, authorization layers, legacy DB access rules, race conditions, and data integrity guarantees for Catalog Management.

### Source Files to Examine:

1. `AGENTS.md` and `.agents/AGENTS.md` (examine rules regarding `fastify.prisma.legacy` READ-ONLY vs CRUD operations, and workspace rules)
2. `apps/api/src/middlewares/auth.ts` (examine `requireAuth` and `requireRole` middleware implementations)
3. `apps/api/prisma/schema.prisma` vs `apps/api/prisma/legacy.prisma`
4. `apps/web/app/` (examine route guard patterns and sidebar menu structure)

### Detailed Instructions:

1. 3-Tier Admin Access Control Audit:
   - Tier 1 (Backend Middleware): How to apply `requireAuth` + `requireRole(['admin'])` on all `/api/catalog/*` mutating/viewing routes.
   - Tier 2 (Frontend Route Guard): How admin routes are protected on `apps/web` (e.g. checking user role from auth state/JWT, redirecting non-admins).
   - Tier 3 (Sidebar Visibility): How sidebar navigation hides/displays Catalog Management menu items based on user role (`admin`).
2. Legacy DB READ-ONLY Rule Assessment:
   - `AGENTS.md` states: `fastify.prisma.legacy`: Database `management` for Legacy CRM data (**READ-ONLY**).
   - Analyze whether writing directly to legacy DB tables (`service`, `service_language`, `service_price`, `product`, etc.) via CRM violates this rule.
   - Provide a formal analysis: Why legacy DB writes are required for Catalog Management (since catalog tables live in `management` DB), how to document/reconcile this exception in `AGENTS.md` safely without compromising read-only guarantees on order/customer history tables.
3. Concurrency & Race Conditions:
   - Analyze potential race conditions when the legacy WingsLashes PHP application and the new CRM API operate concurrently on catalog tables (e.g., simultaneous price updates, duplicate package keys, soft deletes).
4. Prisma Transaction Safety:
   - Identify multi-table operations (e.g. creating/updating `service` + `service_language` + `service_price` simultaneously) and enforce mandatory Prisma `$transaction` usage to prevent orphan/partial writes.
5. Write a comprehensive report `handoff.md` in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r4/` detailing security findings, risk ratings, architectural reconciliation, and concrete code patterns.
