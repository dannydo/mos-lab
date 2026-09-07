import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import type {
  InboxIdeReleasePreview,
  InboxIdeReleaseToken,
  InboxReleaseManifest,
  RecordInboxIdeReleaseRequest,
} from '@mos-lab/shared';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import { Prisma } from '../../generated/crm-client/index.js';
import {
  InboxImplementationError,
  InboxImplementationService,
  implementationReportInclude,
  isInboxImplementationExecutionEligible,
  evaluateInboxImplementationQualityGate,
  qualityTestsForCheckpointApproval,
} from './inbox-implementation.service.js';
import {
  matchesReleaseManifest,
  parseReleaseEvidence,
  readReleaseManifest,
  releaseDigest,
} from './inbox-release-manifest.js';

const execute = promisify(execFile);
const SHA = /^[a-f0-9]{40}$/;
const fail = (code: string, message: string): never => {
  throw new InboxImplementationError(message, 409, code);
};

async function git(args: string[]) {
  const result = await execute('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: process.cwd(),
    timeout: 5_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return result.stdout.trim();
}

/** Read-only trust boundary: deployed process marker, local Git objects, fixed production web endpoint. */
export async function verifyIdeProductionRelease(manifest: InboxReleaseManifest, commitSha: string) {
  const apiRelease = process.env.DEPLOY_COMMIT || '';
  if (!SHA.test(apiRelease) || !SHA.test(commitSha))
    fail('IDE_RELEASE_MARKER_MISSING', 'Thiếu full commit/release marker đáng tin cậy trên server.');
  let webRelease: string | null = null;
  try {
    const parents = await git(['rev-list', '--parents', '-n', '1', commitSha]);
    if (parents !== `${commitSha} ${manifest.baseCommit}`)
      fail('IDE_PATCH_MISMATCH', 'Commit không có đúng base đã được review.');
    const patch = await git(['diff', '--binary', '--no-ext-diff', '--no-renames', manifest.baseCommit, commitSha]);
    if (createHash('sha256').update(patch).digest('hex') !== manifest.patchHash)
      fail('IDE_PATCH_MISMATCH', 'Nội dung commit khác manifest đã được duyệt.');
    await git(['merge-base', '--is-ancestor', commitSha, apiRelease]);
    if (manifest.changedFiles.some((file) => file.startsWith('apps/web/') || file.startsWith('packages/shared/'))) {
      const response = await fetch('https://lab.masteros.app/api/release-version', {
        signal: AbortSignal.timeout(5_000),
        redirect: 'error',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) fail('IDE_WEB_RELEASE_UNAVAILABLE', 'Không xác minh được release web Production.');
      const value = (await response.json()) as { commitSha?: unknown };
      if (typeof value.commitSha !== 'string' || !SHA.test(value.commitSha))
        fail('IDE_WEB_RELEASE_UNAVAILABLE', 'Web chưa có release marker hợp lệ.');
      webRelease = value.commitSha as string;
      await git(['merge-base', '--is-ancestor', commitSha, webRelease]);
    }
  } catch (error) {
    if (error instanceof InboxImplementationError) throw error;
    fail('IDE_RELEASE_UNVERIFIED', 'Không xác minh được commit, patch hoặc release đang chạy. Chưa ghi checkpoint.');
  }
  return { apiRelease, webRelease };
}

type Verifier = typeof verifyIdeProductionRelease;

async function resolveEvidence(db: Prisma.TransactionClient, reportId: number, verify: Verifier) {
  const report = await db.crmBugReport.findUnique({ where: { id: reportId }, include: implementationReportInclude() });
  if (!report) fail('BUG_NOT_FOUND', 'Không tìm thấy ticket.');
  const gate = isInboxImplementationExecutionEligible(report!);
  if (!gate.eligible || !gate.plan || !report!.implementationActiveJobId || report!.status !== 'IN_PROGRESS') {
    fail(
      'IDE_CURRENT_APPROVAL_MISSING',
      'Thiếu job/plan và approval code/test hiện hành. Không thể ghi nhận release IDE.'
    );
  }
  const job = await db.crmInboxImplementationJob.findUnique({ where: { id: report!.implementationActiveJobId! } });
  if (
    !job ||
    job.reportId !== reportId ||
    job.sourceVersion !== gate.sourceVersion ||
    job.planVersion !== gate.plan!.planVersion ||
    job.status !== 'AWAITING_DEPLOY_REVIEW' ||
    job.leaseToken ||
    !job.commitSha ||
    !SHA.test(job.commitSha)
  ) {
    fail(
      'IDE_JOB_NOT_READY',
      'Job chưa có commit đã ghi nhận hoặc đang chạy/đã thay đổi. Không chạy hoặc retry worker từ action này.'
    );
  }
  const audits = await db.crmBugReportAudit.findMany({ where: { reportId }, orderBy: { id: 'desc' } });
  const review = audits.find(
    (a) => a.action === 'AGENT_IMPLEMENTATION_REVIEW_READY' && readReleaseManifest(a.afterJson)?.jobId === job!.id
  );
  const manifest = readReleaseManifest(review?.afterJson || null);
  const tests = qualityTestsForCheckpointApproval(job!.testsJson, job!.failureCode);
  if (
    !manifest ||
    !matchesReleaseManifest(manifest, job!, tests) ||
    !evaluateInboxImplementationQualityGate({ changedFiles: manifest.changedFiles, tests }).eligible
  ) {
    fail(
      'IDE_MANIFEST_MISSING',
      'Thiếu manifest bất biến hoặc test/files khác bản đã review. Không khôi phục approval cũ.'
    );
  }
  const codeApproval = audits.find((a) => {
    const value = parseReleaseEvidence(a.afterJson);
    return (
      a.action === 'IMPLEMENTATION_APPROVED' &&
      a.actorStaffId &&
      value.implementationApprovalSourceVersion === job!.sourceVersion &&
      typeof value.implementationApprovedAt === 'string' &&
      report!.implementationApprovedAt &&
      Math.floor(Date.parse(value.implementationApprovedAt) / 1000) ===
        Math.floor(report!.implementationApprovedAt.getTime() / 1000)
    );
  });
  const approval = (action: string) =>
    audits.find((a) => {
      const binding = parseReleaseEvidence(a.afterJson).releaseApproval as Record<string, unknown> | undefined;
      return (
        a.action === action &&
        a.actorStaffId &&
        binding?.jobId === job!.id &&
        binding.manifestDigest === manifest!.digest &&
        binding.sourceVersion === job!.sourceVersion &&
        binding.planVersion === job!.planVersion &&
        binding.reviewAuditId === review!.id &&
        (action !== 'DANNY_DEPLOY_APPROVED' || binding.commitSha === job!.commitSha)
      );
    });
  const commitApproval = approval('DANNY_COMMIT_APPROVED');
  const deployApproval = approval('DANNY_DEPLOY_APPROVED');
  if (
    !codeApproval ||
    !commitApproval ||
    !deployApproval ||
    codeApproval.id >= review!.id ||
    review!.id >= commitApproval.id ||
    commitApproval.id >= deployApproval.id
  ) {
    fail(
      'IDE_APPROVAL_BINDING_MISSING',
      'Thiếu approval code/test, commit hoặc deploy gắn đúng manifest và kết quả test đã review.'
    );
  }
  const approvalActors = [codeApproval!, commitApproval!, deployApproval!].map((a) => a.actorStaffId!);
  const actors = await db.crmStaff.findMany({ where: { id: { in: approvalActors } } });
  if (
    approvalActors.some(
      (id) =>
        !actors.some((a) => a.id === id && a.isActive && isSuperAdminRole(a.role) && isCanonicalSuperAdminIdentity(a))
    )
  ) {
    fail('IDE_APPROVER_UNAUTHORIZED', 'Không xác minh được danh tính người phê duyệt theo policy Danny hiện hành.');
  }
  const release = await verify(manifest!, job!.commitSha!);
  const token: InboxIdeReleaseToken = {
    jobId: job!.id,
    manifestDigest: manifest!.digest,
    commitSha: job!.commitSha!,
    ...release,
    approvalAuditIds: [codeApproval!.id, commitApproval!.id, deployApproval!.id],
  };
  return { token, approvalActors };
}

export class InboxIdeReleaseService {
  static async preview(
    fastify: FastifyInstance,
    reportId: number,
    verify: Verifier = verifyIdeProductionRelease
  ): Promise<InboxIdeReleasePreview> {
    try {
      const { token } = await resolveEvidence(fastify.prisma.crm, reportId, verify);
      return {
        eligible: true,
        code: null,
        reason: 'Server đã đối chiếu manifest, ba approval và release Production. Chỉ bàn giao người báo nghiệm thu.',
        token,
      };
    } catch (error) {
      if (!(error instanceof InboxImplementationError)) throw error;
      return { eligible: false, code: error.code, reason: error.message, token: null };
    }
  }

  static async record(
    fastify: FastifyInstance,
    reportId: number,
    actorStaffId: number,
    input: RecordInboxIdeReleaseRequest,
    verify: Verifier = verifyIdeProductionRelease
  ): Promise<void> {
    if (input?.acknowledged !== true) throw new InboxImplementationError('Cần xác nhận ghi nhận release IDE.', 422);
    const outcome = await fastify.prisma.crm.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM crm_bug_reports WHERE id = ${reportId} FOR UPDATE`);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM crm_inbox_implementation_jobs WHERE report_id = ${reportId} FOR UPDATE`
        );
        await tx.$queryRaw(Prisma.sql`SELECT id FROM crm_inbox_plan_jobs WHERE report_id = ${reportId} FOR UPDATE`);
        const actor = await tx.crmStaff.findUnique({ where: { id: actorStaffId } });
        if (!actor?.isActive || !isSuperAdminRole(actor.role) || !isCanonicalSuperAdminIdentity(actor))
          throw new InboxImplementationError('Chỉ Danny được ghi nhận release IDE.', 403, 'FORBIDDEN');
        const receipts = await tx.crmBugReportAudit.findMany({
          where: { reportId, action: 'IDE_RELEASE_RECORDED' },
          orderBy: { id: 'desc' },
        });
        if (
          input.token &&
          receipts[0] &&
          releaseDigest(parseReleaseEvidence(receipts[0].afterJson).evidence) === releaseDigest(input.token)
        ) {
          const current = await tx.crmBugReport.findUnique({ where: { id: reportId } });
          if (
            current?.status === 'FIXED' &&
            !current.implementationActiveJobId &&
            current.resolvedAt &&
            Math.floor(current.resolvedAt.getTime() / 1000) === Math.floor(receipts[0].createdAt.getTime() / 1000)
          )
            return null;
          fail(
            'IDE_RECEIPT_STALE',
            'Ticket không còn ở checkpoint nghiệm thu của receipt này. Không tái dùng release cũ.'
          );
        }
        let evidence: Awaited<ReturnType<typeof resolveEvidence>>;
        try {
          evidence = await resolveEvidence(tx, reportId, verify);
          if (!input.token || releaseDigest(input.token) !== releaseDigest(evidence.token))
            fail(
              'IDE_PREVIEW_CHANGED',
              'Bằng chứng thay đổi hoặc chưa được kiểm tra. Hãy kiểm tra lại trước khi xác nhận.'
            );
        } catch (error) {
          // Validation failures retain a truthful rejection, while unexpected write failures roll back ALL writes.
          if (!(error instanceof InboxImplementationError)) throw error;
          const fingerprint = releaseDigest({ token: input.token, code: error.code });
          const existing = await tx.crmBugReportAudit.findFirst({
            where: { reportId, action: 'IDE_RELEASE_REJECTED', afterJson: { contains: fingerprint } },
          });
          if (!existing)
            await tx.crmBugReportAudit.create({
              data: {
                reportId,
                actorStaffId,
                action: 'IDE_RELEASE_REJECTED',
                note: error.message,
                afterJson: JSON.stringify({
                  source: 'IDE',
                  fingerprint,
                  code: error.code,
                  candidate: input.token
                    ? {
                        jobId: String(input.token.jobId || '').slice(0, 80),
                        manifestDigest: String(input.token.manifestDigest || '').slice(0, 64),
                        commitSha: String(input.token.commitSha || '').slice(0, 40),
                      }
                    : null,
                }),
              },
            });
          return error;
        }
        await InboxImplementationService.recordReleasedForReporterAcceptance(
          fastify,
          reportId,
          actorStaffId,
          { acknowledged: true, commitSha: evidence.token.commitSha },
          { tx, evidence: evidence.token, approvalActors: evidence.approvalActors }
        );
        return null;
      },
      { timeout: 30_000 }
    );
    if (outcome) throw outcome;
  }
}
