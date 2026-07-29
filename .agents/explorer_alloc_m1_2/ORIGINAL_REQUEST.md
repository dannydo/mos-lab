## 2026-07-29T09:14:42Z

Auditing Prisma schemas and database models for the Booker Customer Allocation System upgrade in `mos-lab`.

Tasks:

1. Examine `apps/api/prisma/crm.prisma` and `apps/api/prisma/legacy.prisma` (and any existing allocation tables).
2. Check how customer assignments, Booker staff records, and call logs are structured in Prisma models.
3. Propose exact Prisma model schema changes / new models needed for `AllocationBatch` and `AllocationBatchItem`:
   - `AllocationBatch`: id, batch_code, assigner_id, booker_id, total_count, status (`PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `RECALLED`), decline_reason, expires_at (24h timer), created_at.
   - `AllocationBatchItem`: id, batch_id, customer_id, customer_name, customer_phone, status, created_at.
4. Detail how Prisma `$transaction` and unique constraints should be implemented for strict deduplication and exact $+N$ customer increment.
5. Write findings and proposed Prisma schema to `/Users/dannydo/projects/mos-lab/.agents/explorer_alloc_m1_2/handoff.md` and send a message back with report path.
