import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

/**
 * These four jobs were returned to commit review by the preceding migration
 * because the old workflow had not recorded a ticket-level commit. Danny then
 * confirmed the reviewed commits from the retained worktree refs. Each commit
 * is an ancestor of the production release, so restore only these verified
 * hand-offs; do not start work, create a retry, or close any ticket.
 */
const verifiedReleases = [
  { reportId: 5, commitSha: '0f1a09486c8f3748c1ec848bf6fb39e729abda05' },
  { reportId: 13, commitSha: '93a6b57d0197d239a719f616de867888789b9836' },
  { reportId: 17, commitSha: '5938e60950e54a85dea71a71761c843c8e6086c8' },
  { reportId: 18, commitSha: '5938e60950e54a85dea71a71761c843c8e6086c8' },
] as const;

const migration: DataMigration = {
  id: '20260903195500_restore_verified_inbox_releases',
  description: 'Restore four Danny-confirmed Inbox releases to reporter acceptance.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM crm_bug_reports WHERE id IN (${verifiedReleases.map(() => '?').join(', ')})`,
      verifiedReleases.map((release) => release.reportId)
    );
    if (rows.length !== verifiedReleases.length) {
      throw new Error('Expected verified Inbox reports are missing; refusing release-state restoration.');
    }
  },
  async up(connection) {
    const now = new Date();
    for (const release of verifiedReleases) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT r.request_type, r.reporter_staff_id, j.id AS job_id
         FROM crm_bug_reports r
         INNER JOIN crm_inbox_implementation_jobs j ON j.id = r.implementation_active_job_id
         WHERE r.id = ? AND r.status = 'IN_PROGRESS'
           AND j.status = 'AWAITING_COMMIT_REVIEW' AND j.execution_phase = 'AWAITING_COMMIT_REVIEW'`,
        [release.reportId]
      );
      const row = rows[0];
      if (!row) {
        throw new Error(`Report ${release.reportId} is no longer at the expected commit-review checkpoint.`);
      }
      const reportKey = `MOS-${row.request_type === 'FEATURE' ? 'FEAT' : 'BUG'}-${release.reportId}`;
      const summary = 'Bản thay đổi đã được deploy và đang chờ người báo nghiệm thu.';

      await connection.execute(
        `UPDATE crm_inbox_implementation_jobs
         SET status = 'RELEASED', execution_phase = 'AWAITING_REPORTER_ACCEPTANCE', updated_at = ?
         WHERE id = ? AND status = 'AWAITING_COMMIT_REVIEW' AND execution_phase = 'AWAITING_COMMIT_REVIEW'`,
        [now, row.job_id]
      );
      await connection.execute(
        `UPDATE crm_bug_reports
         SET status = 'FIXED', status_sort = 0, resolved_at = ?, closed_at = NULL,
             triage_note = ?, implementation_active_job_id = NULL, updated_at = ?
         WHERE id = ? AND status = 'IN_PROGRESS'`,
        [now, summary, now, release.reportId]
      );
      await connection.execute(
        `INSERT INTO crm_bug_report_resolutions
           (report_id, problem_summary, root_cause, solution_summary, verification_summary, changed_files_json, commit_sha, release_url, search_normalized, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, '[]', ?, 'https://lab.masteros.app/dashboard/bug-reports', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           problem_summary = VALUES(problem_summary), root_cause = VALUES(root_cause), solution_summary = VALUES(solution_summary),
           verification_summary = VALUES(verification_summary), commit_sha = VALUES(commit_sha), release_url = VALUES(release_url),
           search_normalized = VALUES(search_normalized), updated_at = VALUES(updated_at)`,
        [
          release.reportId,
          summary,
          'Danny đã xác nhận commit được duyệt là tổ tiên của release production.',
          'Đã deploy commit đã duyệt; chờ người báo nghiệm thu.',
          `Commit ${release.commitSha} đã được đối chiếu là tổ tiên của release production.`,
          release.commitSha,
          `${reportKey} ${summary}`,
          now,
          now,
        ]
      );
      await connection.execute(
        `INSERT INTO crm_bug_report_audits (report_id, action, note, before_json, after_json, created_at)
         VALUES (?, 'SYSTEM_VERIFIED_RELEASE_RESTORED', ?, NULL, NULL, ?)`,
        [
          release.reportId,
          `Đã khôi phục bàn giao release: commit ${release.commitSha.slice(0, 12)} đã được Danny xác nhận và có trong production.`,
          now,
        ]
      );
      await connection.execute(
        `INSERT INTO crm_bug_report_comments (report_id, author_type, kind, body, created_at)
         VALUES (?, 'AGENT', 'COMMENT', ?, ?)`,
        [
          release.reportId,
          `## Đã phát hành — chờ người báo nghiệm thu\n\n- Commit đã duyệt: ${release.commitSha}\n- Bản thay đổi đã có trong production. Người báo xác nhận đạt hoặc yêu cầu sửa thêm.`,
          now,
        ]
      );
      await connection.execute(
        `INSERT INTO crm_bug_report_notifications (report_id, recipient_staff_id, type, title, message, action_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          release.reportId,
          row.reporter_staff_id,
          row.request_type === 'FEATURE' ? 'FEATURE_IMPLEMENTED_REVIEW' : 'BUG_FIXED_REVIEW',
          `${reportKey} đã deploy — mời bạn nghiệm thu`,
          'Bản thay đổi đã lên production. Hãy xác nhận đạt hoặc mô tả điểm cần sửa thêm.',
          `/dashboard?bugReview=${encodeURIComponent(reportKey)}`,
          now,
        ]
      );
    }
  },
};

export default migration;
