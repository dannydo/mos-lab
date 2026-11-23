'use client';

import React from 'react';
import { Button, Skeleton } from 'antd';
import { CancelBookingModal } from '../../booking/CancelBookingModal';
import { BookingAuditLogDrawer } from '../../booking/BookingAuditLogDrawer';
import { BookingCard } from './bookings-tab/BookingCard';
import type { BookingsTabProps } from './bookings-tab/types';
import { useBookingsTabState } from './bookings-tab/useBookingsTabState';

export type { BookingCycleInfo, BookingPromoInfo, BookingsTabProps } from './bookings-tab/types';

export const BookingsTab: React.FC<BookingsTabProps> = React.memo(
  ({
    bookings,
    notes,
    themeMode,
    customer,
    onRequestReschedule,
    loading = false,
    hasMore = false,
    onLoadMore,
    onRefreshDetails,
  }) => {
    const isDark = themeMode === 'dark';
    const hasCombo = Boolean(customer?.hasComboPackage || customer?.hasCombo);

    const {
      cancelModalOpen,
      selectedBookingForCancel,
      auditDrawerOpen,
      selectedOrderIdForAudit,
      notesByBookingMap,
      bookingCycleMap,
      handleOpenAudit,
      handleCloseAudit,
      handleOpenCancel,
      handleCloseCancel,
      handleCancelSuccess,
    } = useBookingsTabState({
      bookings,
      notes,
      customer,
      onRefreshDetails,
    });

    return (
      <div className="custom-scrollbar max-h-[calc(100vh-240px)] overflow-y-auto py-2.5 pl-2.5 pr-1">
        {bookings.length > 0 ? (
          <div className="flex flex-col gap-3">
            {bookings.map((booking: SafeAny) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                attachedNotes={notesByBookingMap.get(String(booking.id)) || []}
                cycleInfo={bookingCycleMap.get(Number(booking.id))}
                hasCombo={hasCombo}
                themeMode={themeMode}
                onOpenAudit={handleOpenAudit}
                onOpenCancel={handleOpenCancel}
                onRequestReschedule={onRequestReschedule}
              />
            ))}
            {hasMore && (
              <div className="mt-4 pb-4 text-center">
                <Button onClick={onLoadMore} loading={loading} type="default">
                  Tải thêm lịch sử đặt lịch
                </Button>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`mb-4 rounded-lg border p-4 ${
                  isDark ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={`py-10 text-center ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Không có lịch sử đặt lịch nào.
          </div>
        )}

        {/* Cancel Booking Modal */}
        <CancelBookingModal
          open={cancelModalOpen}
          booking={
            selectedBookingForCancel
              ? {
                  ...selectedBookingForCancel,
                  customerId: customer?.id,
                }
              : null
          }
          currentStaffId={customer?.assignedStaff?.id}
          onCancel={handleCloseCancel}
          onSuccess={handleCancelSuccess}
        />

        {/* Booking Audit Log Drawer */}
        <BookingAuditLogDrawer
          open={auditDrawerOpen}
          orderId={selectedOrderIdForAudit?.id || null}
          orderKey={selectedOrderIdForAudit?.key}
          onClose={handleCloseAudit}
        />
      </div>
    );
  }
);

BookingsTab.displayName = 'BookingsTab';
