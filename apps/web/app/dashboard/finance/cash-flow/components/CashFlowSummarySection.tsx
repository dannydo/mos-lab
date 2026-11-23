'use client';

import { Alert, Card, Col, Row } from 'antd';
import { AlertTriangle, Percent, ShieldCheck } from 'lucide-react';
import type { CashFlowForecastResponse } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

export interface CashFlowSummarySectionProps {
  summary?: CashFlowForecastResponse['summary'];
}

export function CashFlowSummarySection({ summary }: CashFlowSummarySectionProps) {
  return (
    <>
      {summary?.isShortfallRisk && (
        <Alert
          message={
            <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
              <AppIcon icon={AlertTriangle} size="sm" />
              CẢNH BÁO NGUY CƠ THIẾU TIỀN VÀO NGÀY {summary.shortfallDate}
            </div>
          }
          description={
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
              Số dư dự kiến sẽ giảm xuống mức thấp nhất là{' '}
              <strong className="text-rose-500 tabular-nums">
                {summary.minForecastBalance.toLocaleString('vi-VN')}đ
              </strong>{' '}
              (dưới ngưỡng an toàn {summary.minSafetyThreshold.toLocaleString('vi-VN')}đ). Tổng các khoản chi khẩn cấp
              và thiết yếu đang chờ duyệt là{' '}
              <strong className="tabular-nums">{summary.criticalOutflowPending.toLocaleString('vi-VN')}đ</strong>. Đề
              xuất: kiểm tra giãn tiến độ hoặc tạm hoãn các khoản chi mức ưu tiên{' '}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Có thể hoãn
              </span>{' '}
              và đẩy mạnh thu hồi công nợ/doanh thu.
            </div>
          }
          type="error"
          showIcon={false}
          className="border-rose-400 dark:border-rose-800"
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Số dư hiện tại</div>
            <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 tabular-nums mt-1">
              {summary ? (summary.openingBalance / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
              <AppIcon icon={ShieldCheck} size="sm" className="text-emerald-500" />
              Ngưỡng AT: {summary ? (summary.minSafetyThreshold / 1000000).toFixed(0) : 0} Tr
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Tổng dự kiến Thu</div>
            <div className="text-2xl font-bold text-emerald-500 tabular-nums mt-1">
              +{summary ? (summary.totalExpectedInflow / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">Dự kiến phát sinh đến cuối kỳ</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Tổng dự kiến Chi</div>
            <div className="text-2xl font-bold text-rose-500 tabular-nums mt-1">
              -{summary ? (summary.totalExpectedOutflow / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Đã chi thực tế: {summary ? (summary.totalActualOutflow / 1000000).toFixed(1) : 0} Tr
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Số dư dự kiến cuối kỳ</div>
            <div
              className={`text-2xl font-bold tabular-nums mt-1 ${
                (summary?.closingForecastBalance || 0) < (summary?.minSafetyThreshold || 0)
                  ? 'text-rose-500'
                  : 'text-neutral-800 dark:text-neutral-100'
              }`}
            >
              {summary ? (summary.closingForecastBalance / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Dòng tiền ròng:{' '}
              <span
                className={`tabular-nums font-semibold ${
                  (summary?.netCashFlowForecast || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {(summary?.netCashFlowForecast || 0) >= 0 ? '+' : ''}
                {summary ? (summary.netCashFlowForecast / 1000000).toFixed(1) : 0} Tr
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Chi khẩn cấp (CRITICAL/HIGH)</div>
            <div className="text-2xl font-bold text-amber-500 tabular-nums mt-1">
              {summary ? (summary.criticalOutflowPending / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">Ưu tiên chi trả lương & NCC chính</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium flex items-center gap-1">
              <AppIcon icon={Percent} size="sm" className="text-blue-500" />
              Thuế VAT trong chi phí
            </div>
            <div className="text-2xl font-bold text-blue-500 tabular-nums mt-1">
              {summary ? (summary.totalVatOutflow / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">Phần thuế GTGT đầu vào hợp lệ</div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
