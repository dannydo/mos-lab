'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Space, Tag, Tooltip, theme } from 'antd';
import { CompressOutlined, ExpandOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { type DailySalesBonusLeaderboardEntry } from '@mos-lab/shared';
import { CollapsibleSearchField, DataTable } from '~/components/ui';
import CcThuongTransactionsModal from './CcThuongTransactionsModal';
import { CcThuongKpiCards } from './cc-thuong/CcThuongKpiCards';
import { CcThuongLeaderboardCard } from './cc-thuong/CcThuongLeaderboardCard';
import { CcThuongMobileSummaryStrip } from './cc-thuong/CcThuongMobileSummaryStrip';
import { CcThuongMobileDetailSheet } from './cc-thuong/CcThuongMobileDetailSheet';
import { buildCcThuongDailyColumns } from './cc-thuong/ccThuongDailyColumns';
import { useCcThuongData } from './cc-thuong/useCcThuongData';
import { useCcMobilePortrait } from './useCcMobilePortrait';

interface CcThuongTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  includeVat?: boolean;
  comparisonMode?: 'month' | 'week' | 'day';
  onSelectConsultant?: (consultantName: string) => void;
  refreshKey?: number;
}

export default function CcThuongTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  includeVat = true,
  comparisonMode = 'month',
  onSelectConsultant: parentOnSelectConsultant,
  refreshKey = 0,
}: CcThuongTabProps) {
  const { token } = theme.useToken();
  const { tier: responsiveTier, isMobile, showMobilePortrait: showMobilePortraitLayout } = useCcMobilePortrait();
  const dailyBonusKpiColumns = isMobile ? 2 : responsiveTier === 'tablet' ? 3 : 5;
  const [mobileDetailConsultant, setMobileDetailConsultant] = useState<DailySalesBonusLeaderboardEntry | null>(null);

  const {
    loading,
    fetchData,
    summary,
    searchText,
    setSearchText,
    isCompact,
    setIsCompact,
    dailyPage,
    setDailyPage,
    dailyPageSize,
    setDailyPageSize,
    selectedCcName,
    setSelectedCcName,
    txModalOpen,
    setTxModalOpen,
    selectedTxDate,
    setSelectedTxDate,
    selectedTxConsultantId,
    setSelectedTxConsultantId,
    selectedTxConsultantName,
    setSelectedTxConsultantName,
    totalComboSales,
    totalProductSales,
    totalSingleSales,
    totalSales,
    totalCcBonus,
    projectedComboSales,
    projectedProductSales,
    projectedSingleSales,
    projectedTotalSales,
    projectedCcBonus,
    elapsedRatioPercent,
    leaderboardData,
    allDailyData,
    filteredDailyData,
    isPastPeriod,
    isDayMode,
    periodNoun,
    ratio,
  } = useCcThuongData({
    dateRange,
    selectedStore,
    parentSelectedConsultant,
    includeVat,
    comparisonMode,
    refreshKey,
  });

  const dailyColumns = useMemo(() => buildCcThuongDailyColumns(), []);

  const mobileDetailRecords = useMemo(() => {
    if (!mobileDetailConsultant) return [];
    return allDailyData.filter(
      (r) =>
        r.user_id === mobileDetailConsultant.consultantId || r.consultant_name === mobileDetailConsultant.displayName
    );
  }, [allDailyData, mobileDetailConsultant]);

  return (
    <div className={showMobilePortraitLayout ? 'flex flex-col gap-3' : 'flex flex-col gap-4'}>
      {showMobilePortraitLayout ? (
        <CcThuongMobileSummaryStrip
          leaderboardData={leaderboardData}
          totalSales={totalSales}
          totalCcBonus={totalCcBonus}
          projectedTotalSales={projectedTotalSales}
          projectedCcBonus={projectedCcBonus}
          isPastPeriod={isPastPeriod}
          isDayMode={isDayMode}
        />
      ) : (
        <CcThuongKpiCards
          isMobile={isMobile}
          dailyBonusKpiColumns={dailyBonusKpiColumns}
          includeVat={includeVat}
          summary={summary}
          totalComboSales={totalComboSales}
          totalProductSales={totalProductSales}
          totalSingleSales={totalSingleSales}
          totalSales={totalSales}
          totalCcBonus={totalCcBonus}
          projectedComboSales={projectedComboSales}
          projectedProductSales={projectedProductSales}
          projectedSingleSales={projectedSingleSales}
          projectedTotalSales={projectedTotalSales}
          projectedCcBonus={projectedCcBonus}
          elapsedRatioPercent={elapsedRatioPercent}
          isPastPeriod={isPastPeriod}
          periodNoun={periodNoun}
        />
      )}

      <CcThuongLeaderboardCard
        isMobile={isMobile}
        loading={Boolean(loading || parentLoading)}
        leaderboardData={leaderboardData}
        selectedCcName={selectedCcName}
        setSelectedCcName={setSelectedCcName}
        parentOnSelectConsultant={parentOnSelectConsultant}
        onInspectConsultantMobile={(entry) => {
          setSelectedCcName(entry.displayName);
          parentOnSelectConsultant?.(entry.displayName);
          setMobileDetailConsultant(entry);
        }}
        isPastPeriod={isPastPeriod}
        isDayMode={isDayMode}
        periodNoun={periodNoun}
        ratio={ratio}
      />

      {/* LEVEL 2: DAILY BONUS REPORT TABLE (Hidden on iPhone Portrait; tap CC card for Bottom Sheet or rotate Landscape) */}
      {!showMobilePortraitLayout && (
        <Card
          title={
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base" style={{ color: token.colorText }}>
                  Chi Tiết Thưởng Theo Ngày
                </span>
                {selectedCcName && (
                  <Tag color="gold" closable onClose={() => setSelectedCcName(null)}>
                    Đang xem: {selectedCcName}
                  </Tag>
                )}
                <Tooltip title="Click vào một dòng ngày cụ thể để xem danh sách giao dịch chi tiết trong ngày (Drill-down Cấp 3)">
                  <InfoCircleOutlined className="text-gray-400" />
                </Tooltip>
              </div>

              <Space wrap>
                <CollapsibleSearchField
                  placeholder="Tìm ngày, CC..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  behavior="filter"
                  expandedWidth={220}
                  expandButtonLabel="Mở tìm kiếm chi tiết thưởng"
                />
                <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
                  <Button
                    icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                    onClick={() => setIsCompact(!isCompact)}
                    aria-label={isCompact ? 'Chuyển chế độ xem chuẩn' : 'Chuyển chế độ xem gọn'}
                    className={`table-toolbar-icon-action${isCompact ? ' text-amber-500 border-amber-500/50' : ''}`}
                  />
                </Tooltip>
                <Tooltip title="Làm mới dữ liệu">
                  <Button
                    icon={<ReloadOutlined />}
                    aria-label="Làm mới dữ liệu thưởng CC"
                    onClick={fetchData}
                    loading={loading}
                    className="table-toolbar-icon-action"
                  />
                </Tooltip>
              </Space>
            </div>
          }
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          styles={{ body: { padding: 0 } }}
          className="full-bleed-card shadow-sm rounded-xl"
        >
          <DataTable
            dataSource={filteredDailyData}
            columns={dailyColumns}
            rowKey={(r) => `${r.date}-${r.user_id}`}
            loading={loading || parentLoading}
            size="small"
            bordered
            scroll={{ x: 1300 }}
            pagination={{
              current: dailyPage,
              pageSize: dailyPageSize,
              pageSizeOptions: ['10', '20', '50', '100', '200'],
              showSizeChanger: true,
              showTotal: (totalCount, range) =>
                `Hiển thị ${range[0]}–${range[1]} / ${totalCount.toLocaleString('vi-VN')} bản ghi`,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== dailyPageSize) {
                  setDailyPageSize(nextPageSize);
                  setDailyPage(1);
                  return;
                }
                setDailyPage(nextPage);
              },
            }}
            className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
            locale={{ emptyText: 'Không có dữ liệu thưởng CC trong khoảng thời gian này' }}
            onRow={(record) => ({
              onClick: () => {
                // Open Level 3 drill-down modal for that specific date & CC
                setSelectedTxDate(record.date);
                setSelectedTxConsultantId(record.user_id);
                setSelectedTxConsultantName(record.consultant_name);
                setTxModalOpen(true);
              },
              className: 'cursor-pointer hover:bg-amber-500/10 transition-colors',
            })}
          />
        </Card>
      )}

      {/* MOBILE APPLE BOTTOM SHEET DRILL-DOWN */}
      <CcThuongMobileDetailSheet
        open={Boolean(mobileDetailConsultant)}
        onClose={() => setMobileDetailConsultant(null)}
        consultant={mobileDetailConsultant}
        dailyRecords={mobileDetailRecords}
        onSelectDay={(record) => {
          setSelectedTxDate(record.date);
          setSelectedTxConsultantId(record.user_id);
          setSelectedTxConsultantName(record.consultant_name);
          setTxModalOpen(true);
        }}
      />

      {/* LEVEL 3 TRANSACTIONS DRILL-DOWN MODAL */}
      <CcThuongTransactionsModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        date={selectedTxDate}
        consultantId={selectedTxConsultantId}
        consultantName={selectedTxConsultantName}
        includeVat={includeVat}
      />
    </div>
  );
}
