# Allocation ledger release contract

## Outcome

Every live allocation ownership change has one append-only ledger event in the same CRM transaction. Historic `crm_assignment_history` evidence is copied separately through a resumable, idempotent backfill; an application rollout never replays historical Prisma migration repairs.

## Authority and data ownership

- `CrmAllocationLedgerEvent` owns immutable allocation evidence.
- `CrmAllocationLedgerBackfill` owns the durable checkpoint and completion state for the one-time legacy import.
- `AllocationLedgerService` is the only application writer for live ownership and retention events.
- The backfill command is explicit and forward-only; it must run only after the additive schema has been applied and its read-only preflight passes.

## Compatibility and recovery

- Schema change: additive tables and indexes only. It is compatible with the deployed schema-push release path and does not require historical Prisma migration reconciliation.
- Backfill: ordered by `crm_assignment_history.id`, bounded by a caller-selected batch size, and protected by a unique `legacy_history_id` event key.
- Progress: checkpoint advancement and each batch insert share one transaction. A retry resumes at the committed checkpoint; no rollback deletes immutable evidence.
- Completion: the command verifies every legacy history row has exactly one ledger event and only marks the checkpoint complete after parity is zero.
- Failure: stop the job, retain the checkpoint and inserted events, inspect the reported parity/progress, then resume forward. Do not drop or rewrite the ledger.

## UI and access semantics

The existing customer access gate remains in force. The timeline presents ledger records and keeps historical labels/reasons; event metadata is not returned to the browser. Retention state is represented by its own event rather than inferred from current assignment state.

## Verification

Run shared build before API tests, focused ledger and backfill tests, API typecheck, and a production-shaped sanitized rehearsal that measures batch duration/locking and validates source/ledger parity. Production release requires an explicit operator approval after those results.
