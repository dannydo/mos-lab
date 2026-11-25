'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import type { CvTipLeaderboardEntry, CvTipRecord } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, StatusTag } from '~/components/ui';
import { apiClient } from '~/lib/api-client';
import { formatCompactVND } from '~/lib/format-utils';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { CvlRoleBadge } from './cvTipColumns';
import { formatStoreCode, isCvLStaff } from './cvTipUtils';

interface CvTipMobileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  entry: CvTipLeaderboardEntry | null;
  dateRange?: [Dayjs, Dayjs];
  selectedStore: string;
  onOpenCustomerHistory: (rec: CvTipRecord) => void;
}

type MobileTipFilter = 'ALL' | 'Tipped' | 'Small Change' | 'No Tip';

const FILTER_OPTIONS: ReadonlyArray<{ key: MobileTipFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Tipped', label: 'Có Tip' },
  { key: 'Small Change', label: 'Tiền lẻ' },
  { key: 'No Tip', label: 'Không Tip' },
];

/** Apple iOS Bottom Sheet displaying a CV technician's tip/no-tip visits with quick status pills. */
export const CvTipMobileDetailSheet: React.FC<CvTipMobileDetailSheetProps> = ({
  open,
  onClose,
  entry,
  dateRange,
  selectedStore,
  onOpenCustomerHistory,
}) => {
  const [statusFilter, setStatusFilter] = useState<MobileTipFilter>('ALL');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<CvTipRecord[]>([]);

  useEffect(() => {
    if (!open || !entry?.displayName) return;
    let cancelled = false;
    setStatusFilter('ALL');
    setLoading(true);

    const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
    const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

    apiClient.kpi
      .getCvTipRecords({
        dateFrom,
        dateTo,
        storeId: selectedStore,
        consultantId: entry.displayName,
        tipFilter: 'ALL',
        page: 1,
        limit: 100,
        includeSummary: false,
      })
      .then((res) => {
        if (!cancelled) {
          setRecords(res?.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, entry?.displayName, dateRange, selectedStore]);

  const visibleRecords = useMemo(() => {
    const filtered = statusFilter === 'ALL' ? records : records.filter((r) => r.tipStatus === statusFilter);
    return filtered.slice(0, 60);
  }, [records, statusFilter]);

  const tipRate = entry?.tipRatePercent || 0;

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="82dvh"
      zIndex={990}
      title={
        entry ? (
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <CcAvatar name={entry.displayName} src={entry.avatar} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                <span className="truncate">{entry.displayName}</span>
                {isCvLStaff(entry.displayName) && <CvlRoleBadge />}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate tabular-nums">
                {formatStoreCode(entry.store)} · {entry.tippedVisits}/{entry.totalVisits} lượt Tip
              </div>
            </div>
          </div>
        ) : (
          'Chi tiết Tip CV'
        )
      }
    >
      {entry && (
        <div data-testid="cv-tip-mobile-detail-sheet" className="space-y-3 pb-4">
          <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08] rounded-2xl px-3 py-2.5 bg-slate-100/85 border border-slate-200/75 dark:bg-white/[0.05] dark:border-white/[0.08]">
            <div className="pr-2 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">% Tip</div>
              <div className="text-base font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{tipRate}%</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {entry.tippedVisits}/{entry.totalVisits} lượt
              </div>
            </div>
            <div className="px-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Tip KH</div>
              <div className="text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate">
                {formatCompactVND(entry.totalCustomerTipAmount || 0)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Khách tip</div>
            </div>
            <div className="pl-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Thưởng CV</div>
              <div className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                +{formatCompactVND(entry.totalCvTipBonus || 0)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">CV nhận</div>
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

          {loading ? (
            <div className="rounded-2xl p-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
              <AppIcon icon={Loader2} size={14} className="animate-spin text-amber-500" aria-hidden />
              <span>Đang tải lượt phục vụ...</span>
            </div>
          ) : visibleRecords.length === 0 ? (
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
                  <button
                    key={`${rec.orderId}-${rec.serviceId}-${rec.checkinTime}`}
                    type="button"
                    onClick={() => onOpenCustomerHistory(rec)}
                    className="w-full text-left rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 bg-white border border-slate-200/80 dark:bg-white/[0.04] dark:border-white/[0.08] cursor-pointer active:scale-[0.99] transition-transform"
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
                        {rec.cvTipAmount > 0 ? `+${formatCompactVND(rec.cvTipAmount)}` : '0 đ'}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                        KH {formatCompactVND(rec.totalCustomerTip || 0)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AdaptiveDrawer>
  );
};
