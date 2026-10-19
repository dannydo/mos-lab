'use client';

import React from 'react';
import { Button } from 'antd';
import { AdaptiveModal } from '../../../../../components/ui';
import type { CashFlowTimelinePoint } from '@mos-lab/shared';

interface DayInspectionModalProps {
  dayPoint: CashFlowTimelinePoint | null;
  onClose: () => void;
}

export function DayInspectionModal({ dayPoint, onClose }: DayInspectionModalProps) {
  if (!dayPoint) return null;

  return (
    <AdaptiveModal
      intent="detail"
      title={`Chi tiết dòng tiền ngày ${dayPoint.date} (${dayPoint.dayOfWeek})`}
      open={Boolean(dayPoint)}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs tabular-nums">
          <div>
            <span className="text-neutral-500">Số dư đầu ngày:</span>
            <div className="font-bold text-sm">{Math.round(dayPoint.openingBalance).toLocaleString('vi-VN')}đ</div>
          </div>
          <div>
            <span className="text-emerald-500 font-medium">Thu trong ngày:</span>
            <div className="font-bold text-sm text-emerald-500">
              +{(dayPoint.expectedInflow + dayPoint.actualInflow).toLocaleString('vi-VN')}đ
            </div>
          </div>
          <div>
            <span className="text-rose-500 font-medium">Chi trong ngày:</span>
            <div className="font-bold text-sm text-rose-500">
              -{(dayPoint.expectedOutflow + dayPoint.actualOutflow).toLocaleString('vi-VN')}đ
            </div>
          </div>
        </div>

        <div>
          <div className="font-semibold text-sm mb-2">Các khoản chi dự kiến:</div>
          {dayPoint.outflows && dayPoint.outflows.length > 0 ? (
            <div className="space-y-2">
              {dayPoint.outflows.map((outf) => (
                <div
                  key={outf.id}
                  className="p-2.5 rounded border border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-semibold">{outf.title}</div>
                    <div className="text-neutral-500 mt-0.5 flex items-center gap-1.5">
                      <span>Ưu tiên: {outf.priority}</span>
                      {outf.hasVat && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                          VAT {outf.vatRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-rose-500 tabular-nums text-sm">
                    -{outf.totalAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-400 text-xs py-2">Không có khoản chi nào trong ngày này.</div>
          )}
        </div>
      </div>
    </AdaptiveModal>
  );
}
