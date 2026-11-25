'use client';

import { useMemo, useState } from 'react';
import { Button, Input, Progress, theme } from 'antd';
import { ChevronRight, Search, Trophy, X } from 'lucide-react';
import { removeVietnameseTones, type CvTipLeaderboardEntry } from '@mos-lab/shared';
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
  onInspectCvMobile?: (entry: CvTipLeaderboardEntry) => void;
}

export function CvTipLeaderboardCard({
  leaderboard,
  loading,
  isMobile,
  selectedCvName,
  forecast,
  onSelectCv,
  onInspectCvMobile,
}: CvTipLeaderboardCardProps) {
  const { token } = theme.useToken();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchText, setMobileSearchText] = useState('');
  const columns = useMemo(() => buildCvTipLeaderboardColumns({ selectedCvName, forecast }), [selectedCvName, forecast]);

  const filteredLeaderboard = useMemo(() => {
    if (!isMobile || !mobileSearchText.trim()) return leaderboard;
    const query = removeVietnameseTones(mobileSearchText.trim());
    return leaderboard.filter(
      (row) =>
        removeVietnameseTones(row.displayName).includes(query) ||
        removeVietnameseTones(formatStoreCode(row.store)).includes(query)
    );
  }, [isMobile, leaderboard, mobileSearchText]);

  if (isMobile) {
    return (
      <section aria-label="Xếp hạng CV Tip" className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Xếp hạng Tip · {filteredLeaderboard.length}
          </span>
          <div className="flex items-center gap-1.5">
            {selectedCvName && (
              <button
                type="button"
                onClick={() => onSelectCv(null)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 cursor-pointer active:scale-95"
              >
                <span>Lọc: {selectedCvName}</span>
                <AppIcon icon={X} size={11} aria-hidden />
              </button>
            )}
            <button
              type="button"
              aria-label="Tìm chuyên viên Tip"
              onClick={() => {
                if (searchOpen && mobileSearchText) setMobileSearchText('');
                setSearchOpen((prev) => !prev);
              }}
              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                searchOpen || mobileSearchText
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-amber-400 dark:border-amber-400 dark:text-slate-950'
                  : 'bg-slate-100 border-slate-200/80 text-slate-600 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-slate-300'
              }`}
            >
              <AppIcon icon={Search} size={12} aria-hidden />
            </button>
          </div>
        </div>

        {searchOpen && (
          <Input
            id="cv-tip-mobile-search"
            placeholder="Tìm tên CV hoặc Salon..."
            prefix={<AppIcon icon={Search} size={13} className="text-slate-400" />}
            value={mobileSearchText}
            onChange={(e) => setMobileSearchText(e.target.value)}
            allowClear
            size="middle"
            className="rounded-xl"
          />
        )}

        <MobileRecordList
          records={filteredLeaderboard}
          loading={loading}
          getKey={(record) => String(record.technicianId)}
          className="cv-tip-mobile-record-list space-y-2"
          recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
          getRecordClassName={(record) =>
            selectedCvName === record.displayName ? '!ring-1 !ring-amber-400/70 !bg-amber-500/10' : ''
          }
          emptyDescription="Chưa có dữ liệu xếp hạng CV Tip"
          renderRecord={(record) => {
            const isSelected = selectedCvName === record.displayName;
            const tipRate = record.tipRatePercent || 0;

            return (
              <button
                type="button"
                className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
                aria-pressed={isSelected}
                onClick={() =>
                  onInspectCvMobile ? onInspectCvMobile(record) : onSelectCv(isSelected ? null : record.displayName)
                }
              >
                {/* Top Row: Medal + Avatar + Name/Store on Left | Hero % Tip + Visits + Chevron on Right */}
                <div className="flex items-center justify-between gap-2.5 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                      {renderRankCell(record.rank)}
                    </span>
                    <CcAvatar name={record.displayName} src={record.avatar} size={36} isSelected={isSelected} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                          {record.displayName}
                        </span>
                        {isCvLStaff(record.displayName) && <CvlRoleBadge />}
                      </div>
                      <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatStoreCode(record.store)} · {record.totalVisits} lượt
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right">
                      <div
                        data-cv-tip-rate={tipRate}
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
                    strokeColor={tipRate >= 15 ? token.colorSuccess : token.colorInfo}
                    showInfo={false}
                    className="m-0 block leading-none [&_.ant-progress-inner]:!h-[3px] [&_.ant-progress-bg]:!h-[3px]"
                  />
                </div>

                {/* Bottom 3-col hairline row */}
                <dl className="mt-2.5 pt-2 border-t border-slate-200/75 dark:border-white/[0.07] grid grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Phục vụ</dt>
                    <dd className="truncate text-[13.5px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                      {record.totalVisits} lượt
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Tip KH</dt>
                    <dd className="truncate text-[13.5px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCompactVND(record.totalCustomerTipAmount || 0)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Thưởng CV</dt>
                    <dd className="truncate text-[13.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCompactVND(record.totalCvTipBonus || 0)}
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
    </SectionCard>
  );
}
