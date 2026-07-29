## 2026-07-29T09:26:21Z

remediate 4 backend edge cases / vulnerabilities identified during Challenger stress testing of the Booker Customer Allocation System Upgrade in `mos-lab`.

Working directory for metadata: `/Users/dannydo/projects/mos-lab/.agents/worker_alloc_m3_remediation`
Project Root: `/Users/dannydo/projects/mos-lab`

Read the Challenger handoff report:
`/Users/dannydo/projects/mos-lab/.agents/challenger_alloc_m3_1/handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Remediation Tasks:

1. **Fix Race Condition in `createBatch`**: Move `findMany` pending items check INSIDE the Prisma `$transaction` block, ensuring atomic check-and-insert for `CrmAllocationBatch` and `CrmAllocationBatchItem`.
2. **Fix Rollback Bug in `acceptBatch` Lazy Expiration**: When `now > batch.expiresAt` in `acceptBatch`, update batch & item status to `EXPIRED` in a dedicated update (or outside the failing transaction) so the status update persists in the database instead of being rolled back by Prisma transaction failure semantics.
3. **Fix History Duplication in `checkAndExpireBatches`**: Atomic `updateMany` for `status: 'PENDING_ACCEPT'` to `EXPIRED` first before logging history, so only the thread that successfully updates rows creates history entries.
4. **Fix IDOR / Role Authorization on `GET /allocation/batches/:id`**: Check requesting user authorization (assignerId === user.id || bookerId === user.id || role is admin/manager). Also ensure safe string coercion on `reasonCategory` in `declineBatch`.
5. **Re-run empirical test suite and monorepo build**:
   - `npx tsx apps/api/test-alloc-stress.ts`
   - `pnpm build`

Write your report to `/Users/dannydo/projects/mos-lab/.agents/worker_alloc_m3_remediation/handoff.md` and send a message back.
