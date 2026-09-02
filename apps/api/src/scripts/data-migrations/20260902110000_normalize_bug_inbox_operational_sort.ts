import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20260902110000_normalize_bug_inbox_operational_sort',
  description: 'Keep active mOS Inbox work ahead of terminal ticket history in the operational queue.',
  async preflight(connection) {
    const [columns] = await connection.execute<RowDataPacket[]>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'crm_bug_reports'
         AND column_name IN ('status', 'status_sort')`
    );
    if (columns.length !== 2) {
      throw new Error('Bug report status columns must exist before operational sorting is normalized.');
    }
  },
  async up(connection) {
    await connection.execute(
      `UPDATE crm_bug_reports
       SET status_sort = CASE
         WHEN status IN ('CLOSED', 'REJECTED', 'DUPLICATE') THEN 9
         ELSE 0
       END
       WHERE status_sort <> CASE
         WHEN status IN ('CLOSED', 'REJECTED', 'DUPLICATE') THEN 9
         ELSE 0
       END`
    );
  },
};

export default migration;
