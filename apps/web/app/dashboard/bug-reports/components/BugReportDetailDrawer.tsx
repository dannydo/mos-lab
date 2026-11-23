'use client';

import { useState } from 'react';
import { Alert, Avatar, Button, Image, List, Typography } from 'antd';
import {
  type BugReportDetail,
  type BugReportPlanReviewCandidate,
  type InboxImplementationModelTier,
  isDeferredBugReport,
  BUG_REPORT_Z_INDEX,
} from '@mos-lab/shared';
import { RefreshCw } from 'lucide-react';
import { AdaptiveDrawer, AdaptiveModal, AppIcon, SectionCard, StatePanel } from '../../../../components/ui';
import { RichTextViewer } from '../../../../components/ui/rich-text';
import { BugReportConversation } from '../../../../components/bug-reports/BugReportConversation';
import { BugReportResolutionTracking } from './BugReportResolutionTracking';
import { BugReportExecutionTimingCard } from './BugReportExecutionTimingCard';
import { BugReportImplementationStatusCards } from './BugReportImplementationStatusCards';
import { FeatureRequestDetails } from './FeatureRequestDetails';
import { BugReportDeferModal } from './BugReportDeferModal';
import { BugReportReasonModal } from './BugReportReasonModal';
import { BugReportDiagnosticsSection } from './BugReportDiagnosticsSection';
import { BugReportDetailHeaderActions } from './BugReportDetailHeaderActions';
import { BugReportTriageSection } from './BugReportTriageSection';
import {
  AgentProgressTag,
  BugStatusTag,
  ClarificationTag,
  effectiveBugReportAgentProgress,
  formatDate,
  formatElapsed,
  initials,
  NextActionTag,
  PriorityTag,
  ProtectedAttachment,
  RequestTypeTag,
} from '../bug-report-presenters';
import { useBugReportDetail, type BugReportDetailOptions } from '../hooks/useBugReportDetail';
import type { useBugReports } from '../hooks/useBugReports';

const { Text } = Typography;

export function recommendDefaultModelTier(_detail: BugReportDetail | null): InboxImplementationModelTier {
  return 'hydrogen';
}

type BugReportDetailDrawerProps = BugReportDetailOptions &
  Pick<ReturnType<typeof useBugReports>, 'comment'> & {
    onClose: () => void;
    canTriage: boolean;
  };

