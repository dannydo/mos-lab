'use client';

import React from 'react';
import { BookingItem } from '../../../state/mockData';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { getLashDetailSpecs } from './incomingBookingHelpers';
import { RotateCcw, X, Lock, FileText, Eye, Users, Sparkles } from 'lucide-react';

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
  return (
    <>
      {/* Modal Cảnh Báo Khóa Check-in khi đang có ca làm dở dang */}
      {lockedCustomerModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-[340px] bg-[#1C1C1E] border border-neutral-700 rounded-3xl p-5 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400/70 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <Lock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-extrabold text-[16px] tracking-tight">Đang Trong Ca Phục Vụ!</h3>
              <p className="text-neutral-300 text-[12.5px] leading-relaxed font-medium">
                Chuyên Viên đang phục vụ{' '}
                <strong className="text-amber-400">{activeServicingBooking?.customerName}</strong>.
              </p>
              <p className="text-neutral-400 text-[11.5px] leading-relaxed">
                Theo quy trình của Wings, bạn không thể check-in cho{' '}
                <strong className="text-white">{lockedCustomerModal.attemptedCustomerName}</strong> cho đến khi hoàn
                thành checkout cho ca làm hiện tại.
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
                className="w-full py-3 rounded-2xl bg-[#FFB400] hover:bg-amber-400 text-black font-black text-[13px] shadow-md active:scale-98 transition-all cursor-pointer"
              >
                Quay lại ca làm {activeServicingBooking?.customerName}
              </button>
              <button
                type="button"
                onClick={() => setLockedCustomerModal(null)}
                className="w-full py-2.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-neutral-300 font-bold text-[12px] active:scale-98 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Admin Trả Khách Về Chờ Đón */}
      {revertConfirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-[340px] bg-[#1C1C1E] border border-neutral-700 rounded-3xl p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">Trả khách về Chờ đón?</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Bạn có chắc chắn muốn hủy ca làm dở dang của khách hàng{' '}
                <strong className="text-amber-400">{revertConfirmModal.customerName}</strong> và đưa về lại danh sách{' '}
                <strong className="text-white">Chờ đón</strong>?
              </p>
              <p className="text-[11px] text-neutral-400 leading-normal pt-1">
                Thời gian làm dở dang sẽ được giải phóng để Chuyên Viên có thể nhận ca tiếp theo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRevertConfirmModal(null)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedCustomerDetail(null)}
        >
          <div
            className="w-full max-w-[430px] bg-[#1C1C1E] border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header: Tiêu đề góc trái · Nút đóng [✕] góc phải (Chuẩn UI Invariant) */}
            <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-neutral-800 bg-[#252528] shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  CHI TIẾT LỊCH HẸN & GHI CHÚ
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[16px] font-black text-white truncate">
                    {selectedCustomerDetail.customerName}
                  </span>
                  {selectedCustomerDetail.customerPhone && (
                    <span className="text-[12px] font-bold text-neutral-400 tabular-nums">
                      {selectedCustomerDetail.customerPhone.replace(/\*+\s*/g, '').trim()}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 font-medium mt-0.5">
                  Giờ hẹn:{' '}
                  <span className="text-amber-400 font-bold">
                    {selectedCustomerDetail.time12h || selectedCustomerDetail.timeSlot}
                  </span>
                  {' · '}Lần {selectedCustomerDetail.customerVisits || 1}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
                aria-label="Đóng chi tiết ghi chú"
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-transform shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 2. Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-none text-left">
              {/* Section 1: Ghi chú đầy đủ từ Booker & CSKH */}
              <div className="rounded-2xl bg-[#252528] border border-amber-400/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                    <span>GHI CHÚ ĐẦY ĐỦ</span>
                  </span>
                  <span className="text-[10px] text-neutral-400">Booker & CSKH</span>
                </div>
                <div className="text-[13px] text-white font-medium leading-relaxed whitespace-pre-wrap break-words bg-[#1C1C1E] p-3 rounded-xl border border-neutral-800">
                  {selectedCustomerDetail.customerNote || 'Không có ghi chú đặc biệt cho lịch hẹn này.'}
                </div>
              </div>

              {/* Section 2: Thông số nối mi đầy đủ (bao gồm độ cong, độ dày sợi, chiều dài) */}
              {(() => {
                const specs = getLashDetailSpecs(selectedCustomerDetail);
                return (
                  <div className="rounded-2xl bg-[#252528] border border-neutral-800 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                        <span>THÔNG SỐ NỐI MI DỰ KIẾN</span>
                      </span>
                      <span className="text-[11.5px] font-black text-amber-400 tabular-nums">{specs.price}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                      <div className="bg-[#1C1C1E] p-2.5 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 text-[10px] block">Dòng mi</span>
                        <span className="text-white font-bold">{specs.material}</span>
                      </div>
                      <div className="bg-[#1C1C1E] p-2.5 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 text-[10px] block">Độ dày & Số lượng</span>
                        <span className="text-white font-bold">
                          {specs.volume} · {specs.count}
                        </span>
                      </div>
                      <div className="bg-[#1C1C1E] p-2.5 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 text-[10px] block">Độ cong</span>
                        <span className="text-amber-400 font-bold">{specs.curl}</span>
                      </div>
                      <div className="bg-[#1C1C1E] p-2.5 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 text-[10px] block">Độ dày sợi · Chiều dài</span>
                        <span className="text-amber-400 font-bold">
                          {specs.thickness} · {specs.length}
                        </span>
                      </div>
                      <div className="col-span-2 bg-[#1C1C1E] p-2.5 rounded-xl border border-neutral-800/80 flex items-center justify-between">
                        <span className="text-neutral-400 text-[10px]">Kiểu dáng thiết kế</span>
                        <span className="text-white font-bold">{specs.design}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Section 3: Nhân sự phụ trách */}
              <div className="rounded-2xl bg-[#252528] border border-neutral-800 p-3.5 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                  <span>NHÂN SỰ PHỤ TRÁCH</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  {/* Booker */}
                  <div className="bg-[#1C1C1E] p-2.5 rounded-xl border border-neutral-800/80 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-700 bg-neutral-900 shrink-0">
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
                      <span className="text-[9.5px] text-neutral-400 block">Người đặt lịch</span>
                      <span className="text-white font-bold text-[11px] truncate block">
                        {selectedCustomerDetail.bookerName || 'Khách đặt Online'}
                      </span>
                    </div>
                  </div>

                  {/* Chuyên Viên */}
                  <div className="bg-[#1C1C1E] p-2.5 rounded-xl border border-neutral-800/80 flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full overflow-hidden ${
                        selectedCustomerDetail.isBookedInAdvance
                          ? 'border border-emerald-500'
                          : 'border border-neutral-700'
                      } bg-neutral-900 shrink-0`}
                    >
                      {selectedCustomerDetail.assignedStaffAvatar ? (
                        <img
                          src={selectedCustomerDetail.assignedStaffAvatar}
                          alt="CV"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 font-bold">
                          CV
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9.5px] text-neutral-400 block">
                        {selectedCustomerDetail.isBookedInAdvance ? 'Book riêng trước' : 'Chuyên Viên'}
                      </span>
                      <span className="text-white font-bold text-[11px] truncate block">
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
                  className={`rounded-2xl bg-[#252528] p-3.5 space-y-2 border ${
                    selectedCustomerDetail.comboLiveStatus?.isExpired ? 'border-rose-500/60' : 'border-amber-400/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        selectedCustomerDetail.comboLiveStatus?.isExpired ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                      <span>
                        {selectedCustomerDetail.comboLiveStatus?.isExpired
                          ? 'GÓI COMBO HẾT HẠN (CHỜ CỨU GÓI)'
                          : 'GÓI COMBO LIVE'}
                      </span>
                    </span>
                    <span className="text-[11px] font-black text-amber-400 tabular-nums">
                      Còn {selectedCustomerDetail.comboLiveStatus.remainingSessions} buổi
                    </span>
                  </div>
                  <div className="text-[12px] text-neutral-200">{selectedCustomerDetail.comboLiveStatus.comboName}</div>
                  <ComboExpiryStatusBadge status={selectedCustomerDetail.comboLiveStatus} showPace />
                </div>
              )}
            </div>

            {/* 3. Footer: Nút check-in / vào phục vụ */}
            <div className="p-4 border-t border-neutral-800 bg-[#252528] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
                className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-[12px] active:scale-95 transition-all cursor-pointer"
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
                className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[13px] shadow-md active:scale-95 transition-all cursor-pointer text-center"
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
