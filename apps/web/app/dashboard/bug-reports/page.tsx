'use client';

import { useCallback, useEffect, useState } from 'react';
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
  Spin,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd';
import type {
  BugPriority,
  BugReportClarificationFilter,
  BugReportDetail,
  ApproveBugReportImplementationResult,
  ApproveBugReportImplementationDeployResult,
  BugReportCommentCreateResult,
  BugReportRequestType,
  BugReportStatus,
  BugReportSummary,
  ConfirmCloseBugReportRequest,
  CreateBugReportCommentRequest,
  TriageBugReportRequest,
} from '@mos-lab/shared';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import {
  CheckCircle2,
  Bot,
  CircleHelp,
  Gavel,
  Inbox,
  LoaderCircle,
  MessageSquareWarning,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react';
import {
  AdaptiveDrawer,
  AppIcon,
  ResourceListPage,
  SearchField,
  SectionCard,
  STANDARD_PAGE_SIZE_OPTIONS,
} from '../../../components/ui';
import { safeStorage } from '../../../lib/safe-storage';
import { BugReportConversation } from '../../../components/bug-reports/BugReportConversation';
import { BugReportWorkflowModal } from '../../../components/bug-reports/BugReportWorkflowGuide';
import { BugReportNextActorFilter } from './components/BugReportNextActorFilter';
import {
  BugReportFilterEmptyState,
  bugReportFilterControlClassName,
  getActiveBugInboxFilterLabels,
} from './components/BugReportFilterEmptyState';
import { BugReportResolutionTracking } from './components/BugReportResolutionTracking';
import { BugReportMobileCard } from './components/BugReportMobileCard';
import { FeatureRequestDetails } from './components/FeatureRequestDetails';
import { useBugReportInboxColumns } from './components/useBugReportInboxColumns';
import { InboxWorkerLiveBar } from './components/BugReportWorkerActivity';
import {
  AgentProgressTag,
  BugStatusTag,
  CLARIFICATION_FILTER_LABELS,
  ClarificationTag,
  effectiveBugReportAgentProgress,
  formatDate,
  formatElapsed,
  initials,
  NextActionTag,
  parseDuplicateKey,
  PriorityTag,
  ProtectedAttachment,
  RequestTypeTag,
  STATUS_LABELS,
  TRANSITIONS,
} from './bug-report-presenters';
import { useBugReports } from './hooks/useBugReports';
import { useRequestClassifierWorkerHealth } from './hooks/useRequestClassifierWorkerHealth';
const { Text, Paragraph, Title } = Typography;

interface DetailDrawerProps {
  reportId: number | null;
  onClose: () => void;
  getDetail: (id: number) => Promise<BugReportDetail>;
  triage: (id: number, request: TriageBugReportRequest) => Promise<BugReportDetail>;
  approveImplementation: (id: number) => Promise<ApproveBugReportImplementationResult>;
  approveImplementationCommit: (id: number) => Promise<{ reportId: number; commitQueued: boolean }>;
  approveImplementationDeploy: (id: number) => Promise<ApproveBugReportImplementationDeployResult>;
  retryImplementation: (id: number) => Promise<ApproveBugReportImplementationResult>;
  confirmClose: (id: number, request: ConfirmCloseBugReportRequest) => Promise<BugReportDetail>;
  comment: (id: number, request: CreateBugReportCommentRequest) => Promise<BugReportCommentCreateResult>;
  canTriage: boolean;
}

function DetailDrawer({
  reportId,
  onClose,
  getDetail,
  triage,
  approveImplementation,
  approveImplementationCommit,
  approveImplementationDeploy,
  retryImplementation,
  confirmClose,
  comment,
  canTriage,
}: DetailDrawerProps) {
  const { token } = theme.useToken();
  const [messageApi, messageContext] = message.useMessage();
  const [detail, setDetail] = useState<BugReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<BugReportStatus>('NEW');
  const [priority, setPriority] = useState<BugPriority | null>(null);
  const [businessContext, setBusinessContext] = useState('');
  const [note, setNote] = useState('');
  const [duplicateKey, setDuplicateKey] = useState('');

  const hydrateForm = useCallback((report: BugReportDetail) => {
    setDetail(report);
    setStatus(report.status);
    setPriority(report.priority);
    setBusinessContext(report.businessContext || '');
    setNote(report.triageNote || '');
    setDuplicateKey(report.duplicateOfKey || '');
  }, []);

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setLoadError(null);
    try {
      hydrateForm(await getDetail(reportId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải chi tiết ticket.');
    } finally {
      setLoading(false);
    }
  }, [getDetail, hydrateForm, reportId]);

  useEffect(() => {
    if (reportId) void load();
    else setDetail(null);
  }, [load, reportId]);

  const save = useCallback(
    async (override?: Partial<TriageBugReportRequest>) => {
      if (!detail) return;
      const nextStatus = override?.status ?? status;
      const duplicateOfId = nextStatus === 'DUPLICATE' ? parseDuplicateKey(duplicateKey) : undefined;
      if (nextStatus === 'DUPLICATE' && !duplicateOfId) {
        messageApi.error('Nhập ticket gốc theo dạng MOS-BUG-123 hoặc MOS-FEAT-123.');
        return;
      }
      setSaving(true);
      try {
        const updated = await triage(detail.id, {
          status: nextStatus,
          priority: override?.priority === undefined ? priority : override.priority,
          businessContext,
          note,
          duplicateOfId,
        });
        hydrateForm(updated);
        messageApi.success(
          nextStatus === 'APPROVED' && detail.status === 'NEW'
            ? detail.requestType === 'FEATURE'
              ? 'Đã duyệt yêu cầu vào hàng triển khai.'
              : 'Đã approve ticket cho Agent.'
            : 'Đã cập nhật ticket.'
        );
      } catch (error) {
        const responseMessage =
          error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể cập nhật ticket.'));
      } finally {
        setSaving(false);
      }
    },
    [businessContext, detail, duplicateKey, hydrateForm, messageApi, note, priority, status, triage]
  );

  const confirmResolvedAndClose = useCallback(async () => {
    if (!detail) return;
    if (note.trim().length < 10) {
      messageApi.error('Ghi ít nhất 10 ký tự về bằng chứng hoặc lý do đóng ngoại lệ.');
      return;
    }
    setSaving(true);
    try {
      const updated = await confirmClose(detail.id, {
        businessContext,
        note: note.trim(),
      });
      hydrateForm(updated);
      messageApi.success('Đã xác nhận sửa đúng và đóng ticket.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể đóng ticket.'));
    } finally {
      setSaving(false);
    }
  }, [businessContext, confirmClose, detail, hydrateForm, messageApi, note]);

  const approveCodeExecution = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await approveImplementation(detail.id);
      if (outcome.implementationQueued) {
        setStatus('IN_PROGRESS');
        setDetail((current) => (current ? { ...current, status: 'IN_PROGRESS' } : current));
      }
      // The rich ticket refresh is non-blocking. The durable receipt above is
      // enough to stop the button spinner even if a later read is slow.
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success(
        outcome.implementationQueued
          ? 'Đã tạo job code/test trong worktree riêng.'
          : outcome.planRequested
            ? 'Đã lưu duyệt; worker đang làm mới plan native trước khi chạy code.'
            : 'Đã lưu duyệt implementation.'
      );
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể duyệt implementation.'));
    } finally {
      setSaving(false);
    }
  }, [approveImplementation, detail, getDetail, hydrateForm, messageApi]);

  const retryCodeExecution = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await retryImplementation(detail.id);
      if (outcome.implementationQueued) {
        setStatus('IN_PROGRESS');
        setDetail((current) => (current ? { ...current, status: 'IN_PROGRESS' } : current));
      }
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success('Đã tạo đúng một retry liên kết trong worktree mới.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể retry implementation.'));
    } finally {
      setSaving(false);
    }
  }, [detail, getDetail, hydrateForm, messageApi, retryImplementation]);

  const approveCommit = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await approveImplementationCommit(detail.id);
      if (!outcome.commitQueued) throw new Error('Checkpoint commit đã thay đổi. Vui lòng tải lại ticket.');
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success('Đã duyệt commit. Worker Mac chỉ commit bản diff đã review, rồi dừng chờ deploy.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể duyệt commit.'));
    } finally {
      setSaving(false);
    }
  }, [approveImplementationCommit, detail, getDetail, hydrateForm, messageApi]);

  const approveDeploy = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await approveImplementationDeploy(detail.id);
      if (!outcome.deploymentQueued) throw new Error('Checkpoint deploy đã thay đổi. Vui lòng tải lại ticket.');
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success(
        'Đã duyệt deploy. Worker Mac sẽ merge, push, chạy pipeline production và tự xác minh release.'
      );
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể duyệt deploy.'));
    } finally {
      setSaving(false);
    }
  }, [approveImplementationDeploy, detail, getDetail, hydrateForm, messageApi]);

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
                detail.priority &&
                detail.clarification.status === 'READY' && (
                  <Popconfirm
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
              {canTriage &&
                detail.agentProgress.stage === 'IMPLEMENTATION_FAILED' &&
                detail.priority &&
                detail.clarification.status === 'READY' && (
                  <Popconfirm
                    title="Tạo đúng một retry sạch?"
                    description="Lượt cũ được giữ nguyên để review. Retry tạo job và worktree mới, chỉ chạy code/test rồi dừng trước commit, push, merge, deploy và migration."
                    okText="Tạo retry"
                    cancelText="Chưa retry"
                    onConfirm={() => void retryCodeExecution()}
                  >
                    <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
                      Tạo retry sạch
                    </Button>
                  </Popconfirm>
                )}
              {canTriage && detail.agentProgress.stage === 'AWAITING_DANNY_COMMIT_REVIEW' && (
                <Popconfirm
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
              )}
              {canTriage && detail.agentProgress.stage === 'AWAITING_DANNY_DEPLOY_APPROVAL' && (
                <Popconfirm
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
        {loading && (
          <div className="flex min-h-64 items-center justify-center">
            <Spin />
          </div>
        )}
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
              <Paragraph style={{ fontSize: 16, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
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
                          <pre
                            className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs"
                            style={{ color: token.colorTextSecondary }}
                          >
                            {item.stack}
                          </pre>
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
    </>
  );
}

export default function BugReportsPage() {
  const { token } = theme.useToken();
  const inbox = useBugReports();
  const workerHealth = useRequestClassifierWorkerHealth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [canTriage, setCanTriage] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(safeStorage.getItem('mos_user') || '{}') as {
        role?: string;
        username?: string | null;
        email?: string | null;
      };
      setCanTriage(isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user));
    } catch {
      setCanTriage(false);
    }
  }, []);

  const columns = useBugReportInboxColumns(setSelectedId);

  const appliedFilterLabels = getActiveBugInboxFilterLabels(inbox.filters);
  const activeFilterCount = appliedFilterLabels.length;
  const isEmptyBecauseOfFilters = !inbox.loading && inbox.total === 0 && activeFilterCount > 0;
  const emptyInboxMessage = isEmptyBecauseOfFilters ? (
    <BugReportFilterEmptyState labels={appliedFilterLabels} onClear={inbox.clearFilters} />
  ) : (
    'Chưa có yêu cầu trong mOS Inbox.'
  );

  return (
    <>
      <ResourceListPage<BugReportSummary>
        title="mOS Inbox"
        subtitle="AI làm rõ với người yêu cầu; Danny quyết định cuối cùng trước khi lỗi hoặc chức năng được đưa vào hàng triển khai."
        icon={<AppIcon icon={MessageSquareWarning} size="lg" />}
        headerActions={
          <Tooltip title="Xem workflow xử lý yêu cầu">
            <Button
              type="text"
              aria-label="Xem workflow xử lý yêu cầu"
              icon={<AppIcon icon={CircleHelp} size="sm" />}
              onClick={() => setWorkflowOpen(true)}
            />
          </Tooltip>
        }
        toolbar={{
          className: 'mos-inbox-toolbar',
          primary: (
            <SearchField
              behavior="filter"
              value={inbox.filters.search}
              onChange={(event) => inbox.setFilters({ search: event.target.value })}
              placeholder="Tìm mã, nội dung, nhân viên hoặc trang…"
              allowClear
              className={bugReportFilterControlClassName(Boolean(inbox.filters.search.trim()))}
              style={{ width: 'min(100%, 420px)' }}
            />
          ),
          filters: (
            <Space wrap>
              <Select
                value={inbox.filters.requestType}
                onChange={(value: BugReportRequestType | 'ALL') => inbox.setFilters({ requestType: value })}
                className={bugReportFilterControlClassName(inbox.filters.requestType !== 'ALL', 'min-w-[165px]')}
                aria-label="Lọc loại yêu cầu"
                options={[
                  { value: 'ALL', label: 'Mọi loại yêu cầu' },
                  { value: 'FEATURE', label: 'Yêu cầu chức năng' },
                  { value: 'BUG', label: 'Báo lỗi' },
                ]}
              />
              <BugReportNextActorFilter
                value={inbox.filters.nextActor}
                onChange={(nextActor) => inbox.setFilters({ nextActor })}
                className={bugReportFilterControlClassName(inbox.filters.nextActor !== 'ALL')}
              />
              <Select
                value={inbox.filters.status}
                onChange={(value) => inbox.setFilters({ status: value })}
                className={bugReportFilterControlClassName(inbox.filters.status !== 'ALL')}
                style={{ minWidth: 150 }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <Select
                value={inbox.filters.priority}
                onChange={(value) => inbox.setFilters({ priority: value })}
                className={bugReportFilterControlClassName(inbox.filters.priority !== 'ALL')}
                style={{ minWidth: 130 }}
                options={[
                  { value: 'ALL', label: 'Mọi priority' },
                  ...(['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((value) => ({ value, label: value })),
                ]}
              />
              <Select
                value={inbox.filters.clarification}
                onChange={(value) => inbox.setFilters({ clarification: value })}
                className={bugReportFilterControlClassName(inbox.filters.clarification !== 'ALL')}
                style={{ minWidth: 170 }}
                options={(Object.entries(CLARIFICATION_FILTER_LABELS) as [BugReportClarificationFilter, string][]).map(
                  ([value, label]) => ({ value, label })
                )}
              />
            </Space>
          ),
          actions: (
            <Button
              aria-label="Tải lại mOS Inbox"
              icon={<AppIcon icon={RefreshCw} size="sm" />}
              loading={inbox.loading}
              onClick={() => void inbox.refresh()}
            >
              Tải lại
            </Button>
          ),
          activeFilterCount,
          filterTitle: 'Lọc mOS Inbox',
        }}
        metrics={{
          columns: 6,
          className: 'bug-report-metric-grid',
          items: [
            {
              key: 'open',
              title: 'Đang mở',
              value: inbox.summary.openCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Đang làm ${inbox.summary.inProgressCount} · Chờ nghiệm thu ${inbox.summary.fixedCount}`,
              icon: <AppIcon icon={Inbox} size="md" />,
              iconBgColor: token.colorInfoBg,
            },
            {
              key: 'reporter-action',
              title: 'Người báo cần làm',
              value: inbox.summary.reporterActionCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Bổ sung ${inbox.summary.reporterClarificationCount} · Nghiệm thu ${inbox.summary.reporterReviewCount}`,
              icon: <AppIcon icon={UserRound} size="md" />,
              iconBgColor: token.colorWarningBg,
            },
            {
              key: 'danny-action',
              title: 'Danny cần quyết định',
              value: inbox.summary.dannyActionCount,
              format: 'number',
              loading: inbox.loading,
              subValue: 'Ticket đã đủ rõ, chờ priority và quyết định',
              icon: <AppIcon icon={Gavel} size="md" />,
              iconBgColor: token.colorWarningBg,
            },
            {
              key: 'agent-action',
              title: 'Agent cần xử lý',
              value: inbox.summary.agentActionCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Làm rõ ${inbox.summary.agentClarificationCount} · Triển khai ${inbox.summary.agentDeliveryCount}`,
              icon: <AppIcon icon={Bot} size="md" />,
              iconBgColor: token.colorInfoBg,
            },
            {
              key: 'in-progress',
              title: 'Đang thực hiện',
              value: inbox.summary.inProgressCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={LoaderCircle} size="md" />,
              iconBgColor: token.colorPrimaryBg,
            },
            {
              key: 'closed',
              title: 'Đã hoàn tất',
              value: inbox.summary.closedCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={CheckCircle2} size="md" />,
              iconBgColor: token.colorSuccessBg,
            },
          ],
        }}
        tableSection={{
          title: `Danh sách · ${inbox.total.toLocaleString('vi-VN')} yêu cầu`,
          state: inbox.error ? 'error' : undefined,
          stateTitle: 'Không thể tải mOS Inbox',
          stateDescription: inbox.error,
          stateExtra: (
            <Button icon={<AppIcon icon={RefreshCw} size="sm" />} onClick={() => void inbox.refresh()}>
              Thử lại
            </Button>
          ),
        }}
        table={{
          rowKey: 'id',
          columns,
          dataSource: inbox.data,
          loading: inbox.loading,
          stickyPrimaryColumn: true,
          columnPriority: {
            ticket: 'primary',
            sourcePath: 'secondary',
            status: 'secondary',
            attachmentCount: 'tertiary',
            workerActivity: 'secondary',
            agentProgress: 'secondary',
            action: 'primary',
          },
          scroll: { x: 1220 },
          onRow: (row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } }),
          pagination: {
            current: inbox.pagination.page,
            pageSize: inbox.pagination.pageSize,
            total: inbox.total,
            showSizeChanger: true,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            showTotal: (total, range) => `${range[0]}–${range[1]} / ${total} yêu cầu`,
            onChange: (page, pageSize) => inbox.setPagination({ page, pageSize }),
          },
          mobileRecordKey: (row) => row.id,
          mobileEmptyDescription: emptyInboxMessage,
          mobileRenderer: (row) => <BugReportMobileCard report={row} onOpen={setSelectedId} />,
          locale: { emptyText: emptyInboxMessage },
        }}
      >
        <InboxWorkerLiveBar
          reports={inbox.data}
          liveWorker={inbox.summary.liveWorker}
          onOpen={setSelectedId}
          health={workerHealth.health}
          loading={workerHealth.loading}
          error={workerHealth.error}
          onRefresh={() => void workerHealth.refresh()}
        />
      </ResourceListPage>
      <BugReportWorkflowModal open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
      <DetailDrawer
        reportId={selectedId}
        onClose={() => setSelectedId(null)}
        getDetail={inbox.getDetail}
        triage={inbox.triage}
        approveImplementation={inbox.approveImplementation}
        approveImplementationCommit={inbox.approveImplementationCommit}
        approveImplementationDeploy={inbox.approveImplementationDeploy}
        retryImplementation={inbox.retryImplementation}
        confirmClose={inbox.confirmClose}
        comment={inbox.comment}
        canTriage={canTriage}
      />
    </>
  );
}
