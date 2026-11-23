import {
  BUG_REPORT_AGENT_UPDATE_STAGES,
  getExecutionOwnerDisplayName,
  isSupportedImplementationOwner,
  type BugPriority,
  type BugReportAgentProgress,
  type BugReportAgentUpdateStage,
  type BugReportClarificationStatus,
  type BugReportNextAction,
  type BugReportNextActor,
  type BugReportReporterExperience,
  type BugReportStatus,
} from '@mos-lab/shared';
import {
  canAuthorizeQualityGateRecoveryRetry,
  canAuthorizeSchemaRecoveryRetry,
  canAuthorizeWorkerRecoveryRetry,
  canRetryInboxImplementation,
} from '../inbox-implementation.service.js';
import { AGENT_READABLE_STATUSES, BugReportError } from './bug-report-filters.js';
import {
  bugReportAgentProgress,
  implementationFailureNote,
  implementationProgressNote,
  latestAgentActivity,
  latestAuditAt,
  pendingReviewPlan,
  type AgentProgressSource,
} from './bug-report-progress.js';

function nextAction(
  actor: BugReportNextActor,
  type: BugReportNextAction['type'],
  label: string,
  detail: string,
  waitingSince: Date
): BugReportNextAction {
  return { actor, type, label, detail, waitingSince: waitingSince.toISOString() };
}

