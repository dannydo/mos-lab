'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Timeline,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  MousePointerClick,
  PlayCircle,
  RefreshCw,
  Search,
  User,
  Zap,
} from 'lucide-react';
import {
  FRONTEND_ISSUE_STATUSES,
  FRONTEND_ISSUE_TYPES,
  type FrontendIssueListQuery,
  type FrontendIssueListResponse,
  type FrontendIssueMetrics,
  type FrontendIssueRecord,
  type FrontendIssueStatus,
  type FrontendIssueType,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, DataTable } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';

const { Text, Paragraph, Title } = Typography;

function BadgeTag({
  color,
  children,
  className = '',
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  const colorClasses: Record<string, string> = {
    magenta: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800/40',
    volcano:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/40',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40',
    gold: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40',
    purple:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40',
    orange:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/40',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40',
    error: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40',
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const selected = colorClasses[color] || colorClasses.default;
  return (
    <span
      className={`inline-flex items-center justify-center leading-none gap-1 px-2 py-1 rounded text-xs font-medium border ${selected} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_CONFIG: Record<FrontendIssueStatus, { label: string; color: string }> = {
  NEW: { label: 'Mới phát hiện', color: 'error' },
  INVESTIGATING: { label: 'Đang điều tra', color: 'warning' },
  RESOLVED: { label: 'Đã giải quyết', color: 'success' },
  REOPENED: { label: 'Tái phát', color: 'purple' },
  IGNORED: { label: 'Bỏ qua', color: 'default' },
};

const ISSUE_TYPE_CONFIG: Record<FrontendIssueType, { label: string; color: string; icon: typeof Activity }> = {
  RAGE_CLICK: { label: 'Rage Click (Ức chế)', color: 'magenta', icon: MousePointerClick },
  API_FAILURE: { label: 'Lỗi API (5xx/Timeout)', color: 'volcano', icon: AlertOctagon },
  REACT_CRASH: { label: 'Crash Component', color: 'red', icon: Flame },
  SLOW_INTERACTION: { label: 'Đơ / Chậm (>3s)', color: 'gold', icon: Clock },
  UNCAUGHT_EXCEPTION: { label: 'Lỗi JS Runtime', color: 'purple', icon: AlertTriangle },
  BLOCKED_SUBMIT: { label: 'Bị chặn Submit', color: 'orange', icon: AlertTriangle },
};

export function FrontendTelemetryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FrontendIssueRecord[]>([]);
  const [metrics, setMetrics] = useState<FrontendIssueMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FrontendIssueStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<FrontendIssueType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Replay / Detail modal state
  const [activeIssue, setActiveIssue] = useState<FrontendIssueRecord | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusForm] = Form.useForm();
  const [convertingBug, setConvertingBug] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query: FrontendIssueListQuery = {
        page,
        limit: pageSize,
        status: statusFilter,
        issueType: typeFilter,
        search: searchQuery.trim() || undefined,
      };

      const res: FrontendIssueListResponse = await apiClient.frontendTelemetry.list(query);
      setData(res.data);
      setMetrics(res.metrics);
      setTotal(res.total);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể tải dữ liệu telemetry.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    if (open) {
      void fetchData();
    }
  }, [open, fetchData]);

  const handleOpenDetail = (issue: FrontendIssueRecord) => {
    setActiveIssue(issue);
    statusForm.setFieldsValue({
      status: issue.status,
      resolutionNotes: issue.resolutionNotes || '',
    });
    setDetailDrawerOpen(true);
  };

  const handleUpdateStatus = async (values: { status: FrontendIssueStatus; resolutionNotes: string }) => {
    if (!activeIssue) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiClient.frontendTelemetry.updateStatus(activeIssue.id, values);
      message.success(`Đã cập nhật trạng thái sự cố sang: ${STATUS_CONFIG[values.status].label}`);
      setActiveIssue(updated);
      void fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToBugReport = async () => {
    if (!activeIssue) return;
    setConvertingBug(true);
    try {
      const res = await apiClient.frontendTelemetry.convertToBugReport(activeIssue.id);
      message.success(`Đã tạo Bug Report ${res.key} trong mOS Inbox!`);
      setDetailDrawerOpen(false);
      void fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi tạo Bug Report.');
    } finally {
      setConvertingBug(false);
    }
  };

  const columns: ColumnsType<FrontendIssueRecord> = [
    {
      title: 'Loại sự cố',
      key: 'issueType',
      width: 170,
      render: (_, record) => {
        const conf = ISSUE_TYPE_CONFIG[record.issueType] || {
          label: record.issueType,
          color: 'default',
          icon: Activity,
        };
        const IconComponent = conf.icon;
        return (
          <Space direction="vertical" size={2}>
            <BadgeTag color={conf.color}>
              <AppIcon icon={IconComponent} size="sm" />
              {conf.label}
            </BadgeTag>
            <Text type="secondary" className="text-xs">
              Lặp lại:{' '}
              <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{record.occurrenceCount} lần</strong>
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Vị trí & Thông điệp',
      key: 'location',
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">
              {record.path}
            </code>
            {record.target ? (
              <span
                className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]"
                title={record.target}
              >
                ↳ {record.target}
              </span>
            ) : null}
          </div>
          <Paragraph className="!mb-0 text-sm font-medium" ellipsis={{ rows: 2, expandable: false }}>
            {record.message}
          </Paragraph>
          {record.lastUserName ? (
            <Text type="secondary" className="text-xs flex items-center gap-1">
              <AppIcon icon={User} size="sm" /> Gần nhất: {record.lastUserName}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, record) => {
        const conf = STATUS_CONFIG[record.status] || STATUS_CONFIG.NEW;
        return (
          <div className="space-y-1">
            <BadgeTag color={conf.color}>{conf.label}</BadgeTag>
            {record.resolvedByName ? (
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Bởi: {record.resolvedByName}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Thời gian',
      key: 'timing',
      width: 150,
      render: (_, record) => (
        <div className="text-xs space-y-0.5 tabular-nums text-slate-500 dark:text-slate-400">
          <div>Gần nhất: {new Date(record.lastSeenAt).toLocaleTimeString('vi-VN')}</div>
          <div>Ngày: {new Date(record.lastSeenAt).toLocaleDateString('vi-VN')}</div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<AppIcon icon={PlayCircle} size="sm" />}
          onClick={() => handleOpenDetail(record)}
          className="p-0 font-medium"
        >
          Hộp đen
        </Button>
      ),
    },
  ];

  const breadcrumbs = activeIssue?.latestPayload?.breadcrumbs || [];

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        destroyOnHidden
        intent="data"
        title={
          <div className="flex items-center gap-2">
            <AppIcon icon={Zap} size="md" className="text-amber-500" />
            <span>Giám sát Trải nghiệm Frontend & Hộp đen (Telemetry)</span>
          </div>
        }
      >
        <Space direction="vertical" size="large" className="w-full">
          {/* KPI Metrics Cards */}
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
              >
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Đã giải quyết</div>
                <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {metrics?.resolvedCount ?? 0}
                  <span className="text-xs font-normal ml-1.5 opacity-80">({metrics?.resolutionRate ?? 100}%)</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40">
                <div className="text-xs text-red-700 dark:text-red-400 font-medium">Cần xử lý ngay</div>
                <div className="text-2xl font-bold text-red-800 dark:text-red-300 tabular-nums">
                  {metrics?.newCount ?? 0}
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Đang điều tra</div>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                  {metrics?.investigatingCount ?? 0}
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40"
              >
                <div className="text-xs text-purple-700 dark:text-purple-400 font-medium">Tái phát (Reopened)</div>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-300 tabular-nums">
                  {metrics?.reopenedCount ?? 0}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <Input
                prefix={<AppIcon icon={Search} size="sm" />}
                placeholder="Tìm URL, nút bấm, thông điệp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={() => {
                  setPage(1);
                  void fetchData();
                }}
                allowClear
                className="max-w-[240px]"
              />
              <Select
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                className="min-w-[140px]"
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  ...FRONTEND_ISSUE_STATUSES.map((s) => ({ value: s, label: STATUS_CONFIG[s].label })),
                ]}
              />
              <Select
                value={typeFilter}
                onChange={(val) => {
                  setTypeFilter(val);
                  setPage(1);
                }}
                className="min-w-[160px]"
                options={[
                  { value: 'ALL', label: 'Mọi loại sự cố' },
                  ...FRONTEND_ISSUE_TYPES.map((t) => ({ value: t, label: ISSUE_TYPE_CONFIG[t].label })),
                ]}
              />
            </div>
            <Button icon={<AppIcon icon={RefreshCw} size="sm" />} loading={loading} onClick={() => void fetchData()}>
              Làm mới
            </Button>
          </div>

          {/* Data Table */}
          <DataTable<FrontendIssueRecord>
            rowKey="id"
            loading={loading}
            dataSource={data}
            columns={columns}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '25', '50'],
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
            }}
          />
        </Space>
      </AdaptiveDrawer>

      {/* Replay & Detail Drawer */}
      <AdaptiveDrawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        destroyOnHidden
        intent="data"
        title={
          <div className="flex items-center justify-between w-full pr-4">
            <span className="flex items-center gap-2">
              <AppIcon icon={PlayCircle} size="md" className="text-blue-500" />
              <span>Hộp đen Thao tác & Chi tiết Sự cố</span>
            </span>
            {activeIssue ? (
              <BadgeTag color={STATUS_CONFIG[activeIssue.status]?.color || 'default'}>
                {STATUS_CONFIG[activeIssue.status]?.label}
              </BadgeTag>
            ) : null}
          </div>
        }
      >
        {activeIssue ? (
          <div className="space-y-6">
            {/* Overview Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500 font-mono">Định danh lỗi (Fingerprint)</div>
                  <code className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-all">
                    {activeIssue.fingerprint}
                  </code>
                </div>
                <BadgeTag color={ISSUE_TYPE_CONFIG[activeIssue.issueType]?.color || 'default'}>
                  {ISSUE_TYPE_CONFIG[activeIssue.issueType]?.label}
                </BadgeTag>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium">Trang phát sinh</div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono">
                  {activeIssue.path}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium">Nội dung lỗi ghi nhận</div>
                <div className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  {activeIssue.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-500">Lần đầu xuất hiện: </span>
                  <span className="tabular-nums font-medium">
                    {new Date(activeIssue.firstSeenAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Lần gần nhất: </span>
                  <span className="tabular-nums font-medium">
                    {new Date(activeIssue.lastSeenAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Status Update */}
            <Card
              size="small"
              title={
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <AppIcon icon={CheckCircle2} size="sm" /> Xử lý & Phân loại Sự cố
                </span>
              }
              extra={
                <Popconfirm
                  title="Chuyển thành Bug Report chính thức?"
                  description="Sự cố này sẽ được tạo thành một Ticket trong mOS Inbox để AI Worker / Kỹ thuật viên triển khai bản vá."
                  onConfirm={handleConvertToBugReport}
                  okText="Tạo Bug Report"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    size="small"
                    icon={<AppIcon icon={Bug} size="sm" />}
                    loading={convertingBug}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Chuyển sang mOS Bug Inbox
                  </Button>
                </Popconfirm>
              }
            >
              <Form
                form={statusForm}
                layout="vertical"
                onFinish={handleUpdateStatus}
                initialValues={{
                  status: activeIssue.status,
                  resolutionNotes: activeIssue.resolutionNotes || '',
                }}
              >
                <Form.Item name="status" label="Trạng thái xử lý" rules={[{ required: true }]}>
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="NEW">Mới</Radio.Button>
                    <Radio.Button value="INVESTIGATING">Đang điều tra</Radio.Button>
                    <Radio.Button value="RESOLVED" className="!text-emerald-600 font-medium">
                      Đã giải quyết
                    </Radio.Button>
                    <Radio.Button value="IGNORED">Bỏ qua</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  name="resolutionNotes"
                  label="Ghi chú giải pháp (Ví dụ: Đã thêm debounce, đã tối ưu query DB, đã sửa CSS)"
                >
                  <Input.TextArea rows={2} placeholder="Nhập tóm tắt cách xử lý để Danny và team cùng theo dõi..." />
                </Form.Item>

                <div className="flex justify-end">
                  <Button type="primary" htmlType="submit" loading={updatingStatus}>
                    Lưu cập nhật
                  </Button>
                </div>
              </Form>
            </Card>

            {/* Breadcrumbs Flight Recorder Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Title level={5} className="!mb-0 flex items-center gap-2">
                  <AppIcon icon={Activity} size="sm" className="text-blue-500" />
                  Hộp đen 25 thao tác gần nhất của người dùng
                </Title>
                <BadgeTag color="blue" className="tabular-nums">
                  {breadcrumbs.length} sự kiện
                </BadgeTag>
              </div>

              {breadcrumbs.length === 0 ? (
                <Alert type="info" message="Không có bản ghi breadcrumbs chi tiết cho sự cố này." className="text-xs" />
              ) : (
                <div className="max-h-[380px] overflow-y-auto pr-2 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Timeline
                    items={breadcrumbs.map((b, idx) => {
                      const isLast = idx === breadcrumbs.length - 1;
                      const timeStr = new Date(b.timestamp).toLocaleTimeString('vi-VN');

                      let dotColor = 'blue';
                      let iconEl = <AppIcon icon={MousePointerClick} size="sm" />;

                      if (b.category === 'network') {
                        dotColor = b.action === 'error' ? 'red' : 'green';
                        iconEl = <AppIcon icon={Zap} size="sm" />;
                      } else if (b.category === 'navigation') {
                        dotColor = 'purple';
                        iconEl = <AppIcon icon={ExternalLink} size="sm" />;
                      }

                      if (isLast) {
                        dotColor = 'red';
                        iconEl = <AppIcon icon={AlertTriangle} size="sm" />;
                      }

                      return {
                        color: dotColor,
                        dot: <span className="p-1 rounded-full bg-white dark:bg-slate-900 border">{iconEl}</span>,
                        children: (
                          <div className="text-xs space-y-0.5 pb-2">
                            <div className="flex items-center justify-between text-slate-400 tabular-nums">
                              <span className="font-semibold uppercase tracking-wider text-[10px]">
                                #{idx + 1} · {b.category} · {b.action}
                              </span>
                              <span>{timeStr}</span>
                            </div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {b.target ? (
                                <code className="text-blue-600 dark:text-blue-400 font-mono mr-1.5">{b.target}</code>
                              ) : null}
                              {b.path ? <span className="text-slate-500 font-mono text-[11px]">{b.path}</span> : null}
                            </div>
                            {b.metadata && Object.keys(b.metadata).length > 0 ? (
                              <div className="bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-200/60 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                                {JSON.stringify(b.metadata)}
                              </div>
                            ) : null}
                          </div>
                        ),
                      };
                    })}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </AdaptiveDrawer>
    </>
  );
}
