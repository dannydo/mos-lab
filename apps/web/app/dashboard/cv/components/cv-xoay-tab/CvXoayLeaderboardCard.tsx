'use client';

import { useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import { ChevronRight, Filter, Search, Trophy, X } from 'lucide-react';
import { removeVietnameseTones } from '@mos-lab/shared';
import { AppIcon, DataTable, MobileRecordList, SectionCard } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { buildCvXoayLeaderboardColumns, CvlRoleBadge } from './cvXoayColumns';
import {
  calculateProjectedCvXoay,
  formatStoreCode,
  isCvLStaff,
  type CvLeaderboardRow,
  type CvXoayForecast,
} from './cvXoayUtils';

export interface CvXoayLeaderboardCardProps {
  leaderboard: CvLeaderboardRow[];
  loading: boolean;
  isMobile: boolean;
  selectedCvName: string | null;
  searchText: string;
  forecast: CvXoayForecast;
  onToggleSelectedCv: (techName: string) => void;
  onClearSelectedCv: () => void;
  onInspectCvMobile?: (row: CvLeaderboardRow) => void;
  onSearchTextChange?: (value: string) => void;
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
  onInspectCvMobile,
  onSearchTextChange,
}: CvXoayLeaderboardCardProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const columns = useMemo(() => buildCvXoayLeaderboardColumns({ searchText, forecast }), [searchText, forecast]);

  const filteredLeaderboard = useMemo(() => {
    if (!isMobile || !searchText.trim()) return leaderboard;
    const query = removeVietnameseTones(searchText.trim());
    return leaderboard.filter(
      (row) =>
        removeVietnameseTones(row.techName).includes(query) ||
        removeVietnameseTones(formatStoreCode(row.store)).includes(query)
    );
  }, [isMobile, leaderboard, searchText]);

  const showMonthlyProjection = forecast.isMonthMode && !forecast.isPastPeriod && !forecast.isDayMode;

  if (isMobile) {
    return (
      <section aria-label="Xếp hạng CV Xoay" className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Xếp hạng Xoay · {filteredLeaderboard.length}
          </span>
          <div className="flex items-center gap-1.5">
            {selectedCvName && (
              <button
                type="button"
                onClick={onClearSelectedCv}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 cursor-pointer active:scale-95"
              >
                <span>Lọc: {selectedCvName}</span>
                <AppIcon icon={X} size={11} aria-hidden />
              </button>
            )}
            {onSearchTextChange && (
              <button
                type="button"
                aria-label="Tìm chuyên viên"
                onClick={() => {
                  if (searchOpen && searchText) onSearchTextChange('');
                  setSearchOpen((prev) => !prev);
                }}
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  searchOpen || searchText
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-amber-400 dark:border-amber-400 dark:text-slate-950'
                    : 'bg-slate-100 border-slate-200/80 text-slate-600 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-slate-300'
                }`}
              >
                <AppIcon icon={Search} size={12} aria-hidden />
              </button>
            )}
          </div>
        </div>

        {searchOpen && onSearchTextChange && (
          <Input
            id="cv-xoay-mobile-search"
            placeholder="Tìm tên CV hoặc Salon..."
            prefix={<AppIcon icon={Search} size={13} className="text-slate-400" />}
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            allowClear
            size="middle"
            className="rounded-xl"
          />
        )}

        <MobileRecordList
          records={filteredLeaderboard}
          loading={loading}
          getKey={(record) => record.techName}
          className="cv-xoay-mobile-record-list space-y-2"
          recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
          getRecordClassName={(record) =>
            selectedCvName?.toLowerCase() === record.techName.toLowerCase()
              ? '!ring-1 !ring-amber-400/70 !bg-amber-500/10'
              : ''
          }
          emptyDescription="Chưa có dữ liệu xếp hạng Chuyên viên"
          renderRecord={(record) => {
            const isSelected = selectedCvName?.toLowerCase() === record.techName.toLowerCase();
            const projectedBonus = showMonthlyProjection
              ? calculateProjectedCvXoay(record.totalServices || 0, record.totalBonus || 0, forecast.ratio || 1)
              : 0;

            return (
              <button
                type="button"
                className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
                aria-pressed={isSelected}
                onClick={() => (onInspectCvMobile ? onInspectCvMobile(record) : onToggleSelectedCv(record.techName))}
              >
                {/* Top Row: Medal + Avatar + Name/Store/Level on Left | Hero Bonus + Forecast + Chevron on Right */}
                <div className="flex items-center justify-between gap-2.5 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                      {record.rank === 1
                        ? '🥇'
                        : record.rank === 2
                          ? '🥈'
                          : record.rank === 3
                            ? '🥉'
                            : `#${record.rank}`}
                    </span>
                    <CcAvatar name={record.techName} src={record.avatar} size={36} isSelected={isSelected} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                          {record.techName}
                        </span>
                        {isCvLStaff(record.techName) && <CvlRoleBadge />}
                      </div>
                      <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatStoreCode(record.store)} · L{record.techLevel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right">
                      <div className="text-[17px] font-bold leading-none tabular-nums text-amber-600 dark:text-amber-400">
                        +{formatCompactVND(record.totalBonus || 0)}
                      </div>
                      {projectedBonus > 0 && (
                        <div className="mt-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                          ~{formatCompactVND(projectedBonus)}
                        </div>
                      )}
                    </div>
                    <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
                  </div>
                </div>

                {/* Bottom 3-col hairline row */}
                <dl className="mt-2.5 pt-2 border-t border-slate-200/75 dark:border-white/[0.07] grid grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Bộ Mi</dt>
                    <dd className="truncate text-[13.5px] font-bold tabular-nums text-purple-600 dark:text-purple-400">
                      {record.totalServices} Bộ
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">∑ Điểm Xoay</dt>
                    <dd className="truncate text-[13.5px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                      +{record.totalPoints}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Tích lũy</dt>
                    <dd className="truncate text-[13.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {(record.maxPointsAccu || 0).toLocaleString('vi-VN')} pts
                    </dd>
                  </div>
                </dl>
              </button>
            );
          }}
        />
      </section>
    );
  }

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
    </SectionCard>
  );
}
