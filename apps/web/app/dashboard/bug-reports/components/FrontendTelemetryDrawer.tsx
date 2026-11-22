'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Space, Tabs, Tooltip, message } from 'antd';
import { Layers, ListFilter, RefreshCw, Zap } from 'lucide-react';
import type {
  FrontendIssueAgAnalysis,
  FrontendIssueAgDispatchResponse,
  FrontendIssueClusterKey,
  FrontendIssueClusterListResponse,
  FrontendIssueListQuery,
  FrontendIssueListResponse,
  FrontendIssueMetrics,
  FrontendIssueRecord,
  FrontendIssueStatus,
  FrontendIssueType,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { STATUS_CONFIG } from './frontend-telemetry.shared';
import { FrontendTelemetryKpiRow } from './FrontendTelemetryKpiRow';
import { FrontendTelemetryClustersTab } from './FrontendTelemetryClustersTab';
import { FrontendTelemetryIssuesTab } from './FrontendTelemetryIssuesTab';
import { FrontendTelemetryIssueDetailDrawer } from './FrontendTelemetryIssueDetailDrawer';

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
  const [userFilter, setUserFilter] = useState<string | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'occurrences' | 'lastSeen'>('occurrences');
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

  const pendingPriorityClusters = useMemo(() => {
    return (clusterData?.clusters || []).filter((c) => {
      const isResolved =
        !!c.isResolved ||
        ['CLOSED', 'RESOLVED', 'AWAITING_REPORTER_ACCEPTANCE'].includes(c.dispatchedBugReport?.status || '');
      const isDispatched = !!c.dispatchedBugReport;
      const isPriority =
        ['POLLING_SLOW_API', 'RAGE_CLICK_CALL_LOG', 'WEBRTC_SDK_CRASH'].includes(c.clusterKey) || c.severity === 'P0';
      return isPriority && !isResolved && !isDispatched;
    });
  }, [clusterData?.clusters]);

  const isAllExtinguished = useMemo(() => {
    const clusterTotal = clusterData?.summary.totalClusters ?? 0;
    const resolved = clusterData?.summary.resolvedClusters ?? 0;
    return clusterTotal > 0 && resolved >= clusterTotal;
  }, [clusterData?.summary.resolvedClusters, clusterData?.summary.totalClusters]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query: FrontendIssueListQuery = {
        page,
        limit: pageSize,
        status: statusFilter,
        issueType: typeFilter,
        userName: userFilter === 'ALL' ? undefined : userFilter,
        sortBy,
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
  }, [page, pageSize, statusFilter, typeFilter, userFilter, sortBy, searchQuery]);

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
      message.success(`Đã tạo Bug Report ${res.key} trong mOS Mission!`);
      setDetailDrawerOpen(false);
      void fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi tạo Bug Report.');
    } finally {
      setConvertingBug(false);
    }
  };

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
              <span>Giám sát Trải nghiệm Frontend &amp; Hộp đen (Telemetry)</span>
            </div>
            <Tooltip title="Quét đối soát và tự động đồng bộ trạng thái các sự cố con theo Ticket mOS Mission đã giải quyết">
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
          <FrontendTelemetryKpiRow metrics={metrics} clusterData={clusterData} />

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
                  <FrontendTelemetryClustersTab
                    clusterData={clusterData}
                    metrics={metrics}
                    clustersLoading={clustersLoading}
                    syncing={syncing}
                    pendingPriorityClusters={pendingPriorityClusters}
                    batchDispatching={batchDispatching}
                    isAllExtinguished={isAllExtinguished}
                    dispatchingClusterKey={dispatchingClusterKey}
                    expandedClusterKeys={expandedClusterKeys}
                    onToggleClusterExpand={toggleClusterExpand}
                    onRefreshAndSync={() => {
                      void fetchClusters();
                      void handleSync();
                    }}
                    onBatchDispatchPriority={() => void handleBatchDispatchPriority()}
                    onDispatchCluster={(key) => void handleDispatchCluster(key)}
                  />
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
                  <FrontendTelemetryIssuesTab
                    loading={loading}
                    data={data}
                    metrics={metrics}
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    statusFilter={statusFilter}
                    typeFilter={typeFilter}
                    userFilter={userFilter}
                    sortBy={sortBy}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onSearchSubmit={() => {
                      setPage(1);
                      void fetchData();
                    }}
                    onStatusFilterChange={(val) => {
                      setStatusFilter(val);
                      setPage(1);
                    }}
                    onTypeFilterChange={(val) => {
                      setTypeFilter(val);
                      setPage(1);
                    }}
                    onUserFilterChange={(val) => {
                      setUserFilter(val);
                      setPage(1);
                    }}
                    onSortByChange={(val) => {
                      setSortBy(val);
                      setPage(1);
                    }}
                    onPageChange={(newPage, newPageSize) => {
                      setPage(newPage);
                      setPageSize(newPageSize);
                    }}
                    onRefresh={() => void fetchData()}
                    onOpenDetail={handleOpenDetail}
                  />
                ),
              },
            ]}
          />
        </Space>
      </AdaptiveDrawer>

      <FrontendTelemetryIssueDetailDrawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        activeIssue={activeIssue}
        analyzingAg={analyzingAg}
        agAnalysis={agAnalysis}
        dispatchResult={dispatchResult}
        dispatchingAg={dispatchingAg}
        convertingBug={convertingBug}
        updatingStatus={updatingStatus}
        statusForm={statusForm}
        onFetchAgAnalysis={(issueId) => void fetchAgAnalysis(issueId)}
        onAgDispatch={() => void handleAgDispatch()}
        onConvertToBugReport={() => void handleConvertToBugReport()}
        onUpdateStatus={(values) => void handleUpdateStatus(values)}
      />
    </>
  );
}
