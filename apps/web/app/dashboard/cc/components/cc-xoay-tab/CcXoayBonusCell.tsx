'use client';

import React from 'react';
import { Progress, Tooltip, theme } from 'antd';
import type { CcXoayRecord } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import type { StaffCapInfo } from './cc-xoay-utils';

interface CcXoayBonusCellProps {
  value: number;
  record: CcXoayRecord;
  staffCapMap: Map<string, StaffCapInfo>;
}

export function CcXoayBonusCell({ value, record, staffCapMap }: CcXoayBonusCellProps) {
  const { token } = theme.useToken();
  const capInfo = staffCapMap.get(record.consultantName || '') || {
    capStatus: record.capStatus || 'NORMAL',
    wheelCapPercent: record.wheelCapPercent || 0,
    maxWheelBonusAllowed: record.maxWheelBonusAllowed || 0,
    effectiveWheelBonus: value,
  };

  const isHardcapped = capInfo.capStatus === 'HARDCAPPED';
  const isWarning = capInfo.capStatus === 'WARNING';
  const percent = capInfo.wheelCapPercent || 0;
  const maxAllowed = capInfo.maxWheelBonusAllowed || 0;
  const formattedBonus = `+${Math.round(value || 0).toLocaleString('vi-VN')}\u00A0đ`;

  if (isHardcapped) {
    return (
      <Tooltip
        title={
          <div>
            <div className="font-bold text-rose-300">⛔ ĐÃ ĐẠT TRẦN THƯỞNG VÒNG XOAY (1.5X)</div>
            <div className="text-xs mt-1">
              Tổng thưởng Vòng xoay đã đạt trần tối đa:{' '}
              <strong className="text-emerald-300">{maxAllowed.toLocaleString('vi-VN')}&nbsp;đ</strong> (1.5x CC Daily
              Bonus). Phần tiền vượt quá bị khống chế theo quy định.
            </div>
          </div>
        }
      >
        <div className="w-full text-right cursor-help">
          <div className="tabular-nums font-bold text-rose-600 dark:text-rose-500 text-xs">{formattedBonus}</div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <StatusTag
              status="error"
              label="⛔ HARDCAP 1.5X"
              className="text-[10px] font-bold py-0 px-1 border-rose-500/40 animate-pulse"
            />
          </div>
          <Progress percent={100} size="small" strokeColor={token.colorError} showInfo={false} className="m-0 mt-0.5" />
        </div>
      </Tooltip>
    );
  }

  if (isWarning) {
    return (
      <Tooltip
        title={
          <div>
            <div className="font-bold text-amber-300">⚠️ CẢNH BÁO: SẮP CHẠM TRẦN THƯỞNG (1.5X)</div>
            <div className="text-xs mt-1">
              Đã sử dụng <strong className="text-amber-300">{percent}%</strong> hạn mức thưởng Vòng xoay tháng (Tối đa:{' '}
              <strong>{maxAllowed.toLocaleString('vi-VN')}&nbsp;đ</strong>). Hãy nâng cao CC Daily Bonus để mở rộng
              trần!
            </div>
          </div>
        }
      >
        <div className="w-full text-right cursor-help">
          <div className="tabular-nums font-bold text-amber-600 dark:text-amber-400 text-xs">{formattedBonus}</div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <StatusTag
              status="warning"
              label={`⚠️ SẮP CHẠM TRẦN (${percent}%)`}
              className="text-[10px] font-bold py-0 px-1 border-amber-500/40"
            />
          </div>
          <Progress
            percent={percent}
            size="small"
            strokeColor={token.colorWarning}
            showInfo={false}
            className="m-0 mt-0.5"
          />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`Tiến độ sử dụng hạn mức Vòng xoay tháng: ${percent}% (Trần 1.5x Daily Bonus)`}>
      <div className="w-full text-right">
        <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-xs">{formattedBonus}</span>
        {percent > 0 ? (
          <Progress
            percent={percent}
            size="small"
            strokeColor={token.colorSuccess}
            showInfo={false}
            className="m-0 mt-0.5"
          />
        ) : null}
      </div>
    </Tooltip>
  );
}
