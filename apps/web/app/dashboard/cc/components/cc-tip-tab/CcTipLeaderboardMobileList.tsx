'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { ChevronRight } from 'lucide-react';
import type { CcTipLeaderboardEntry } from '@mos-lab/shared';
import { AppIcon, MobileRecordList } from '~/components/ui';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { formatTipRankBadge } from './cc-tip-utils';

interface CcTipLeaderboardMobileListProps {
  records: CcTipLeaderboardEntry[];
  loading: boolean;
  selectedCcName: string | null;
  onSelectConsultant: (consultantName: string) => void;
  onInspectConsultantMobile?: (entry: CcTipLeaderboardEntry) => void;
}

export function CcTipLeaderboardMobileList({
  records,
  loading,
  selectedCcName,
  onSelectConsultant,
  onInspectConsultantMobile,
}: CcTipLeaderboardMobileListProps) {
  const { token } = theme.useToken();

  return (
    <MobileRecordList
      records={records}
      loading={loading}
      getKey={(record) => String(record.consultantId)}
      className="space-y-2"
      recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
      getRecordClassName={(record) =>
        selectedCcName === record.displayName ? '!ring-1 !ring-amber-400/70 !bg-amber-500/10' : ''
      }
      emptyDescription="Chưa có dữ liệu xếp hạng CC Tip"
      renderRecord={(record) => {
        const isSelected = selectedCcName === record.displayName;
        const tipRate = record.tipRatePercent || 0;

        return (
          <button
            type="button"
            className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
            aria-pressed={isSelected}
            onClick={() =>
              onInspectConsultantMobile ? onInspectConsultantMobile(record) : onSelectConsultant(record.displayName)
            }
          >
            {/* Top Row: Medal + Avatar + Name/Visits on Left | Hero % Tip + Chevron on Right */}
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                  {formatTipRankBadge(record.rank)}
                </span>
                <CcAvatar name={record.displayName} src={record.avatar} isSelected={isSelected} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {record.displayName}
                  </div>
                  <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatStoreCode(record.store)} · {record.totalVisits} lượt
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right">
                  <div
                    data-cc-tip-rate={tipRate}
                    className="text-[18px] font-bold leading-none tabular-nums text-cyan-600 dark:text-cyan-400"
                  >
                    {tipRate}%
                  </div>
                  <div className="mt-0.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {record.tippedVisits}/{record.totalVisits} lượt
                  </div>
                </div>
                <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
              </div>
            </div>

            {/* Slim 3px Progress Bar */}
            <div className="mt-2.5">
              <Progress
                percent={Math.min(100, Math.max(0, tipRate))}
                size="small"
                strokeColor={tipRate >= 10 ? token.colorInfo : token.colorPrimary}
                showInfo={false}
                className="m-0 block leading-none [&_.ant-progress-inner]:!h-[3px] [&_.ant-progress-bg]:!h-[3px]"
              />
            </div>

            {/* Bottom 3-col hairline row */}
            <dl className="mt-2.5 pt-2 border-t border-slate-200/75 dark:border-white/[0.07] grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Khách Tip</dt>
                <dd className="truncate text-[13.5px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                  {record.tippedVisits}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Tip KH</dt>
                <dd className="truncate text-[13.5px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCompactVND(record.totalCustomerTipAmount || 0)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Thưởng CC</dt>
                <dd className="truncate text-[13.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatCompactVND(record.totalCcTipBonus || 0)}
                </dd>
              </div>
            </dl>
          </button>
        );
      }}
    />
  );
}
