'use client';

import React from 'react';
import type { IosCustomerHistoryTab, IosCustomerNoteItem } from '@mos-lab/shared';
import { BookingItem } from '../../../state/mockData';
import { CustomerHistoryAndSpendingSheet } from '../../ui-kit/CustomerHistoryAndSpendingSheet';
import { RotateCcw, Lock } from 'lucide-react';

interface IncomingBookingsModalsProps {
  lockedCustomerModal: { isOpen: boolean; attemptedCustomerName: string } | null;
  setLockedCustomerModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; attemptedCustomerName: string } | null>
  >;
  revertConfirmModal: { isOpen: boolean; bookingId: number; customerName: string } | null;
  setRevertConfirmModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; bookingId: number; customerName: string } | null>
  >;
  selectedCustomerDetail: BookingItem | null;
  setSelectedCustomerDetail: React.Dispatch<React.SetStateAction<BookingItem | null>>;
  initialHistoryTab?: IosCustomerHistoryTab;
  onNoteCreated?: (note: IosCustomerNoteItem) => void;
  activeServicingBooking?: BookingItem | null;
  isSimulationMode?: boolean;
  isCvll?: boolean;
  canMultiCheckIn?: boolean;
  isAdmin?: boolean;
  onSelectBooking: (bookingId: number) => void;
  onResumeServicing?: (bookingId: number) => void;
  onRevertToIncoming?: (bookingId: number) => void;
}

export function IncomingBookingsModals({
  lockedCustomerModal,
  setLockedCustomerModal,
  revertConfirmModal,
  setRevertConfirmModal,
  selectedCustomerDetail,
  setSelectedCustomerDetail,
  initialHistoryTab = 'LASH_PHOTOS',
  onNoteCreated,
  activeServicingBooking,
  isSimulationMode = false,
  isCvll = false,
  canMultiCheckIn = false,
  isAdmin = false,
  onSelectBooking,
  onResumeServicing,
  onRevertToIncoming,
}: IncomingBookingsModalsProps) {
  return (
    <>
      {/* Modal Cảnh Báo Khóa Check-in khi đang có ca làm dở dang */}
      {lockedCustomerModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[340px] border rounded-3xl p-5 shadow-2xl text-center space-y-4"
            style={{
              backgroundColor: 'var(--mos-surface)',
              borderColor: 'var(--mos-surface-border)',
              color: 'var(--mos-text)',
            }}
          >
            <div
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center mx-auto shadow-inner"
              style={{
                backgroundColor: 'var(--mos-focus-ring)',
                borderColor: 'var(--mos-accent)',
                color: 'var(--mos-accent)',
              }}
            >
              <Lock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-[16px] tracking-tight" style={{ color: 'var(--mos-text)' }}>
                Đang Trong Ca Phục Vụ!
              </h3>
              <p className="text-[12.5px] leading-relaxed font-medium" style={{ color: 'var(--mos-text-muted)' }}>
                Chuyên Viên đang phục vụ{' '}
                <strong style={{ color: 'var(--mos-accent)' }}>{activeServicingBooking?.customerName}</strong>.
              </p>
              <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--mos-text-muted)' }}>
                Theo quy trình của Wings, bạn không thể check-in cho{' '}
                <strong style={{ color: 'var(--mos-text)' }}>{lockedCustomerModal.attemptedCustomerName}</strong> cho
                đến khi hoàn thành checkout cho ca làm hiện tại.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLockedCustomerModal(null);
                  if (activeServicingBooking && onResumeServicing) {
                    onResumeServicing(activeServicingBooking.id);
                  } else if (activeServicingBooking) {
                    onSelectBooking(activeServicingBooking.id);
                  }
                }}
                className="w-full py-3 rounded-2xl font-black text-[13px] shadow-md active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--mos-accent)', color: 'var(--mos-accent-contrast)' }}
              >
                Quay lại ca làm {activeServicingBooking?.customerName}
              </button>
              <button
                type="button"
                onClick={() => setLockedCustomerModal(null)}
                className="w-full py-2.5 rounded-2xl font-bold text-[12px] active:scale-98 transition-all cursor-pointer border"
                style={{
                  backgroundColor: 'var(--mos-surface-muted)',
                  borderColor: 'var(--mos-surface-border)',
                  color: 'var(--mos-text)',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Admin Trả Khách Về Chờ Đón */}
      {revertConfirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[340px] border rounded-3xl p-5 shadow-2xl text-center space-y-4"
            style={{
              backgroundColor: 'var(--mos-surface)',
              borderColor: 'var(--mos-surface-border)',
              color: 'var(--mos-text)',
            }}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-500">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black" style={{ color: 'var(--mos-text)' }}>
                Trả khách về Chờ đón?
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mos-text-muted)' }}>
                Bạn có chắc chắn muốn hủy ca làm dở dang của khách hàng{' '}
                <strong style={{ color: 'var(--mos-accent)' }}>{revertConfirmModal.customerName}</strong> và đưa về lại
                danh sách <strong style={{ color: 'var(--mos-text)' }}>Chờ đón</strong>?
              </p>
              <p className="text-[11px] leading-normal pt-1" style={{ color: 'var(--mos-text-muted)' }}>
                Thời gian làm dở dang sẽ được giải phóng để Chuyên Viên có thể nhận ca tiếp theo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRevertConfirmModal(null)}
                className="w-full py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer border"
                style={{
                  backgroundColor: 'var(--mos-surface-muted)',
                  borderColor: 'var(--mos-surface-border)',
                  color: 'var(--mos-text)',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (revertConfirmModal?.bookingId && onRevertToIncoming) {
                    onRevertToIncoming(revertConfirmModal.bookingId);
                  }
                  setRevertConfirmModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Xác nhận trả về
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Bottom Sheet: Hồ Sơ Bộ Mi, 3 Ảnh B/C/A & Lịch Sử Chi Tiêu */}
      {selectedCustomerDetail &&
        (() => {
          const isLockedByOther = Boolean(
            activeServicingBooking &&
            Number(selectedCustomerDetail.id) !== Number(activeServicingBooking.id) &&
            !isCvll &&
            !isAdmin &&
            !canMultiCheckIn
          );
          const primaryLabel = isLockedByOther
            ? undefined
            : selectedCustomerDetail.status === 'SERVICING'
              ? 'Quay lại ca đang làm'
              : selectedCustomerDetail.status === 'DONE'
                ? 'Xem Hoá đơn / Chốt đơn'
                : 'Bắt đầu phục vụ khách này';

          return (
            <CustomerHistoryAndSpendingSheet
              isOpen={Boolean(selectedCustomerDetail)}
              onClose={() => setSelectedCustomerDetail(null)}
              booking={selectedCustomerDetail}
              initialTab={initialHistoryTab}
              isSimulationMode={isSimulationMode}
              customerFacingMode={false}
              onNoteCreated={onNoteCreated}
              primaryActionLabel={primaryLabel}
              onPrimaryAction={
                primaryLabel
                  ? () => {
                      const bId = selectedCustomerDetail.id;
                      setSelectedCustomerDetail(null);
                      if (activeServicingBooking && bId === activeServicingBooking.id && onResumeServicing) {
                        onResumeServicing(bId);
                      } else {
                        onSelectBooking(bId);
                      }
                    }
                  : undefined
              }
            />
          );
        })()}
    </>
  );
}
