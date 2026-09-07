'use client';

import { useState } from 'react';

import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Dropdown,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Typography,
} from 'antd';
import type { BugPriority, BugReportPlanReviewCandidate } from '@mos-lab/shared';
import { CheckCircle2, Gavel, RefreshCw, Send } from 'lucide-react';
import { AdaptiveDrawer, AdaptiveModal, AppIcon, SectionCard, StatePanel } from '../../../../components/ui';
import { BugReportConversation } from '../../../../components/bug-reports/BugReportConversation';
import { BugReportResolutionTracking } from './BugReportResolutionTracking';
import { FeatureRequestDetails } from './FeatureRequestDetails';
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
  STATUS_LABELS,
  TRANSITIONS,
} from '../bug-report-presenters';
import { useBugReportDetail, type BugReportDetailOptions } from '../hooks/useBugReportDetail';
import type { useBugReports } from '../hooks/useBugReports';
import styles from './BugReportDetailDrawer.module.css';

const { Text, Paragraph } = Typography;

type BugReportDetailDrawerProps = BugReportDetailOptions &
  Pick<ReturnType<typeof useBugReports>, 'comment'> & {
    onClose: () => void;
    canTriage: boolean;
  };

export function BugReportDetailDrawer({ onClose, canTriage, comment, ...actions }: BugReportDetailDrawerProps) {
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');
  const [reviewedPlan, setReviewedPlan] = useState<BugReportPlanReviewCandidate | null>(null);
  const [planReason, setPlanReason] = useState('');
  const [retryConfirmationOpen, setRetryConfirmationOpen] = useState(false);
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
    approveCodeExecution,
    retryCodeExecution,
    authorizeWorkerRecoveryRetry,
    authorizeSchemaRecoveryRetry,
    authorizeQualityGateRecoveryRetry,
    authorizeBuildLockRecoveryRetry,
    approveCommit,
    approveDeploy,
  } = useBugReportDetail(actions);

  const approvalItems = (['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((item) => ({
    key: item,
    label: detail?.requestType === 'FEATURE' ? `Duyệt triển khai ${item}` : `Approve ${item}`,
    onClick: () => void save({ status: 'APPROVED', priority: item }),
  }));

  const context = detail?.context;

  return (
    <>
      {messageContext}
      <AdaptiveDrawer
        open={Boolean(reportId)}
        onClose={onClose}
        intent="detail"
        className="bug-report-detail-drawer"
        destroyOnHidden
        title={detail ? `${detail.key} · ${detail.title}` : 'Chi tiết yêu cầu'}
        extra={
          detail ? (
            <Space wrap>
              {canTriage && detail.status === 'NEW' && (
                <Dropdown menu={{ items: approvalItems }} trigger={['click']}>
                  <Button
                    type="primary"
                    loading={saving}
                    disabled={
                      detail.requestType === 'FEATURE'
                        ? detail.clarification.status !== 'READY'
                        : detail.clarification.status !== 'READY' && businessContext.trim().length < 10
                    }
                    title={
                      detail.requestType === 'FEATURE'
                        ? 'Agent phải xác nhận yêu cầu đã đủ rõ trước khi Danny duyệt triển khai'
                        : 'Cần Agent xác nhận đủ rõ hoặc nhập biz logic/kết quả đúng trước khi approve'
                    }
                    icon={<AppIcon icon={Send} size="sm" />}
                  >
                    {detail.requestType === 'FEATURE' ? 'Duyệt triển khai' : 'Approve'}
                  </Button>
                </Dropdown>
              )}
              {canTriage &&
                detail.status === 'APPROVED' &&
                detail.agentProgress.stage === 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL' &&
                !detail.implementation &&
                !approvalReceived &&
                detail.priority &&
                detail.clarification.status === 'READY' && (
                  <Popconfirm
                    classNames={{ root: styles.confirmationPopup }}
                    title="Duyệt AI chạy code/test?"
                    description="AI chỉ làm trong worktree riêng. Không commit, push, merge, deploy hay chạy migration. Sau đó ticket sẽ chờ Danny duyệt commit."
                    okText="Duyệt code/test"
                    cancelText="Chưa duyệt"
                    onConfirm={() => void approveCodeExecution()}
                  >
                    <Button type="primary" loading={saving} icon={<AppIcon icon={Gavel} size="sm" />}>
                      Duyệt code/test
                    </Button>
                  </Popconfirm>
                )}
              {canTriage && detail.planReview && !approvalReceived && (
                <Button
                  disabled={saving}
                  icon={<AppIcon icon={RefreshCw} size="sm" />}
                  onClick={() => {
                    setPlanReason('');
                    setReviewedPlan(detail.planReview!);
                  }}
                >
                  Yêu cầu sửa lại plan
                </Button>
              )}
              {canTriage &&
                detail.agentProgress.stage === 'IMPLEMENTATION_FAILED' &&
                detail.priority &&
                detail.clarification.status === 'READY' &&
                (detail.implementation?.canAuthorizeBuildLockRecoveryRetry ? (
                  <Popconfirm
                    classNames={{ root: styles.confirmationPopup }}
                    title="Cho phép một retry sau khi sửa lock build?"
                    description="Đúng lỗi lock output Next đã được sửa và kiểm chứng. Hệ thống tạo đúng một worktree code/test mới; commit, push, merge, deploy và migration vẫn không tự chạy."
                    okText="Cho phép retry"
                    cancelText="Chưa cho phép"
                    onConfirm={() => void authorizeBuildLockRecoveryRetry()}
                  >
                    <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
                      Cho phép retry sau khi sửa lock build
                    </Button>
                  </Popconfirm>
                ) : detail.implementation?.canAuthorizeQualityGateRecoveryRetry ? (
                  <Popconfirm
                    classNames={{ root: styles.confirmationPopup }}
                    title="Cho phép một retry sau khi sửa cổng kiểm thử?"
                    description="Cổng kiểm thử đã được sửa và xác minh. Hệ thống tạo đúng một worktree code/test mới; commit, push, merge, deploy và migration vẫn không tự chạy."
                    okText="Cho phép retry"
                    cancelText="Chưa cho phép"
                    onConfirm={() => void authorizeQualityGateRecoveryRetry()}
                  >
                    <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
                      Cho phép retry sau khi sửa cổng kiểm thử
                    </Button>
                  </Popconfirm>
                ) : detail.implementation?.canAuthorizeSchemaRecoveryRetry ? (
                  <Popconfirm
                    classNames={{ root: styles.confirmationPopup }}
                    title="Cho phép một retry sau khi đã sửa schema?"
                    description="Chỉ áp dụng cho lỗi schema đã được chẩn đoán chỉ-đọc và xác minh. Hệ thống tạo worktree code/test mới, không commit, push, merge, deploy hay chạy migration. Quyền này chỉ dùng một lần cho lượt hiện tại."
                    okText="Cho phép retry"
                    cancelText="Chưa cho phép"
                    onConfirm={() => void authorizeSchemaRecoveryRetry()}
                  >
                    <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
                      Cho phép retry sau khi sửa schema
                    </Button>
                  </Popconfirm>
                ) : detail.implementation?.canAuthorizeWorkerRecoveryRetry ? (
                  <Popconfirm
                    classNames={{ root: styles.confirmationPopup }}
                    title="Cho phép một retry sau khi đã sửa Worker?"
                    description="Chỉ áp dụng cho lỗi hạ tầng đã nhận diện sau hai retry thường. Hệ thống tạo worktree code/test mới, không commit, push, merge, deploy hay chạy migration. Quyền này chỉ dùng một lần cho lượt hiện tại."
                    okText="Cho phép retry"
                    cancelText="Chưa cho phép"
                    onConfirm={() => void authorizeWorkerRecoveryRetry()}
                  >
                    <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
                      Cho phép retry sau khi sửa Worker
                    </Button>
                  </Popconfirm>
                ) : detail.implementation?.canRetryImplementation ? (
                  <Button
                    type="primary"
                    loading={saving}
                    icon={<AppIcon icon={RefreshCw} size="sm" />}
                    onClick={() => setRetryConfirmationOpen(true)}
                  >
                    Tạo retry sạch
                  </Button>
                ) : null)}
              {canTriage && detail.agentProgress.stage === 'AWAITING_DANNY_COMMIT_REVIEW' && (
                <>
                  <Popconfirm
                    classNames={{ root: styles.confirmationPopup }}
                    title="Duyệt commit bản đã review?"
                    description="Worker Mac chỉ stage đúng các tệp đã ghi trong review, commit vào branch riêng rồi dừng. Không push, merge hay deploy."
                    okText="Duyệt commit"
                    cancelText="Chưa duyệt"
                    onConfirm={() => void approveCommit()}
                  >
                    <Button type="primary" loading={saving} icon={<AppIcon icon={CheckCircle2} size="sm" />}>
                      Duyệt commit
                    </Button>
                  </Popconfirm>
                  {detail.implementation?.reviewCandidate && (
                    <Button
                      disabled={saving}
                      icon={<AppIcon icon={RefreshCw} size="sm" />}
                      onClick={() => {
                        setChangesReason('');
                        setChangesOpen(true);
                      }}
                    >
                      Yêu cầu sửa lại
                    </Button>
                  )}
                </>
              )}
              {canTriage && detail.agentProgress.stage === 'AWAITING_DANNY_DEPLOY_APPROVAL' && (
                <Popconfirm
                  classNames={{ root: styles.confirmationPopup }}
                  title="Duyệt deploy commit đã review?"
                  description="Worker Mac sẽ merge đúng commit vào main, push, chạy pipeline production và chỉ bàn giao khi release marker khớp."
                  okText="Duyệt deploy"
                  cancelText="Chưa duyệt"
                  onConfirm={() => void approveDeploy()}
                >
                  <Button type="primary" loading={saving} icon={<AppIcon icon={CheckCircle2} size="sm" />}>
                    Duyệt deploy
                  </Button>
                </Popconfirm>
              )}
              {canTriage &&
                ['APPROVED', 'IN_PROGRESS', 'FIXED'].includes(detail.status) &&
                detail.agentProgress.stage !== 'AWAITING_REPORTER_ACCEPTANCE' && (
                  <Popconfirm
                    classNames={{ root: styles.confirmationPopup }}
                    title="Đóng ticket bằng ngoại lệ Admin?"
                    description="Bắt buộc ghi bằng chứng/lý do ở ô Ghi chú xử lý. mOS không tạo trạng thái sửa giả."
                    okText="Override & đóng"
                    cancelText="Kiểm tra lại"
                    onConfirm={() => void confirmResolvedAndClose()}
                  >
                    <Button loading={saving} icon={<AppIcon icon={CheckCircle2} size="sm" />}>
                      Đóng ngoại lệ
                    </Button>
                  </Popconfirm>
                )}
            </Space>
          ) : undefined
        }
      >
        <AdaptiveModal
          title="Yêu cầu sửa lại plan"
          open={Boolean(reviewedPlan)}
          onCancel={() => !saving && setReviewedPlan(null)}
          okText="Gửi yêu cầu sửa plan"
          cancelText="Hủy"
          confirmLoading={saving}
          okButtonProps={{ disabled: planReason.trim().length < 10 || saving || !detail?.planReview }}
          onOk={async () => {
            if (reviewedPlan && (await revisePlan(planReason, reviewedPlan))) setReviewedPlan(null);
          }}
        >
          <Paragraph>
            Plan cũ và audit được giữ nguyên. Agent lập lại plan theo lý do này; Danny phải duyệt plan mới trước
            code/test. Không đóng ticket.
          </Paragraph>
          <Input.TextArea
            aria-label="Lý do yêu cầu sửa plan"
            value={planReason}
            onChange={(event) => setPlanReason(event.target.value)}
            maxLength={2000}
            showCount
            rows={5}
            placeholder="Nêu phần plan cần sửa và kết quả mong muốn (ít nhất 10 ký tự)."
          />
        </AdaptiveModal>
        <AdaptiveModal
          title="Yêu cầu sửa lại trước commit"
          open={changesOpen}
          onCancel={() => !saving && setChangesOpen(false)}
          okText="Gửi yêu cầu sửa lại"
          cancelText="Hủy"
          confirmLoading={saving}
          okButtonProps={{ disabled: changesReason.trim().length < 10 || saving }}
          onOk={async () => {
            if (await requestChanges(changesReason)) setChangesOpen(false);
          }}
        >
          <Paragraph>
            Candidate và bằng chứng cũ được giữ nguyên. Agent lập plan mới; chỉ chạy code/test sau một phê duyệt mới của
            Danny. Không commit hoặc đóng ticket.
          </Paragraph>
          <Input.TextArea
            aria-label="Lý do yêu cầu sửa lại"
            value={changesReason}
            onChange={(event) => setChangesReason(event.target.value)}
            maxLength={2000}
            showCount
            rows={5}
            placeholder="Nêu phần chưa đạt và kết quả cần bổ sung (ít nhất 10 ký tự)."
          />
        </AdaptiveModal>
        {loading && <StatePanel kind="loading" minHeight={256} surface={false} />}
        {loadError && (
          <Alert
            type="error"
            showIcon
            message={loadError}
            action={<Button onClick={() => void load()}>Thử lại</Button>}
          />
        )}
        {!loading && detail && context && (
          <div className="space-y-4">
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
              <Paragraph className="!mb-2 whitespace-pre-wrap ![font-size:var(--text-base)]">
                {detail.description}
              </Paragraph>
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
                  Đang chờ {formatElapsed(detail.nextAction.waitingSince)} · từ{' '}
                  {formatDate(detail.nextAction.waitingSince)}
                </Text>
              </div>
            </SectionCard>

            {detail.implementation?.ideHandoff ? (
              <SectionCard title="Handoff Codex IDE">
                <Alert
                  type="info"
                  showIcon
                  message={
                    detail.implementation.ideHandoff.taskId
                      ? 'Đã gán cho task Codex IDE'
                      : detail.implementation.ideHandoff.phase === 'IDE_PROVISIONING_PENDING'
                        ? 'Chờ Codex IDE tạo task'
                        : detail.implementation.ideHandoff.phase === 'IDE_PROVISIONING_LEASED'
                          ? 'Codex IDE đang tạo task'
                          : 'Đang chờ Codex IDE nhận handoff'
                  }
                  description={
                    <div className="space-y-1">
                      <div>
                        <Text strong>Mã tham chiếu: </Text>
                        <Text code>{detail.implementation.ideHandoff.reference}</Text>
                      </div>
                      {detail.implementation.ideHandoff.taskId ? (
                        <div>
                          <Text strong>Task Codex IDE: </Text>
                          <Text code>{detail.implementation.ideHandoff.taskId}</Text>
                        </div>
                      ) : null}
                      <Text type="secondary">
                        {detail.implementation.ideHandoff.phase === 'IDE_PROVISIONING_PENDING'
                          ? 'Companion cục bộ đã opt-in sẽ tạo task/worktree. Chưa cấp nonce hay quyền code/test.'
                          : detail.implementation.ideHandoff.phase === 'IDE_PROVISIONING_LEASED'
                            ? 'Companion cục bộ đang tạo task/worktree với request ID bền vững. Mất kết nối sẽ retry cùng request, không tạo task thứ hai.'
                            : detail.implementation.ideHandoff.phase === 'IDE_COMMIT_HANDOFF'
                              ? 'Chỉ ghi đúng một commit từ candidate Danny đã duyệt. Không cấp lease, push, merge, deploy hoặc migration.'
                              : 'Chỉ code/test theo scope đã duyệt. Không cấp lease thực thi, commit, push, merge, deploy hoặc migration.'}
                      </Text>
                    </div>
                  }
                />
              </SectionCard>
            ) : null}

            {detail.implementation?.deploymentLane ? (
              <SectionCard title="Lộ trình phát hành đề xuất">
                <Alert
                  type="info"
                  showIcon
                  message={`${detail.implementation.deploymentLane.lane} · chỉ quan sát`}
                  description={
                    <div className="space-y-1">
                      <Text>{detail.implementation.deploymentLane.reason}</Text>
                      <div>
                        <Text type="secondary">
                          Sẽ chạy: {detail.implementation.deploymentLane.willRun.join(' · ')}
                        </Text>
                      </div>
                      {detail.implementation.deploymentLane.willSkip.length ? (
                        <div>
                          <Text type="secondary">
                            Bỏ qua: {detail.implementation.deploymentLane.willSkip.join(' · ')}
                          </Text>
                        </div>
                      ) : null}
                    </div>
                  }
                />
              </SectionCard>
            ) : null}

            {detail.implementation?.failure ? (
              <SectionCard title="Vì sao worker dừng">
                <Alert
                  type="warning"
                  showIcon
                  message={detail.implementation.failure.summary}
                  description={
                    <div className="space-y-1">
                      {detail.implementation.failure.command ? (
                        <Text code>{detail.implementation.failure.command}</Text>
                      ) : null}
                      <div>
                        <Text type="secondary" className="tabular-nums">
                          {detail.implementation.failure.code ? `${detail.implementation.failure.code} · ` : ''}
                          Ghi nhận {formatDate(detail.implementation.failure.occurredAt)}. Commit và deploy đã bị chặn.
                        </Text>
                      </div>
                    </div>
                  }
                />
              </SectionCard>
            ) : null}

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

            {detail.attachments.some((item) => !item.deletedAt && !item.commentId) && (
              <SectionCard
                title={`Ảnh đính kèm (${detail.attachments.filter((item) => !item.deletedAt && !item.commentId).length})`}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {detail.attachments
                    .filter((item) => !item.deletedAt && !item.commentId)
                    .map((attachment) => (
                      <ProtectedAttachment key={attachment.id} reportId={detail.id} attachment={attachment} />
                    ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Context tự động">
              <Descriptions column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }} size="small" bordered>
                <Descriptions.Item label="Trang">{context.path}</Descriptions.Item>
                <Descriptions.Item label="Popup / drawer">
                  {context.overlays.join(' → ') || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Web commit">
                  <Text code copyable>
                    {context.webCommit || 'unknown'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="API commit">
                  <Text code copyable>
                    {context.apiCommit || 'unknown'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Theme">{context.themeMode}</Descriptions.Item>
                <Descriptions.Item label="Viewport">
                  {context.viewport.width} × {context.viewport.height} · DPR {context.viewport.devicePixelRatio}
                </Descriptions.Item>
                <Descriptions.Item label="Mạng">{context.online ? 'Online' : 'Offline'}</Descriptions.Item>
                <Descriptions.Item label="Múi giờ">{context.timeZone}</Descriptions.Item>
                <Descriptions.Item label="Trình duyệt" span={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}>
                  {context.userAgent}
                </Descriptions.Item>
              </Descriptions>
            </SectionCard>

            <SectionCard title={`API lỗi gần nhất (${context.recentApiFailures.length})`}>
              {context.recentApiFailures.length === 0 ? (
                <Text type="secondary">Không ghi nhận API lỗi gần đây.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={context.recentApiFailures}
                  renderItem={(item) => (
                    <List.Item>
                      <div className="min-w-0">
                        <Text code>{item.method}</Text> <Text>{item.url}</Text>
                        <div>
                          <Text type="secondary">
                            {item.status ?? 'NETWORK'} · {item.message} · {formatDate(item.occurredAt)}
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </SectionCard>

            <SectionCard title={`JavaScript lỗi gần nhất (${context.recentClientErrors.length})`}>
              {context.recentClientErrors.length === 0 && !context.errorBoundary ? (
                <Text type="secondary">Không ghi nhận JavaScript error gần đây.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={[
                    ...(context.errorBoundary ? [context.errorBoundary] : []),
                    ...context.recentClientErrors,
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <div className="min-w-0">
                        <Text strong>
                          {item.name}: {item.message}
                        </Text>
                        {item.stack && (
                          <Text
                            type="secondary"
                            className="mt-2 block max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs"
                          >
                            {item.stack}
                          </Text>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </SectionCard>

            {canTriage ? (
              <SectionCard title={detail.requestType === 'FEATURE' ? 'Danny quyết định sản phẩm' : 'Danny triage'}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <Text strong>Trạng thái</Text>
                    <Select
                      value={status}
                      onChange={setStatus}
                      options={TRANSITIONS[detail.status].map((item) => ({ value: item, label: STATUS_LABELS[item] }))}
                      getPopupContainer={(node) => node.parentElement || document.body}
                      className="w-full"
                    />
                  </label>
                  <label className="space-y-1">
                    <Text strong>Ưu tiên</Text>
                    <Select
                      allowClear
                      placeholder="Chọn P0–P3"
                      value={priority}
                      onChange={(value) => setPriority(value ?? null)}
                      options={(['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((item) => ({
                        value: item,
                        label: item,
                      }))}
                      getPopupContainer={(node) => node.parentElement || document.body}
                      className="w-full"
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-1">
                  <Text strong>
                    {detail.requestType === 'FEATURE' ? 'Phạm vi / acceptance criteria' : 'Biz logic / kết quả đúng'}
                  </Text>
                  <Input.TextArea
                    value={businessContext}
                    onChange={(event) => setBusinessContext(event.target.value)}
                    placeholder={
                      detail.requestType === 'FEATURE'
                        ? 'Ghi phạm vi đã chốt, điều kiện được xem là đạt và giới hạn nếu có'
                        : 'Bổ sung điều Agent cần hiểu về nghiệp vụ hoặc kết quả đúng mong muốn'
                    }
                    maxLength={4000}
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    showCount
                  />
                </label>
                <label className="mt-4 block space-y-1">
                  <Text strong>Ghi chú xử lý</Text>
                  <Input.TextArea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Bắt buộc khi Fixed, Rejected, mở lại hoặc dùng Đóng ngoại lệ"
                    maxLength={2000}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    showCount
                  />
                </label>
                {status === 'DUPLICATE' && (
                  <label className="mt-4 block space-y-1">
                    <Text strong>Ticket gốc</Text>
                    <Input
                      value={duplicateKey}
                      onChange={(event) => setDuplicateKey(event.target.value)}
                      placeholder="MOS-BUG-123 hoặc MOS-FEAT-123"
                    />
                  </label>
                )}
                <div className="mt-4 flex justify-end">
                  <Button type="primary" loading={saving} onClick={() => void save()}>
                    Lưu triage
                  </Button>
                </div>
              </SectionCard>
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
