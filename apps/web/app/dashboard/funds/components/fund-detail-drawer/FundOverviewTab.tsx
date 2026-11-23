'use client';

import React from 'react';
import { Button, Card, Col, Progress, Row } from 'antd';
import { AlertTriangle, Calendar, Users } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { getFundRoleLabel } from './fundDetailHelpers';
import type { FundOverviewData } from './types';

export interface FundOverviewTabProps {
  fundOverview: FundOverviewData | null;
  onOpenProposal: () => void;
}

export function FundOverviewTab({ fundOverview, onOpenProposal }: FundOverviewTabProps) {
  return (
    <div className="space-y-6 py-2">
      {/* Metrics 4 Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 font-medium">Số dư hiện tại</div>
            <div className="text-xl md:text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
              {Number(fundOverview?.currentBalance || 0).toLocaleString('vi-VN')} đ
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress
                percent={fundOverview?.usedPercent || 0}
                size="small"
                showInfo={false}
                status={fundOverview?.isLowBalance ? 'exception' : 'success'}
              />
              <span className="text-xs text-slate-500 tabular-nums font-semibold">
                {fundOverview?.usedPercent || 0}%
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 font-medium">Hạn mức tối đa</div>
            <div className="text-xl md:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {Number(fundOverview?.maxQuota || 0).toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Ngưỡng cảnh báo: <strong>{fundOverview?.alertThresholdPercent || 80}%</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 font-medium">Định mức chi / lần</div>
            <div className="text-xl md:text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400 mt-1">
              {Number(fundOverview?.unitQuota || 0).toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Dung sai: <strong>{fundOverview?.toleranceMode || 'STRICT'}</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 font-medium">Kỳ kế toán hiện tại</div>
            <div className="text-lg md:text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 line-clamp-1">
              {fundOverview?.currentPeriod?.periodName || 'Chưa mở kỳ'}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Thu kỳ: {Number(fundOverview?.currentPeriod?.totalIncome || 0).toLocaleString('vi-VN')}đ
            </div>
          </Card>
        </Col>
      </Row>

      {/* Alert if low balance */}
      {fundOverview?.isLowBalance && (
        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AppIcon icon={AlertTriangle} size="md" className="text-amber-500 flex-shrink-0" />
            <span className="text-sm font-medium">
              Cảnh báo: Số dư quỹ đang chạm ngưỡng cảnh báo ({fundOverview.usedPercent}% hạn mức đã dùng). Đề nghị tạo
              phiếu đề xuất bổ sung vốn quỹ.
            </span>
          </div>
          <Button
            type="primary"
            size="small"
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold flex-shrink-0"
            onClick={onOpenProposal}
          >
            Bổ sung vốn ngay
          </Button>
        </div>
      )}

      {/* Current Period Summary */}
      {fundOverview?.currentPeriod && (
        <Card
          title={
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
              <AppIcon icon={Calendar} size="sm" className="text-purple-500" />
              <span>Sổ Kế Toán Kỳ Đang Mở: {fundOverview.currentPeriod.periodName}</span>
            </div>
          }
          className="shadow-sm border-slate-200 dark:border-slate-800"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400 block text-xs">Số dư đầu kỳ:</span>
              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {Number(fundOverview.currentPeriod.openingBalance).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Tổng thu trong kỳ:</span>
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                +{Number(fundOverview.currentPeriod.totalIncome).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Tổng chi trong kỳ:</span>
              <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                -{Number(fundOverview.currentPeriod.totalExpense).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Số dư sổ sách hệ thống:</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                {Number(fundOverview.currentBalance).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Roles and Assignments */}
      <Card
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
            <AppIcon icon={Users} size="sm" className="text-emerald-500" />
            <span>Nhân Sự Phụ Trách & Phân Quyền Quỹ</span>
          </div>
        }
        className="shadow-sm border-slate-200 dark:border-slate-800"
      >
        {fundOverview?.assignments && fundOverview.assignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fundOverview.assignments.map((a) => (
              <div
                key={a.id}
                className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block text-sm">{a.staffName}</span>
                  <span className="text-xs text-slate-500 font-mono">ID: {a.staffId}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {getFundRoleLabel(a.roleKey)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">Chưa có phân công nhân sự cụ thể.</div>
        )}
      </Card>
    </div>
  );
}
