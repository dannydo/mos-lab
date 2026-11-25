'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import type { CvXoayRecord } from '@mos-lab/shared';
import { AdaptiveDrawer, StatusTag } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { CvlRoleBadge } from './cvXoayColumns';
import {
  calculateProjectedCvXoay,
  formatStoreCode,
  isCvLStaff,
  type CvLeaderboardRow,
  type CvXoayForecast,
} from './cvXoayUtils';

interface CvXoayMobileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  row: CvLeaderboardRow | null;
  records: CvXoayRecord[];
  forecast: CvXoayForecast;
}

/** Apple iOS Bottom Sheet displaying a CV technician's individual Xoay shifts & bonus forecast. */
export const CvXoayMobileDetailSheet: React.FC<CvXoayMobileDetailSheetProps> = ({
  open,
  onClose,
  row,
  records,
  forecast,
}) => {
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    setLimit(50);
  }, [row?.techName]);

  const visibleRecords = useMemo(() => records.slice(0, limit), [records, limit]);
  const showMonthlyProjection = forecast.isMonthMode && !forecast.isPastPeriod && !forecast.isDayMode;
  const projectedBonus =
    row && showMonthlyProjection
      ? calculateProjectedCvXoay(row.totalServices || 0, row.totalBonus || 0, forecast.ratio || 1)
      : 0;

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="82dvh"
      zIndex={990}
      title={
        row ? (
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <CcAvatar name={row.techName} src={row.avatar} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                <span className="truncate">{row.techName}</span>
                {isCvLStaff(row.techName) && <CvlRoleBadge />}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate tabular-nums">
                {formatStoreCode(row.store)} · L{row.techLevel} · {(row.maxPointsAccu || 0).toLocaleString('vi-VN')} pts
              </div>
            </div>
          </div>
        ) : (
          'Chi tiết CV Xoay'
        )
      }
    >
      {row && (
        <div data-testid="cv-xoay-mobile-detail-sheet" className="space-y-3 pb-4">
          <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08] rounded-2xl px-3 py-2.5 bg-slate-100/85 border border-slate-200/75 dark:bg-white/[0.05] dark:border-white/[0.08]">
            <div className="pr-2 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Bộ Mi</div>
              <div className="text-base font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {row.totalServices} Bộ
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Hạng #{row.rank}</div>
            </div>

            <div className="px-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">∑ Điểm Xoay</div>
              <div className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                +{row.totalPoints}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                Tích lũy {row.maxPointsAccu}
              </div>
            </div>

            <div className="pl-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">∑ Thưởng</div>
              <div className="text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate">
                +{formatCompactVND(row.totalBonus || 0)}
              </div>
              {projectedBonus > 0 ? (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                  ~{formatCompactVND(projectedBonus)}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Trong kỳ</div>
              )}
            </div>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
            Chi tiết ca làm · {records.length} lượt
          </div>

          {visibleRecords.length === 0 ? (
            <div className="rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
              Chưa có ca làm Xoay chi tiết trong kỳ này.
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleRecords.map((rec) => (
                <div
                  key={rec.orderServiceId}
                  className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 bg-white border border-slate-200/80 dark:bg-white/[0.04] dark:border-white/[0.08]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {rec.clientName}
                      </span>
                      <StatusTag
                        status={rec.serviceType === 'Retain' ? 'gold' : 'processing'}
                        label={rec.serviceType === 'Retain' ? 'Retain' : 'Normal'}
                        className="text-[10px] py-0 px-1.5 shrink-0"
                      />
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                      {rec.checkin} · {rec.serviceName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      +{Math.round(rec.techBonus || 0).toLocaleString('vi-VN')}&nbsp;đ
                    </div>
                    <div className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{rec.techPoints} pts
                    </div>
                  </div>
                </div>
              ))}
              {records.length > limit && (
                <Button block onClick={() => setLimit((prev) => prev + 50)}>
                  Xem thêm ({records.length - limit} lượt còn lại)
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </AdaptiveDrawer>
  );
};
