# Subagent Task: R2 — API Design & Completeness Review

## Working Directory

/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r2

## Task Description

Perform an API Design & Completeness Review for the proposed 11 Catalog Management endpoints (`/api/catalog/*`).

### Source Files to Examine:

1. `apps/api/src/server.ts` (examine module route registration patterns and prefix conventions, e.g. `/api/customers`, `/api/plans`)
2. `apps/api/src/middlewares/auth.ts` (examine `requireRole` and `requireAuth` implementations)
3. Existing module routes: `apps/api/src/modules/customers/routes.ts`, `apps/api/src/modules/kpi/routes.ts`, `apps/api/src/modules/plans/routes/plan-crud.routes.ts`
4. Shared types: `packages/shared/src/types/`

### Detailed Instructions:

1. Review naming conventions & RESTful URL structures for proposed endpoints:
   - GET /services, GET /services/:id, POST /services, PUT /services/:id, DELETE /services/:id
   - GET /combos, POST /combos, PUT /combos/:id
   - GET /products, POST /products, PUT /products/:id
2. Evaluate pagination: verify if listing endpoints support `page` and `pageSize`/`limit` like other modules in `mos-lab`.
3. Check error handling, input validation (Zod / Fastify schemas), response structure, and TypeScript type safety.
4. Verify middleware usage: examine `requireRole` in `apps/api/src/middlewares/auth.ts`. Confirm its signature takes an array `requireRole(['admin'])` vs single string `requireRole('admin')`.
5. Identify missing or necessary endpoints:
   - Soft delete / restore endpoints (is soft delete used in legacy DB?)
   - Bulk operations (bulk enable/disable, bulk status toggle)
   - Reordering / position management (`position` or `priority` column)
   - Filtering & searching (e.g. search by name, filter by `service_group`, `service_type`, active status)
   - Combo detail / service-price breakdown endpoints
6. Write a comprehensive report `handoff.md` in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r2/` with risk ratings, justification for each finding, exact signature fixes, and proposed complete endpoint specifications.