export function BugReportDetailDrawer({ onClose, canTriage, comment, ...actions }: BugReportDetailDrawerProps) {
  const [deferOpen, setDeferOpen] = useState(false);
  const [deferReason, setDeferReason] = useState('');
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');
  const [exceptionCloseOpen, setExceptionCloseOpen] = useState(false);
  const [exceptionCloseReason, setExceptionCloseReason] = useState('');
  const [reviewedPlan, setReviewedPlan] = useState<BugReportPlanReviewCandidate | null>(null);
  const [planReason, setPlanReason] = useState('');
  const [retryConfirmationOpen, setRetryConfirmationOpen] = useState(false);
  const [executionOwnerOverride, setExecutionOwnerOverride] = useState<{
    reportId: number;
    owner: 'AG_WIN' | 'AUTO' | 'AG_MAC';
  } | null>(null);
  const [modelTierOverride, setModelTierOverride] = useState<{
    reportId: number;
    tier: InboxImplementationModelTier;
  } | null>(null);
  const { reportId } = actions;
  const {
    messageContext,
    detail,
    loading,
    saving,
    approvalReceived,
    requestChanges,
    revisePlan,
    loadError,
    status,
    setStatus,
    priority,
    setPriority,
    businessContext,
    setBusinessContext,
    note,
    setNote,
    duplicateKey,
    setDuplicateKey,
    hydrateForm,
    load,
    save,
    confirmResolvedAndClose,
    retryClarification,
    approveCodeExecution,
    retryCodeExecution,
    authorizeWorkerRecoveryRetry,
    authorizeSchemaRecoveryRetry,
    authorizeQualityGateRecoveryRetry,
    authorizeBuildLockRecoveryRetry,
    commitApprovalReceived,
    deployApprovalReceived,
    approveCommit,
    approveDeploy,
  } = useBugReportDetail(actions);

  const context = detail?.context;
  const isDeferred = detail ? isDeferredBugReport(detail) : false;
  const activeExecutionOwner: 'AG_WIN' | 'AUTO' | 'AG_MAC' =
    detail && executionOwnerOverride?.reportId === detail.id ? executionOwnerOverride.owner : 'AG_WIN';
  const activeModelTier: InboxImplementationModelTier =
    detail && modelTierOverride?.reportId === detail.id ? modelTierOverride.tier : recommendDefaultModelTier(detail);

  return (
    <>
      {messageContext}
      <AdaptiveDrawer
        open={Boolean(reportId)}
        onClose={onClose}
        intent="detail"
        className="bug-report-detail-drawer"
        title={detail ? `${detail.key} · ${detail.title}` : 'Chi tiết yêu cầu'}
        extra={
          detail ? (
            <BugReportDetailHeaderActions
              detail={detail}
              canTriage={canTriage}
              isDeferred={isDeferred}
              saving={saving}
              businessContext={businessContext}
              approvalReceived={approvalReceived}
              commitApprovalReceived={commitApprovalReceived}
              deployApprovalReceived={deployApprovalReceived}
              activeExecutionOwner={activeExecutionOwner}
              onExecutionOwnerChange={(owner) => setExecutionOwnerOverride({ reportId: detail.id, owner })}
              activeModelTier={activeModelTier}
              onModelTierChange={(tier) => setModelTierOverride({ reportId: detail.id, tier })}
              onOpenDefer={() => {
                setDeferReason('');
                setDeferOpen(true);
              }}
              onSaveTriage={(override) => void save(override)}
              onApproveCodeExecution={(owner, tier) => void approveCodeExecution(owner, tier)}
              onOpenPlanRevision={(plan) => {
                setPlanReason('');
                setReviewedPlan(plan);
              }}
              onRetryClarification={() => void retryClarification()}
              onAuthorizeBuildLockRecoveryRetry={() => void authorizeBuildLockRecoveryRetry()}
              onAuthorizeQualityGateRecoveryRetry={() => void authorizeQualityGateRecoveryRetry()}
              onAuthorizeSchemaRecoveryRetry={() => void authorizeSchemaRecoveryRetry()}
              onAuthorizeWorkerRecoveryRetry={() => void authorizeWorkerRecoveryRetry()}
              onOpenRetryConfirmation={() => setRetryConfirmationOpen(true)}
              onApproveCommit={() => void approveCommit()}
              onOpenChangesModal={() => {
                setChangesReason('');
                setChangesOpen(true);
              }}
              onApproveDeploy={() => void approveDeploy()}
              onOpenExceptionClose={() => {
                setExceptionCloseReason('');
                setExceptionCloseOpen(true);
              }}
            />
          ) : undefined
        }
      >
        <BugReportDeferModal
          open={deferOpen}
          saving={saving}
          reason={deferReason}
          onReasonChange={setDeferReason}
          onCancel={() => setDeferOpen(false)}
          onConfirm={async () => {
            const formattedNote = `[Tạm hoãn] ${deferReason.trim()}`;
            await save({ status: 'REJECTED', note: formattedNote });
            setDeferOpen(false);
          }}
        />
        <BugReportReasonModal
          title="Đóng ticket bằng ngoại lệ Admin?"
          open={exceptionCloseOpen}
          onCancel={() => setExceptionCloseOpen(false)}
          okText="Xác nhận đóng ngoại lệ"
          confirmLoading={saving}
          reason={exceptionCloseReason}
          onReasonChange={setExceptionCloseReason}
          description="Ghi rõ bằng chứng hoặc lý do đóng ngoại lệ. Thao tác này chỉ dành cho Danny và vẫn được máy chủ kiểm tra."
          ariaLabel="Lý do đóng ngoại lệ"
          placeholder="Nêu bằng chứng release/kiểm tra và lý do đóng (ít nhất 10 ký tự)."
          onConfirm={async () => {
            if (await confirmResolvedAndClose(exceptionCloseReason)) setExceptionCloseOpen(false);
          }}
        />
        <BugReportReasonModal
          title="Yêu cầu sửa lại plan"
          open={Boolean(reviewedPlan)}
          onCancel={() => setReviewedPlan(null)}
          okText="Gửi yêu cầu sửa plan"
          confirmLoading={saving}
          reason={planReason}
          onReasonChange={setPlanReason}
          disabled={!detail?.planReview}
          description="Plan cũ và audit được giữ nguyên. Agent lập lại plan theo lý do này; Danny phải duyệt plan mới trước code/test. Không đóng ticket."
          ariaLabel="Lý do yêu cầu sửa plan"
          placeholder="Nêu phần plan cần sửa và kết quả mong muốn (ít nhất 10 ký tự)."
          onConfirm={async () => {
            if (reviewedPlan && (await revisePlan(planReason, reviewedPlan))) setReviewedPlan(null);
          }}
        />
        <BugReportReasonModal
          title="Yêu cầu sửa lại trước commit"
          open={changesOpen}
          onCancel={() => setChangesOpen(false)}
          okText="Gửi yêu cầu sửa lại"
          confirmLoading={saving}
          reason={changesReason}
          onReasonChange={setChangesReason}
          description="Candidate và bằng chứng cũ được giữ nguyên. Agent lập plan mới; chỉ chạy code/test sau một phê duyệt mới của Danny. Không commit hoặc đóng ticket."
          ariaLabel="Lý do yêu cầu sửa lại"
          placeholder="Nêu phần chưa đạt và kết quả cần bổ sung (ít nhất 10 ký tự)."
          onConfirm={async () => {
            if (await requestChanges(changesReason)) setChangesOpen(false);
          }}
        />
        {loading && !detail && <StatePanel kind="loading" minHeight={256} surface={false} />}
        {loadError && !detail && (
          <Alert
            type="error"
            showIcon
            message={loadError}
            action={<Button onClick={() => void load()}>Thử lại</Button>}
          />
        )}
        {detail && context && (
          <div className="space-y-4">
            {isDeferred && (
              <Alert
                type="warning"
                showIcon
                message="Ticket đang ở trạng thái Tạm hoãn (Won't Do Now)"
                description={
                  <div className="space-y-2">
                    <p>
                      {detail.triageNote?.replace(/^\[Tạm hoãn\]\s*/, '') ||
                        'Chưa có kế hoạch triển khai trong thời gian tới.'}
                    </p>
                    {canTriage && (
                      <Button
                        size="small"
                        type="primary"
                        loading={saving}
                        icon={<AppIcon icon={RefreshCw} size="sm" />}
                        onClick={() => void save({ status: 'NEW', note: 'Mở lại ticket sau thời gian tạm hoãn' })}
                      >
                        Mở lại ticket
                      </Button>
                    )}
                  </div>
                }
              />
            )}
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size={44} src={detail.reporter.avatarUrl || undefined}>
                    {initials(detail.reporter.displayName)}
                  </Avatar>
                  <div className="min-w-0">
                    <Text strong>{detail.reporter.displayName}</Text>
                    <div>
                      <Text type="secondary">Người báo · {detail.reporter.role}</Text>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <BugStatusTag
                    status={detail.status}
                    triageNote={detail.triageNote}
                    reporterName={detail.reporter.displayName}
                    agentProgress={effectiveBugReportAgentProgress(detail).stage}
                  />
                  <RequestTypeTag requestType={detail.requestType} />
                  <PriorityTag priority={detail.priority} />
                  <ClarificationTag status={detail.clarification.status} reporterName={detail.reporter.displayName} />
                  <AgentProgressTag
                    progress={effectiveBugReportAgentProgress(detail)}
                    reporterName={detail.reporter.displayName}
                  />
                  <Text type="secondary" className="tabular-nums">
                    Đã báo {formatElapsed(detail.createdAt)}
                  </Text>
                </div>
              </div>
              <div className="!mb-3 ![font-size:var(--text-base)]">
                <RichTextViewer content={detail.description} className="![font-size:var(--text-base)]" />
              </div>
              {detail.businessContext && (
                <div className="!mb-3 rounded-lg border border-blue-200/70 bg-blue-50/40 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <Text
                    strong
                    className="mb-1.5 block text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300"
                  >
                    {detail.requestType === 'FEATURE'
                      ? 'Phạm vi & Tiêu chí nghiệm thu (Acceptance Criteria)'
                      : 'Biz Logic & Kết quả đúng'}
                  </Text>
                  <RichTextViewer content={detail.businessContext} compact />
                </div>
              )}
              <Text type="secondary">
                Báo bởi {detail.reporter.displayName} · {detail.reporter.role}
              </Text>
            </section>

            <SectionCard title="Bàn giao tiếp theo">
              <div className="space-y-2">
                <NextActionTag action={detail.nextAction} reporterName={detail.reporter.displayName} />
                <div>
                  <Text>{detail.nextAction.detail}</Text>
                </div>
                <Text type="secondary" className="tabular-nums">
                  {detail.nextAction.actor === 'AGENT' &&
                  (detail.implementation?.ideHandoff?.taskId || detail.implementation?.status === 'RUNNING')
                    ? `Đang thực hiện ${formatElapsed(detail.nextAction.waitingSince)}`
                    : `Đang chờ ${formatElapsed(detail.nextAction.waitingSince)}`}{' '}
                  · từ {formatDate(detail.nextAction.waitingSince)}
                </Text>
              </div>
            </SectionCard>

            <BugReportImplementationStatusCards implementation={detail.implementation} />

            {detail.reopen ? (
              <SectionCard title="Phản hồi reopen hiện tại">
                <div className="space-y-1">
                  <Text>{detail.reopen.reason}</Text>
                  <Text type="secondary" className="tabular-nums">
                    Agent đang tái phân tích từ audit #{detail.reopen.auditId} · {formatDate(detail.reopen.reopenedAt)}.
                    Bản plan/approval cũ không còn hiệu lực; cần plan mới, Danny duyệt lại và đặt priority trước khi
                    sửa.
                  </Text>
                  <Text type="secondary">
                    {detail.reopen.originalEvidence.length
                      ? `Agent có thể đối chiếu ${detail.reopen.originalEvidence.length} ảnh gốc của ticket; người báo không cần gửi lại.`
                      : 'Ticket không có ảnh gốc được lưu; Agent sẽ làm rõ nếu cần thêm bằng chứng.'}
                  </Text>
                </div>
              </SectionCard>
            ) : null}

            {detail.featureRequest ? <FeatureRequestDetails featureRequest={detail.featureRequest} /> : null}

            <SectionCard title={`Trao đổi & làm rõ (${detail.comments.length})`}>
              <BugReportConversation
                reportId={detail.id}
                requestType={detail.requestType}
                status={detail.status}
                clarification={detail.clarification}
                comments={detail.comments}
                readOnly={!canTriage}
                onSubmit={async (request) => {
                  const result = await comment(detail.id, request);
                  hydrateForm(result.report);
                  return result;
                }}
              />
            </SectionCard>

            <BugReportResolutionTracking detail={detail} />

            <BugReportExecutionTimingCard timing={detail.executionTiming} />

            {detail.attachments.some((item) => !item.deletedAt && !item.commentId) && (
              <SectionCard
                title={`Ảnh đính kèm (${detail.attachments.filter((item) => !item.deletedAt && !item.commentId).length})`}
              >
                <Image.PreviewGroup
                  preview={{
                    zIndex: BUG_REPORT_Z_INDEX.PREVIEW,
                    countRender: (current: number, total: number) => (
                      <span className="tabular-nums font-semibold tracking-wide">
                        {current} / {total}
                      </span>
                    ),
                  }}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {detail.attachments
                      .filter((item) => !item.deletedAt && !item.commentId)
                      .map((attachment) => (
                        <ProtectedAttachment key={attachment.id} reportId={detail.id} attachment={attachment} />
                      ))}
                  </div>
                </Image.PreviewGroup>
              </SectionCard>
            )}

            <BugReportDiagnosticsSection context={context} />

            {canTriage ? (
              <BugReportTriageSection
                detail={detail}
                isDeferred={isDeferred}
                status={status}
                onStatusChange={setStatus}
                priority={priority}
                onPriorityChange={setPriority}
                businessContext={businessContext}
                onBusinessContextChange={setBusinessContext}
                note={note}
                onNoteChange={setNote}
                duplicateKey={duplicateKey}
                onDuplicateKeyChange={setDuplicateKey}
                saving={saving}
                onSave={() => void save()}
              />
            ) : null}

            <SectionCard title={`Audit history (${detail.audits.length})`}>
              <List
                size="small"
                dataSource={[...detail.audits].reverse()}
                renderItem={(item) => (
                  <List.Item>
                    <div>
                      <Text strong>{item.action}</Text>{' '}
                      <Text type="secondary">
                        · {item.actor?.displayName || 'Hệ thống'} · {formatDate(item.createdAt)}
                      </Text>
                      {item.note && (
                        <div>
                          <Text>{item.note}</Text>
                        </div>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </SectionCard>
          </div>
        )}
      </AdaptiveDrawer>
      <AdaptiveModal
        intent="confirm"
        open={retryConfirmationOpen}
        title="Tạo đúng một retry sạch?"
        onCancel={() => setRetryConfirmationOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRetryConfirmationOpen(false)}>
            Chưa retry
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={saving}
            onClick={() => {
              setRetryConfirmationOpen(false);
              void retryCodeExecution();
            }}
          >
            Tạo retry
          </Button>,
        ]}
      >
        <p>
          Lượt cũ được giữ nguyên để review. Retry chỉ tạo một handoff IDE mới để chạy code/test; không cấp lease Worker
          Mac, không commit, push, merge, deploy hay migration.
        </p>
      </AdaptiveModal>
    </>
  );
}
