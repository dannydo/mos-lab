'use client';

import { Card, Col, Row } from 'antd';
import { AlertTriangle, CheckCircle2, Layers, ShieldCheck } from 'lucide-react';
import type { FrontendIssueClusterListResponse, FrontendIssueMetrics } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui';
import { BadgeTag } from './frontend-telemetry.shared';

export function FrontendTelemetryKpiRow({
  metrics,
  clusterData,
}: {
  metrics: FrontendIssueMetrics | null;
  clusterData: FrontendIssueClusterListResponse | null;
}) {
  return (
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
            Đồng bộ theo Ticket cụm &amp; đơn
          </div>
        </Card>
      </Col>

      {/* Card 4: Cụm Cần Xử Lý Tiếp */}
      <Col xs={12} sm={6}>
        <Card
          size="small"
          className={
            (metrics?.openClusters ?? 0) === 0
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-sm'
              : 'bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200 dark:border-amber-800/40 shadow-sm'
          }
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold flex items-center gap-1 ${
                (metrics?.openClusters ?? 0) === 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              <AppIcon icon={(metrics?.openClusters ?? 0) === 0 ? CheckCircle2 : AlertTriangle} size="sm" />
              Cụm Cần Xử Lý Tiếp
            </span>
            <BadgeTag color={(metrics?.openClusters ?? 0) === 0 ? 'success' : 'warning'}>
              {(metrics?.openClusters ?? 0) === 0 ? 'Đã sạch' : 'Tồn đọng'}
            </BadgeTag>
          </div>
          <div
            className={`text-2xl font-bold tabular-nums mt-1 ${
              (metrics?.openClusters ?? 0) === 0
                ? 'text-emerald-900 dark:text-emerald-200'
                : 'text-amber-900 dark:text-amber-200'
            }`}
          >
            {metrics?.openClusters ?? 0}
            <span className="text-base font-medium opacity-70"> Cụm</span>
          </div>
          <div
            className={`text-[11px] mt-0.5 truncate ${
              (metrics?.openClusters ?? 0) === 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {(metrics?.openClusters ?? 0) === 0
              ? '100% cụm sự cố đã dập tắt'
              : `${(metrics?.newCount ?? 0) + (metrics?.investigatingCount ?? 0)} sự cố chưa dập tắt`}
          </div>
        </Card>
      </Col>
    </Row>
  );
}
