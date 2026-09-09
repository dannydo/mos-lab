import dotenv from 'dotenv';
import mysql, { type PoolConnection, type RowDataPacket } from 'mysql2/promise';

dotenv.config();

export const ALLOCATION_LEDGER_BACKFILL_ID = 'allocation-ledger-v1';
const DURABLE_ASSIGNMENT_REPAIR_ID = '20260831193000_restore_durable_customer_assignments';

export type LegacyAssignmentHistory = {
  id: number;
  legacyUserId: number;
  previousStaffId: number | null;
  nextStaffId: number | null;
  actorStaffId: number | null;
  assignedAt: Date;
  actionType: string;
  reason: string | null;
  sourceType: string | null;
  batchId: string;
  isUndone: number | boolean;
  previousStaffLabel: string | null;
  nextStaffLabel: string | null;
  actorLabel: string | null;
};

export function normalizeBatchSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000)
    throw new Error('batch size must be an integer from 1 to 1000');
  return parsed;
}

export function legacyEventType(actionType: string): string {
  switch (actionType) {
    case 'ACCEPT':
    case 'ACCEPT_ALLOCATION':
    case 'ASSIGN':
      return 'ACCEPTED';
    case 'DECLINE_ALLOCATION':
    case 'DECLINE':
      return 'DECLINED';
    case 'RECALL_ALLOCATION':
    case 'RECALL':
      return 'RECALLED';
    case 'REVOKE':
    case 'UNASSIGN':
      return 'RETURNED_TO_POOL';
    case 'TRANSFER':
      return 'TRANSFERRED';
    case 'EXPIRE':
      return 'EXPIRED';
    case 'RANDOM_SELECT':
      return 'RANDOM_SELECTED';
    case 'UNDO':
      return 'UNDO_REVERSED';
    default:
      return 'SYSTEM_REPAIR';
  }
}

export function legacyEventMetadata(history: LegacyAssignmentHistory): string {
  return JSON.stringify({ legacyActionType: history.actionType, legacyIsUndone: Boolean(history.isUndone) });
}

async function ensureAppendOnlyTriggers(connection: PoolConnection): Promise<void> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT trigger_name FROM information_schema.triggers
     WHERE trigger_schema = DATABASE() AND event_object_table = 'crm_allocation_ledger_events'
       AND trigger_name IN ('crm_allocation_ledger_events_no_update', 'crm_allocation_ledger_events_no_delete')`
  );
  const names = new Set(rows.map((row) => String(row.trigger_name)));
  if (!names.has('crm_allocation_ledger_events_no_update')) {
    await connection.query(
      "CREATE TRIGGER crm_allocation_ledger_events_no_update BEFORE UPDATE ON crm_allocation_ledger_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation ledger events are append-only'"
    );
  }
  if (!names.has('crm_allocation_ledger_events_no_delete')) {
    await connection.query(
      "CREATE TRIGGER crm_allocation_ledger_events_no_delete BEFORE DELETE ON crm_allocation_ledger_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation ledger events are append-only'"
    );
  }
}

async function inspect(connection: PoolConnection) {
  const [repair] = await connection.execute<RowDataPacket[]>('SELECT id FROM crm_data_migrations WHERE id = ?', [
    DURABLE_ASSIGNMENT_REPAIR_ID,
  ]);
  if (!repair[0])
    throw new Error(
      `Required historic assignment repair ${DURABLE_ASSIGNMENT_REPAIR_ID} is not recorded; run it before ledger backfill.`
    );
  const [parity] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS sourceCount, SUM(l.id IS NULL) AS missingCount
     FROM crm_assignment_history h
     LEFT JOIN crm_allocation_ledger_events l ON l.legacy_history_id = h.id`
  );
  return { sourceCount: Number(parity[0]?.sourceCount || 0), missingCount: Number(parity[0]?.missingCount || 0) };
}

