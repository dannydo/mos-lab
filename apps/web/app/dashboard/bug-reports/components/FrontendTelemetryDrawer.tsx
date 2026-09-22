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
  Tabs,
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
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCode2,
  Flame,
  Layers,
  ListFilter,
  MousePointerClick,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import {
  FRONTEND_ISSUE_STATUSES,
  FRONTEND_ISSUE_TYPES,
  type FrontendIssueAgAnalysis,
  type FrontendIssueAgDispatchResponse,
  type FrontendIssueCluster,
  type FrontendIssueClusterDispatchResponse,
  type FrontendIssueClusterKey,
  type FrontendIssueClusterListResponse,
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

  // AG Analysis & Dispatch state
  const [agAnalysis, setAgAnalysis] = useState<FrontendIssueAgAnalysis | null>(null);
  const [analyzingAg, setAnalyzingAg] = useState(false);
  const [dispatchingAg, setDispatchingAg] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<FrontendIssueAgDispatchResponse | null>(null);
  const [fleetAnalysisOpen, setFleetAnalysisOpen] = useState(false);

  // Smart Clustering state
  const [activeTab, setActiveTab] = useState<'clusters' | 'issues'>('clusters');
  const [clustersLoading, setClustersLoading] = useState(false);
  const [clusterData, setClusterData] = useState<FrontendIssueClusterListResponse | null>(null);
  const [dispatchingClusterKey, setDispatchingClusterKey] = useState<FrontendIssueClusterKey | null>(null);
  const [batchDispatching, setBatchDispatching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expandedClusterKeys, setExpandedClusterKeys] = useState<Record<string, boolean>>({
    POLLING_SLOW_API: true,
    RAGE_CLICK_CALL_LOG: true,
    WEBRTC_SDK_CRASH: true,
  });

  const toggleClusterExpand = (key: string) => {
    setExpandedClusterKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchClusters = useCallback(async () => {
    setClustersLoading(true);
    try {
      const res = await apiClient.frontendTelemetry.getClusters();
      setClusterData(res);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể tải danh sách cụm sự cố.');
    } finally {
      setClustersLoading(false);
    }
  }, []);

  const handleDispatchCluster = async (clusterKey: FrontendIssueClusterKey) => {
    setDispatchingClusterKey(clusterKey);
    try {
      const res = await apiClient.frontendTelemetry.dispatchCluster(clusterKey);
      message.success(res.message);
      void fetchClusters();
      void fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi duyệt cụm sự cố');
    } finally {
      setDispatchingClusterKey(null);
    }
  };

  const handleBatchDispatchPriority = async () => {
    setBatchDispatching(true);
    try {
      const results = await apiClient.frontendTelemetry.batchDispatchPriorityClusters();
      message.success(`Đã phê duyệt ${results.length} cụm sự cố trọng tâm cho AG thành công!`);
      void fetchClusters();
      void fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi duyệt hàng loạt');
    } finally {
      setBatchDispatching(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.frontendTelemetry.syncStatus();
      message.success(res.message);
      void fetchClusters();
      void fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi đồng bộ dữ liệu telemetry.');
    } finally {
      setSyncing(false);
    }
  };

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
      void fetchClusters();
      void fetchData();
    }
  }, [open, fetchClusters, fetchData]);

  const fetchAgAnalysis = useCallback(async (issueId: number) => {
    setAnalyzingAg(true);
    try {
      const res = await apiClient.frontendTelemetry.agAnalyze(issueId);
      setAgAnalysis(res);
    } catch (err) {
      console.error('Không thể phân tích sự cố bằng AG:', err);
    } finally {
      setAnalyzingAg(false);
    }
  }, []);

  const handleOpenDetail = (issue: FrontendIssueRecord) => {
    setActiveIssue(issue);
    setAgAnalysis(null);
    setDispatchResult(null);
    statusForm.setFieldsValue({
      status: issue.status,
      resolutionNotes: issue.resolutionNotes || '',
    });
    setDetailDrawerOpen(true);
    void fetchAgAnalysis(issue.id);
  };

  const handleAgDispatch = async () => {
    if (!activeIssue) return;
    setDispatchingAg(true);
    try {
      const res = await apiClient.frontendTelemetry.agDispatch(activeIssue.id);
      setDispatchResult(res);
      message.success(res.message);
      void fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi duyệt và giao cho AG.');
    } finally {
      setDispatchingAg(false);
    }
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
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-2">
              <AppIcon icon={Zap} size="md" className="text-amber-500" />
              <span>Giám sát Trải nghiệm Frontend & Hộp đen (Telemetry)</span>
            </div>
            <Tooltip title="Quét đối soát và tự động đồng bộ trạng thái các sự cố con theo Ticket mOS Inbox đã giải quyết">
              <Button
                icon={<AppIcon icon={RefreshCw} size="sm" className={syncing ? 'animate-spin text-purple-600' : ''} />}
                loading={syncing}
                onClick={() => void handleSync()}
                size="small"
                className="text-xs font-semibold border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              >
                Đồng bộ ngay
              </Button>
            </Tooltip>
          </div>
        }
      >
        <Space direction="vertical" size="large" className="w-full">
          {/* Executive KPI Metrics Cards */}
          <Row gutter={[12, 12]}>
            {/* Card 1: Cụm Vấn Đề Gốc */}
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-gradient-to-br from-purple-50 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800/40 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                    <AppIcon icon={Layers} size="sm" />
                    Cụm Đã Khắc Phục
                  </span>
                  <BadgeTag color="purple">Vĩ mô</BadgeTag>
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-200 tabular-nums mt-1">
                  {metrics?.resolvedClusters ?? clusterData?.summary.resolvedClusters ?? 0}
                  <span className="text-base font-medium opacity-70"> / {metrics?.totalClusters ?? 5} Cụm</span>
                  <span className="text-xs font-normal ml-2 text-purple-600 dark:text-purple-400">
                    ({metrics?.clusterResolutionRate ?? 0}%)
                  </span>
                </div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                  Tiến độ dập tắt theo cụm gốc
                </div>
              </Card>
            </Col>

            {/* Card 2: Lưu Lượng Lỗi Đã Dập Tắt */}
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <AppIcon icon={CheckCircle2} size="sm" />
                    Lưu Lượng Đã Dập
                  </span>
                  <BadgeTag color="success">Tác động</BadgeTag>
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 tabular-nums mt-1">
                  {(metrics?.extinguishedOccurrences ?? 0).toLocaleString('vi-VN')}
                  <span className="text-xs font-normal ml-1.5 text-emerald-600 dark:text-emerald-400">
                    ({metrics?.trafficExtinguishmentRate ?? 0}%)
                  </span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                  / {(metrics?.totalOccurrences ?? 0).toLocaleString('vi-VN')} lượt gặp phải
                </div>
              </Card>
            </Col>

            {/* Card 3: Sự Cố Con Đã Giải Quyết */}
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-gradient-to-br from-blue-50 to-sky-50/40 dark:from-blue-950/30 dark:to-sky-950/20 border-blue-200 dark:border-blue-800/40 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1">
                    <AppIcon icon={ShieldCheck} size="sm" />
                    Sự Cố Con Đã Đóng
                  </span>
                  <BadgeTag color="blue">Vi mô</BadgeTag>
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 tabular-nums mt-1">
                  {metrics?.resolvedCount ?? 0}
                  <span className="text-base font-medium opacity-70"> / {metrics?.totalCount ?? 0}</span>
                  <span className="text-xs font-normal ml-2 text-blue-600 dark:text-blue-400">
                    ({metrics?.resolutionRate ?? 0}%)
                  </span>
                </div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                  Đồng bộ theo Ticket cụm & đơn
                </div>
              </Card>
            </Col>

            {/* Card 4: Cụm Cần Xử Lý Tiếp */}
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200 dark:border-amber-800/40 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                    <AppIcon icon={AlertTriangle} size="sm" />
                    Cụm Cần Xử Lý Tiếp
                  </span>
                  <BadgeTag color="warning">Tồn đọng</BadgeTag>
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 tabular-nums mt-1">
                  {metrics?.openClusters ?? 0}
                  <span className="text-base font-medium opacity-70"> Cụm</span>
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                  {(metrics?.newCount ?? 0) + (metrics?.investigatingCount ?? 0)} sự cố chưa dập tắt
                </div>
              </Card>
            </Col>
          </Row>

          {/* Tabs: Smart Clusters vs Raw Issues */}
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as 'clusters' | 'issues')}
            className="telemetry-tabs"
            items={[
              {
                key: 'clusters',
                label: (
                  <span className="flex items-center gap-1.5 font-semibold text-sm">
                    <AppIcon icon={Layers} size="sm" />
                    <span>🗂️ Gom Cụm Thông Minh ({clusterData?.summary.totalClusters ?? 5} Cụm Vấn Đề)</span>
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-1">
                    {/* Cluster Summary Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-800/50 rounded-xl">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <AppIcon icon={Bot} size="md" className="text-purple-600 dark:text-purple-400" />
                          <span>Gom Cụm Thông Minh Theo Nguyên Nhân Gốc (5 Cụm Vấn Đề)</span>
                          <BadgeTag color="success">
                            {clusterData?.summary.resolvedClusters ?? metrics?.resolvedClusters ?? 0} /{' '}
                            {clusterData?.summary.totalClusters ?? 5} Cụm Đã Dập Tắt
                          </BadgeTag>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Toàn bộ <strong>{clusterData?.summary.totalIssuesClustered ?? 0} sự cố</strong> (
                          {(clusterData?.summary.totalOccurrences ?? 0).toLocaleString('vi-VN')} lượt gặp phải). Đã dập
                          tắt{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {(
                              clusterData?.summary.extinguishedOccurrences ??
                              metrics?.extinguishedOccurrences ??
                              0
                            ).toLocaleString('vi-VN')}{' '}
                            lượt
                          </strong>{' '}
                          ({clusterData?.summary.extinguishmentRate ?? metrics?.trafficExtinguishmentRate ?? 0}% lưu
                          lượng lỗi)!
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          icon={<AppIcon icon={RefreshCw} size="sm" className={syncing ? 'animate-spin' : ''} />}
                          loading={clustersLoading || syncing}
                          onClick={() => {
                            void fetchClusters();
                            void handleSync();
                          }}
                          size="small"
                        >
                          Đồng bộ & Làm mới
                        </Button>
                        <Button
                          type="primary"
                          icon={<AppIcon icon={Sparkles} size="sm" />}
                          loading={batchDispatching}
                          onClick={() => void handleBatchDispatchPriority()}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-none text-white font-medium"
                          size="small"
                        >
                          ⚡ Duyệt Nhanh 3 Cụm Trọng Tâm (P0)
                        </Button>
                      </div>
                    </div>

                    {/* 5 Cluster Cards */}
                    <div className="space-y-3">
                      {clusterData?.clusters.map((cluster) => {
                        const isExpanded = !!expandedClusterKeys[cluster.clusterKey];
                        const isDispatching = dispatchingClusterKey === cluster.clusterKey;
                        const isDispatched = !!cluster.dispatchedBugReport;
                        const isResolved =
                          !!cluster.isResolved ||
                          ['CLOSED', 'RESOLVED', 'AWAITING_REPORTER_ACCEPTANCE'].includes(
                            cluster.dispatchedBugReport?.status || ''
                          );

                        const severityColor =
                          cluster.severity === 'P0' ? 'red' : cluster.severity === 'P1' ? 'gold' : 'blue';

                        return (
                          <div
                            key={cluster.clusterKey}
                            className={`border rounded-xl transition-all ${
                              isResolved
                                ? 'border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-600/70 shadow-sm'
                                : isDispatched
                                  ? 'border-purple-300 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/10'
                                  : cluster.severity === 'P0'
                                    ? 'border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 shadow-sm'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                            }`}
                          >
                            {/* Header */}
                            <div className="p-3.5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60">
                              <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                                <div className="mt-0.5">
                                  <BadgeTag color={severityColor}>
                                    {cluster.severity === 'P0'
                                      ? 'P0 - Nghiêm trọng'
                                      : cluster.severity === 'P1'
                                        ? 'P1 - Cần thiết'
                                        : 'P2 - Cải thiện'}
                                  </BadgeTag>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                                    <span>{cluster.title}</span>
                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-purple-600 dark:text-purple-400 font-mono">
                                      {cluster.clusterKey}
                                    </code>
                                    {isResolved && <BadgeTag color="success">ĐÃ DẬP TẮT HOÀN TOÀN</BadgeTag>}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                                    <span>
                                      Quy mô:{' '}
                                      <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                                        {cluster.issueCount} sự cố
                                      </strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Lượt gặp phải:{' '}
                                      <strong
                                        className={`${
                                          isResolved
                                            ? 'text-emerald-700 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                        } tabular-nums font-bold`}
                                      >
                                        {cluster.totalOccurrences.toLocaleString('vi-VN')} hits
                                      </strong>
                                      {isResolved && (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                                          (Đã triệt tiêu)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action button */}
                              <div>
                                {isResolved ? (
                                  <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                    <AppIcon
                                      icon={CheckCircle2}
                                      size="sm"
                                      className="text-emerald-600 dark:text-emerald-400"
                                    />
                                    <span>
                                      ĐÃ DẬP TẮT ({cluster.dispatchedBugReport?.key}) ·{' '}
                                      {cluster.resolvedIssueCount ?? cluster.issueCount} sự cố đã đóng
                                    </span>
                                  </div>
                                ) : isDispatched ? (
                                  <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                    <AppIcon icon={Bot} size="sm" className="text-purple-500" />
                                    <span>
                                      Đang xử lý: {cluster.dispatchedBugReport?.key} (
                                      {cluster.dispatchedBugReport?.status})
                                    </span>
                                  </div>
                                ) : (
                                  <Button
                                    type="primary"
                                    icon={<AppIcon icon={Bot} size="sm" />}
                                    loading={isDispatching}
                                    onClick={() => void handleDispatchCluster(cluster.clusterKey)}
                                    className="bg-purple-600 hover:bg-purple-500 border-none font-medium shadow-sm"
                                  >
                                    ⚡ Duyệt Cụm Này (Tạo 1 Ticket Cho AG)
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Content Body */}
                            <div className="p-3.5 space-y-3 text-xs">
                              {/* Description & Root Cause */}
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                                <div className="text-slate-700 dark:text-slate-300 font-medium">
                                  {cluster.description}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">
                                  <strong className="text-slate-700 dark:text-slate-300">🔍 Nguyên nhân gốc:</strong>{' '}
                                  {cluster.rootCause}
                                </div>
                              </div>

                              {/* Affected Files & Plan */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <AppIcon icon={FileCode2} size="sm" className="text-blue-500" />
                                    <span>Tệp tin phạm vi xử lý ({cluster.affectedFiles.length}):</span>
                                  </div>
                                  <div className="space-y-1">
                                    {cluster.affectedFiles.map((file) => (
                                      <code
                                        key={file}
                                        className="block text-[11px] bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded text-blue-600 dark:text-blue-400 font-mono truncate"
                                      >
                                        {file}
                                      </code>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <AppIcon icon={Sparkles} size="sm" className="text-amber-500" />
                                    <span>Kế hoạch khắc phục đề xuất:</span>
                                  </div>
                                  <ul className="space-y-1 list-none pl-0 mb-0">
                                    {cluster.proposedFixSteps.map((step, idx) => (
                                      <li
                                        key={idx}
                                        className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed"
                                      >
                                        <span className="text-purple-600 dark:text-purple-400 font-bold tabular-nums">
                                          {idx + 1}.
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* Collapsible Sample Issues */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                  type="text"
                                  size="small"
                                  onClick={() => toggleClusterExpand(cluster.clusterKey)}
                                  className="p-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs flex items-center gap-1 font-medium"
                                >
                                  <AppIcon icon={isExpanded ? ChevronDown : ChevronRight} size="sm" />
                                  <span>
                                    {isExpanded ? 'Thu gọn' : 'Xem'} danh sách sự cố mẫu trong cụm (
                                    {cluster.sampleIssues.length}/{cluster.issueCount} sự cố)
                                  </span>
                                </Button>

                                {isExpanded && (
                                  <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-purple-200 dark:border-purple-800/40">
                                    {cluster.sampleIssues.map((sample) => (
                                      <div
                                        key={sample.id}
                                        className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-200/50 dark:border-slate-800 flex items-center justify-between gap-2"
                                      >
                                        <div className="space-y-0.5 flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                              #{sample.id}
                                            </span>
                                            <code className="text-[11px] bg-slate-200/60 dark:bg-slate-700 px-1 rounded text-blue-600 dark:text-blue-300">
                                              {sample.path}
                                            </code>
                                            {sample.target && (
                                              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                                ↳ {sample.target}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11.5px] text-slate-600 dark:text-slate-400 truncate">
                                            {sample.message}
                                          </div>
                                        </div>
                                        <div className="text-right whitespace-nowrap">
                                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                            {sample.occurrenceCount} hits
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              },
              {
                key: 'issues',
                label: (
                  <span className="flex items-center gap-1.5 font-semibold text-sm">
                    <AppIcon icon={ListFilter} size="sm" />
                    <span>📋 Danh Sách Rời Rạc ({total} Sự Cố)</span>
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-1">
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
                      <Button
                        icon={<AppIcon icon={RefreshCw} size="sm" />}
                        loading={loading}
                        onClick={() => void fetchData()}
                      >
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
                  </div>
                ),
              },
            ]}
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

            {/* Antigravity AI Auto-Analysis & 1-Click Dispatch Card */}
            <Card
              size="small"
              className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 shadow-sm"
              title={
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="text-sm font-semibold flex items-center gap-1.5 text-purple-900 dark:text-purple-200">
                    <AppIcon icon={Sparkles} size="sm" className="text-purple-600 dark:text-purple-400" />
                    <span>Antigravity AI — Phân tích Nguyên nhân &amp; Giải pháp</span>
                  </span>
                  {agAnalysis && (
                    <div className="flex items-center gap-1.5">
                      <BadgeTag
                        color={agAnalysis.severity === 'P0' ? 'red' : agAnalysis.severity === 'P1' ? 'orange' : 'blue'}
                      >
                        {agAnalysis.severity}
                      </BadgeTag>
                      <BadgeTag color="purple">{agAnalysis.category}</BadgeTag>
                    </div>
                  )}
                </div>
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  icon={<AppIcon icon={RefreshCw} size="sm" />}
                  loading={analyzingAg}
                  onClick={() => activeIssue && void fetchAgAnalysis(activeIssue.id)}
                  title="Phân tích lại bằng AG"
                />
              }
            >
              {analyzingAg ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                  <AppIcon icon={RefreshCw} size="md" className="animate-spin" />
                  <div className="text-xs font-medium">
                    Antigravity đang phân tích hộp đen telemetry và đối chiếu codebase...
                  </div>
                </div>
              ) : agAnalysis ? (
                <div className="space-y-4">
                  {/* Root Cause Analysis Highlight */}
                  <div className="bg-purple-50/60 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200/70 dark:border-purple-800/50 space-y-1.5">
                    <div className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <AppIcon icon={Bot} size="sm" className="text-purple-600 dark:text-purple-400" />
                      {agAnalysis.title}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {agAnalysis.rootCause}
                    </div>
                  </div>

                  {/* Affected Files in Codebase */}
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                      <AppIcon icon={FileCode2} size="sm" /> Tệp mã nguồn liên quan trong codebase:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {agAnalysis.affectedFiles.map((f, i) => (
                        <code
                          key={i}
                          className="text-[11px] bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-mono"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                  </div>

                  {/* Step by step action plan */}
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                      <AppIcon icon={ShieldCheck} size="sm" /> Kế hoạch Khắc phục Kỹ thuật đề xuất:
                    </div>
                    <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      {agAnalysis.proposedFix.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                            {idx + 1}.
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Impact & Risk */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span>Đánh giá rủi ro: </span>
                      <strong className="text-slate-700 dark:text-slate-300">{agAnalysis.riskAssessment}</strong>
                    </div>
                    <div>
                      <span>Ước tính thời gian: </span>
                      <strong className="text-slate-700 dark:text-slate-300">{agAnalysis.estimatedEffort}</strong>
                    </div>
                  </div>

                  {/* Dispatch / Approval Action Area */}
                  {dispatchResult || activeIssue.resolutionNotes?.includes('BUG-') ? (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
                          <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-600 dark:text-emerald-400" />
                          <span>Đã duyệt &amp; Sẵn sàng cho Antigravity (AG)</span>
                        </div>
                        <BadgeTag color="success">AWAITING_IDE_HANDOFF</BadgeTag>
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">
                        Ticket{' '}
                        <strong>{dispatchResult?.key || activeIssue.resolutionNotes?.match(/BUG-\d+/)?.[0]}</strong> đã
                        được cấp quyền implementation. AG đang tự động nhận task và xử lý theo chu trình mOS Inbox.
                      </div>
                      <div className="pt-1">
                        <Button
                          type="link"
                          size="small"
                          className="p-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1"
                          onClick={() => {
                            const key = dispatchResult?.key || activeIssue.resolutionNotes?.match(/BUG-\d+/)?.[0];
                            window.open(`/dashboard/bug-reports?search=${key || ''}`, '_blank');
                          }}
                        >
                          Mở Ticket trong mOS Inbox <AppIcon icon={ExternalLink} size="sm" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500">
                        Bấm duyệt để AG tự động mở ticket mOS Inbox, nhận handoff và giải quyết vấn đề.
                      </div>
                      <Popconfirm
                        title="Duyệt &amp; Kích hoạt AG Xử lý Tự động?"
                        description="AG sẽ tự động tạo ticket trong mOS Inbox, duyệt implementation và sẵn sàng nhận handoff để sửa code &amp; chạy test."
                        onConfirm={handleAgDispatch}
                        okText="Duyệt cho AG"
                        cancelText="Hủy"
                      >
                        <Button
                          type="primary"
                          icon={<AppIcon icon={Zap} size="sm" />}
                          loading={dispatchingAg}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-sm font-medium"
                        >
                          ⚡ Duyệt &amp; Giao AG Xử lý Tự động
                        </Button>
                      </Popconfirm>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  Chưa có phân tích cho sự cố này.{' '}
                  <Button
                    type="link"
                    size="small"
                    onClick={() => activeIssue && void fetchAgAnalysis(activeIssue.id)}
                    className="p-0"
                  >
                    Bấm để AG phân tích ngay
                  </Button>
                </div>
              )}
            </Card>

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
