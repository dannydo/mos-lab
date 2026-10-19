'use client';

import React from 'react';
import { Badge, Col, Row } from 'antd';
import { SectionCard } from '../../../../../components/ui';
import type { CashFlowForecastSummary, CashFlowPriority, CashFlowTimelinePoint } from '@mos-lab/shared';

interface TimelineOverviewTabProps {
  timeline: CashFlowTimelinePoint[];
  summary?: CashFlowForecastSummary;
  onSelectDay: (pt: CashFlowTimelinePoint) => void;
  categoryNames: Record<string, string>;
  priorityMeta: Record<CashFlowPriority, { label: string; badgeClass: string; desc: string }>;
}

export function TimelineOverviewTab({
  timeline,
  summary,
  onSelectDay,
  categoryNames,
  priorityMeta,
}: TimelineOverviewTabProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Diễn biến số dư & Dòng tiền dự kiến theo ngày"
        extra={
          <div className="text-xs text-neutral-400 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Thu
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Chi
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Số dư cuối ngày
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {timeline.slice(0, 14).map((pt) => {
                const isWarning = pt.isBelowSafety;
                return (
                  <div
                    key={pt.date}
                    onClick={() => onSelectDay(pt)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isWarning
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 shadow-sm'
                        : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-neutral-700 dark:text-neutral-200">
                        {pt.date.slice(5)} ({pt.dayOfWeek.slice(0, 4)})
                      </span>
                      {isWarning ? <Badge status="error" text="Nguy cơ" /> : <Badge status="success" />}
                    </div>
                    <div className="mt-2 space-y-1 text-xs tabular-nums">
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Thu:</span>
                        <span>+{(pt.expectedInflow + pt.actualInflow).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between text-rose-600 dark:text-rose-400">
                        <span>Chi:</span>
                        <span>-{(pt.expectedOutflow + pt.actualOutflow).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="pt-1 border-t border-neutral-200 dark:border-neutral-800 flex justify-between font-bold">
                        <span>Dư:</span>
                        <span className={isWarning ? 'text-rose-600' : 'text-neutral-800 dark:text-neutral-100'}>
                          {Math.round(pt.closingBalance / 1000000)} Tr
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <SectionCard title="Cơ cấu Khoản Chi theo Danh mục">
            <div className="space-y-3">
              {Object.entries(summary?.outflowCategoryBreakdown || {}).map(([cat, amount]) => {
                const total = summary?.totalExpectedOutflow || 1;
                const percent = Math.round((amount / total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {categoryNames[cat] || cat}
                      </span>
                      <span className="tabular-nums font-semibold">
                        {amount.toLocaleString('vi-VN')}đ ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} md={12}>
          <SectionCard title="Cơ cấu Chi theo Mức độ Ưu tiên (Triage Priority)">
            <div className="space-y-3">
              {Object.entries(summary?.priorityOutflowBreakdown || {}).map(([prio, amount]) => {
                const conf = priorityMeta[prio as CashFlowPriority] || priorityMeta.MEDIUM;
                const total = summary?.totalExpectedOutflow || 1;
                const percent = Math.round((amount / total) * 100);
                return (
                  <div key={prio} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{conf.label}</span>
                      <span className="tabular-nums font-semibold">
                        {amount.toLocaleString('vi-VN')}đ ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}
