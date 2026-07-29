## 2026-07-29T09:17:00Z

You are a Worker subagent implementing the Booker Customer Allocation System Upgrade in `mos-lab`.

Working directory for metadata: `/Users/dannydo/projects/mos-lab/.agents/worker_alloc_m2`
Project Root: `/Users/dannydo/projects/mos-lab`

Read the 3 M1 handoff reports before starting:

- `/Users/dannydo/projects/mos-lab/.agents/explorer_alloc_m1_1/handoff.md`
- `/Users/dannydo/projects/mos-lab/.agents/explorer_alloc_m1_2/handoff.md`
- `/Users/dannydo/projects/mos-lab/.agents/explorer_alloc_m1_3/handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Key Requirements to satisfy:

1. R1: Batch Pending Accept Flow (`PENDING_ACCEPT` status with 24h countdown timer; customers remain unassigned/pending during 24h; Booker verification modal; "Chấp nhận toàn bộ" -> `ACCEPTED` & assigns customers; "Từ chối toàn bộ" -> `DECLINED` with required reason & returns customers to pool; auto expiration after 24h -> `EXPIRED` & returns customers to pool).
2. R2: Strict Deduplication & Database Transaction (Prisma `$transaction` and unique constraints; filter out existing active/pending customers; exact $+N$ customer increase for Booker upon acceptance).
3. R3: 30-Day History & Countdown Timer (Allocation History tab/screen for Booker & Admin/Manager; records batch info, assigner, recipient, count, status, decline reason; 30-day countdown badge).
4. R4: Allocation Audit Dashboard for Admin/Manager (Overview dashboard for Admin/Manager to monitor acceptance/decline/expired rates per Booker, decline reasons; "Recall Batch" button to recall `PENDING_ACCEPT` batches -> `RECALLED` and return customers to pool).

Implementation Steps:

1. Shared DTOs & Types (`packages/shared/src/types/allocation.ts` & export in `packages/shared/src/index.ts`):
   - Define `CustomerAllocationBatch`, `CustomerAllocationItem`, `AllocationBatchStatus` (`PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `RECALLED`), `AllocationAuditStatsResponse`, and request/response DTOs.
   - Run `pnpm --filter @mos-lab/shared build`.
2. Prisma Schema (`apps/api/prisma/crm.prisma`):
   - Add `CrmAllocationBatch` (`crm_allocation_batches`) and `CrmAllocationBatchItem` (`crm_allocation_batch_items`) models and `CrmStaff` relations.
   - Run `pnpm --filter @mos-lab/api prisma:generate` and `pnpm --filter @mos-lab/api prisma:migrate:crm`.
3. Fastify Backend Routes & Services (`apps/api/src/modules/allocation/`):
   - Implement `routes.ts` & `allocation.service.ts` for `/api/allocation/*` (`batch`, `pending`, `accept`, `decline`, `recall`, `check-expired`, `history`, `audit-stats`).
   - Register routes in `apps/api/src/server.ts`.
4. API Client SDK (`apps/web/lib/api-client.ts`):
   - Add `apiClient.allocation` namespace methods.
5. Frontend UI (`apps/web/components/allocation/` & Dashboard pages):
   - Build `PendingAllocationModal.tsx` (24h countdown badge with `tabular-nums`, customer table preview, Accept/Decline actions).
   - Build `DeclineReasonModal.tsx` (Mandatory decline reason select & note textarea).
   - Build `AllocationHistoryScreen.tsx` (30-day history with 30-day countdown badge and status tags).
   - Build `AllocationAuditDashboard.tsx` (KPI cards, per-Booker stats table, decline reason breakdown, Recall Batch action button).
   - Integrate in layout header alert badge (`apps/web/app/dashboard/layout.tsx`) and tabs in `/dashboard/bk` and `/dashboard/customers`.
6. Monorepo Build Verification:
   - Run `pnpm build` across monorepo to verify clean TypeScript compilation with zero type errors.

Write your handoff report to `/Users/dannydo/projects/mos-lab/.agents/worker_alloc_m2/handoff.md` and send a message back with build results.
