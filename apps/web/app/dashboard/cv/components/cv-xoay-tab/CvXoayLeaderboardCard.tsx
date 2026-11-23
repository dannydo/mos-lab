'use client';

import { useMemo } from 'react';
import { Button } from 'antd';
import { Filter, Trophy } from 'lucide-react';
import { AppIcon, DataTable, MobileRecordList, SectionCard } from '~/components/ui';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { buildCvXoayLeaderboardColumns, CvlRoleBadge } from './cvXoayColumns';
import { formatStoreCode, isCvLStaff, type CvLeaderboardRow, type CvXoayForecast } from './cvXoayUtils';

export interface CvXoayLeaderboardCardProps {
  leaderboard: CvLeaderboardRow[];
  loading: boolean;
  isMobile: boolean;
  selectedCvName: string | null;
  searchText: string;
  forecast: CvXoayForecast;
  onToggleSelectedCv: (techName: string) => void;
  onClearSelectedCv: () => void;
}

export function CvXoayLeaderboardCard({
  leaderboard,
  loading,
  isMobile,
  selectedCvName,
  searchText,
  forecast,
  onToggleSelectedCv,
  onClearSelectedCv,
}: CvXoayLeaderboardCardProps) {
  const columns = useMemo(() => buildCvXoayLeaderboardColumns({ searchText, forecast }), [searchText, forecast]);

  return (
    <SectionCard
      bodyPadding={0}
      className="full-bleed-card shadow-sm mb-4 rounded-xl"
      title={
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <AppIcon icon={Trophy} size={18} className="text-amber-500 shrink-0" />
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">
              Bảng Xếp Hạng Báo Cáo Chuyên Viên (CV Leaderboard)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <AppIcon icon={Filter} size={14} className="text-blue-500 shrink-0" />
            <span>Mẹo: Click vào dòng CV để lọc nhanh bảng chi tiết ca làm bên dưới</span>
          </div>
        </div>
      }
      extra={
        selectedCvName ? (
          <Button type="dashed" size="small" onClick={onClearSelectedCv} className="text-xs font-medium">
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
            getKey={(record) => record.techName}
            emptyDescription="Chưa có dữ liệu xếp hạng Chuyên viên"
            renderRecord={(record) => {
              const isSelected = selectedCvName?.toLowerCase() === record.techName.toLowerCase();
              return (
                <button
                  type="button"
                  className={`w-full min-w-0 text-left ${
                    isSelected ? 'rounded-lg bg-amber-500/10 ring-1 ring-amber-400/60' : ''
                  }`}
                  aria-pressed={isSelected}
                  onClick={() => onToggleSelectedCv(record.techName)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500 dark:text-amber-400">
                      {record.rank === 1
                        ? '🥇'
                        : record.rank === 2
                          ? '🥈'
                          : record.rank === 3
                            ? '🥉'
                            : `#${record.rank}`}
                    </span>
                    <CcAvatar name={record.techName} src={record.avatar} size={32} isSelected={isSelected} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <span>{record.techName}</span>
                        {isCvLStaff(record.techName) && <CvlRoleBadge />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatStoreCode(record.store)} · L{record.techLevel}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-amber-500 dark:text-amber-400">
                      {isSelected ? 'Đang lọc' : 'Xem'}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Bộ Mi</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-purple-600 dark:text-purple-400">
                        {record.totalServices} Bộ
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">∑ Điểm Xoay</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400">
                        +{record.totalPoints}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thưởng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {Math.round(record.totalBonus || 0).toLocaleString('vi-VN')}
                        {'\u00a0'}đ
                      </dd>
                    </div>
                  </dl>
                </button>
              );
            }}
          />
        </div>
      ) : (
        <DataTable<CvLeaderboardRow>
          dataSource={leaderboard}
          columns={columns}
          rowKey="techName"
          size="small"
          pagination={false}
          loading={loading}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Chưa có dữ liệu xếp hạng Chuyên viên' }}
          onRow={(record) => ({
            onClick: () => onToggleSelectedCv(record.techName),
          })}
          rowClassName={(record) =>
            selectedCvName && selectedCvName.toLowerCase() === record.techName.toLowerCase()
              ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
              : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }
        />
      )}
    </SectionCard>
  );
}
