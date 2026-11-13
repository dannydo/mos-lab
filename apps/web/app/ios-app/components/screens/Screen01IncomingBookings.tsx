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
import { useTheme } from '../../../../context/ThemeContext';

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

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const actorName = actor?.name || 'Thảo Ly';
  const isCvll = role === 'CVLL';

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden select-none transition-colors"
      style={{ backgroundColor: 'var(--background)', color: 'var(--mos-text)' }}
    >
      {/* 1. Single Native iOS Navigation Bar (Clean 1-row layout) */}
      <div
        className="h-12 px-3 border-b flex items-center justify-between z-10 flex-shrink-0 transition-colors"
        style={{ backgroundColor: 'var(--mos-surface)', borderColor: 'var(--mos-surface-border)' }}
      >
        {/* Left: Tên chi nhánh viết tắt siêu gọn ("ĐT" / "EP") + Live Refresh Indicator */}
        <div
          className="flex items-center gap-1 border rounded-full pl-2 pr-1.5 py-1 shadow-xs"
          style={{
            backgroundColor: 'var(--mos-surface-muted)',
            borderColor: 'var(--mos-surface-border)',
            color: 'var(--mos-text)',
          }}
        >
          {canSwitchBranch ? (
            <button
              onClick={() => setIsBranchSheetOpen(true)}
              className="flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all select-none"
              title={`${effectiveBranch.name} · Bấm để đổi chi nhánh (Admin)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11.5px] font-black tracking-wider" style={{ color: 'var(--mos-text)' }}>
                {effectiveBranch.code}
              </span>
              <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'var(--mos-text-muted)' }} />
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 select-none"
              title={`Chi nhánh ${effectiveBranch.name} (Cố định theo Chuyên Viên)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11.5px] font-black tracking-wider" style={{ color: 'var(--mos-text)' }}>
                {effectiveBranch.code}
              </span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefreshDb?.();
            }}
            disabled={isRefreshing}
            className="p-0.5 rounded-full active:scale-90 transition-all cursor-pointer hover:opacity-80"
            style={{ color: 'var(--mos-text-muted)' }}
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} style={isRefreshing ? { color: 'var(--mos-accent)' } : undefined} />
          </button>
        </div>

        {/* Center: Chuyển ngày < Hôm nay > mượt mà */}
        <div
          className="flex items-center gap-0.5 px-1 py-0.5 rounded-full border shadow-inner"
          style={{
            backgroundColor: 'var(--mos-surface-muted)',
            borderColor: 'var(--mos-surface-border)',
          }}
        >
          <button
            onClick={() => onDateOffsetChange?.(dateOffset - 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            style={{ color: 'var(--mos-text-muted)' }}
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
              className="text-[12px] font-black leading-tight"
              style={{ color: dateOffset === 0 ? 'var(--mos-accent)' : 'var(--mos-text)' }}
            >
              {dateLabel}
            </span>
            <span className="text-[10px] font-semibold tabular-nums leading-none" style={{ color: 'var(--mos-text-muted)' }}>
              {subDateLabel}
            </span>
          </button>

          <button
            onClick={() => onDateOffsetChange?.(dateOffset + 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            style={{ color: 'var(--mos-text-muted)' }}
            title="Xem ngày kế tiếp"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Right: Quick Profile Trigger (Tapping opens iOS Action Sheet) */}
        <button
          onClick={onOpenProfileMenu}
          className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border active:scale-95 transition-all cursor-pointer shadow-xs"
          style={{
            backgroundColor: 'var(--mos-surface-muted)',
            borderColor: 'var(--mos-surface-border)',
          }}
          title="Mở hồ sơ & chuyển vai trò"
        >
          <span className="text-[10.5px] font-black" style={{ color: 'var(--mos-accent)' }}>
            {isCvll ? <CvFeather2Badge /> : <CvFeather1Badge />}
          </span>
          <div
            className="w-6 h-6 rounded-full overflow-hidden border shrink-0"
            style={{ borderColor: 'var(--mos-accent)', backgroundColor: 'var(--mos-surface)' }}
          >
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
        <div
          className="px-3 py-1.5 border-b flex items-center justify-between z-10 flex-shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.12)',
            borderColor: 'var(--mos-surface-border)',
          }}
        >
          <div className="flex items-center gap-1.5 font-extrabold text-[11px]" style={{ color: 'var(--mos-accent)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: 'var(--mos-accent)' }} />
            <span>Superadmin:</span>
          </div>

          <div
            className="flex items-center gap-1 p-0.5 rounded-full border"
            style={{
              backgroundColor: 'var(--mos-surface-muted)',
              borderColor: 'var(--mos-surface-border)',
            }}
          >
            <button
              onClick={() => onScopeModeChange?.('STORE_ALL')}
              className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer"
              style={
                scopeMode === 'STORE_ALL'
                  ? { backgroundColor: 'var(--mos-accent)', color: 'var(--mos-accent-contrast)' }
                  : { color: 'var(--mos-text-muted)' }
              }
            >
              Toàn bộ sảnh ({totalStoreBookingsCount ?? bookings.length})
            </button>
            <button
              onClick={() => onScopeModeChange?.('MY_CUSTOMERS')}
              className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer inline-flex items-center gap-0.5"
              style={
                scopeMode === 'MY_CUSTOMERS'
                  ? { backgroundColor: 'var(--mos-accent)', color: 'var(--mos-accent-contrast)' }
                  : { color: 'var(--mos-text-muted)' }
              }
            >
              <span>Lọc</span>
              <CvFeather1Badge />
              <span>({actor?.name || 'Thảo Ly'})</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Native iOS Segmented Control */}
      <div className="px-3 pt-2.5 pb-2 flex-shrink-0" style={{ backgroundColor: 'var(--background)' }}>
        <div
          className="p-1 rounded-2xl border grid grid-cols-3 gap-1 shadow-inner"
          style={{
            backgroundColor: 'var(--mos-surface-muted)',
            borderColor: 'var(--mos-surface-border)',
          }}
        >
          {(
            [
              { key: 'INCOMING', label: 'Chờ đón', badge: counts?.incoming ?? filteredBookings.length },
              { key: 'SERVICING', label: 'Đang làm', badge: counts?.servicing ?? 0 },
              { key: 'DONE', label: 'Đã xong', badge: counts?.done ?? 0 },
            ] as const
          ).map((seg) => {
            const active = bookingSegment === seg.key;
            return (
              <button
                key={seg.key}
                onClick={() => setBookingSegment(seg.key)}
                className={`py-1.5 px-2 rounded-xl text-[12px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  active ? 'shadow-sm font-black' : 'font-bold'
                }`}
                style={
                  active
                    ? { backgroundColor: 'var(--mos-surface)', color: 'var(--mos-accent)' }
                    : { color: 'var(--mos-text-muted)' }
                }
              >
                <span>{seg.label}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-black tabular-nums leading-none"
                  style={
                    active
                      ? { backgroundColor: 'var(--mos-accent)', color: 'var(--mos-accent-contrast)' }
                      : { backgroundColor: 'var(--mos-surface-border)', color: 'var(--mos-text-muted)' }
                  }
                >
                  {seg.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Customer Booking Cards (Số thứ tự đặt góc Avatar, không tốn diện tích card!) */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2.5 pb-20" style={{ backgroundColor: 'var(--background)' }}>
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-xs px-4 space-y-3" style={{ color: 'var(--mos-text-muted)' }}>
            <div
              className="w-12 h-12 rounded-full border flex items-center justify-center mx-auto"
              style={{
                backgroundColor: 'var(--mos-surface)',
                borderColor: 'var(--mos-surface-border)',
                color: 'var(--mos-accent)',
              }}
            >
              <Calendar className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="font-medium" style={{ color: 'var(--mos-text-muted)' }}>
              {dateOffset !== 0
                ? `Chưa có lịch hẹn nào cho ngày ${subDateLabel} (${dateLabel}).`
                : isRefreshing
                  ? 'Đang đồng bộ dữ liệu từ hệ thống...'
                  : 'Hiện tại chưa có khách trong mục này.'}
            </p>
            {dateOffset !== 0 && (
              <button
                onClick={() => onDateOffsetChange?.(0)}
                className="px-3.5 py-1.5 rounded-full font-extrabold text-[11px] shadow-sm active:scale-95 transition-transform cursor-pointer"
                style={{ backgroundColor: 'var(--mos-accent)', color: 'var(--mos-accent-contrast)' }}
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