async function runBatch(connection: PoolConnection, batchSize: number): Promise<number> {
  await connection.beginTransaction();
  try {
    await connection.execute(
      `INSERT INTO crm_allocation_ledger_backfills (id, state, started_at, updated_at)
       VALUES (?, 'RUNNING', NOW(), NOW())
       ON DUPLICATE KEY UPDATE state = IF(state = 'COMPLETED', state, 'RUNNING'), started_at = COALESCE(started_at, NOW()), updated_at = NOW()`,
      [ALLOCATION_LEDGER_BACKFILL_ID]
    );
    const [checkpoints] = await connection.execute<RowDataPacket[]>(
      'SELECT last_legacy_history_id AS lastHistoryId FROM crm_allocation_ledger_backfills WHERE id = ? FOR UPDATE',
      [ALLOCATION_LEDGER_BACKFILL_ID]
    );
    const lastHistoryId = Number(checkpoints[0]?.lastHistoryId || 0);
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT h.id, h.legacy_user_id AS legacyUserId, h.prev_staff_id AS previousStaffId, h.new_staff_id AS nextStaffId,
              h.assigned_by AS actorStaffId, h.assigned_at AS assignedAt, h.action_type AS actionType, h.reason,
              h.source_type AS sourceType, h.batch_id AS batchId, h.is_undone AS isUndone,
              previous_staff.display_name AS previousStaffLabel, next_staff.display_name AS nextStaffLabel, actor.display_name AS actorLabel
       FROM crm_assignment_history h
       LEFT JOIN crm_staff previous_staff ON previous_staff.id = h.prev_staff_id
       LEFT JOIN crm_staff next_staff ON next_staff.id = h.new_staff_id
       LEFT JOIN crm_staff actor ON actor.id = h.assigned_by
       WHERE h.id > ?
         AND NOT EXISTS (
           SELECT 1 FROM crm_allocation_ledger_events existing_event WHERE existing_event.legacy_history_id = h.id
         )
       ORDER BY h.id ASC LIMIT ?`,
      [lastHistoryId, batchSize]
    );
    const histories = rows as unknown as LegacyAssignmentHistory[];
    if (histories.length === 0) {
      await connection.commit();
      return 0;
    }
    const values = histories.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const parameters = histories.flatMap((h) => [
      h.legacyUserId,
      legacyEventType(h.actionType),
      h.previousStaffId,
      h.nextStaffId,
      h.actorStaffId,
      h.actorStaffId ? 'USER' : 'SYSTEM',
      h.previousStaffLabel,
      h.nextStaffLabel,
      h.actorLabel,
      h.reason,
      h.sourceType || 'MANUAL',
      'LEGACY_ASSIGNMENT_HISTORY_BACKFILL',
      h.batchId,
      legacyEventMetadata(h),
      h.id,
      h.assignedAt,
    ]);
    await connection.execute(
      `INSERT INTO crm_allocation_ledger_events
       (legacy_user_id, event_type, previous_staff_id, next_staff_id, actor_staff_id, actor_kind, previous_staff_label, next_staff_label, actor_label, reason, source_type, action_context, batch_id, metadata_json, legacy_history_id, occurred_at)
       VALUES ${values}`,
      parameters
    );
    const last = histories[histories.length - 1];
    await connection.execute(
      `UPDATE crm_allocation_ledger_backfills
       SET last_legacy_history_id = ?, processed_count = processed_count + ?, last_batch_count = ?, state = 'RUNNING', last_error = NULL, updated_at = NOW()
       WHERE id = ?`,
      [last.id, histories.length, histories.length, ALLOCATION_LEDGER_BACKFILL_ID]
    );
    await connection.commit();
    return histories.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sizeArgument = process.argv.find((arg) => arg.startsWith('--batch-size='));
  const maxArgument = process.argv.find((arg) => arg.startsWith('--max-batches='));
  const batchSize = normalizeBatchSize(sizeArgument?.slice('--batch-size='.length) || 500);
  const maxBatches = normalizeBatchSize(maxArgument?.slice('--max-batches='.length) || 1);
  if (!process.env.CRM_DATABASE_URL) throw new Error('CRM_DATABASE_URL is required');
  const pool = mysql.createPool(process.env.CRM_DATABASE_URL);
  const connection = await pool.getConnection();
  try {
    const before = await inspect(connection);
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'plan', ...before, batchSize, maxBatches }));
    if (!apply) return;
    await ensureAppendOnlyTriggers(connection);
    for (let index = 0; index < maxBatches; index += 1) {
      const processed = await runBatch(connection, batchSize);
      console.log(JSON.stringify({ batch: index + 1, processed }));
      if (processed === 0) break;
    }
    const after = await inspect(connection);
    if (after.missingCount === 0) {
      await connection.execute(
        `UPDATE crm_allocation_ledger_backfills SET state = 'COMPLETED', completed_at = NOW(), last_error = NULL, updated_at = NOW() WHERE id = ?`,
        [ALLOCATION_LEDGER_BACKFILL_ID]
      );
    }
    console.log(JSON.stringify({ ...after, complete: after.missingCount === 0 }));
  } catch (error) {
    await connection
      .execute(
        `UPDATE crm_allocation_ledger_backfills SET state = 'FAILED', last_error = LEFT(?, 4000), updated_at = NOW() WHERE id = ?`,
        [error instanceof Error ? error.message : String(error), ALLOCATION_LEDGER_BACKFILL_ID]
      )
      .catch(() => undefined);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

if (/[/\\]backfill-allocation-ledger\.(?:ts|js)$/.test(process.argv[1] || '')) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
