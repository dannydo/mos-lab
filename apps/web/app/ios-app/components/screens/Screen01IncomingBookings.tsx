'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BookingItem, resolveCustomerBookingTab } from '../../state/mockData';
import {
  ActiveActorProfile,
  BookingScopeMode,
  IosUserRole,
  IosBranchConfig,
  IOS_AVAILABLE_BRANCHES,
} from '../../state/useIosAppState';
import { CvFeather2Badge, CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { IosBranchSelectorSheet } from '../ui-kit/IosBranchSelectorSheet';
import { ComboWalletDetailModal } from '../ui-kit/ComboWalletDetailModal';
import { SegmentCounts } from './incoming/incomingBookingHelpers';
import { IncomingBookingCard } from './incoming/IncomingBookingCard';
import { IncomingBookingsModals } from './incoming/IncomingBookingsModals';
import { RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';

interface Screen01IncomingBookingsProps {
  bookings: BookingItem[];
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  setBookingSegment: (seg: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL') => void;
  onSelectBooking: (bookingId: number) => void;
  activeServicingBooking?: BookingItem | null;
  onResumeServicing?: (bookingId: number) => void;
  counts?: SegmentCounts;
  isRefreshing?: boolean;
  lastRefreshedAt?: string | null;
  isLiveDb?: boolean;
  onRefreshDb?: () => void;
  dateOffset?: number;
  onDateOffsetChange?: (offset: number) => void;
  role?: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange?: (role: IosUserRole) => void;
  actor?: ActiveActorProfile;
  scopeMode?: BookingScopeMode;
  onScopeModeChange?: (scope: BookingScopeMode) => void;
  onOpenProfileMenu?: () => void;
  isAdmin?: boolean;
  onRevertToIncoming?: (bookingId: number) => void;
  selectedStoreId?: number;
  onSelectStoreId?: (storeId: number) => void;
  currentBranch?: IosBranchConfig;
  availableBranches?: IosBranchConfig[];
  totalStoreBookingsCount?: number;
}

export function Screen01IncomingBookings({
  bookings,
  bookingSegment,
  setBookingSegment,
  onSelectBooking,
  activeServicingBooking,
  onResumeServicing,
  counts,
  isRefreshing,
  onRefreshDb,
  dateOffset = 0,
  onDateOffsetChange,
  role = 'CVL',
  actor,
  scopeMode = 'STORE_ALL',
  onScopeModeChange,
  onOpenProfileMenu,
  isAdmin = false,
  onRevertToIncoming,
  selectedStoreId = 6,
  onSelectStoreId,
  currentBranch,
  availableBranches = IOS_AVAILABLE_BRANCHES,
  totalStoreBookingsCount,
}: Screen01IncomingBookingsProps) {
  // Modal chọn chi nhánh cho Admin
  const [isBranchSheetOpen, setIsBranchSheetOpen] = useState(false);

  // Invariant (UI-010): Chỉ Admin thực sự VÀ khi không ở vai trò Chuyên Viên (CV/CVL/CVLL) mới được đổi chi nhánh
  const canSwitchBranch = Boolean(isAdmin && role !== 'CVL' && role !== 'CVLL' && role !== 'CV');

  const effectiveBranch = useMemo(() => {
    if (currentBranch) return currentBranch;
    return availableBranches.find((b) => b.id === selectedStoreId) || availableBranches[0];
  }, [currentBranch, availableBranches, selectedStoreId]);

  // Modal xác nhận Admin trả khách về Chờ đón
  const [revertConfirmModal, setRevertConfirmModal] = useState<{
    isOpen: boolean;
    bookingId: number;
    customerName: string;
  } | null>(null);

  // Modal cảnh báo khi cố tình bấm check-in khách khác lúc đang có ca làm dở dang
  const [lockedCustomerModal, setLockedCustomerModal] = useState<{
    isOpen: boolean;
    attemptedCustomerName: string;
  } | null>(null);

  // Modal / Bottom Sheet xem đầy đủ ghi chú và thông tin khách hàng
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<BookingItem | null>(null);
  const [walletModalBookingId, setWalletModalBookingId] = useState<number | null>(null);

  const activeWalletBooking = useMemo(
    () =>
      walletModalBookingId !== null
        ? bookings.find((b) => Number(b.id) === Number(walletModalBookingId)) || null
        : null,
    [bookings, walletModalBookingId]
  );

  // Đồng hồ thực tế đếm ngược thời gian khách đến (in mins)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 1. Quản lý ngày xem lịch hẹn (Hôm qua < Hôm nay > Ngày mai)
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);

  const dateLabel = useMemo(() => {
    if (dateOffset === 0) return 'Hôm nay';
    if (dateOffset === -1) return 'Hôm qua';
    if (dateOffset === 1) return 'Ngày mai';
    const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return dayNames[targetDate.getDay()];
  }, [dateOffset, targetDate]);

  const subDateLabel = useMemo(() => {
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }, [targetDate]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const tab = resolveCustomerBookingTab(b, activeServicingBooking?.id);
      return tab === bookingSegment;
    });
  }, [bookings, bookingSegment, activeServicingBooking]);

  const actorName = actor?.name || 'Thảo Ly';
  const isCvll = role === 'CVLL';
  const canMultiCheckIn = Boolean(isAdmin || role === 'CC' || role === 'CVLL' || role === 'STORE');

  return (
    <div className="flex-1 flex flex-col bg-black text-white overflow-hidden select-none">
      {/* 1. Single Native iOS Navigation Bar (Clean 1-row layout) */}
      <div className="h-12 px-3 bg-black border-b border-neutral-900 flex items-center justify-between z-10 flex-shrink-0">
        {/* Left: Tên chi nhánh viết tắt siêu gọn ("ĐT" / "EP") + Live Refresh Indicator */}
        <div className="flex items-center gap-1 bg-[#1C1C1E] border border-neutral-800 rounded-full pl-2 pr-1.5 py-1 text-neutral-300 shadow-xs">
          {canSwitchBranch ? (
            <button
              onClick={() => setIsBranchSheetOpen(true)}
              className="flex items-center gap-1.5 hover:text-amber-400 active:scale-95 cursor-pointer transition-all select-none"
              title={`${effectiveBranch.name} · Bấm để đổi chi nhánh (Admin)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11.5px] font-black text-neutral-100 tracking-wider">{effectiveBranch.code}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 select-none"
              title={`Chi nhánh ${effectiveBranch.name} (Cố định theo Chuyên Viên)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11.5px] font-black text-neutral-100 tracking-wider">{effectiveBranch.code}</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefreshDb?.();
            }}
            disabled={isRefreshing}
            className="p-0.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white active:scale-90 transition-all cursor-pointer"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Center: Chuyển ngày < Hôm nay > mượt mà */}
        <div className="flex items-center gap-0.5 bg-[#1C1C1E] px-1 py-0.5 rounded-full border border-neutral-800 shadow-inner">
          <button
            onClick={() => onDateOffsetChange?.(dateOffset - 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Xem ngày trước"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => onDateOffsetChange?.(0)}
            className="px-2 py-0.5 flex items-center gap-1.5 cursor-pointer active:opacity-75"
            title={dateOffset !== 0 ? 'Bấm để về lại Hôm nay' : undefined}
          >
            <span
              className={`text-[12px] font-black leading-tight ${
                dateOffset === 0 ? 'text-amber-400' : 'text-neutral-200'
              }`}
            >
              {dateLabel}
            </span>
            <span className="text-[10px] text-neutral-400 font-semibold tabular-nums leading-none">{subDateLabel}</span>
          </button>

          <button
            onClick={() => onDateOffsetChange?.(dateOffset + 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Xem ngày kế tiếp"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Right: Quick Profile Trigger (Tapping opens iOS Action Sheet) */}
        <button
          onClick={onOpenProfileMenu}
          className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-[#1C1C1E] border border-neutral-800 hover:border-amber-400/50 active:scale-95 transition-all cursor-pointer shadow-xs"
          title="Mở hồ sơ & chuyển vai trò"
        >
          <span className="text-[10.5px] font-black text-amber-400 inline-flex items-center leading-none">
            {role === 'CVLL' ? <CvFeather2Badge /> : role === 'CVL' ? <CvFeather1Badge /> : role}
          </span>
          <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400/80 bg-neutral-800 shrink-0">
            <img
              src={actor?.avatar || 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png'}
              alt={actorName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </button>
      </div>

      {/* 1.5 Superadmin Scope Switcher Toolbar (Chỉ hiển thị khi Admin kiểm thử các vai trò quầy / quản lý CC, STORE, CVLL - Ẩn tuyệt đối khi ở vai trò CVL để bảo mật 100%) */}
      {isAdmin && role !== 'CVL' && (
        <div className="px-3 py-1.5 bg-[#181611] border-b border-amber-500/20 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Superadmin:</span>
          </div>

          <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-full border border-neutral-800">
            <button
              onClick={() => onScopeModeChange?.('STORE_ALL')}
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer ${
                scopeMode === 'STORE_ALL' ? 'bg-amber-400 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Toàn bộ sảnh ({totalStoreBookingsCount ?? bookings.length})
            </button>
            <button
              onClick={() => onScopeModeChange?.('MY_CUSTOMERS')}
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer inline-flex items-center gap-0.5 ${
                scopeMode === 'MY_CUSTOMERS' ? 'bg-amber-400 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Lọc</span>
              {role === 'CVLL' ? <CvFeather2Badge /> : <span>{role}</span>}
              <span>({actor?.name || 'Thảo Ly'})</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Native iOS Dark Segmented Control */}
      <div className="px-3 pt-2.5 pb-2 flex-shrink-0 bg-black">
        <div className="bg-[#1C1C1E] p-1 rounded-2xl border border-neutral-800/90 grid grid-cols-3 gap-1 shadow-inner">
          <button
            onClick={() => setBookingSegment('INCOMING')}
            className={`py-1.5 px-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              bookingSegment === 'INCOMING'
                ? 'bg-[#2C2C2E] text-amber-400 shadow-sm font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Chờ đón</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black tabular-nums leading-none ${
                bookingSegment === 'INCOMING' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {counts?.incoming ?? filteredBookings.length}
            </span>
          </button>

          <button
            onClick={() => setBookingSegment('SERVICING')}
            className={`py-1.5 px-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              bookingSegment === 'SERVICING'
                ? 'bg-[#2C2C2E] text-amber-400 shadow-sm font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Đang làm</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black tabular-nums leading-none ${
                bookingSegment === 'SERVICING' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {counts?.servicing ?? 0}
            </span>
          </button>

          <button
            onClick={() => setBookingSegment('DONE')}
            className={`py-1.5 px-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              bookingSegment === 'DONE'
                ? 'bg-[#2C2C2E] text-amber-400 shadow-sm font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Đã xong</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black tabular-nums leading-none ${
                bookingSegment === 'DONE' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {counts?.done ?? 0}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Customer Booking Cards (Số thứ tự đặt góc Avatar, không tốn diện tích card!) */}
      <div className="flex-1 bg-black overflow-y-auto px-3 py-1 space-y-2.5 pb-20">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-xs px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1C1C1E] border border-neutral-800 flex items-center justify-center mx-auto text-amber-400">
              <Calendar className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="text-neutral-400 font-medium">
              {dateOffset !== 0
                ? `Chưa có lịch hẹn nào cho ngày ${subDateLabel} (${dateLabel}).`
                : isRefreshing
                  ? 'Đang đồng bộ dữ liệu từ hệ thống...'
                  : 'Hiện tại chưa có khách trong mục này.'}
            </p>
            {dateOffset !== 0 && (
              <button
                onClick={() => onDateOffsetChange?.(0)}
                className="px-3.5 py-1.5 rounded-full bg-amber-400 text-black font-extrabold text-[11px] shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                Về lại Hôm nay
              </button>
            )}
          </div>
        ) : (
          filteredBookings.map((b, idx) => (
            <IncomingBookingCard
              key={b.id}
              booking={b}
              idx={idx}
              bookingSegment={bookingSegment}
              activeServicingBooking={activeServicingBooking}
              dateOffset={dateOffset}
              now={now}
              isCvll={isCvll}
              canMultiCheckIn={canMultiCheckIn}
              isAdmin={isAdmin}
              actor={actor}
              onSelectBooking={onSelectBooking}
              onResumeServicing={onResumeServicing}
              onOpenLockedModal={(attemptedCustomerName) =>
                setLockedCustomerModal({ isOpen: true, attemptedCustomerName })
              }
              onOpenCustomerDetail={(bookingItem) => setSelectedCustomerDetail(bookingItem)}
              onOpenWalletModal={(bookingItem) => setWalletModalBookingId(bookingItem.id)}
              onOpenRevertModal={(bookingId, customerName) =>
                setRevertConfirmModal({ isOpen: true, bookingId, customerName })
              }
            />
          ))
        )}
      </div>

      <ComboWalletDetailModal
        booking={activeWalletBooking}
        isOpen={Boolean(activeWalletBooking)}
        onClose={() => setWalletModalBookingId(null)}
        isAdmin={isAdmin}
        onUpdated={() => onRefreshDb?.()}
      />

      <IncomingBookingsModals
        lockedCustomerModal={lockedCustomerModal}
        setLockedCustomerModal={setLockedCustomerModal}
        revertConfirmModal={revertConfirmModal}
        setRevertConfirmModal={setRevertConfirmModal}
        selectedCustomerDetail={selectedCustomerDetail}
        setSelectedCustomerDetail={setSelectedCustomerDetail}
        activeServicingBooking={activeServicingBooking}
        onSelectBooking={onSelectBooking}
        onResumeServicing={onResumeServicing}
        onRevertToIncoming={onRevertToIncoming}
      />

      {/* 5. Sheet chọn chi nhánh cho Admin */}
      {canSwitchBranch && (
        <IosBranchSelectorSheet
          isOpen={isBranchSheetOpen}
          onClose={() => setIsBranchSheetOpen(false)}
          selectedStoreId={selectedStoreId}
          onSelectBranch={(storeId) => {
            onSelectStoreId?.(storeId);
          }}
          availableBranches={availableBranches}
        />
      )}
    </div>
  );
}
