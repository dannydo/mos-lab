'use client';

import React from 'react';
import { Button } from 'antd';
import { Play } from 'lucide-react';
import type { TelesaleConfigPreviewResult } from '@mos-lab/shared';
import { AdaptiveModal, DataTable } from '~/components/ui';
import { previewCalculationColumns } from './previewColumns';

interface PreviewCalculationModalProps {
  open: boolean;
  currentMonth: string;
  previewResult: TelesaleConfigPreviewResult | null;
  onClose: () => void;
}

export function PreviewCalculationModal({ open, currentMonth, previewResult, onClose }: PreviewCalculationModalProps) {
  return (
    <AdaptiveModal
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
          <Play className="w-5 h-5 text-indigo-500" />
          <span>Mô Phỏng Điểm Kỳ {currentMonth} (Bản Nháp vs Cấu Hình Đang Áp Dụng)</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={850}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {previewResult ? (
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 text-xs">
            <div>
              Tổng số tư vấn viên: <b>{previewResult.staffCount}</b>
            </div>
            <div>
              Độ lệch điểm trung bình toàn đội:{' '}
              <span
                className={`font-bold tabular-nums ${
                  previewResult.averageScoreDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {previewResult.averageScoreDiff > 0 ? '+' : ''}
                {previewResult.averageScoreDiff} điểm
              </span>
            </div>
          </div>

          <DataTable
            dataSource={previewResult.rows}
            rowKey="staffId"
            pagination={{ pageSize: 8 }}
            size="small"
            columns={previewCalculationColumns}
          />
        </div>
      ) : null}
    </AdaptiveModal>
  );
}
