'use client';

import { useMemo } from 'react';
import { Typography } from 'antd';
import dynamic from 'next/dynamic';
import { Info } from 'lucide-react';
import BkLeaderboardCard from './BkLeaderboardCard';
import { BkDoneDetailsCard } from './bk-done-tab/BkDoneDetailsCard';
import { BkDoneSummaryCards } from './bk-done-tab/BkDoneSummaryCards';
import { buildBkDoneDetailColumns, buildBkDoneLeaderboardColumns } from './bk-done-tab/bkDoneColumns';
import {
  BK_DONE_LEADERBOARD_LABELS,
  formatBkDoneCurrency,
  formatStoreCode,
  type BkDoneTabProps,
} from './bk-done-tab/bkDoneUtils';
import { useBkDoneData } from './bk-done-tab/useBkDoneData';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

const { Text } = Typography;

export { BK_DONE_LEADERBOARD_LABELS, formatStoreCode };
export type { BkDoneTabProps };

export default function BkDoneTab({ dateRange, selectedStore, comparisonMode }: BkDoneTabProps) {
  const {
    loading,
    detailsLoading,
    isMaskedRole,
    previousPeriod,
    leaderboard,
    summary,
    previousSummary,
    forecast,
    selectedBookerId,
    selectedBookerName,
    filterStatus,
    setFilterStatus,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    filteredDetailRecords,
    currentPage,
    pageSize,
    handlePaginationChange,
    selectedCustomerId,
    customerDrawerOpen,
    openCustomerDrawer,
    closeCustomerDrawer,
    handleSelectBooker,
    clearBookerFilter,
    fetchDetails,
  } = useBkDoneData({
    dateRange,
    selectedStore,
    comparisonMode,
  });

  const columns = useMemo(
    () =>
      buildBkDoneLeaderboardColumns({
        selectedBookerId,
        onSelectBooker: handleSelectBooker,
      }),
    [selectedBookerId, handleSelectBooker]
  );

  const detailColumns = useMemo(
    () =>
      buildBkDoneDetailColumns({
        currentPage,
        pageSize,
        isMaskedRole,
        onOpenCustomer: openCustomerDrawer,
      }),
    [currentPage, pageSize, isMaskedRole, openCustomerDrawer]
  );

  return (
    <div className="space-y-6">
      <BkDoneSummaryCards
        summary={summary}
        previousSummary={previousSummary}
        comparison={previousPeriod?.comparison}
        forecast={forecast}
      />

      <BkLeaderboardCard
        title="BK Leaderboard - Done"
        description="Xếp hạng thành tích Telesales theo Khách Lẻ Done (Điều răn BK-005) trong khoảng thời gian lọc"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        selectedBooker={selectedBookerId || undefined}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
        mobileMetrics={(record) => [
          {
            label: 'Lẻ / Combo',
            value: `${record.singleDoneCount ?? record.doneCount} Lẻ · +${record.comboLiveDoneCount ?? 0} Combo`,
            tone: 'success',
          },
          {
            label: 'Khách mới',
            value: `${record.newCustomerDoneCount ?? 0} (${record.newCustomerRatePercent ?? 0}%)`,
            tone: 'warning',
          },
          { label: 'Missed', value: `${record.missedCount ?? 0} (${record.missedRatePercent ?? 0}%)`, tone: 'danger' },
          { label: 'Thưởng', value: formatBkDoneCurrency(record.totalDoneBonus ?? 0), tone: 'success' },
        ]}
        extraSummary={
          <Text type="secondary" className="text-xs flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Click vào dòng Booker hoặc con số Missed để xem chi tiết danh sách Khách hàng bên dưới</span>
          </Text>
        }
      />

      <BkDoneDetailsCard
        records={filteredDetailRecords}
        columns={detailColumns}
        loading={detailsLoading}
        selectedBookerName={selectedBookerName}
        filterStatus={filterStatus}
        searchText={searchText}
        isCompact={isCompact}
        currentPage={currentPage}
        pageSize={pageSize}
        onFilterStatusChange={setFilterStatus}
        onSearchChange={setSearchText}
        onToggleCompact={toggleCompact}
        onRefresh={fetchDetails}
        onClearBookerFilter={clearBookerFilter}
        onPaginationChange={handlePaginationChange}
      />

      <CustomerDetailDrawer open={customerDrawerOpen} customerId={selectedCustomerId} onClose={closeCustomerDrawer} />
    </div>
  );
}
