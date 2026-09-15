'use client';

import React from 'react';
import { AlertOutlined } from '@ant-design/icons';
import { InspectionStats } from '../types/qa-shop.types';

interface QaSoftAlertStripProps {
  inspectionStats: InspectionStats;
}

export const QaSoftAlertStrip: React.FC<QaSoftAlertStripProps> = ({ inspectionStats }) => {
  if (inspectionStats.failed <= 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label="Cảnh báo vi phạm tiêu chí kiểm tra"
      className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex items-start gap-2.5 transition-all duration-200"
    >
      <AlertOutlined className="text-rose-500 mt-0.5 text-sm shrink-0" aria-hidden="true" />
      <div className="space-y-1 text-xs flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-rose-700 dark:text-rose-300 block">
            Phát hiện {inspectionStats.failed} tiêu chí không đạt quy chuẩn trong đợt kiểm tra:
          </span>
          <span className="text-[11px] font-medium text-rose-500 tabular-nums">
            ({inspectionStats.failedItemsList.length} lỗi)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {inspectionStats.failedItemsList.map((item, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/80 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium shadow-2xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" aria-hidden="true" />
              <span className="font-semibold">[{item.secTitle}]</span> {item.itemTitle}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
