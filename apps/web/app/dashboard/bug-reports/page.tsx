'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { ColumnsType } from 'antd/es/table';
import type {
  BugPriority,
  BugReportClarificationFilter,
  BugReportDetail,
  BugReportCommentCreateResult,
  BugReportRequestType,
  BugReportStatus,
  BugReportSummary,
  ConfirmCloseBugReportRequest,
  CreateBugReportCommentRequest,
  TriageBugReportRequest,
} from '@mos-lab/shared';
import { isAdminOrSuperAdminRole, isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import {
  CheckCircle2,
  CircleHelp,
  Clipboard,
  Clock3,
  ExternalLink,
  Inbox,
  Lightbulb,
  LoaderCircle,
  MessageCircleQuestion,
  MessageSquareWarning,
  RefreshCw,
  Send,
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
import { BugReportResolutionTracking } from './components/BugReportResolutionTracking';
import { FeatureRequestDetails } from './components/FeatureRequestDetails';
import {
  AgentProgressTag,
  BugStatusTag,
  CLARIFICATION_FILTER_LABELS,
  ClarificationTag,
  formatDate,
  formatElapsed,
  formatProgressUpdated,
  initials,
  parseDuplicateKey,
  PriorityTag,
  ProtectedAttachment,
  RequestTypeTag,
  STATUS_LABELS,
  TRANSITIONS,
} from './bug-report-presenters';
import { useBugReports } from './hooks/useBugReports';
const { Text, Paragraph, Title } = Typography;

interface DetailDrawerProps {
  reportId: number | null;
  onClose: () => void;
  getDetail: (id: number) => Promise<BugReportDetail>;
  triage: (id: number, request: TriageBugReportRequest) => Promise<BugReportDetail>;
  confirmClose: (id: number, request: ConfirmCloseBugReportRequest) => Promise<BugReportDetail>;
  comment: (id: number, request: CreateBugReportCommentRequest) => Promise<BugReportCommentCreateResult>;
  canTriage: boolean;
  canOverride: boolean;
}

function DetailDrawer({
  reportId,
  onClose,
  getDetail,
  triage,
  confirmClose,
  comment,
  canTriage,
  canOverride,
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

  const copyAgentCommand = useCallback(async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(`pnpm bug:agent ${detail.key}`);
      messageApi.success('Đã copy lệnh Agent.');
    } catch {
      messageApi.error('Không thể copy tự động.');
    }
  }, [detail, messageApi]);

  const confirmResolvedAndClose = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await confirmClose(detail.id, {
        businessContext,
        note: note.trim() || 'Danny xác nhận đã sửa đúng và đóng ticket.',
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
              {canOverride && ['APPROVED', 'IN_PROGRESS', 'FIXED'].includes(detail.status) && (
                <Popconfirm
                  title="Admin override và đóng ticket?"
                  description="Dùng khi Admin đã tự kiểm tra; mOS vẫn lưu đầy đủ audit cho người báo."
                  okText="Override & đóng"
                  cancelText="Kiểm tra lại"
                  onConfirm={() => void confirmResolvedAndClose()}
                >
                  <Button type="primary" loading={saving} icon={<AppIcon icon={CheckCircle2} size="sm" />}>
                    Admin override đóng
                  </Button>
                </Popconfirm>
              )}
              {['APPROVED', 'IN_PROGRESS', 'FIXED'].includes(detail.status) && (
                <Button icon={<AppIcon icon={Clipboard} size="sm" />} onClick={() => void copyAgentCommand()}>
                  Copy lệnh Agent
                </Button>
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
                  <BugStatusTag status={detail.status} />
                  <RequestTypeTag requestType={detail.requestType} />
                  <PriorityTag priority={detail.priority} />
                  <ClarificationTag status={detail.clarification.status} />
                  <AgentProgressTag progress={detail.agentProgress} />
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

            {detail.featureRequest ? <FeatureRequestDetails featureRequest={detail.featureRequest} /> : null}

            <SectionCard title={`Trao đổi & làm rõ (${detail.comments.length})`}>
              <BugReportConversation
                reportId={detail.id}
                requestType={detail.requestType}
                status={detail.status}
                clarification={detail.clarification}
                comments={detail.comments}
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
                    placeholder="Bắt buộc khi Fixed, Rejected hoặc mở lại ticket đã đóng"
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [canTriage, setCanTriage] = useState(false);
  const [canOverride, setCanOverride] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(safeStorage.getItem('mos_user') || '{}') as {
        role?: string;
        username?: string | null;
        email?: string | null;
      };
      setCanTriage(isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user));
      setCanOverride(isAdminOrSuperAdminRole(user.role));
    } catch {
      setCanTriage(false);
      setCanOverride(false);
    }
  }, []);

  const columns = useMemo<ColumnsType<BugReportSummary>>(
    () => [
      {
        title: 'Ticket',
        key: 'ticket',
        width: 320,
        render: (_, row) => (
          <div className="flex min-w-0 items-start gap-3">
            <Avatar size={36} src={row.reporter.avatarUrl || undefined}>
              {initials(row.reporter.displayName)}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Text strong>{row.key}</Text>
                <RequestTypeTag requestType={row.requestType} />
                <PriorityTag priority={row.priority} />
                <ClarificationTag status={row.clarification.status} />
              </div>
              <Text ellipsis={{ tooltip: row.description }}>{row.description}</Text>
              <div className="mt-1">
                <Text type="secondary">{row.reporter.displayName}</Text>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Vị trí',
        dataIndex: 'sourcePath',
        key: 'sourcePath',
        width: 230,
        render: (value: string, row) => (
          <div>
            <Text code>{value}</Text>
            {row.overlay && (
              <div className="mt-1">
                <Text type="secondary">{row.overlay}</Text>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value: BugReportStatus) => <BugStatusTag status={value} />,
      },
      {
        title: 'Ảnh',
        dataIndex: 'attachmentCount',
        key: 'attachmentCount',
        width: 72,
        align: 'center',
        render: (value: number) => <span className="tabular-nums">{value}</span>,
      },
      {
        title: 'AI Agent',
        key: 'agentProgress',
        width: 250,
        render: (_, row) => (
          <div className="min-w-0 space-y-1.5 text-xs">
            <AgentProgressTag progress={row.agentProgress} />
            <div>
              <Text type="secondary" className="tabular-nums">
                {formatProgressUpdated(row.agentProgress.updatedAt)}
              </Text>
            </div>
            {row.agentProgress.note ? (
              <Text type="secondary" ellipsis={{ tooltip: row.agentProgress.note }}>
                {row.agentProgress.note}
              </Text>
            ) : null}
          </div>
        ),
      },
      {
        title: '',
        key: 'action',
        width: 70,
        fixed: 'right',
        render: (_, row) => (
          <Button
            type="text"
            aria-label={`Mở ${row.key}`}
            icon={<AppIcon icon={ExternalLink} size="sm" />}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedId(row.id);
            }}
          />
        ),
      },
    ],
    []
  );

  const activeFilterCount =
    Number(inbox.filters.requestType !== 'ALL') +
    Number(inbox.filters.status !== 'ALL') +
    Number(inbox.filters.priority !== 'ALL') +
    Number(inbox.filters.clarification !== 'ALL');

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
          primary: (
            <SearchField
              behavior="filter"
              value={inbox.filters.search}
              onChange={(event) => inbox.setFilters({ search: event.target.value })}
              placeholder="Tìm mã, nội dung, nhân viên hoặc trang…"
              allowClear
              style={{ width: 'min(100%, 420px)' }}
            />
          ),
          filters: (
            <Space wrap>
              <Select
                value={inbox.filters.requestType}
                onChange={(value: BugReportRequestType | 'ALL') => inbox.setFilters({ requestType: value })}
                className="min-w-[165px]"
                aria-label="Lọc loại yêu cầu"
                options={[
                  { value: 'ALL', label: 'Mọi loại yêu cầu' },
                  { value: 'FEATURE', label: 'Yêu cầu chức năng' },
                  { value: 'BUG', label: 'Báo lỗi' },
                ]}
              />
              <Select
                value={inbox.filters.status}
                onChange={(value) => inbox.setFilters({ status: value })}
                style={{ minWidth: 150 }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <Select
                value={inbox.filters.priority}
                onChange={(value) => inbox.setFilters({ priority: value })}
                style={{ minWidth: 130 }}
                options={[
                  { value: 'ALL', label: 'Mọi priority' },
                  ...(['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((value) => ({ value, label: value })),
                ]}
              />
              <Select
                value={inbox.filters.clarification}
                onChange={(value) => inbox.setFilters({ clarification: value })}
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
          items: [
            {
              key: 'feature',
              title: 'Yêu cầu chức năng',
              value: inbox.summary.featureCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Báo lỗi ${inbox.summary.bugCount}`,
              icon: <AppIcon icon={Lightbulb} size="md" />,
              iconBgColor: token.colorInfoBg,
            },
            {
              key: 'unclear',
              title: 'Chờ làm rõ',
              value: inbox.summary.unclearCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Agent ${inbox.summary.pendingAgentCount} · Người báo ${inbox.summary.waitingReporterCount}`,
              icon: <AppIcon icon={MessageCircleQuestion} size="md" />,
              iconBgColor: token.colorWarningBg,
            },
            {
              key: 'new',
              title: 'Chờ Danny duyệt',
              value: inbox.summary.newCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={Inbox} size="md" />,
              iconBgColor: token.colorWarningBg,
            },
            {
              key: 'approved',
              title: 'Agent queue',
              value: inbox.summary.approvedCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={Send} size="md" />,
              iconBgColor: token.colorInfoBg,
            },
            {
              key: 'in-progress',
              title: 'Đang sửa',
              value: inbox.summary.inProgressCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={LoaderCircle} size="md" />,
              iconBgColor: token.colorPrimaryBg,
            },
            {
              key: 'fixed',
              title: 'Chờ nghiệm thu',
              value: inbox.summary.fixedCount,
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
            agentProgress: 'secondary',
            action: 'primary',
          },
          scroll: { x: 980 },
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
          mobileEmptyDescription: 'Chưa có yêu cầu phù hợp bộ lọc.',
          mobileRenderer: (row) => (
            <button type="button" className="w-full text-left" onClick={() => setSelectedId(row.id)}>
              <div className="mb-3 flex items-start gap-3">
                <Avatar size={36} src={row.reporter.avatarUrl || undefined}>
                  {initials(row.reporter.displayName)}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Text strong>{row.key}</Text>
                    <div className="flex items-center gap-2">
                      <RequestTypeTag requestType={row.requestType} />
                      <PriorityTag priority={row.priority} />
                      <BugStatusTag status={row.status} />
                    </div>
                  </div>
                  <ClarificationTag status={row.clarification.status} />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AgentProgressTag progress={row.agentProgress} />
                    <Text type="secondary" className="tabular-nums text-xs">
                      {formatProgressUpdated(row.agentProgress.updatedAt)}
                    </Text>
                  </div>
                  <Text type="secondary">{row.reporter.displayName}</Text>
                </div>
              </div>
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                {row.description}
              </Paragraph>
              <div className="flex items-center justify-between gap-2">
                <Text type="secondary" ellipsis>
                  {row.sourcePath}
                </Text>
                <Text type="secondary" className="shrink-0">
                  <AppIcon icon={Clock3} size="sm" /> {formatElapsed(row.createdAt)}
                </Text>
              </div>
            </button>
          ),
        }}
      />
      <BugReportWorkflowModal open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
      <DetailDrawer
        reportId={selectedId}
        onClose={() => setSelectedId(null)}
        getDetail={inbox.getDetail}
        triage={inbox.triage}
        confirmClose={inbox.confirmClose}
        comment={inbox.comment}
        canTriage={canTriage}
        canOverride={canOverride}
      />
    </>
  );
}
