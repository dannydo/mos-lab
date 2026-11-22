'use client';

import React, { useMemo } from 'react';
import type { CcDiamondEntry } from '@mos-lab/shared';
import { DataTable, SectionCard } from '~/components/ui';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import CcDiamondDetailModal from './CcDiamondDetailModal';
import { CcDiamondMobileList } from './cc-diamond-tab/CcDiamondMobileList';
import { CcDiamondProgramBanner } from './cc-diamond-tab/CcDiamondProgramBanner';
import { CcDiamondSummaryCards } from './cc-diamond-tab/CcDiamondSummaryCards';
import { buildCcDiamondColumns } from './cc-diamond-tab/cc-diamond-columns';
import type { CcDiamondTabProps } from './cc-diamond-tab/cc-diamond-utils';
import { useCcDiamondData } from './cc-diamond-tab/useCcDiamondData';

export type { CcDiamondTabProps };

export default function CcDiamondTab({
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant = 'ALL',
  comparisonMode = 'month',
  onClearConsultant,
}: CcDiamondTabProps) {
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';

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
    <div className="flex flex-col gap-4">
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
          isMobile={isMobile}
          hasData={Boolean(diamondData)}
          isConsultantFiltered={isConsultantFiltered}
          selectedConsultant={selectedConsultant}
          visibleRecordCount={filteredData.length}
          totalRecordCount={allDiamondRecords.length}
          rewardRecipientCount={rewardRecipientCount}
          periodLabel={periodLabel}
          onClearConsultant={onClearConsultant}
        />

        {isMobile ? (
          <CcDiamondMobileList
            records={mobileDiamondRecords}
            totalCount={filteredData.length}
            currentPage={currentMobilePage}
            loading={loading}
            onPageChange={setMobilePage}
            onOpenDetail={openDiamondDetail}
          />
        ) : (
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
        )}
      </SectionCard>

      <CcDiamondDetailModal
        open={detailModalOpen}
        onClose={closeDiamondDetail}
        ccRecord={selectedCcRecord}
        dateRange={dateRange}
      />
    </div>
  );
}
