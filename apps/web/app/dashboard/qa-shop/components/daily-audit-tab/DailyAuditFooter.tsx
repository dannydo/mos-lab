'use client';

import React from 'react';
import { Button, Card, Divider, Input } from 'antd';
import { Send } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { ComplianceStats } from './types';

interface DailyAuditFooterProps {
  themeMode: string;
  generalNotes: string;
  onGeneralNotesChange: (notes: string) => void;
  stats: ComplianceStats;
  submitting: boolean;
  onSubmitAudit: () => void;
}

export const DailyAuditFooter: React.FC<DailyAuditFooterProps> = ({
  themeMode,
  generalNotes,
  onGeneralNotesChange,
  stats,
  submitting,
  onSubmitAudit,
}) => {
  return (
    <>
      <Card
        className={`shadow-sm border border-slate-200/60 dark:border-slate-800/60 ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800/60' : 'bg-white border-slate-200/60'
        }`}
        classNames={{ body: 'p-4' }}
      >
        <label className="font-bold text-sm block mb-1 text-slate-700 dark:text-slate-200">
          Ghi chú tổng kết chuyến đi Audit của QA:
        </label>
        <Input.TextArea
          rows={3}
          value={generalNotes}
          onChange={(e) => onGeneralNotesChange(e.target.value)}
          placeholder="Nhập nhận xét chung về thái độ nhân sự, tình hình chi nhánh hoặc đề xuất cải tiến..."
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        />
      </Card>

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md px-6 py-3 transition-all ${
          themeMode === 'dark'
            ? 'bg-slate-950/90 border-slate-800 text-white'
            : 'bg-white/90 border-slate-200 text-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium">
                Tỷ lệ tuân thủ
              </div>
              <div className="tabular-nums text-xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.rate}%
              </div>
            </div>
            <Divider type="vertical" className="h-8" />
            <div className="hidden sm:block">
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Kết quả đánh giá</div>
              <div className="text-xs font-semibold flex items-center gap-2">
                <span className="text-emerald-600 font-bold tabular-nums">{stats.passed} Pass</span> •{' '}
                <span className="text-rose-600 font-bold tabular-nums">{stats.failed} Fail</span> •{' '}
                <span className="text-slate-600 dark:text-slate-400 tabular-nums">{stats.na} N/A</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="primary"
              size="large"
              icon={<AppIcon icon={Send} size={15} />}
              loading={submitting}
              onClick={onSubmitAudit}
              className="bg-emerald-600 hover:bg-emerald-500 border-0 font-bold px-8 shadow-lg shadow-emerald-600/20 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Gửi Báo Cáo Audit Shop
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
