'use client';

import { Button } from 'antd';
import { Bot, CheckCircle2, ChevronDown, ChevronRight, FileCode2, RefreshCw, Sparkles } from 'lucide-react';
import type {
  FrontendIssueCluster,
  FrontendIssueClusterKey,
  FrontendIssueClusterListResponse,
  FrontendIssueMetrics,
} from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui';
import { BadgeTag } from './frontend-telemetry.shared';

export function FrontendTelemetryClustersTab({
  clusterData,
  metrics,
  clustersLoading,
  syncing,
  pendingPriorityClusters,
  batchDispatching,
  isAllExtinguished,
  dispatchingClusterKey,
  expandedClusterKeys,
  onToggleClusterExpand,
  onRefreshAndSync,
  onBatchDispatchPriority,
  onDispatchCluster,
}: {
  clusterData: FrontendIssueClusterListResponse | null;
  metrics: FrontendIssueMetrics | null;
  clustersLoading: boolean;
  syncing: boolean;
  pendingPriorityClusters: FrontendIssueCluster[];
  batchDispatching: boolean;
  isAllExtinguished: boolean;
  dispatchingClusterKey: FrontendIssueClusterKey | null;
  expandedClusterKeys: Record<string, boolean>;
  onToggleClusterExpand: (key: string) => void;
  onRefreshAndSync: () => void;
  onBatchDispatchPriority: () => void;
  onDispatchCluster: (clusterKey: FrontendIssueClusterKey) => void;
}) {
  return (
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
            {(clusterData?.summary.totalOccurrences ?? 0).toLocaleString('vi-VN')} lượt gặp phải). Đã dập tắt{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {(clusterData?.summary.extinguishedOccurrences ?? metrics?.extinguishedOccurrences ?? 0).toLocaleString(
                'vi-VN'
              )}{' '}
              lượt
            </strong>{' '}
            ({clusterData?.summary.extinguishmentRate ?? metrics?.trafficExtinguishmentRate ?? 0}% lưu lượng lỗi)!
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<AppIcon icon={RefreshCw} size="sm" className={syncing ? 'animate-spin' : ''} />}
            loading={clustersLoading || syncing}
            onClick={onRefreshAndSync}
            size="small"
          >
            Đồng bộ &amp; Làm mới
          </Button>
          {pendingPriorityClusters.length > 0 ? (
            <Button
              type="primary"
              icon={<AppIcon icon={Sparkles} size="sm" />}
              loading={batchDispatching}
              onClick={onBatchDispatchPriority}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-none text-white font-medium shadow-sm"
              size="small"
            >
              ⚡ Duyệt Nhanh {pendingPriorityClusters.length} Cụm Trọng Tâm (P0)
            </Button>
          ) : isAllExtinguished ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 px-2.5 py-1 rounded-md text-xs font-semibold">
              <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-600 dark:text-emerald-400" />
              <span>Toàn bộ 5 cụm đã dập tắt</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 px-2.5 py-1 rounded-md text-xs font-semibold">
              <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-600 dark:text-emerald-400" />
              <span>Đã xử lý hết cụm P0</span>
            </div>
          )}
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
            ['CLOSED', 'RESOLVED', 'AWAITING_REPORTER_ACCEPTANCE'].includes(cluster.dispatchedBugReport?.status || '');

          const severityColor = cluster.severity === 'P0' ? 'red' : cluster.severity === 'P1' ? 'gold' : 'blue';

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
                            isResolved ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
                      <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-600 dark:text-emerald-400" />
                      <span>
                        ĐÃ DẬP TẮT ({cluster.dispatchedBugReport?.key}) ·{' '}
                        {cluster.resolvedIssueCount ?? cluster.issueCount} sự cố đã đóng
                      </span>
                    </div>
                  ) : isDispatched ? (
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold">
                      <AppIcon icon={Bot} size="sm" className="text-purple-500" />
                      <span>
                        Đang xử lý: {cluster.dispatchedBugReport?.key} ({cluster.dispatchedBugReport?.status})
                      </span>
                    </div>
                  ) : (
                    <Button
                      type="primary"
                      icon={<AppIcon icon={Bot} size="sm" />}
                      loading={isDispatching}
                      onClick={() => onDispatchCluster(cluster.clusterKey)}
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
                  <div className="text-slate-700 dark:text-slate-300 font-medium">{cluster.description}</div>
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
                    onClick={() => onToggleClusterExpand(cluster.clusterKey)}
                    className="p-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs flex items-center gap-1 font-medium"
                  >
                    <AppIcon icon={isExpanded ? ChevronDown : ChevronRight} size="sm" />
                    <span>
                      {isExpanded ? 'Thu gọn' : 'Xem'} danh sách sự cố mẫu trong cụm ({cluster.sampleIssues.length}/
                      {cluster.issueCount} sự cố)
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
  );
}
