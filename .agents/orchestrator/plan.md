# Plan: Custom Campaign Batch Allocation & History Unification

## Objective

Unify custom campaign customer allocation with the global batch allocation (`crm_allocation_batches`, `crm_allocation_batch_items`) and allocation history tracking (`crm_assignment_histories`) systems in `mos-lab`. Ensure true `legacyUserId` usage, 24h Booker acceptance workflow, full traceability in drawers/tables, and proper campaign expiration cleanup.

## Tasks Breakdown

### Task 1: Comprehensive Codebase Audit (Exploration)

- Explore `apps/api/src/modules/allocation/allocation.service.ts`, campaign routes in `apps/api/src/modules/campaigns/routes.ts`, customer routes, and Prisma schema.
- Explore frontend campaign tables (`apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx`), customer detail drawer allocation history tab, and batch allocation modals.
- Identify discrepancies between `crm_campaign_customers.id` and `legacyUserId`.

### Task 2: Backend Unification & API Implementation

- Ensure `AllocationService.createBatch` supports `campaignId`, uses `legacyUserId`, creates `crm_allocation_batches`, `crm_allocation_batch_items`, and records `crm_assignment_histories` entries with `actionType = 'ASSIGN'`.
- Ensure Booker accept/decline action updates `crm_customer_assignments` and records `crm_assignment_histories` with `actionType = 'ACCEPT'` / `'DECLINE'`.
- Implement or verify campaign expiration cleanup logging `actionType = 'EXPIRED'` in `crm_assignment_histories` and releasing customers back to NYC pool when a campaign ends/archives.

### Task 3: Frontend Unification & Traceability UI

- Update Campaign customer table selection key to `record.legacyUserId || record.customerId || record.id`.
- Update batch allocation action on Campaign page to invoke `apiClient.allocation.createBatch` with `legacyUserId`s and `campaignId`.
- Ensure Allocation History tab in Customer Detail Drawer and Global History tables query and display campaign allocation events accurately.

### Task 4: Expiration Cleanup & Monorepo Build Verification

- Test campaign expiration flow.
- Execute full monorepo build (`pnpm build`) across all packages (`@mos-lab/shared`, `apps/api`, `apps/web`).
