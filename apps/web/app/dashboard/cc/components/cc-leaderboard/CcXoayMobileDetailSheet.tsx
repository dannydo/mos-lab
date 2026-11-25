'use client';

import React, { useMemo, useState } from 'react';
import { Button } from 'antd';
import { type CcLeaderboardEntry, type CcXoayRecord, calculateWheelBonusCap } from '@mos-lab/shared';
import { AdaptiveDrawer, StatusTag } from '~/components/ui';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { fmtVnd } from './cc-leaderboard-utils';

interface CcXoayMobileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  consultant: CcLeaderboardEntry | null;
  records: CcXoayRecord[];
}

export const CcXoayMobileDetailSheet: React.FC<CcXoayMobileDetailSheetProps> = ({
  open,
  onClose,
  consultant,
  records,
}) => {
  const [limit, setLimit] = useState(50);

  const visibleRecords = useMemo(() => records.slice(0, limit), [records, limit]);
  const cap = consultant
    ? calculateWheelBonusCap(consultant.monthlyDailyBonus || 0, consultant.monthlyWheelBonus || 0)
    : null;
  const level = consultant ? consultant.level || Math.floor((consultant.totalPointsAccu || 0) / 100) + 1 : 1;

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="82dvh"
      zIndex={990}
      title={
        consultant ? (
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <CcAvatar name={consultant.displayName} src={consultant.avatar} size={32} />
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {consultant.displayName}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {formatStoreCode(consultant.store)} · Lv.{level} ·{' '}
                {(consultant.totalPointsAccu || 0).toLocaleString('vi-VN')} pts
              </div>
            </div>
          </div>
        ) : (
          'Chi tiết CC Xoay'
        )
      }
    >
      {consultant && cap && (
        <div data-testid="cc-xoay-mobile-detail-sheet" className="space-y-3 pb-4">
          <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08] rounded-2xl px-3 py-2.5 bg-slate-100/85 border border-slate-200/75 dark:bg-white/[0.05] dark:border-white/[0.08]">
            <div className="pr-2 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Khách / DV</div>
              <div className="text-base font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {consultant.totalCheckins}/{consultant.totalServices || 0}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Lv.{level}</div>
            </div>

            <div className="px-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Thưởng Xoay</div>
              <div
                className={`text-base font-bold tabular-nums truncate ${
                  cap.capStatus === 'HARDCAPPED'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {formatCompactVND(cap.effectiveWheelBonus)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                Gốc {formatCompactVND(cap.rawWheelBonus)}
              </div>
            </div>

            <div className="pl-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Trần 1.5×</div>
              <div
                className={`text-base font-bold tabular-nums ${
                  cap.capStatus === 'HARDCAPPED'
                    ? 'text-rose-600 dark:text-rose-400'
                    : cap.capStatus === 'WARNING'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {cap.wheelCapPercent}%
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                Max {formatCompactVND(cap.maxWheelBonusAllowed)}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
            Lượt dịch vụ Xoay · {records.length} lượt
          </div>

          {visibleRecords.length === 0 ? (
            <div className="rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
              Chưa có lượt dịch vụ Xoay chi tiết trong kỳ này.
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleRecords.map((rec) => (
                <div
                  key={`${rec.orderId}-${rec.serviceId}-${rec.checkin}`}
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
                      +{fmtVnd(rec.consultantBonus)}&nbsp;đ
                    </div>
                    <div className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{rec.consultantPoints} pts
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