/** Keep every consumer aligned on the single person or system responsible for moving a ticket forward. */
export function bugReportNextAction(source: AgentProgressSource): BugReportNextAction {
  if (['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(source.status)) {
    return nextAction(
      'NONE',
      'NONE',
      'Không còn',
      'Ticket đã kết thúc và chỉ còn phục vụ tra cứu.',
      source.closedAt ?? source.updatedAt
    );
  }

  if (source.status === 'FIXED') {
    if (
      [
        'DANNY_RELEASED_FOR_REPORTER_ACCEPTANCE',
        'IDE_RELEASE_RECORDED',
        'IDE_RELEASE_CHECKPOINT_RECORDED',
        'DIRECT_TECHNICAL_HOTFIX_RELEASE_RECORDED',
      ].includes(latestAgentActivity(source)?.action || '')
    ) {
      return nextAction(
        'REPORTER',
        'REVIEW_RESULT',
        'Nghiệm thu bản deploy',
        'Người báo kiểm tra thay đổi trên production, rồi xác nhận đạt hoặc yêu cầu sửa thêm.',
        latestAgentActivity(source)?.createdAt ?? source.resolvedAt ?? source.updatedAt
      );
    }
    return nextAction(
      'REPORTER',
      'REVIEW_RESULT',
      'Nghiệm thu',
      'Mở kết quả, xác nhận đã đúng hoặc mô tả điểm cần sửa lại.',
      source.resolvedAt ?? source.updatedAt
    );
  }

  if (source.clarificationStatus === 'WAITING_REPORTER') {
    return nextAction(
      'REPORTER',
      'ANSWER_CLARIFICATION',
      'Bổ sung thông tin',
      'Trả lời câu hỏi làm rõ và đính kèm bằng chứng nếu có.',
      latestAuditAt(source, ['AGENT_ASKED_CLARIFICATION']) ?? source.updatedAt
    );
  }

  if (source.clarificationStatus === 'PENDING_AGENT') {
    const latestAgentStep = latestAgentActivity(source);
    if (latestAgentStep?.action === 'REPORTER_REOPENED') {
      return nextAction(
        'AGENT',
        'REVIEW_CLARIFICATION',
        'Tái phân tích reopen',
        'Đọc lý do reopen của người báo, hỏi thêm hoặc xác nhận re-analysis. Plan, Danny approval và priority cũ không được dùng lại.',
        latestAgentStep.createdAt
      );
    }
    return nextAction(
      'AGENT',
      'REVIEW_CLARIFICATION',
      latestAgentStep?.action === 'CLARIFICATION_ANSWERED' ? 'Đọc phản hồi mới' : 'Làm rõ yêu cầu',
      'Đối chiếu repository và hội thoại, rồi hỏi tiếp hoặc xác nhận ticket đã đủ rõ.',
      latestAgentStep?.createdAt ?? source.updatedAt
    );
  }

  if (source.status === 'NEW') {
    return nextAction(
      'DANNY',
      'TRIAGE',
      'Quyết định',
      'Chốt priority, phạm vi và quyết định duyệt, từ chối hoặc đánh dấu trùng.',
      source.updatedAt
    );
  }

  const implementation = source.implementation;
  if (implementation && ['FAILED', 'STALE', 'EXPIRED'].includes(implementation.status)) {
    const retrySequence = implementation.retrySequence ?? 0;
    if (!canRetryInboxImplementation({ status: implementation.status, retrySequence })) {
      const canRecoverWorker = canAuthorizeWorkerRecoveryRetry({
        status: implementation.status,
        retrySequence,
        failureCode: implementation.failureCode,
      });
      if (canRecoverWorker) {
        return nextAction(
          'DANNY',
          'RETRY_IMPLEMENTATION',
          'Cho phép retry sau khi sửa Worker',
          'Worker đã được sửa cho đúng lỗi hạ tầng này. Danny có thể cấp một lượt code/test khôi phục có audit.',
          implementation.updatedAt
        );
      }
      const diagnosticAudit = [...source.audits]
        .reverse()
        .find((audit) => audit.action === 'WORKER_READONLY_DIAGNOSTIC_PASSED');
      const diagnostic = diagnosticAudit
        ? { action: diagnosticAudit.action, afterJson: diagnosticAudit.afterJson ?? null }
        : null;
      const canRecoverSchema = canAuthorizeSchemaRecoveryRetry(
        {
          id: implementation.id || '',
          status: implementation.status,
          retrySequence,
          failureCode: implementation.failureCode,
        },
        diagnostic
      );
      if (canRecoverSchema) {
        return nextAction(
          'DANNY',
          'RETRY_IMPLEMENTATION',
          'Cho phép retry sau khi sửa schema',
          'Chẩn đoán chỉ-đọc đã xác minh schema Worker được sửa. Danny có thể cấp đúng một lượt code/test có audit.',
          implementation.updatedAt
        );
      }
      const qualityGateDiagnosticAudit = [...source.audits]
        .reverse()
        .find((audit) => audit.action === 'WORKER_VISUAL_QA_SELF_CHECK');
      const canRecoverQualityGate = canAuthorizeQualityGateRecoveryRetry(
        {
          id: implementation.id || '',
          status: implementation.status,
          retrySequence,
          failureCode: implementation.failureCode,
          testsJson: implementation.testsJson,
        },
        qualityGateDiagnosticAudit
          ? { action: qualityGateDiagnosticAudit.action, afterJson: qualityGateDiagnosticAudit.afterJson ?? null }
          : null
      );
      if (canRecoverQualityGate) {
        return nextAction(
          'DANNY',
          'RETRY_IMPLEMENTATION',
          'Cho phép retry sau khi sửa cổng kiểm thử',
          'Cổng kiểm thử đã được sửa và xác minh. Danny có thể cấp đúng một lượt code/test cuối có audit.',
          implementation.updatedAt
        );
      }
      return nextAction(
        'SYSTEM',
        'NONE',
        'Đang chờ khắc phục cổng kiểm thử',
        'Các lượt retry hợp lệ đã dùng hết. Hệ thống phải xử lý lỗi build đã được ghi nhận trước khi có thể tạo lượt chạy mới.',
        implementation.updatedAt
      );
    }
    return nextAction(
      'DANNY',
      'RETRY_IMPLEMENTATION',
      'Quyết định retry',
      implementationFailureNote(implementation),
      implementation.status === 'RUNNING'
        ? (implementation.lastProgressAt ?? implementation.updatedAt)
        : implementation.updatedAt
    );
  }
  if (implementation?.status === 'AWAITING_COMMIT_REVIEW') {
    if (implementation.executionPhase === 'COMMIT_APPROVED' || implementation.executionPhase === 'IDE_COMMIT_HANDOFF') {
      const engineLabel =
        implementation.executionOwner === 'IDE'
          ? 'Codex IDE'
          : getExecutionOwnerDisplayName(implementation.executionOwner);
      return nextAction(
        'AGENT',
        'CONTINUE_IMPLEMENTATION',
        'Đang tạo commit',
        `${engineLabel} đang tự động tạo commit từ bản diff đã duyệt.`,
        implementation.updatedAt
      );
    }
    return nextAction(
      'DANNY',
      'REVIEW_COMMIT',
      'Duyệt commit',
      'Code và kiểm thử đã dừng ở worktree review. Commit, push và deploy vẫn cần duyệt tách biệt.',
      implementation.updatedAt
    );
  }
  if (implementation?.status === 'AWAITING_DEPLOY_REVIEW') {
    if (implementation.executionPhase === 'DEPLOY_APPROVED') {
      const engineLabel =
        implementation.executionOwner === 'IDE'
          ? 'Codex IDE'
          : getExecutionOwnerDisplayName(implementation.executionOwner);
      return nextAction(
        'AGENT',
        'CONTINUE_IMPLEMENTATION',
        'Đang triển khai production',
        `${engineLabel} đang tự động merge main và triển khai pipeline production. Chờ xác thực release marker.`,
        implementation.updatedAt
      );
    }
    return nextAction(
      'DANNY',
      'REVIEW_DEPLOY',
      'Duyệt deploy',
      'Commit đã nằm ở branch riêng. Sau khi Danny duyệt deploy, worker mới được merge, phát hành và để server đối chiếu release marker trước khi bàn giao nghiệm thu.',
      implementation.updatedAt
    );
  }
  if (implementation && ['PENDING', 'LEASED', 'RUNNING'].includes(implementation.status)) {
    const ideOwned = isSupportedImplementationOwner(implementation.executionOwner);
    const engineLabel =
      implementation.executionOwner === 'IDE'
        ? 'Codex IDE'
        : getExecutionOwnerDisplayName(implementation.executionOwner);
    const handoffReference = implementation.id
      ? `Handoff ${engineLabel} ${implementation.id}`
      : `Handoff ${engineLabel}`;
    return nextAction(
      'AGENT',
      implementation.status === 'PENDING' || implementation.status === 'LEASED'
        ? 'IMPLEMENT'
        : 'CONTINUE_IMPLEMENTATION',
      ideOwned && implementation.status !== 'RUNNING'
        ? implementation.executionPhase === 'IDE_PROVISIONING_PENDING'
          ? `Chờ ${engineLabel} tạo handoff`
          : implementation.executionPhase === 'IDE_PROVISIONING_LEASED'
            ? `${engineLabel} đang tạo task`
            : implementation.executionPhase === 'IDE_COMMIT_HANDOFF'
              ? `Chờ ${engineLabel} ghi commit đã duyệt`
              : implementation.executionPhase === 'DEPLOY_APPROVED'
                ? `${engineLabel} đang merge & triển khai production`
                : implementation.ideTaskId
                  ? `${engineLabel} đang code & kiểm thử`
                  : `Chờ ${engineLabel} nhận handoff`
        : implementation.executionPhase === 'DEPLOY_APPROVED'
          ? 'Đang triển khai production'
          : implementation.executionPhase === 'COMMIT_APPROVED'
            ? 'Chờ worker tạo commit'
            : implementation.executionPhase === 'COMMITTING'
              ? 'Đang tạo commit'
              : implementation.executionPhase === 'DEPLOYING'
                ? 'Đang deploy'
                : implementation.status === 'RUNNING'
                  ? 'Đang code/test'
                  : 'Chờ worker nhận',
      ideOwned && implementation.status !== 'RUNNING'
        ? implementation.executionPhase === 'IDE_PROVISIONING_PENDING'
          ? `${handoffReference} đang chờ companion ${engineLabel} cục bộ tạo task/worktree. Không cấp nonce, lease thực thi, commit, push, merge, deploy hoặc migration.`
          : implementation.executionPhase === 'IDE_PROVISIONING_LEASED'
            ? `${handoffReference} đang được companion ${engineLabel} cục bộ tạo task/worktree. Nếu companion mất kết nối, request ID giữ nguyên để retry không tạo task thứ hai.`
            : implementation.executionPhase === 'IDE_COMMIT_HANDOFF'
              ? `${handoffReference} đã sẵn sàng ghi đúng một commit từ candidate Danny đã duyệt. Không cấp lease, push, merge, deploy hoặc migration.`
              : implementation.executionPhase === 'DEPLOY_APPROVED'
                ? `${handoffReference} đã nhận lệnh duyệt deploy; ${engineLabel} đang tự động merge main, push và triển khai lên máy chủ Production.`
                : implementation.ideTaskId
                  ? `${handoffReference} đang được ${engineLabel} trực tiếp triển khai code và kiểm thử trong worktree riêng.`
                  : `${handoffReference} đã sẵn sàng cho code/test theo scope được duyệt. Không cấp lease thực thi nào.`
        : implementation.status === 'RUNNING'
          ? implementationProgressNote(implementation, 'Worker đang xử lý trong worktree riêng.')
          : implementation.executionPhase === 'DEPLOY_APPROVED'
            ? 'Đã nhận lệnh duyệt deploy; hệ thống đang triển khai lên máy chủ Production.'
            : 'Job đã bền vững trong hàng đợi; worker sẽ nhận khi permit trống.',
      implementation.ideTaskId
        ? (implementation.startedAt ?? implementation.ideTaskBoundAt ?? implementation.updatedAt)
        : implementation.updatedAt
    );
  }

  const latestActivity = latestAgentActivity(source);
  if (latestActivity?.action === 'REPORTER_IMPLEMENTATION_REOPENED') {
    return nextAction(
      'AGENT',
      'REWORK',
      'Rà soát yêu cầu sửa thêm',
      'Người báo đã mở lại ticket sau nghiệm thu. Không có implementation hoặc deploy tự động được tạo.',
      latestActivity.createdAt
    );
  }
  if (latestActivity?.action === 'AGENT_IMPLEMENTATION_FAILED') {
    return nextAction(
      'DANNY',
      'RETRY_IMPLEMENTATION',
      'Quyết định retry',
      'Lượt implementation trước đã dừng an toàn. Danny có thể tạo đúng một retry liên kết sau khi rà soát lỗi và worktree cũ.',
      latestActivity.createdAt
    );
  }

  if (source.status === 'APPROVED') {
    const replanAt = pendingReviewPlan(source);
    if (replanAt) {
      return nextAction(
        'AGENT',
        'REVIEW_CLARIFICATION',
        'Đăng plan sửa lại',
        'Chờ Agent đăng plan mới trước khi Danny duyệt code/test lại.',
        replanAt
      );
    }
    if (source.implementationApprovedAt || source.implementationActiveJobId) {
      return nextAction(
        'AGENT',
        'IMPLEMENT',
        'Chờ worker/IDE nhận việc',
        'Danny đã duyệt code/test; đang chờ worker/IDE nhận việc trong worktree riêng.',
        source.implementationApprovedAt ?? source.updatedAt
      );
    }
    return nextAction(
      'DANNY',
      'IMPLEMENT',
      'Duyệt code/test',
      'Plan đã có, nhưng Agent chỉ được bắt đầu sau khi Danny duyệt code/test. Khi job bền vững được tạo, UI mới hiển thị Agent triển khai.',
      source.approvedAt ?? source.updatedAt
    );
  }

  if (latestAgentActivity(source)?.action === 'AGENT_IMPLEMENTATION_REVIEW_READY') {
    return nextAction(
      'DANNY',
      'REVIEW_COMMIT',
      'Duyệt commit',
      'Rà soát worktree, diff và kiểm thử. Commit, push và deploy vẫn cần phê duyệt tách biệt.',
      latestAgentActivity(source)?.createdAt ?? source.updatedAt
    );
  }

  const reopenedAt = latestAuditAt(source, ['REPORTER_REOPENED']);
  const latestProgressAt = latestAuditAt(source, [
    'AGENT_PROGRESS_ANALYZING',
    'AGENT_PROGRESS_CHECKING_BUSINESS_LOGIC',
    'AGENT_PROGRESS_IMPLEMENTING',
    'AGENT_PROGRESS_VERIFYING',
  ]);
  if (reopenedAt && (!latestProgressAt || reopenedAt > latestProgressAt)) {
    return nextAction(
      'AGENT',
      'REWORK',
      'Xử lý phản hồi reopen',
      'Đọc điểm chưa đúng từ người báo, cập nhật bản sửa và kiểm thử hồi quy.',
      reopenedAt
    );
  }
  return nextAction(
    'AGENT',
    'CONTINUE_IMPLEMENTATION',
    'Tiếp tục triển khai',
    'Cập nhật tiến độ, hoàn tất kiểm thử và gửi kết quả cho người báo nghiệm thu.',
    latestProgressAt ?? source.startedAt ?? source.updatedAt
  );
}

/**
 * The only server-side projection used when serialising an Inbox ticket.
 *
 * Status, clarification, audit history and the durable implementation job are
 * intentionally resolved together at this boundary. Browser code receives
 * the already-decided progress and owner; it must not infer a lifecycle step
 * from a ticket status on its own.
 */
export function bugReportWorkflowProjection(source: AgentProgressSource): {
  agentProgress: BugReportAgentProgress;
  nextAction: BugReportNextAction;
} {
  return {
    agentProgress: bugReportAgentProgress(source),
    nextAction: bugReportNextAction(source),
  };
}

/**
 * Translate the canonical workflow into the only lifecycle language a reporter
 * needs. This deliberately does not expose Agent, plan, worker, commit, or
 * deployment gates; those remain available in the operator Inbox projection.
 */
export function bugReportReporterExperience(input: {
  status: BugReportStatus;
  clarificationStatus: BugReportClarificationStatus;
  createdAt: Date;
  approvedAt: Date | null;
  startedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  updatedAt: Date;
}): BugReportReporterExperience {
  const received = { label: 'Đã nhận yêu cầu của bạn', occurredAt: input.createdAt.toISOString() };
  const updates = [received];
  let state: BugReportReporterExperience['state'] = 'REVIEWING';
  let label = 'Đang xem xét';
  let summary = 'mOS đang xem yêu cầu và thông tin bạn đã gửi.';
  let reporterNextAction = {
    label: 'Bạn chưa cần làm gì',
    detail: 'mOS sẽ báo bạn khi cần thêm thông tin hoặc có kết quả để kiểm tra.',
  };

  if (input.status === 'CLOSED') {
    state = 'COMPLETED';
    label = 'Đã hoàn tất';
    summary = 'Yêu cầu này đã hoàn tất.';
    reporterNextAction = { label: 'Bạn đã xác nhận hoàn tất', detail: 'Cảm ơn bạn đã kiểm tra kết quả.' };
    updates.push({ label: 'Yêu cầu đã hoàn tất', occurredAt: (input.closedAt ?? input.updatedAt).toISOString() });
  } else if (input.status === 'FIXED') {
    state = 'READY_FOR_REVIEW';
    label = 'Mời bạn kiểm tra lại';
    summary = 'mOS đã chuẩn bị kết quả để bạn kiểm tra.';
    reporterNextAction = {
      label: 'Kiểm tra lại kết quả',
      detail: 'Chọn “Đã đúng” nếu vấn đề đã được giải quyết, hoặc “Vẫn như cũ” nếu chưa đúng.',
    };
    updates.push({
      label: 'Kết quả đã sẵn sàng để bạn kiểm tra',
      occurredAt: (input.resolvedAt ?? input.updatedAt).toISOString(),
    });
  } else if (input.status === 'CANCELLED') {
    state = 'NOT_PROCEEDING';
    label = 'Đã huỷ';
    summary = 'Bạn đã huỷ yêu cầu này.';
    reporterNextAction = { label: 'Yêu cầu đã huỷ', detail: 'Bạn có thể gửi một yêu cầu mới khi cần.' };
    updates.push({ label: 'Đã huỷ yêu cầu', occurredAt: (input.closedAt ?? input.updatedAt).toISOString() });
  } else if (input.status === 'REJECTED' || input.status === 'DUPLICATE') {
    state = 'NOT_PROCEEDING';
    label = 'Không tiếp tục';
    summary =
      input.status === 'DUPLICATE'
        ? 'Yêu cầu này đã được gộp với một yêu cầu tương tự.'
        : 'mOS chưa thể tiếp tục yêu cầu này.';
    reporterNextAction = {
      label: 'Bạn chưa cần làm gì',
      detail: 'Bạn có thể gửi một yêu cầu mới nếu có thông tin khác.',
    };
    updates.push({ label, occurredAt: input.updatedAt.toISOString() });
  } else if (input.clarificationStatus === 'WAITING_REPORTER') {
    state = 'WAITING_REPORTER';
    label = 'Cần bạn trả lời';
    summary = 'mOS cần thêm một chi tiết ngắn để tiếp tục.';
    reporterNextAction = {
      label: 'Trả lời câu hỏi bên dưới',
      detail: 'Bạn chỉ cần bổ sung điều mOS đang hỏi; không cần kể lại những gì đã gửi.',
    };
    updates.push({ label: 'mOS cần thêm một chi tiết', occurredAt: input.updatedAt.toISOString() });
  } else if (input.status === 'APPROVED' || input.status === 'IN_PROGRESS') {
    state = 'IN_PROGRESS';
    label = 'Đang xử lý';
    summary = 'mOS đang xử lý yêu cầu của bạn.';
    updates.push({
      label: 'mOS đã bắt đầu xử lý yêu cầu',
      occurredAt: (input.startedAt ?? input.approvedAt ?? input.updatedAt).toISOString(),
    });
  }

  return { state, label, summary, nextAction: reporterNextAction, updates: updates.slice(-2).reverse() };
}

export function assertAgentProgressUpdateAllowed(input: {
  stage: unknown;
  status: BugReportStatus;
  clarificationStatus: BugReportClarificationStatus;
  priority: BugPriority | null;
}): asserts input is typeof input & { stage: BugReportAgentUpdateStage } {
  if (!BUG_REPORT_AGENT_UPDATE_STAGES.includes(input.stage as BugReportAgentUpdateStage)) {
    throw new BugReportError('Giai đoạn Agent không hợp lệ.');
  }
  if (!AGENT_READABLE_STATUSES.has(input.status)) {
    throw new BugReportError('Ticket không còn trong phạm vi Agent xử lý.', 409, 'BUG_NOT_AGENT_READABLE');
  }
  if (input.stage === 'IMPLEMENTING' || input.stage === 'VERIFYING') {
    if (input.clarificationStatus !== 'READY') {
      throw new BugReportError('Agent chưa thể sửa khi ticket còn điểm chưa rõ.', 409, 'BUG_NEEDS_CLARIFICATION');
    }
    if (!input.priority || !['APPROVED', 'IN_PROGRESS'].includes(input.status)) {
      throw new BugReportError('Ticket chưa được duyệt và xếp priority để Agent sửa.', 409, 'BUG_NOT_READY_FOR_FIX');
    }
  }
}
