'use client';

import React from 'react';
import type { CcTipLeaderboardEntry } from '@mos-lab/shared';
import { MobileRecordList } from '~/components/ui';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { formatTipRankBadge } from './cc-tip-utils';

interface CcTipLeaderboardMobileListProps {
  records: CcTipLeaderboardEntry[];
  loading: boolean;
  selectedCcName: string | null;
  onSelectConsultant: (consultantName: string) => void;
}

export function CcTipLeaderboardMobileList({
  records,
  loading,
  selectedCcName,
  onSelectConsultant,
}: CcTipLeaderboardMobileListProps) {
  return (
    <div className="p-3">
      <MobileRecordList
        records={records}
        loading={loading}
        getKey={(record) => String(record.consultantId)}
        getRecordClassName={(record) =>
          selectedCcName === record.displayName ? 'rounded-lg bg-amber-500/10 ring-1 ring-amber-400/60' : ''
        }
        emptyDescription="Chưa có dữ liệu xếp hạng CC Tip"
        renderRecord={(record) => {
          const isSelected = selectedCcName === record.displayName;
          return (
            <button
              type="button"
              className="w-full min-w-0 text-left"
              aria-pressed={isSelected}
              onClick={() => onSelectConsultant(record.displayName)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  {formatTipRankBadge(record.rank)}
                </span>
                <CcAvatar name={record.displayName} src={record.avatar} isSelected={isSelected} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {record.displayName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{formatStoreCode(record.store)}</div>
                </div>
                <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
                  {isSelected ? 'Đang lọc' : 'Xem'}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500 dark:text-slate-400">Phục vụ</dt>
                  <dd className="truncate text-sm font-bold tabular-nums text-sky-700 dark:text-sky-400">
                    {record.totalVisits}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500 dark:text-slate-400">Tip</dt>
                  <dd className="truncate text-sm font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
                    {record.tippedVisits} · {record.tipRatePercent}%
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500 dark:text-slate-400">Thưởng</dt>
                  <dd className="truncate text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{formatCompactVND(record.totalCcTipBonus || 0)}
                  </dd>
                </div>
              </dl>
            </button>
          );
        }}
      />
    </div>
  );
}
