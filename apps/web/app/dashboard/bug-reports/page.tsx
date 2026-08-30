'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Dropdown,
  Image,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Spin,
  Typography,
  message,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  BugPriority,
  BugReportAttachment,
  BugReportDetail,
  BugReportStatus,
  BugReportSummary,
  ConfirmCloseBugReportRequest,
  TriageBugReportRequest,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import {
  CheckCircle2,
  Clipboard,
  Clock3,
  ExternalLink,
  Inbox,
  LoaderCircle,
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
  StatusTag,
} from '../../../components/ui';
import { apiClient } from '../../../lib/api-client';
import { useBugReports } from './hooks/useBugReports';

const { Text, Paragraph, Title } = Typography;

const STATUS_LABELS: Record<BugReportStatus, string> = {
  NEW: 'Mới',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang sửa',
  FIXED: 'Đã sửa',
  CLOSED: 'Đã đóng',
  REJECTED: 'Từ chối',
  DUPLICATE: 'Trùng lặp',
};

const STATUS_TONES: Record<BugReportStatus, Parameters<typeof StatusTag>[0]['status']> = {
  NEW: 'warning',
  APPROVED: 'processing',
  IN_PROGRESS: 'cyan',
  FIXED: 'success',
  CLOSED: 'default',
  REJECTED: 'error',
  DUPLICATE: 'purple',
};

const PRIORITY_TONES: Record<BugPriority, Parameters<typeof StatusTag>[0]['status']> = {
  P0: 'error',
  P1: 'orange',
  P2: 'warning',
  P3: 'default',
};

