'use client';

import React from 'react';
import { Alert, Button, Tabs } from 'antd';
import { Loader2 } from 'lucide-react';
import type { CustomerCounts, CustomerTabDataMap } from '../customer-detail/hooks/useCustomerDetail';
import { KpiStatsCard } from '../customer-detail/components/KpiStatsCard';
import { ProfileDetailsCard } from '../customer-detail/components/ProfileDetailsCard';
import { BookingHabitsCard } from '../customer-detail/components/BookingHabitsCard';
import { ComboBalancesCard } from '../customer-detail/components/ComboBalancesCard';
import { ReferralCard } from '../customer-detail/components/ReferralCard';
import { BookingsTab } from '../customer-detail/components/BookingsTab';
import { NotesTab } from '../customer-detail/components/NotesTab';
import { CallsTab } from '../customer-detail/components/CallsTab';
import { TimelineViewTab } from '../customer-detail/components/TimelineViewTab';
import { CustomerAssignmentTimeline } from '../customer-detail/components/CustomerAssignmentTimeline';
import { CustomerStickyNotesBanner } from './CustomerStickyNotesBanner';
import type { CustomerDetailCurrentUser } from './types';

export interface CustomerDetailBodyProps {
  loading: boolean;
  forbiddenError: string | null;
  themeMode: 'light' | 'dark';
  data: SafeAny;
  customer: SafeAny;
  stats: SafeAny;
  comboBalances: SafeAny[];
  bookings: SafeAny[];
  notes: SafeAny[];
  calls: SafeAny[];
  activeBookings: SafeAny[];
  tabDataMap: CustomerTabDataMap;
  counts?: CustomerCounts;
  activeTabKey: string;
  currentUser: CustomerDetailCurrentUser | null;
  isManagerOrAdmin: boolean;
  unpinLoading: boolean;
  onClose: () => void;
  onSelectCustomerId: (customerId: number) => void;
  onOpenGemModal: () => void;
  onOpenTipModal: () => void;
  onOpenRevenueModal: () => void;
  onOpenComboModal: () => void;
  onLoadDetailedData: () => Promise<SafeAny>;
  onToggleForeign: () => void;
  onRefreshAllDetails: () => Promise<void>;
  onUnpinNote: (noteId: number) => void;
  onPinToggle: (noteId: number, currentSticky: boolean) => Promise<void>;
  onTabChange: (key: string) => void;
  onFetchTabData: (tabKey: string, pageNum?: number, append?: boolean, force?: boolean) => Promise<void>;
  onCancelBooking: (id: number) => void;
  onRequestReschedule: (booking: SafeAny) => Promise<void>;
  getFavoriteBranch: (bookings: SafeAny[]) => string;
  getFavoriteTechnicians: (bookings: SafeAny[]) => string;
  getRecentTechnician: (bookings: SafeAny[]) => string;
  getMostFrequentDay: (bookings: SafeAny[]) => string;
  getFavoriteTimeSlot: (bookings: SafeAny[]) => string;
  getRecentVisitTime: (bookings: SafeAny[]) => string;
  getComboDisplayInfo: (
    serviceName: string,
    normalCount: number,
    retainCount: number,
    packageNormalCount?: number,
    packageKey?: string
  ) => SafeAny;
}

