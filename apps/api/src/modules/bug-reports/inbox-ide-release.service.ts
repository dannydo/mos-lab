import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import type {
  InboxIdeReleasePreview,
  InboxIdeReleaseCheckpointMetadata,
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

function checkpointMetadata(value: unknown): InboxIdeReleaseCheckpointMetadata | null {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  if (!raw) return null;
  const { jobId, manifestDigest, commitSha, apiRelease, webRelease } = raw;
  if (
    typeof jobId !== 'string' ||
    typeof manifestDigest !== 'string' ||
    typeof commitSha !== 'string' ||
    typeof apiRelease !== 'string' ||
    (webRelease !== null && typeof webRelease !== 'string')
  )
    return null;
  return { jobId, manifestDigest, commitSha, apiRelease, webRelease };
}

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
    const [, parent] = parents.split(' ');
    if (!parent || parents.split(' ').length !== 2)
      fail('IDE_PATCH_MISMATCH', 'Commit phải có đúng một parent để đối chiếu candidate đã review.');
    if (parent !== manifest.baseCommit) {
      try {
        await git(['merge-base', '--is-ancestor', manifest.baseCommit, parent]);
        const interveningFiles = await git(['diff', '--name-only', manifest.baseCommit, parent]);
        const reviewedFiles = new Set(manifest.changedFiles);
        if (interveningFiles.split('\n').some((file) => reviewedFiles.has(file)))
          fail('IDE_PATCH_MISMATCH', 'Commit xen giữa đã chạm candidate được review.');
      } catch (error) {
        if (error instanceof InboxImplementationError) throw error;
        fail('IDE_PATCH_MISMATCH', 'Commit không tiếp nối base đã được review.');
      }
    }
    const patch = await git(['diff', '--binary', '--no-ext-diff', '--no-renames', parent, commitSha]);
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
  // Select the current review before validating its contents. Searching for a valid
  // manifest would silently revive an older approval when a newer review is corrupt
  // or belongs to a different candidate.
  const review = audits.find((a) => a.action === 'AGENT_IMPLEMENTATION_REVIEW_READY');
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
  /**
   * Machine-to-machine checkpoint intake. The publisher has no authority to
   * deploy, approve, or close: a byte-for-byte receipt must match the current
   * server-derived evidence inside the same locked transaction.
   */
  static async recordOfficialCheckpoint(
    fastify: FastifyInstance,
    reportId: number,
    metadata: InboxIdeReleaseCheckpointMetadata,
    verify: Verifier = verifyIdeProductionRelease
  ): Promise<void> {
    const outcome = await fastify.prisma.crm.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM crm_bug_reports WHERE id = ${reportId} FOR UPDATE`);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM crm_inbox_implementation_jobs WHERE report_id = ${reportId} FOR UPDATE`
        );
        await tx.$queryRaw(Prisma.sql`SELECT id FROM crm_inbox_plan_jobs WHERE report_id = ${reportId} FOR UPDATE`);
        const receipts = await tx.crmBugReportAudit.findMany({
          where: { reportId, action: 'IDE_RELEASE_CHECKPOINT_RECORDED' },
          orderBy: { id: 'desc' },
        });
        const receiptMetadata = receipts[0]
          ? checkpointMetadata(parseReleaseEvidence(receipts[0].afterJson).evidence)
          : null;
        if (receiptMetadata && releaseDigest(receiptMetadata) === releaseDigest(metadata)) {
          const current = await tx.crmBugReport.findUnique({ where: { id: reportId } });
          if (current?.status === 'FIXED' && !current.implementationActiveJobId && current.resolvedAt) return null;
          fail('IDE_RELEASE_RECEIPT_STALE', 'Receipt release cũ không thể áp lại sau khi ticket đã thay đổi.');
        }
        const evidence = await resolveEvidence(tx, reportId, verify);
        const expected: InboxIdeReleaseCheckpointMetadata = {
          jobId: evidence.token.jobId,
          manifestDigest: evidence.token.manifestDigest,
          commitSha: evidence.token.commitSha,
          apiRelease: evidence.token.apiRelease,
          webRelease: evidence.token.webRelease,
        };
        if (releaseDigest(metadata) !== releaseDigest(expected))
          fail('IDE_RELEASE_METADATA_MISMATCH', 'Metadata IDE không khớp release và evidence hiện hành trên server.');
        await InboxImplementationService.recordReleasedForReporterAcceptance(
          fastify,
          reportId,
          null,
          { acknowledged: true, commitSha: expected.commitSha },
          { tx, evidence: evidence.token, approvalActors: evidence.approvalActors, source: 'IDE_RELEASE_CHECKPOINT' }
        );
        return null;
      },
      { timeout: 30_000 }
    );
    if (outcome) throw outcome;
  }

  /**
   * Operator-only control-plane escape hatch.  It is deliberately not exposed
   * through HTTP: the caller must be in the production operator environment
   * and the user must have explicitly authorized this technical hotfix.
   */
  static async recordDirectTechnicalHotfix(
    fastify: FastifyInstance,
    reportId: number,
    actorStaffId: number,
    commitSha: string,
    verify: Verifier = verifyIdeProductionRelease
  ): Promise<void> {
    throw new InboxImplementationError(
      'Direct technical-hotfix reconciliation đã bị retire; chỉ IDE release publisher được phép tạo checkpoint.',
      410,
      'DIRECT_TECHNICAL_HOTFIX_RETIRED'
    );
    const outcome = await fastify.prisma.crm.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM crm_bug_reports WHERE id = ${reportId} FOR UPDATE`);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM crm_inbox_implementation_jobs WHERE report_id = ${reportId} FOR UPDATE`
        );
        await tx.$queryRaw(Prisma.sql`SELECT id FROM crm_inbox_plan_jobs WHERE report_id = ${reportId} FOR UPDATE`);
        const actor = await tx.crmStaff.findUnique({ where: { id: actorStaffId } });
        if (!actor?.isActive || !isSuperAdminRole(actor.role) || !isCanonicalSuperAdminIdentity(actor))
          throw new InboxImplementationError('Chỉ Danny được xác nhận hotfix kỹ thuật.', 403, 'FORBIDDEN');
        if (!SHA.test(commitSha)) fail('DIRECT_HOTFIX_COMMIT_INVALID', 'Hotfix phải dùng full commit SHA.');

        const receipts = await tx.crmBugReportAudit.findMany({
          where: { reportId, action: 'DIRECT_TECHNICAL_HOTFIX_RELEASE_RECORDED' },
          orderBy: { id: 'desc' },
        });
        const receipt = receipts[0];
        if (receipt && parseReleaseEvidence(receipt.afterJson).evidence) {
          const evidence = parseReleaseEvidence(receipt.afterJson).evidence as Record<string, unknown>;
          if (evidence.commitSha === commitSha) {
            const current = await tx.crmBugReport.findUnique({ where: { id: reportId } });
            if (current?.status === 'FIXED' && !current.implementationActiveJobId) return null;
            fail('DIRECT_HOTFIX_RECEIPT_STALE', 'Receipt hotfix không còn khớp ticket hiện tại.');
          }
        }

        const report = await tx.crmBugReport.findUnique({
          where: { id: reportId },
          include: implementationReportInclude(),
        });
        if (!report) fail('BUG_NOT_FOUND', 'Không tìm thấy ticket.');
        const currentReport = report!;
        const gate = isInboxImplementationExecutionEligible(currentReport);
        if (
          !gate.eligible ||
          !gate.plan ||
          currentReport.status !== 'IN_PROGRESS' ||
          !currentReport.implementationActiveJobId
        )
          fail(
            'DIRECT_HOTFIX_CURRENT_EVIDENCE_MISSING',
            'Thiếu plan/job/approval code-test hiện hành cho hotfix kỹ thuật.'
          );
        const plan = gate.plan!;
        const job = await tx.crmInboxImplementationJob.findUnique({
          where: { id: currentReport.implementationActiveJobId! },
        });
        if (
          !job ||
          job.reportId !== reportId ||
          job.sourceVersion !== gate.sourceVersion ||
          job.planVersion !== plan.planVersion ||
          job.status !== 'AWAITING_COMMIT_REVIEW' ||
          job.leaseToken
        )
          fail('DIRECT_HOTFIX_JOB_NOT_READY', 'Job không còn ở checkpoint review hiện hành.');
        const audits = await tx.crmBugReportAudit.findMany({ where: { reportId }, orderBy: { id: 'desc' } });
        const review = audits.find((audit) => audit.action === 'AGENT_IMPLEMENTATION_REVIEW_READY');
        const manifest = readReleaseManifest(review?.afterJson || null);
        const tests = qualityTestsForCheckpointApproval(job!.testsJson, job!.failureCode);
        if (
          !manifest ||
          !matchesReleaseManifest(manifest!, job!, tests) ||
          !evaluateInboxImplementationQualityGate({ changedFiles: manifest!.changedFiles, tests }).eligible
        )
          fail('DIRECT_HOTFIX_MANIFEST_MISSING', 'Manifest hoặc test review hiện hành không khớp hotfix.');
        const currentManifest = manifest!;
        const release = await verify(currentManifest, commitSha);
        const evidence: InboxIdeReleaseToken = {
          jobId: job!.id,
          manifestDigest: currentManifest.digest,
          commitSha,
          ...release,
          approvalAuditIds: [],
        };
        const now = new Date();
        const attached = await tx.crmInboxImplementationJob.updateMany({
          where: { id: job!.id, status: 'AWAITING_COMMIT_REVIEW', updatedAt: job!.updatedAt },
          data: {
            commitSha,
            status: 'AWAITING_DEPLOY_REVIEW',
            executionPhase: 'AWAITING_DEPLOY_REVIEW',
            updatedAt: now,
          },
        });
        if (!attached.count) fail('DIRECT_HOTFIX_RACE', 'Job thay đổi trong lúc đối chiếu hotfix.');
        await tx.crmBugReportAudit.create({
          data: {
            reportId,
            actorStaffId,
            action: 'DIRECT_TECHNICAL_HOTFIX_AUTHORIZED',
            note: 'Danny đã ủy quyền hotfix kỹ thuật trực tiếp ngoài luồng nút/phê duyệt Inbox. Server chỉ tiếp tục sau khi đối chiếu manifest, commit và release Production.',
            afterJson: JSON.stringify({ source: 'TECHNICAL_HOTFIX', reviewAuditId: review!.id, evidence }),
          },
        });
        await InboxImplementationService.recordReleasedForReporterAcceptance(
          fastify,
          reportId,
          actorStaffId,
          { acknowledged: true, commitSha },
          { tx, evidence, approvalActors: [actorStaffId], source: 'TECHNICAL_HOTFIX' }
        );
        return null;
      },
      { timeout: 30_000 }
    );
    if (outcome) throw outcome;
  }

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
