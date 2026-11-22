'use client';

import { useMemo } from 'react';
import { Typography } from 'antd';
import dynamic from 'next/dynamic';
import { Info } from 'lucide-react';
import BkLeaderboardCard from './BkLeaderboardCard';
import { BkBookingDetailsCard } from './bk-booking-tab/BkBookingDetailsCard';
import { BkBookingSummaryCards } from './bk-booking-tab/BkBookingSummaryCards';
import { buildBkBookingDetailColumns, buildBkBookingLeaderboardColumns } from './bk-booking-tab/bkBookingColumns';
import { formatStoreCode, type BkBookingTabProps } from './bk-booking-tab/bkBookingUtils';
import { useBkBookingData } from './bk-booking-tab/useBkBookingData';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

const { Text } = Typography;

export { formatStoreCode };
export type { BkBookingTabProps };

export default function BkBookingTab({ dateRange, selectedStore, comparisonMode }: BkBookingTabProps) {
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
    selectedDetailStatus,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    filteredDetailRecords,
    selectedCustomerId,
    customerDrawerOpen,
    openCustomerDrawer,
    closeCustomerDrawer,
    handleSelectBooker,
    clearBookerFilter,
    clearStatusFilter,
    fetchDetails,
  } = useBkBookingData({
    dateRange,
    selectedStore,
    comparisonMode,
  });

  const columns = useMemo(
    () =>
      buildBkBookingLeaderboardColumns({
        selectedBookerId,
        onSelectBooker: handleSelectBooker,
      }),
    [selectedBookerId, handleSelectBooker]
  );

  const detailColumns = useMemo(
    () =>
      buildBkBookingDetailColumns({
        isMaskedRole,
        onOpenCustomer: openCustomerDrawer,
      }),
    [isMaskedRole, openCustomerDrawer]
  );

  return (
    <div className="space-y-6">
      <BkBookingSummaryCards
        summary={summary}
        previousSummary={previousSummary}
        comparison={previousPeriod?.comparison}
        forecast={forecast}
      />

      <BkLeaderboardCard
        title="BK Leaderboard - Booking"
        description="Xếp hạng hiệu suất của nhân viên thuộc nhóm Telesales trong khoảng thời gian lọc"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        selectedBooker={selectedBookerId || undefined}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
        mobileMetrics={(record) => [
          { label: 'Đã tạo', value: record.totalCreatedBookings ?? 0, tone: 'accent' },
          { label: 'Cuộc gọi', value: record.callCount ?? 0, tone: 'accent' },
          { label: 'Pickup', value: `${record.pickupCount ?? 0} (${record.pickupRate ?? 0}%)`, tone: 'success' },
          { label: 'Done', value: record.doneBookings ?? 0, tone: 'success' },
          { label: 'Missed', value: record.missedBookings ?? 0, tone: 'danger' },
          { label: 'Tỷ lệ', value: `${record.conversionRate ?? 0}%`, tone: 'warning' },
        ]}
        extraSummary={
          <Text type="secondary" className="text-xs flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Click vào dòng BK để lọc danh sách chi tiết bên dưới</span>
          </Text>
        }
      />

      <BkBookingDetailsCard
        records={filteredDetailRecords}
        columns={detailColumns}
        loading={detailsLoading}
        selectedBookerName={selectedBookerName}
        selectedDetailStatus={selectedDetailStatus}
        searchText={searchText}
        isCompact={isCompact}
        onSearchChange={setSearchText}
        onToggleCompact={toggleCompact}
        onRefresh={fetchDetails}
        onClearBookerFilter={clearBookerFilter}
        onClearStatusFilter={clearStatusFilter}
      />

      <CustomerDetailDrawer open={customerDrawerOpen} customerId={selectedCustomerId} onClose={closeCustomerDrawer} />
    </div>
  );
}
