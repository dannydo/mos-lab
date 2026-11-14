'use client';

import React from 'react';
import { BookingItem } from '../../../state/mockData';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { getLashDetailSpecs } from './incomingBookingHelpers';
import { RotateCcw, X, Lock, FileText, Eye, Users, Sparkles } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';

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
  activeServicingBooking?: BookingItem | null;
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
  activeServicingBooking,
  onSelectBooking,
  onResumeServicing,
  onRevertToIncoming,
}: IncomingBookingsModalsProps) {
  const { themeMode } = useTheme();
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

      {/* Modal / Bottom Sheet Chi Tiết Khách Hàng & Đầy Đủ Ghi Chú */}
      {selectedCustomerDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedCustomerDetail(null)}
        >
          <div
            className="w-full max-w-[430px] border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            style={{
              backgroundColor: 'var(--mos-surface)',
              borderColor: 'var(--mos-surface-border)',
              color: 'var(--mos-text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header: Tiêu đề góc trái · Nút đóng [✕] góc phải (Chuẩn UI Invariant) */}
            <div
              className="flex items-start justify-between gap-3 p-4 pb-3 border-b shrink-0"
              style={{
                backgroundColor: 'var(--mos-surface-raised, var(--mos-surface))',
                borderColor: 'var(--mos-surface-border)',
              }}
            >
              <div className="min-w-0">
                <span
                  className="text-[10px] font-black uppercase tracking-wider block"
                  style={{ color: 'var(--mos-accent)' }}
                >
                  CHI TIẾT LỊCH HẸN & GHI CHÚ
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[16px] font-black truncate" style={{ color: 'var(--mos-text)' }}>
                    {selectedCustomerDetail.customerName}
                  </span>
                  {selectedCustomerDetail.customerPhone && (
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--mos-text-muted)' }}>
                      {selectedCustomerDetail.customerPhone.replace(/\*+\s*/g, '').trim()}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--mos-text-muted)' }}>
                  Giờ hẹn:{' '}
                  <span className="font-bold" style={{ color: 'var(--mos-accent)' }}>
                    {selectedCustomerDetail.time12h || selectedCustomerDetail.timeSlot}
                  </span>
                  {' · '}Lần {selectedCustomerDetail.customerVisits || 1}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
                aria-label="Đóng chi tiết ghi chú"
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform shrink-0 cursor-pointer border"
                style={{
                  backgroundColor: 'var(--mos-surface-muted)',
                  borderColor: 'var(--mos-surface-border)',
                  color: 'var(--mos-text-muted)',
                }}
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 2. Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-none text-left">
              {/* Section 1: Ghi chú đầy đủ từ Booker & CSKH */}
              <div
                className="rounded-2xl border p-3.5 space-y-2"
                style={{
                  backgroundColor: 'var(--mos-surface-muted)',
                  borderColor: 'var(--mos-accent)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'var(--mos-accent)' }}
                  >
                    <FileText className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                    <span>GHI CHÚ ĐẦY ĐỦ</span>
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--mos-text-muted)' }}>
                    Booker & CSKH
                  </span>
                </div>
                <div
                  className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap break-words p-3 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--mos-surface)',
                    borderColor: 'var(--mos-surface-border)',
                    color: 'var(--mos-text)',
                  }}
                >
                  {selectedCustomerDetail.customerNote || 'Không có ghi chú đặc biệt cho lịch hẹn này.'}
                </div>
              </div>

              {/* Section 2: Thông số nối mi đầy đủ (bao gồm độ cong, độ dày sợi, chiều dài) */}
              {(() => {
                const specs = getLashDetailSpecs(selectedCustomerDetail);
                return (
                  <div
                    className="rounded-2xl border p-3.5 space-y-2.5"
                    style={{
                      backgroundColor: 'var(--mos-surface-muted)',
                      borderColor: 'var(--mos-surface-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                        style={{ color: 'var(--mos-text)' }}
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                        <span>THÔNG SỐ NỐI MI DỰ KIẾN</span>
                      </span>
                      <span className="text-[11.5px] font-black tabular-nums" style={{ color: 'var(--mos-accent)' }}>
                        {specs.price}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                      <div
                        className="p-2.5 rounded-xl border"
                        style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
                      >
                        <span className="text-[10px] block" style={{ color: 'var(--mos-text-muted)' }}>
                          Dòng mi
                        </span>
                        <span className="font-bold" style={{ color: 'var(--mos-text)' }}>
                          {specs.material}
                        </span>
                      </div>
                      <div
                        className="p-2.5 rounded-xl border"
                        style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
                      >
                        <span className="text-[10px] block" style={{ color: 'var(--mos-text-muted)' }}>
                          Độ dày & Số lượng
                        </span>
                        <span className="font-bold" style={{ color: 'var(--mos-text)' }}>
                          {specs.volume} · {specs.count}
                        </span>
                      </div>
                      <div
                        className="p-2.5 rounded-xl border"
                        style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
                      >
                        <span className="text-[10px] block" style={{ color: 'var(--mos-text-muted)' }}>
                          Độ cong
                        </span>
                        <span className="font-bold" style={{ color: 'var(--mos-accent)' }}>
                          {specs.curl}
                        </span>
                      </div>
                      <div
                        className="p-2.5 rounded-xl border"
                        style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
                      >
                        <span className="text-[10px] block" style={{ color: 'var(--mos-text-muted)' }}>
                          Độ dày sợi · Chiều dài
                        </span>
                        <span className="font-bold" style={{ color: 'var(--mos-accent)' }}>
                          {specs.thickness} · {specs.length}
                        </span>
                      </div>
                      <div
                        className="col-span-2 p-2.5 rounded-xl border flex items-center justify-between"
                        style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
                      >
                        <span className="text-[10px]" style={{ color: 'var(--mos-text-muted)' }}>
                          Kiểu dáng thiết kế
                        </span>
                        <span className="font-bold" style={{ color: 'var(--mos-text)' }}>
                          {specs.design}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Section 3: Nhân sự phụ trách */}
              <div
                className="rounded-2xl border p-3.5 space-y-2"
                style={{ backgroundColor: 'var(--mos-surface-muted)', borderColor: 'var(--mos-surface-border)' }}
              >
                <span
                  className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: 'var(--mos-text)' }}
                >
                  <Users className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                  <span>NHÂN SỰ PHỤ TRÁCH</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  {/* Booker */}
                  <div
                    className="p-2.5 rounded-xl border flex items-center gap-2"
                    style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden border shrink-0"
                      style={{
                        borderColor: 'var(--mos-surface-border-strong)',
                        backgroundColor: 'var(--mos-surface-muted)',
                      }}
                    >
                      {selectedCustomerDetail.bookerAvatar ? (
                        <img
                          src={selectedCustomerDetail.bookerAvatar}
                          alt="Booker"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1A1500] flex items-center justify-center overflow-hidden">
                          <img
                            src="/images/combo-cards/wings-logo-gold.png"
                            alt="Wings"
                            className="w-[180%] max-w-none h-full object-cover object-left"
                          />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9.5px] block" style={{ color: 'var(--mos-text-muted)' }}>
                        Người đặt lịch
                      </span>
                      <span className="font-bold text-[11px] truncate block" style={{ color: 'var(--mos-text)' }}>
                        {selectedCustomerDetail.bookerName || 'Khách đặt Online'}
                      </span>
                    </div>
                  </div>

                  {/* Chuyên Viên */}
                  <div
                    className="p-2.5 rounded-xl border flex items-center gap-2"
                    style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full overflow-hidden shrink-0 ${
                        selectedCustomerDetail.isBookedInAdvance ? 'border border-emerald-500' : 'border'
                      }`}
                      style={
                        selectedCustomerDetail.isBookedInAdvance
                          ? { backgroundColor: 'var(--mos-surface-muted)' }
                          : {
                              borderColor: 'var(--mos-surface-border-strong)',
                              backgroundColor: 'var(--mos-surface-muted)',
                            }
                      }
                    >
                      {selectedCustomerDetail.assignedStaffAvatar ? (
                        <img
                          src={selectedCustomerDetail.assignedStaffAvatar}
                          alt="CV"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-xs font-bold"
                          style={{ color: 'var(--mos-text-muted)' }}
                        >
                          CV
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9.5px] block" style={{ color: 'var(--mos-text-muted)' }}>
                        {selectedCustomerDetail.isBookedInAdvance ? 'Book riêng trước' : 'Chuyên Viên'}
                      </span>
                      <span className="font-bold text-[11px] truncate block" style={{ color: 'var(--mos-text)' }}>
                        {selectedCustomerDetail.assignedStaffName || 'Chưa phân công'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Gói Combo Live hoặc Gói Hết Hạn nếu có */}
              {(selectedCustomerDetail.comboLiveStatus?.isComboLive ||
                selectedCustomerDetail.comboLiveStatus?.isExpired) && (
                <div
                  className="rounded-2xl p-3.5 space-y-2 border"
                  style={{
                    backgroundColor: 'var(--mos-surface-muted)',
                    borderColor: selectedCustomerDetail.comboLiveStatus?.isExpired ? '#f43f5e' : 'var(--mos-accent)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        selectedCustomerDetail.comboLiveStatus?.isExpired ? 'text-rose-500' : ''
                      }`}
                      style={
                        selectedCustomerDetail.comboLiveStatus?.isExpired ? undefined : { color: 'var(--mos-accent)' }
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                      <span>
                        {selectedCustomerDetail.comboLiveStatus?.isExpired
                          ? 'GÓI COMBO HẾT HẠN (CHỜ CỨU GÓI)'
                          : 'GÓI COMBO LIVE'}
                      </span>
                    </span>
                    <span className="text-[11px] font-black tabular-nums" style={{ color: 'var(--mos-accent)' }}>
                      Còn {selectedCustomerDetail.comboLiveStatus.remainingSessions} buổi
                    </span>
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--mos-text)' }}>
                    {selectedCustomerDetail.comboLiveStatus.comboName}
                  </div>
                  <ComboExpiryStatusBadge status={selectedCustomerDetail.comboLiveStatus} showPace theme={themeMode} />
                </div>
              )}
            </div>

            {/* 3. Footer: Nút check-in / vào phục vụ */}
            <div
              className="p-4 border-t flex items-center gap-2 shrink-0"
              style={{
                backgroundColor: 'var(--mos-surface-raised, var(--mos-surface))',
                borderColor: 'var(--mos-surface-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
                className="py-3 px-4 rounded-xl border font-bold text-[12px] active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--mos-surface-muted)',
                  borderColor: 'var(--mos-surface-border)',
                  color: 'var(--mos-text)',
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const bId = selectedCustomerDetail.id;
                  setSelectedCustomerDetail(null);
                  if (activeServicingBooking && bId === activeServicingBooking.id && onResumeServicing) {
                    onResumeServicing(bId);
                  } else {
                    onSelectBooking(bId);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl font-black text-[13px] shadow-md active:scale-95 transition-all cursor-pointer text-center"
                style={{ backgroundColor: 'var(--mos-accent)', color: 'var(--mos-accent-contrast)' }}
              >
                {selectedCustomerDetail.status === 'SERVICING' ? 'Quay lại ca đang làm' : 'Bắt đầu phục vụ khách này'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
