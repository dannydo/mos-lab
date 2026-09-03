import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

/**
 * The first release hand-off implementation treated DEPLOY_COMMIT as sufficient
 * ticket evidence. A release marker only identifies what is live; it cannot
 * prove that a reviewed worktree was committed. Return only those legacy
 * hand-offs to their immutable commit-review checkpoint. User reports and
 * comments are retained; this migration writes an audit/comment explaining the
 * correction rather than closing or retrying anything.
 */
const migration: DataMigration = {
  id: '20260903193000_repair_unverified_inbox_releases',
  description: 'Return legacy Inbox releases without reviewed-commit proof to commit review.',
  async preflight(connection) {
    const [columns] = await connection.execute<RowDataPacket[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'crm_inbox_implementation_jobs'
         AND column_name IN ('status', 'execution_phase')`
    );
    if (columns.length !== 2) {
      throw new Error('Inbox implementation release columns must exist before repairing legacy hand-offs.');
    }
  },
  async up(connection) {
    const [legacyJobs] = await connection.execute<RowDataPacket[]>(
      `SELECT j.id, j.report_id, r.status AS report_status
       FROM crm_inbox_implementation_jobs j
       INNER JOIN crm_bug_reports r ON r.id = j.report_id
       WHERE j.status = 'RELEASED'
         AND j.execution_phase = 'AWAITING_DANNY_ACCEPTANCE'
         AND r.status = 'FIXED'`
    );

    const now = new Date();
    for (const job of legacyJobs) {
      const reportId = Number(job.report_id);
      const jobId = String(job.id);
      await connection.execute(
        `UPDATE crm_inbox_implementation_jobs
         SET status = 'AWAITING_COMMIT_REVIEW', execution_phase = 'AWAITING_COMMIT_REVIEW', updated_at = ?
         WHERE id = ? AND status = 'RELEASED' AND execution_phase = 'AWAITING_DANNY_ACCEPTANCE'`,
        [now, jobId]
      );
      await connection.execute(
        `UPDATE crm_bug_reports
         SET status = 'IN_PROGRESS', status_sort = 0, resolved_at = NULL, closed_at = NULL,
             triage_note = 'Bằng chứng release trước đây không đủ; đang chờ Danny ghi nhận commit đã duyệt.',
             implementation_active_job_id = ?, updated_at = ?
         WHERE id = ? AND status = 'FIXED'`,
        [jobId, now, reportId]
      );
      await connection.execute(
        `UPDATE crm_bug_report_resolutions
         SET commit_sha = NULL, release_url = NULL,
             solution_summary = 'Bằng chứng release cũ đã được vô hiệu vì chưa liên kết commit đã duyệt với production.',
             updated_at = ?
         WHERE report_id = ?`,
        [now, reportId]
      );
      await connection.execute(
        `INSERT INTO crm_bug_report_audits (report_id, action, note, before_json, after_json, created_at)
         VALUES (?, 'SYSTEM_RELEASE_PROOF_REPAIRED', ?, NULL, NULL, ?)`,
        [
          reportId,
          'Đã khôi phục checkpoint duyệt commit vì release cũ chỉ có marker production, chưa có bằng chứng commit được duyệt.',
          now,
        ]
      );
      await connection.execute(
        `INSERT INTO crm_bug_report_comments (report_id, author_type, kind, body, created_at)
         VALUES (?, 'AGENT', 'COMMENT', ?, ?)`,
        [
          reportId,
          '## Cập nhật workflow release\n\nBản bàn giao release cũ chưa có commit đã duyệt liên kết với production, nên ticket được trả về bước **Chờ Danny duyệt commit**. Không có code, commit hay deploy tự động nào được tạo.',
          now,
        ]
      );
    }
  },
};

export default migration;