const TRANSITIONS: Record<BugReportStatus, BugReportStatus[]> = {
  NEW: ['NEW', 'APPROVED', 'REJECTED', 'DUPLICATE'],
  APPROVED: ['APPROVED', 'IN_PROGRESS', 'REJECTED', 'DUPLICATE'],
  IN_PROGRESS: ['IN_PROGRESS', 'APPROVED', 'FIXED'],
  FIXED: ['FIXED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
  REJECTED: ['REJECTED', 'NEW'],
  DUPLICATE: ['DUPLICATE', 'NEW'],
};

function formatDate(value: string | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function parseDuplicateKey(value: string): number | null {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^(?:MOS-BUG-)?(\d+)$/);
  return match ? Number(match[1]) : null;
}

function BugStatusTag({ status }: { status: BugReportStatus }) {
  return <StatusTag status={STATUS_TONES[status]} label={STATUS_LABELS[status]} />;
}

function PriorityTag({ priority }: { priority: BugPriority | null }) {
  return priority ? (
    <StatusTag status={PRIORITY_TONES[priority]} label={priority} />
  ) : (
    <Text type="secondary">Chưa đặt</Text>
  );
}

function ProtectedAttachment({ reportId, attachment }: { reportId: number; attachment: BugReportAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    void apiClient.bugReports
      .attachment(reportId, attachment.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, reportId]);

  if (failed) return <Alert type="warning" showIcon message={`Không tải được ${attachment.fileName}`} />;
  if (!url) return <Spin size="small" />;

  return (
    <div className="space-y-2">
      <Image
        src={url}
        alt={`Ảnh đính kèm ${attachment.fileName}`}
        style={{ maxHeight: 240, objectFit: 'contain', borderRadius: 8 }}
      />
      <div className="flex items-center justify-between gap-2">
        <Text ellipsis title={attachment.fileName}>
          {attachment.fileName}
        </Text>
        <Button
          type="link"
          size="small"
          icon={<AppIcon icon={ExternalLink} size="sm" />}
          href={url}
          download={attachment.fileName}
        >
          Tải ảnh
        </Button>
      </div>
    </div>
  );
}

interface DetailDrawerProps {
  reportId: number | null;
  onClose: () => void;
  getDetail: (id: number) => Promise<BugReportDetail>;
  triage: (id: number, request: TriageBugReportRequest) => Promise<BugReportDetail>;
  confirmClose: (id: number, request: ConfirmCloseBugReportRequest) => Promise<BugReportDetail>;
}

function DetailDrawer({ reportId, onClose, getDetail, triage, confirmClose }: DetailDrawerProps) {
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
        messageApi.error('Nhập ticket gốc theo dạng MOS-BUG-123.');
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
          nextStatus === 'APPROVED' && detail.status === 'NEW' ? 'Đã approve ticket cho Agent.' : 'Đã cập nhật ticket.'
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
    label: `Approve ${item}`,
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
        title={detail ? `${detail.key} · ${detail.title}` : 'Chi tiết báo lỗi'}
        extra={
          detail ? (
            <Space wrap>
              {detail.status === 'NEW' && (
                <Dropdown menu={{ items: approvalItems }} trigger={['click']}>
                  <Button type="primary" loading={saving} icon={<AppIcon icon={Send} size="sm" />}>
                    Approve
                  </Button>
                </Dropdown>
              )}
              {['APPROVED', 'IN_PROGRESS', 'FIXED'].includes(detail.status) && (
                <Popconfirm
                  title="Xác nhận bug đã được sửa đúng?"
                  description="mOS sẽ ghi đủ audit Đang sửa → Đã sửa → Đã đóng cho các bước còn thiếu."
                  okText="Xác nhận & đóng"
                  cancelText="Kiểm tra lại"
                  onConfirm={() => void confirmResolvedAndClose()}
                >
                  <Button type="primary" loading={saving} icon={<AppIcon icon={CheckCircle2} size="sm" />}>
                    Xác nhận đã sửa & đóng
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <BugStatusTag status={detail.status} />
                <PriorityTag priority={detail.priority} />
                <Text type="secondary">{formatDate(detail.createdAt)}</Text>
              </div>
              <Paragraph style={{ fontSize: 16, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                {detail.description}
              </Paragraph>
              <Text type="secondary">
                Báo bởi {detail.reporter.displayName} · {detail.reporter.role}
              </Text>
            </section>

            {detail.attachments.length > 0 && (
              <SectionCard title={`Ảnh đính kèm (${detail.attachments.length})`}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {detail.attachments
                    .filter((item) => !item.deletedAt)
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

            <SectionCard title="Danny triage">
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
                    options={(['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((item) => ({ value: item, label: item }))}
                    getPopupContainer={(node) => node.parentElement || document.body}
                    className="w-full"
                  />
                </label>
              </div>
              <label className="mt-4 block space-y-1">
                <Text strong>Biz logic / kết quả đúng</Text>
                <Input.TextArea
                  value={businessContext}
                  onChange={(event) => setBusinessContext(event.target.value)}
                  placeholder="Bổ sung điều Agent cần hiểu về nghiệp vụ hoặc kết quả đúng mong muốn"
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
                    placeholder="MOS-BUG-123"
                  />
                </label>
              )}
              <div className="mt-4 flex justify-end">
                <Button type="primary" loading={saving} onClick={() => void save()}>
                  Lưu triage
                </Button>
              </div>
            </SectionCard>

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

  const columns = useMemo<ColumnsType<BugReportSummary>>(
    () => [
      {
        title: 'Ticket',
        key: 'ticket',
        width: 320,
        render: (_, row) => (
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Text strong>{row.key}</Text>
              <PriorityTag priority={row.priority} />
            </div>
            <Text ellipsis={{ tooltip: row.description }}>{row.description}</Text>
            <div className="mt-1">
              <Text type="secondary">{row.reporter.displayName}</Text>
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
        title: 'Thời gian',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 150,
        render: (value: string) => formatDate(value),
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

  const activeFilterCount = Number(inbox.filters.status !== 'ALL') + Number(inbox.filters.priority !== 'ALL');

  return (
    <>
      <ResourceListPage<BugReportSummary>
        title="Bug Inbox"
        subtitle="Danny duyệt, ưu tiên và giao đúng context cho Agent — nhân viên chỉ cần mô tả một câu."
        icon={<AppIcon icon={MessageSquareWarning} size="lg" />}
        toolbar={{
          primary: (
            <SearchField
              behavior="filter"
              value={inbox.filters.search}
              onChange={(event) => inbox.setFilters({ search: event.target.value })}
              placeholder="Tìm mã lỗi, nội dung, nhân viên hoặc trang…"
              allowClear
              style={{ width: 'min(100%, 420px)' }}
            />
          ),
          filters: (
            <Space wrap>
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
            </Space>
          ),
          actions: (
            <Button
              aria-label="Tải lại Bug Inbox"
              icon={<AppIcon icon={RefreshCw} size="sm" />}
              loading={inbox.loading}
              onClick={() => void inbox.refresh()}
            >
              Tải lại
            </Button>
          ),
          activeFilterCount,
          filterTitle: 'Lọc Bug Inbox',
        }}
        metrics={{
          columns: 4,
          items: [
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
              title: 'Chờ xác nhận đóng',
              value: inbox.summary.fixedCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={CheckCircle2} size="md" />,
              iconBgColor: token.colorSuccessBg,
            },
          ],
        }}
        tableSection={{
          title: `Danh sách · ${inbox.total.toLocaleString('vi-VN')} ticket`,
          state: inbox.error ? 'error' : undefined,
          stateTitle: 'Không thể tải Bug Inbox',
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
            createdAt: 'tertiary',
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
            showTotal: (total, range) => `${range[0]}–${range[1]} / ${total} ticket`,
            onChange: (page, pageSize) => inbox.setPagination({ page, pageSize }),
          },
          mobileRecordKey: (row) => row.id,
          mobileEmptyDescription: 'Chưa có ticket phù hợp bộ lọc.',
          mobileRenderer: (row) => (
            <button type="button" className="w-full text-left" onClick={() => setSelectedId(row.id)}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Text strong>{row.key}</Text>
                <div className="flex items-center gap-2">
                  <PriorityTag priority={row.priority} />
                  <BugStatusTag status={row.status} />
                </div>
              </div>
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                {row.description}
              </Paragraph>
              <div className="flex items-center justify-between gap-2">
                <Text type="secondary" ellipsis>
                  {row.reporter.displayName} · {row.sourcePath}
                </Text>
                <Text type="secondary" className="shrink-0">
                  <AppIcon icon={Clock3} size="sm" /> {formatDate(row.createdAt)}
                </Text>
              </div>
            </button>
          ),
        }}
      />
      <DetailDrawer
        reportId={selectedId}
        onClose={() => setSelectedId(null)}
        getDetail={inbox.getDetail}
        triage={inbox.triage}
        confirmClose={inbox.confirmClose}
      />
    </>
  );
}
