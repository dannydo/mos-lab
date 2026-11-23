'use client';

import { useMemo } from 'react';
import { Button } from 'antd';
import { Trophy } from 'lucide-react';
import type { CvTipLeaderboardEntry } from '@mos-lab/shared';
import { AppIcon, DataTable, MobileRecordList, SectionCard } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { buildCvTipLeaderboardColumns, CvlRoleBadge, renderRankCell } from './cvTipColumns';
import { formatStoreCode, isCvLStaff, type CvTipForecast } from './cvTipUtils';

export interface CvTipLeaderboardCardProps {
  leaderboard: CvTipLeaderboardEntry[];
  loading: boolean;
  isMobile: boolean;
  selectedCvName: string | null;
  forecast: CvTipForecast;
  onSelectCv: (nextCvName: string | null) => void;
}

export function CvTipLeaderboardCard({
  leaderboard,
  loading,
  isMobile,
  selectedCvName,
  forecast,
  onSelectCv,
}: CvTipLeaderboardCardProps) {
  const columns = useMemo(() => buildCvTipLeaderboardColumns({ selectedCvName, forecast }), [selectedCvName, forecast]);

  return (
    <SectionCard
      bodyPadding={0}
      className="full-bleed-card shadow-sm mb-4 rounded-xl"
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Trophy} size={18} className="text-amber-500 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-slate-100">Bảng Xếp Hạng CV Tip</span>
        </div>
      }
      extra={
        selectedCvName ? (
          <Button type="dashed" size="small" onClick={() => onSelectCv(null)} className="text-xs font-medium">
            Bỏ lọc: {selectedCvName}
          </Button>
        ) : null
      }
    >
      {isMobile ? (
        <div className="p-3">
          <MobileRecordList
            records={leaderboard}
            loading={loading}
            getKey={(record) => String(record.technicianId)}
            getRecordClassName={(record) =>
              selectedCvName === record.displayName ? 'responsive-mobile-record-card-selected' : ''
            }
            emptyDescription="Chưa có dữ liệu xếp hạng CV Tip"
            renderRecord={(record) => {
              const isSelected = selectedCvName === record.displayName;
              const toggleSelection = () => {
                onSelectCv(isSelected ? null : record.displayName);
              };

              return (
                <button
                  type="button"
                  className="w-full min-w-0 text-left"
                  aria-pressed={isSelected}
                  onClick={toggleSelection}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500 dark:text-amber-400">
                      {renderRankCell(record.rank)}
                    </span>
                    <CcAvatar name={record.displayName} src={record.avatar} size={32} isSelected={isSelected} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <span>{record.displayName}</span>
                        {isCvLStaff(record.displayName) && <CvlRoleBadge />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{formatStoreCode(record.store)}</div>
                    </div>
                    <span className="shrink-0 text-xs text-amber-500 dark:text-amber-400">
                      {isSelected ? 'Đang lọc' : 'Xem'}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Phục vụ</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400">
                        {record.totalVisits}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Tip</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                        {record.tippedVisits} · {record.tipRatePercent}%
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thưởng</dt>
                      <dd className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatCompactVND(record.totalCvTipBonus || 0)}
                      </dd>
                    </div>
                  </dl>
                </button>
              );
            }}
          />
        </div>
      ) : (
        <DataTable<CvTipLeaderboardEntry>
          dataSource={leaderboard}
          columns={columns}
          rowKey="technicianId"
          loading={loading}
          pagination={false}
          size="small"
          onRow={(record) => ({
            onClick: () => {
              const name = record.displayName;
              onSelectCv(selectedCvName === name ? null : name);
            },
          })}
          rowClassName={(record) =>
            selectedCvName === record.displayName
              ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
              : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }
        />
      )}
    </SectionCard>
  );
}
