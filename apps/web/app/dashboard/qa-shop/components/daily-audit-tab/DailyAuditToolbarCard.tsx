'use client';

import React from 'react';
import { Button, Card, DatePicker, Divider, Input, Segmented, Select } from 'antd';
import { FileSpreadsheet, Store } from 'lucide-react';
import type dayjs from 'dayjs';
import type { QaShopBranchCode } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { BRANCH_SEGMENT_OPTIONS, SHIFT_SELECT_OPTIONS, type AuditShift } from './types';

interface DailyAuditToolbarCardProps {
  themeMode: string;
  selectedBranch: QaShopBranchCode;
  onBranchChange: (branch: QaShopBranchCode) => void;
  templateCode?: string;
  auditDate: dayjs.Dayjs;
  onAuditDateChange: (date: dayjs.Dayjs) => void;
  shift: AuditShift;
  onShiftChange: (shift: AuditShift) => void;
  auditorName: string;
  onAuditorNameChange: (name: string) => void;
  onOpenImportDrawer: () => void;
}

export const DailyAuditToolbarCard: React.FC<DailyAuditToolbarCardProps> = ({
  themeMode,
  selectedBranch,
  onBranchChange,
  templateCode,
  auditDate,
  onAuditDateChange,
  shift,
  onShiftChange,
  auditorName,
  onAuditorNameChange,
  onOpenImportDrawer,
}) => {
  return (
    <Card
      className={`shadow-sm border transition-all ${
        themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
      classNames={{ body: 'px-5 py-4' }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AppIcon icon={Store} size={18} className="text-amber-500 shrink-0" />
            <span className="font-bold text-base tracking-tight">Phiếu Đi Kiểm Tra Shop Mỗi Ngày (Daily Audit)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Chọn chi nhánh & thực hiện đánh giá tiêu chuẩn phân khu theo bộ tiêu chuẩn hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-400">Chi Nhánh:</span>
            <Segmented
              value={selectedBranch}
              onChange={(val) => onBranchChange(val as QaShopBranchCode)}
              options={BRANCH_SEGMENT_OPTIONS}
            />
          </div>

          <Button
            icon={<AppIcon icon={FileSpreadsheet} size={14} className="text-emerald-500" />}
            onClick={onOpenImportDrawer}
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            Quản Lý Tiêu Chí
          </Button>
        </div>
      </div>

      <Divider className="my-3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Mã Template Áp Dụng:</label>
          <StatusTag
            status="processing"
            label={templateCode || `${selectedBranch}.Reception.DAILY.check`}
            className="w-full justify-center py-1 font-mono text-xs"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Ngày Audit:</label>
          <DatePicker
            value={auditDate}
            onChange={(d) => d && onAuditDateChange(d)}
            format="DD/MM/YYYY"
            className="w-full"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Ca Kiểm Tra:</label>
          <Select value={shift} onChange={onShiftChange} className="w-full" options={SHIFT_SELECT_OPTIONS} />
        </div>

        <div>
          <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Nhân Sự QA Audit:</label>
          <Input
            value={auditorName}
            onChange={(e) => onAuditorNameChange(e.target.value)}
            placeholder="Tên nhân sự QA"
          />
        </div>
      </div>
    </Card>
  );
};