export const CustomerDetailBody: React.FC<CustomerDetailBodyProps> = ({
  loading,
  forbiddenError,
  themeMode,
  data,
  customer,
  stats,
  comboBalances,
  bookings,
  notes,
  calls,
  activeBookings,
  tabDataMap,
  counts,
  activeTabKey,
  currentUser,
  isManagerOrAdmin,
  unpinLoading,
  onClose,
  onSelectCustomerId,
  onOpenGemModal,
  onOpenTipModal,
  onOpenRevenueModal,
  onOpenComboModal,
  onLoadDetailedData,
  onToggleForeign,
  onRefreshAllDetails,
  onUnpinNote,
  onPinToggle,
  onTabChange,
  onFetchTabData,
  onCancelBooking,
  onRequestReschedule,
  getFavoriteBranch,
  getFavoriteTechnicians,
  getRecentTechnician,
  getMostFrequentDay,
  getFavoriteTimeSlot,
  getRecentVisitTime,
  getComboDisplayInfo,
}) => {
  const isDark = themeMode === 'dark';
  const mutedTextClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const canViewOmicallQa = ['admin', 'super_admin', 'manager', 'qa', 'qc', 'qa_qc'].includes(
    String(currentUser?.role || '').toLowerCase()
  );

  const resolvedBookings = tabDataMap?.['bookings']?.items || bookings || [];
  const resolvedNotes = tabDataMap?.['notes']?.items || notes || [];
  const resolvedCalls = tabDataMap?.['calls']?.items || calls || [];

  const bCount = Math.max(counts?.bookingCount ?? 0, resolvedBookings.length);
  const nCount = Math.max(counts?.noteCount ?? 0, resolvedNotes.length);
  const cCount = Math.max(counts?.callCount ?? 0, resolvedCalls.length);

  return (
    <div className="relative min-h-[240px]">
      {loading && (
        <div
          aria-busy="true"
          className={`absolute inset-0 z-20 flex items-center justify-center rounded-xl backdrop-blur-[1px] ${
            isDark ? 'bg-slate-900/60' : 'bg-white/60'
          }`}
        >
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      )}

      {forbiddenError ? (
        <div
          className={`flex min-h-[400px] flex-col items-center justify-center rounded-xl border px-5 py-10 text-center shadow-md ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="mb-4 text-[56px]">🔒</div>
          <h3 className={`mb-2 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Quyền Truy Cập Bị Hạn Chế
          </h3>
          <p className={`mb-6 max-w-[400px] text-sm leading-normal ${mutedTextClass}`}>{forbiddenError}</p>
          <Button
            type="primary"
            onClick={onClose}
            className="rounded-md border-amber-500 bg-amber-500 font-bold hover:bg-amber-600"
          >
            Đóng cửa sổ
          </Button>
        </div>
      ) : (
        customer && (
          <div>
            {data?.duplicateNotice && (
              <Alert
                type="info"
                showIcon
                message="Phát hiện hồ sơ gốc có đầy đủ lịch sử"
                description={
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Hồ sơ hiện tại có thể là bản trùng chưa có lịch sử. Tìm thấy hồ sơ gốc{' '}
                      <b>
                        {data.duplicateNotice.originalCustomerName} (ID: #{data.duplicateNotice.originalCustomerId})
                      </b>{' '}
                      với <b className="tabular-nums">{data.duplicateNotice.bookingCount}</b> lượt đặt lịch.
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => onSelectCustomerId(data.duplicateNotice.originalCustomerId)}
                      className="border-amber-500 bg-amber-500 font-semibold text-white hover:bg-amber-600"
                    >
                      Mở hồ sơ #{data.duplicateNotice.originalCustomerId}
                    </Button>
                  </div>
                }
                className="mb-4 rounded-lg"
              />
            )}

            {customer?.isDeleted ? (
              <Alert
                type="warning"
                showIcon
                message="Hồ sơ này đã bị xóa hoặc đã được gộp vào hồ sơ chính"
                className="mb-4 rounded-lg"
              />
            ) : null}

            <div className="customer-detail-layout grid grid-cols-[320px_1fr] gap-5">
              {/* SIDEBAR: Info & Stats */}
              <div className="customer-detail-sidebar flex flex-col gap-5">
                <KpiStatsCard
                  stats={stats}
                  themeMode={themeMode}
                  onOpenGemModal={() => {
                    onOpenGemModal();
                    void onLoadDetailedData();
                  }}
                  onOpenTipModal={() => {
                    onOpenTipModal();
                    void onLoadDetailedData();
                  }}
                  onOpenRevenueModal={() => {
                    onOpenRevenueModal();
                    void onLoadDetailedData();
                  }}
                />

                <ProfileDetailsCard customer={customer} themeMode={themeMode} onToggleForeign={onToggleForeign} />

                <BookingHabitsCard
                  themeMode={themeMode}
                  bookings={activeBookings}
                  getFavoriteBranch={getFavoriteBranch}
                  getFavoriteTechnicians={getFavoriteTechnicians}
                  getRecentTechnician={getRecentTechnician}
                  getMostFrequentDay={getMostFrequentDay}
                  getFavoriteTimeSlot={getFavoriteTimeSlot}
                  getRecentVisitTime={getRecentVisitTime}
                />

                <ComboBalancesCard
                  comboBalances={comboBalances}
                  customerName={customer?.name || ''}
                  customerId={customer?.id}
                  customer={customer}
                  onRefreshCustomer={onRefreshAllDetails}
                  themeMode={themeMode}
                  getComboDisplayInfo={getComboDisplayInfo}
                  onOpenComboModal={() => {
                    onOpenComboModal();
                    void onLoadDetailedData();
                  }}
                />

                <ReferralCard data={data} themeMode={themeMode} />
              </div>

              {/* MAIN PANEL: Timelines & History */}
              <div
                className={`customer-detail-history min-h-[600px] rounded-lg border p-5 ${
                  isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
                }`}
              >
                <CustomerStickyNotesBanner
                  notes={notes}
                  themeMode={themeMode}
                  isManagerOrAdmin={isManagerOrAdmin}
                  unpinLoading={unpinLoading}
                  onUnpinNote={onUnpinNote}
                />

                <Tabs
                  className="customer-detail-tabs"
                  activeKey={activeTabKey}
                  onChange={onTabChange}
                  items={[
                    {
                      key: 'bookings',
                      label: `Lịch sử đặt lịch (${bCount})`,
                      children: (
                        <BookingsTab
                          bookings={resolvedBookings}
                          notes={resolvedNotes}
                          themeMode={themeMode}
                          customer={customer}
                          handleCancelBooking={onCancelBooking}
                          onRequestReschedule={onRequestReschedule}
                          loading={tabDataMap?.['bookings']?.loading}
                          hasMore={tabDataMap?.['bookings']?.hasMore}
                          onLoadMore={() => onFetchTabData('bookings', (tabDataMap?.['bookings']?.page || 1) + 1, true)}
                          onRefreshDetails={onRefreshAllDetails}
                        />
                      ),
                    },
                    {
                      key: 'timeline',
                      label: `Tổng hợp ghi chú (${nCount})`,
                      children: (
                        <TimelineViewTab
                          bookings={resolvedBookings}
                          notes={resolvedNotes}
                          calls={resolvedCalls}
                          themeMode={themeMode}
                        />
                      ),
                    },
                    {
                      key: 'notes',
                      label: `Nhật ký ghi chú (${nCount})`,
                      children: (
                        <NotesTab
                          notes={resolvedNotes}
                          themeMode={themeMode}
                          currentUser={currentUser}
                          onPinToggle={onPinToggle}
                          unpinLoading={unpinLoading}
                          loading={tabDataMap?.['notes']?.loading}
                          hasMore={tabDataMap?.['notes']?.hasMore}
                          onLoadMore={() => onFetchTabData('notes', (tabDataMap?.['notes']?.page || 1) + 1, true)}
                        />
                      ),
                    },
                    {
                      key: 'calls',
                      label: `Lịch sử cuộc gọi (${cCount})`,
                      children: (
                        <CallsTab
                          calls={resolvedCalls}
                          themeMode={themeMode}
                          loading={tabDataMap?.['calls']?.loading}
                          hasMore={tabDataMap?.['calls']?.hasMore}
                          onLoadMore={() => onFetchTabData('calls', (tabDataMap?.['calls']?.page || 1) + 1, true)}
                          customerId={customer?.id}
                          customerName={customer?.name}
                          canViewOmicallQa={canViewOmicallQa}
                        />
                      ),
                    },
                    {
                      key: 'assignment-timeline',
                      label: 'Lịch sử Phân bổ',
                      children: <CustomerAssignmentTimeline customerId={customer.id} />,
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
