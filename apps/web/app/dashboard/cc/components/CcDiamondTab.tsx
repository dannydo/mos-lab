'use client';

import React, { useMemo, useState } from 'react';
import { Input } from 'antd';
import { RefreshCw, Search, Trophy, X } from 'lucide-react';
import type { CcDiamondEntry } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import { CcMobileWalletStrip } from './CcMobileWalletStrip';
import CcDiamondDetailModal from './CcDiamondDetailModal';
import { CcDiamondMobileList } from './cc-diamond-tab/CcDiamondMobileList';
import { CcDiamondProgramBanner } from './cc-diamond-tab/CcDiamondProgramBanner';
import { CcDiamondSummaryCards } from './cc-diamond-tab/CcDiamondSummaryCards';
import { buildCcDiamondColumns } from './cc-diamond-tab/cc-diamond-columns';
import { DIAMOND_REWARD_TIERS, type CcDiamondTabProps } from './cc-diamond-tab/cc-diamond-utils';
import { useCcDiamondData } from './cc-diamond-tab/useCcDiamondData';
import { useCcMobilePortrait } from './useCcMobilePortrait';

export type { CcDiamondTabProps };

export default function CcDiamondTab({
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant = 'ALL',
  comparisonMode = 'month',
  onClearConsultant,
}: CcDiamondTabProps) {
  const { showMobilePortrait } = useCcMobilePortrait();
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const {
    loading,
    diamondData,
    searchText,
    handleSearchChange,
    setMobilePage,
    currentMobilePage,
    mobileDiamondRecords,
    selectedCcRecord,
    detailModalOpen,
    openDiamondDetail,
    closeDiamondDetail,
    fetchDiamondData,
    allDiamondRecords,
    filteredData,
    totalReferrals,
    totalBonus,
    topCc,
    rewardRecipientCount,
    isDayMode,
    periodNoun,
    elapsedRatioPercent,
    isPastPeriod,
    ratio,
    projectedReferrals,
    projectedBonus,
  } = useCcDiamondData({
    dateRange,
    selectedStore,
    selectedConsultant,
    comparisonMode,
  });

  const isConsultantFiltered = selectedConsultant !== 'ALL';
  const periodLabel = dateRange?.[0]?.format('MM/YYYY');
  const showForecast = !isDayMode && !isPastPeriod;

  const columns = useMemo(
    () =>
      buildCcDiamondColumns({
        isPastPeriod,
        isDayMode,
        ratio,
        periodNoun,
        onOpenDetail: openDiamondDetail,
      }),
    [isPastPeriod, isDayMode, ratio, periodNoun, openDiamondDetail]
  );

  return (
    <div className={showMobilePortrait ? 'flex flex-col gap-3' : 'flex flex-col gap-4'}>
      {showMobilePortrait ? (
        <>
          <CcMobileWalletStrip
            testId="cc-diamond-mobile-summary"
            ariaLabel="Tóm tắt thưởng Kim Cương CC"
            items={[
              {
                key: 'referrals',
                label: 'KH Kim Cương',
                value: `${totalReferrals.toLocaleString('vi-VN')} KH`,
                valueClassName: 'text-cyan-600 dark:text-cyan-400',
                subtext: showForecast ? `~${projectedReferrals} KH` : 'Khách mới',
              },
              {
                key: 'qualified',
                label: 'Đạt chuẩn ≥3%',
                value: `${rewardRecipientCount}/${allDiamondRecords.length}`,
                valueClassName: 'text-amber-600 dark:text-amber-400',
                subtext: 'CC nhận thưởng',
              },
              {
                key: 'bonus',
                label: '∑ Thưởng KC',
                value: formatCompactVND(totalBonus || 0),
                valueClassName: 'text-emerald-600 dark:text-emerald-400',
                subtext: showForecast ? `~${formatCompactVND(projectedBonus)}` : 'Kim Cương',
              },
            ]}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Kim Cương · {filteredData.length} CC
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRulesExpanded((prev) => !prev)}
                  className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer active:scale-95 ${
                    rulesExpanded
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                      : 'bg-white/90 border-slate-200/80 text-slate-600 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-slate-300'
                  }`}
                >
                  <AppIcon icon={Trophy} size={11} className="text-amber-500" />
                  <span>Thể lệ ≥3%</span>
                </button>
                <button
                  type="button"
                  aria-label={mobileSearchOpen ? 'Đóng tìm kiếm CC' : 'Tìm kiếm CC Kim Cương'}
                  onClick={() => {
                    if (mobileSearchOpen && searchText) handleSearchChange('');
                    setMobileSearchOpen((prev) => !prev);
                  }}
                  className="w-7 h-7 rounded-full border border-slate-200/80 bg-white/90 text-slate-600 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-300 flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  <AppIcon icon={mobileSearchOpen ? X : Search} size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Làm mới dữ liệu Kim Cương"
                  onClick={fetchDiamondData}
                  className="w-7 h-7 rounded-full border border-slate-200/80 bg-white/90 text-slate-600 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-300 flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  <AppIcon icon={RefreshCw} size={13} className={loading ? 'animate-spin' : undefined} />
                </button>
              </div>
            </div>

            {rulesExpanded && (
              <div className="rounded-2xl p-3 bg-white/95 border border-slate-200/80 dark:bg-white/[0.045] dark:border-white/[0.08] space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Mốc thưởng Kim Cương (yêu cầu ≥ 3% tổng lượt tiếp):
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIAMOND_REWARD_TIERS.map((tier) => (
                    <div
                      key={tier.label}
                      className={`rounded-xl px-2 py-1.5 border text-center ${
                        tier.featured
                          ? 'bg-amber-500/10 border-amber-500/35 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-50 border-slate-200/70 dark:bg-white/[0.03] dark:border-white/[0.07]'
                      }`}
                    >
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{tier.label}</div>
                      <div className="text-xs font-bold tabular-nums">{tier.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mobileSearchOpen && (
              <Input
                placeholder="Tìm tư vấn viên..."
                prefix={<AppIcon icon={Search} size={14} className="text-slate-500 dark:text-slate-400" />}
                value={searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
                autoFocus
              />
            )}

            {isConsultantFiltered && onClearConsultant && (
              <div className="px-1">
                <button
                  type="button"
                  onClick={onClearConsultant}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 cursor-pointer"
                >
                  <span>Đang lọc: {selectedConsultant}</span>
                  <AppIcon icon={X} size={11} />
                </button>
              </div>
            )}

            <CcDiamondMobileList
              records={mobileDiamondRecords}
              totalCount={filteredData.length}
              currentPage={currentMobilePage}
              loading={loading}
              onPageChange={setMobilePage}
              onOpenDetail={openDiamondDetail}
            />
          </div>
        </>
      ) : (
        <>
          <CcDiamondSummaryCards
            comparison={diamondData?.comparison}
            totalReferrals={totalReferrals}
            totalBonus={totalBonus}
            topCc={topCc}
            projectedReferrals={projectedReferrals}
            projectedBonus={projectedBonus}
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            periodNoun={periodNoun}
            elapsedRatioPercent={elapsedRatioPercent}
          />

          <SectionCard bodyPadding={0} className="full-bleed-card shadow-sm overflow-hidden">
            <CcDiamondProgramBanner
              searchText={searchText}
              onSearchChange={handleSearchChange}
              onRefresh={fetchDiamondData}
              loading={loading}
              isMobile={false}
              hasData={Boolean(diamondData)}
              isConsultantFiltered={isConsultantFiltered}
              selectedConsultant={selectedConsultant}
              visibleRecordCount={filteredData.length}
              totalRecordCount={allDiamondRecords.length}
              rewardRecipientCount={rewardRecipientCount}
              periodLabel={periodLabel}
              onClearConsultant={onClearConsultant}
            />

            <DataTable<CcDiamondEntry>
              columns={columns}
              dataSource={filteredData}
              rowKey="ccId"
              loading={loading}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              className="antd-custom-table"
              onRow={(record) => ({
                onClick: () => openDiamondDetail(record),
                className: 'cursor-pointer hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 transition-colors',
              })}
            />
          </SectionCard>
        </>
      )}

      <CcDiamondDetailModal
        open={detailModalOpen}
        onClose={closeDiamondDetail}
        ccRecord={selectedCcRecord}
        dateRange={dateRange}
      />
    </div>
  );
}
