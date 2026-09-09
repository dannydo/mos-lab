# Local allocation-ledger rehearsal

Status: PASS — completed on a disposable, fully sanitized local target.

The first disposable clone attempt created `mos_lab_ledger_rehearsal_20260909_mttjthap` but its streamed restore failed before sanitization completed. No candidate DDL or backfill ran against that partial target. This note was written before the target is removed so no partially restored customer or staff data remains in a disposable schema.

A later narrow clone completed its backfill checks, but `crm_assignment_history.reason` was copied as free text. It was not emitted or inspected, yet may contain personal information. That target was removed and the rehearsal repeated with that field sanitized before ledger rows were created.

## Final sanitized target

- Source shape: 88,634 `crm_assignment_history` rows and the matching CRM staff, assignment, and data-migration records.
- Sanitization before candidate DDL: CRM staff username, display name, address, avatar URL, email, emergency phone, phone, and every historic assignment reason were replaced with deterministic placeholders.
- Additive DDL started from zero ledger/checkpoint rows and installed both append-only triggers.
- First run: two 250-row transactions inserted 500 rows in 1,227 ms; parity then reported 88,134 rows pending.
- Resume: 1,000-row bounded transactions completed the remainder in 5,314 ms; final parity was 88,634 source rows, 88,634 ledger rows, and zero missing rows.
- Restart: an explicit 100-row apply invocation processed zero rows and remained complete.
- Checkpoint: `processedCount=88634`, `lastBatchCount=134`, `state=COMPLETED`.
- Integrity: direct ledger UPDATE and DELETE probes were both rejected by the triggers; the target had zero active InnoDB transactions and zero lock waits after the job.

The final target `mos_lab_ledger_rehearsal_20260909_mttjxtta` may now be removed. This rehearsal did not touch the real local `mos_lab` database or Production.
