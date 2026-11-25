'use client';

import React, { useMemo, useState } from 'react';
import type { CcTipLeaderboardEntry, CcTipRecord } from '@mos-lab/shared';
import { AdaptiveDrawer, StatusTag } from '~/components/ui';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { formatSignedTipVnd, formatTipVnd } from './cc-tip-utils';

interface CcTipMobileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  consultant: CcTipLeaderboardEntry | null;
  records: CcTipRecord[];
}

type MobileTipFilter = 'ALL' | 'Tipped' | 'Small Change' | 'No Tip';

const FILTER_OPTIONS: ReadonlyArray<{ key: MobileTipFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Tipped', label: 'Có Tip' },
  { key: 'Small Change', label: 'Tiền lẻ' },
  { key: 'No Tip', label: 'Không Tip' },
];

export const CcTipMobileDetailSheet: React.FC<CcTipMobileDetailSheetProps> = ({
  open,
  onClose,
  consultant,
  records,
}) => {
  const [statusFilter, setStatusFilter] = useState<MobileTipFilter>('ALL');

  const visibleRecords = useMemo(() => {
    const filtered = statusFilter === 'ALL' ? records : records.filter((r) => r.tipStatus === statusFilter);
    return filtered.slice(0, 60);
  }, [records, statusFilter]);

  const tipRate = consultant?.tipRatePercent || 0;

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
                {formatStoreCode(consultant.store)} · {consultant.tippedVisits}/{consultant.totalVisits} lượt Tip
              </div>
            </div>
          </div>
        ) : (
          'Chi tiết Tip CC'
        )
      }
    >
      {consultant && (
        <div data-testid="cc-tip-mobile-detail-sheet" className="space-y-3 pb-4">
          <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08] rounded-2xl px-3 py-2.5 bg-slate-100/85 border border-slate-200/75 dark:bg-white/[0.05] dark:border-white/[0.08]">
            <div className="pr-2 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">% Tip</div>
              <div className="text-base font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{tipRate}%</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {consultant.tippedVisits}/{consultant.totalVisits} lượt
              </div>
            </div>
            <div className="px-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Tip KH</div>
              <div className="text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate">
                {formatCompactVND(consultant.totalCustomerTipAmount || 0)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Khách tip</div>
            </div>
            <div className="pl-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Thưởng CC</div>
              <div className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                +{formatCompactVND(consultant.totalCcTipBonus || 0)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">CC nhận</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStatusFilter(opt.key)}
                  className={`shrink-0 h-7 px-3 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-amber-400 dark:border-amber-400 dark:text-slate-950'
                      : 'bg-slate-100 border-slate-200/80 text-slate-600 dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {visibleRecords.length === 0 ? (
            <div className="rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
              Không có lượt Tip phù hợp trong kỳ này.
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleRecords.map((rec) => {
                const statusType =
                  rec.tipStatus === 'Tipped' ? 'success' : rec.tipStatus === 'Small Change' ? 'gold' : 'default';
                const statusLabel =
                  rec.tipStatus === 'Tipped' ? 'Tip' : rec.tipStatus === 'Small Change' ? 'Tiền lẻ' : 'Không Tip';
                return (
                  <div
                    key={`${rec.orderId}-${rec.serviceId}-${rec.checkinTime}`}
                    className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 bg-white border border-slate-200/80 dark:bg-white/[0.04] dark:border-white/[0.08]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {rec.clientName}
                        </span>
                        <StatusTag
                          status={statusType}
                          label={statusLabel}
                          className="text-[10px] py-0 px-1.5 shrink-0"
                        />
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                        {rec.checkinTime} · {rec.serviceName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatSignedTipVnd(rec.ccTipAmount)}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                        KH {formatTipVnd(rec.totalCustomerTip)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AdaptiveDrawer>
  );
};
