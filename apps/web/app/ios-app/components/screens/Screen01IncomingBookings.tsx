'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  BookingItem,
  resolveStaffAvatarUrl,
  resolveCustomerBookingTab,
  resolveServicingSubStatus,
} from '../../state/mockData';
import { ActiveActorProfile, BookingScopeMode, IosUserRole } from '../../state/useIosAppState';
import { CvFeather2Badge, CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { ComboSessionBadge } from '../ui-kit/ComboSessionBadge';
import {
  resolveDisplayServiceName,
  parseDaysSinceLastVisit,
  resolveCustomerTypeMeta,
} from './LashMaterialConstraintMatrix';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Info,
  Package,
  Heart,
  Lock,
  Calendar,
  FileText,
  Eye,
  Users,
  Sparkles,
} from 'lucide-react';

interface SegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

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
}

function getStepShortTitle(step?: number): string {
  switch (step) {
    case 6:
      return 'Nhận ca';
    case 7:
      return 'Ảnh Before';
    case 8:
      return 'Ảnh Vệ Sinh';
    case 9:
      return 'Giờ Phục Vụ';
    case 10:
      return 'Ảnh After';
    case 11:
      return 'Khảo sát';
    case 12:
      return 'Tư vấn Dưỡng mi / Combo';
    case 13:
      return 'Thanh toán';
    case 14:
      return 'Ghi nhận Tip';
    case 15:
      return 'VietQR & Hoàn tất';
    default:
      return 'Tiến trình nối mi';
  }
}

/**
 * Format thông số mi chuẩn Danny:
 * LINE 2: HyperLight 5X 770 60
 * (curl, thickness, length được chuyển vào Detail Popup)
 */
function formatLashSpecLine(b: BookingItem): string {
  // 1. Dòng mi (Material)
  let mat = b.attributes?.material || '';
  const sName = b.serviceName || '';
  if (!mat || mat.toLowerCase().includes('any')) {
    if (sName.includes('Classic')) mat = 'Classic';
    else if (sName.includes('Hyperlight') || sName.includes('HyperLight')) mat = 'HyperLight';
    else if (sName.includes('Ultralight') || sName.includes('UltraLight')) mat = 'UltraLight';
    else if (sName.includes('Ivylight')) mat = 'Ivylight';
    else if (sName.includes('Mink') || sName.includes('Flawless')) mat = 'Flawless Mink';
    else mat = 'HyperLight';
  }
  if (mat === 'New Classic') mat = 'Classic';

  // 2. Độ dày (Volume): 5X, 1D, 2X, 3X, 4D, 5D...
  let vol = b.attributes?.volume || '';
  if (!vol) {
    vol = mat === 'Classic' ? '1D' : '2X';
  }
  if (mat === 'Classic' && !vol.includes('D')) vol = '1D';

  // 3. Mức giá (Price k): 770, 550, 440, 660, 1220...
  let priceNum = '';
  const priceMatch = sName.match(/\b(390|440|550|660|770|880|1020|1220)\b/);
  if (priceMatch) {
    priceNum = priceMatch[1];
  } else if (b.servicePrice && b.servicePrice > 0) {
    priceNum = String(Math.round(b.servicePrice / 1000));
  } else {
    priceNum = '550';
  }

  // 4. Số lượng sợi/fan (Count): 60, 70, 90...
  let countNum = '';
  const countMatch = (b.attributes?.count || '').match(/\d+/);
  if (countMatch) {
    countNum = countMatch[0];
  } else {
    countNum = mat === 'Classic' ? '90' : '60';
  }

  return [mat, vol, priceNum, countNum].filter(Boolean).join(' ');
}

/**
 * Trích xuất toàn bộ thông số nối mi chi tiết cho Detail Popup
 */
function getLashDetailSpecs(b: BookingItem) {
  let mat = b.attributes?.material || '';
  const sName = b.serviceName || '';
  if (!mat || mat.toLowerCase().includes('any')) {
    if (sName.includes('Classic')) mat = 'Classic';
    else if (sName.includes('Hyperlight') || sName.includes('HyperLight')) mat = 'HyperLight';
    else if (sName.includes('Ultralight') || sName.includes('UltraLight')) mat = 'UltraLight';
    else if (sName.includes('Ivylight')) mat = 'Ivylight';
    else if (sName.includes('Mink') || sName.includes('Flawless')) mat = 'Flawless Mink';
    else mat = 'HyperLight';
  }
  if (mat === 'New Classic') mat = 'Classic';

  let vol = b.attributes?.volume || '';
  if (!vol) {
    vol = mat === 'Classic' ? '1D' : '2X';
  }
  if (mat === 'Classic' && !vol.includes('D')) vol = '1D';

  let priceNum = '';
  const priceMatch = sName.match(/\b(390|440|550|660|770|880|1020|1220)\b/);
  if (priceMatch) {
    priceNum = priceMatch[1];
  } else if (b.servicePrice && b.servicePrice > 0) {
    priceNum = String(Math.round(b.servicePrice / 1000));
  } else {
    priceNum = '550';
  }

  let countNum = '';
  const countMatch = (b.attributes?.count || '').match(/\d+/);
  if (countMatch) {
    countNum = countMatch[0];
  } else {
    countNum = mat === 'Classic' ? '90' : '60';
  }

  const curl = (b.attributes?.curl || 'C').trim();
  let thick = (b.attributes?.thickness || '0.07')
    .replace(/mm/gi, '')
    .replace(/^0\.10$/, '0.1')
    .trim();
  if (!thick) thick = '0.07';

  let len = (b.attributes?.length || '10-12')
    .replace(/mm/gi, '')
    .replace(/\s+/g, '')
    .replace(/8-9-10-11-12/g, '8-12')
    .trim();
  if (!len) len = '10-12';

  const design = b.attributes?.style || 'Tự nhiên';

  return {
    material: mat,
    volume: vol,
    price: `${priceNum}.000đ`,
    count: `${countNum} sợi`,
    curl: `${curl} (Cong)`,
    thickness: `${thick}mm`,
    length: `${len}mm`,
    design,
  };
}

/**
 * Tính toán thời gian đếm ngược khách sẽ đến (theo phút - in mins)
 */
function formatArrivalCountdownInMins(
  timeStr: string | undefined,
  dateOffset: number,
  now: Date
): { text: string; colorClass: string; diffMins: number | null } {
  if (dateOffset !== 0) {
    if (dateOffset === 1) return { text: 'Ngày mai', colorClass: 'text-neutral-400', diffMins: null };
    if (dateOffset === -1) return { text: 'Hôm qua', colorClass: 'text-neutral-500', diffMins: null };
    return { text: `${dateOffset > 0 ? '+' : ''}${dateOffset}N`, colorClass: 'text-neutral-400', diffMins: null };
  }

  if (!timeStr) return { text: '-- mins', colorClass: 'text-neutral-500', diffMins: null };

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return { text: '-- mins', colorClass: 'text-neutral-500', diffMins: null };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  const apptDate = new Date(now);
  apptDate.setHours(hours, minutes, 0, 0);

  const diffMs = apptDate.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (60 * 1000));
  const suffix = Math.abs(diffMins) === 1 ? 'min' : 'mins';

  if (diffMins > 60) {
    return { text: `${diffMins} ${suffix}`, colorClass: 'text-neutral-400 font-bold', diffMins };
  }
  if (diffMins > 15) {
    return { text: `${diffMins} ${suffix}`, colorClass: 'text-sky-400 font-extrabold', diffMins };
  }
  if (diffMins > 0) {
    return { text: `${diffMins} ${suffix}`, colorClass: 'text-emerald-400 font-black animate-pulse', diffMins };
  }
  if (diffMins === 0) {
    return { text: '0 mins', colorClass: 'text-amber-400 font-black animate-pulse', diffMins: 0 };
  }
  // diffMins < 0: Đã quá giờ hẹn
  return { text: `${diffMins} ${suffix}`, colorClass: 'text-rose-400 font-bold', diffMins };
}

function parseBookingTime(timeStr?: string, baseDate: Date = new Date()): Date {
  const d = new Date(baseDate);
  if (!timeStr) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatTime24hFromDate(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatTime24h(timeStr?: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3]?.toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return timeStr.replace(/\s*(am|pm)/gi, '').trim();
}

/**
 * Tính toán thời gian hoàn tất dự kiến và số phút còn lại (in mins) cho ca đang làm
 */
function getBookingCompletionInfo(
  b: BookingItem,
  now: Date
): {
  completionTimeStr: string;
  countdownText: string;
  colorClass: string;
  diffMins: number;
} {
  const durationMinutes = b.serviceDuration || 90;

  // 1. Xác định thời điểm bắt đầu
  let startDate: Date;
  if (b.progress?.startedAt) {
    const parsed = new Date(b.progress.startedAt);
    startDate = isNaN(parsed.getTime()) ? parseBookingTime(b.time12h || b.timeSlot, now) : parsed;
  } else {
    startDate = parseBookingTime(b.time12h || b.timeSlot, now);
  }

  // 2. Thời điểm hoàn tất dự kiến
  const completionDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const completionTimeStr = formatTime24hFromDate(completionDate);

  // 3. Đếm ngược số phút còn lại để hoàn tất
  let remainingMins: number;
  if (b.progress?.elapsedSeconds && b.progress.elapsedSeconds > 0) {
    remainingMins = Math.round((durationMinutes * 60 - b.progress.elapsedSeconds) / 60);
  } else {
    const diffMs = completionDate.getTime() - now.getTime();
    remainingMins = Math.round(diffMs / (60 * 1000));
  }

  const suffix = Math.abs(remainingMins) === 1 ? 'min' : 'mins';

  if (remainingMins > 30) {
    return {
      completionTimeStr,
      countdownText: `${remainingMins} ${suffix}`,
      colorClass: 'text-emerald-400 font-extrabold',
      diffMins: remainingMins,
    };
  }
  if (remainingMins > 0) {
    return {
      completionTimeStr,
      countdownText: `${remainingMins} ${suffix}`,
      colorClass: 'text-amber-400 font-black animate-pulse',
      diffMins: remainingMins,
    };
  }
  if (remainingMins === 0) {
    return {
      completionTimeStr,
      countdownText: '0 mins',
      colorClass: 'text-amber-400 font-black animate-pulse',
      diffMins: 0,
    };
  }
  // remainingMins < 0: Đã quá giờ hoàn tất dự kiến
  return {
    completionTimeStr,
    countdownText: `${remainingMins} ${suffix}`,
    colorClass: 'text-rose-400 font-bold',
    diffMins: remainingMins,
  };
}

/**
 * Định dạng số tiền siêu gọn chuẩn Wings:
 * 770.000 -> 770K, 7.700.000 -> 7.700K, 200.000 -> 200K, 0 -> 0đ
 */
function formatShortMoney(amount: number): string {
  if (!amount || amount === 0) return '0đ';
  const k = Math.round(amount / 1000);
  return `${k.toLocaleString('vi-VN')}K`;
}

/**
 * Trích xuất 3 tầng thông tin chuẩn cho Cột Phải của ca ĐÃ XONG (DONE):
 * 1. Thời gian: 09:00 · 55p
 * 2. Tiền (Quan trọng nhất): -200K (nếu nợ) | Package 7.700K (nếu bán Combo) | +770K (nếu thu dịch vụ/phụ thu) | 0đ (nếu trừ combo)
 * 3. Điểm CV🪶 & Tip: ↻ +41 pts (kèm Heart 50K nếu có tip)
 */
function getDoneBookingSummary(b: BookingItem) {
  // 1. Giờ book và số phút làm thực tế
  const rawTime = b.time12h || b.timeSlot || '09:00';
  const bookingTimeStr = formatTime24h(rawTime);
  const rawElapsed = b.progress?.elapsedSeconds ? Math.round(b.progress.elapsedSeconds / 60) : 0;
  const durationMinutes = rawElapsed >= 20 && rawElapsed <= 150 ? rawElapsed : b.serviceDuration || 60;
  const timeAndDurationStr = `${bookingTimeStr} · ${durationMinutes}p`;

  // 2. Dòng TIỀN (Chỉ số quan trọng nhất)
  const debtAmount = Number(b.debtAmount || b.billing?.debtAmount || 0);
  const hasDebt = debtAmount > 0;

  const soldComboPrice = Number(b.selectedCombo?.price || (b.billing as any)?.soldComboPrice || 0);
  const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
  const upgradeOrPaidAmount = Number(
    b.upgradePrice && b.upgradePrice > 0 ? b.upgradePrice : isComboLive ? 0 : b.servicePrice
  );

  // 3. Điểm CV🪶 & Tip
  const cvPoints = Number(b.cvRotationPoints || 41);
  const tipAmount = Number(b.billing?.tipAmount || 0);

  return {
    timeAndDurationStr,
    hasDebt,
    debtAmount,
    soldComboPrice,
    upgradeOrPaidAmount,
    cvPoints,
    tipAmount,
  };
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
}: Screen01IncomingBookingsProps) {
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

  return (
    <div className="flex-1 flex flex-col bg-black text-white overflow-hidden select-none">
      {/* 1. Single Native iOS Navigation Bar (Clean 1-row layout) */}
      <div className="h-12 px-3 bg-black border-b border-neutral-900 flex items-center justify-between z-10 flex-shrink-0">
        {/* Left: Tên chi nhánh viết tắt siêu gọn "ĐT" + Live Refresh Indicator */}
        <button
          onClick={onRefreshDb}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#1C1C1E] border border-neutral-800 text-neutral-300 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="Làm mới dữ liệu từ máy chủ (Chi nhánh Đề Thám · ĐT)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11.5px] font-black text-neutral-200 tracking-wider">ĐT</span>
          <RefreshCw className={`w-3 h-3 text-neutral-400 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>

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
          <span className="text-[10.5px] font-black text-amber-400">
            {isCvll ? <CvFeather2Badge /> : <CvFeather1Badge />}
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

      {/* 1.5 Superadmin Scope Switcher Toolbar (Chỉ hiển thị khi Admin kiểm thử các vai trò quầy / quản lý CC, STORE, CVLL - Ẩn tuyệt đối khi ở vai trò CV🪶 để bảo mật 100%) */}
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
              Toàn bộ sảnh ({bookings.length})
            </button>
            <button
              onClick={() => onScopeModeChange?.('MY_CUSTOMERS')}
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer ${
                scopeMode === 'MY_CUSTOMERS' ? 'bg-amber-400 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Lọc CV🪶 ({actor?.name || 'Thảo Ly'})
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
          filteredBookings.map((b, idx) => {
            const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
            const remainingSessions = b.comboLiveStatus?.remainingSessions ?? 0;

            const cleanCustomerName = (b.customerName || 'Khách Hàng').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
            const displayPhone = (b.customerPhone || '').replace(/\*+\s*/g, '').trim();
            const visits = b.customerVisits || 1;
            const typeMeta = resolveCustomerTypeMeta(b);
            const lastVisitDateStr = b.lastVisitDate || b.lashHistory?.[0]?.date;
            const daysSinceLastVisit = parseDaysSinceLastVisit(lastVisitDateStr);
            const daysText = visits > 1 && daysSinceLastVisit !== null ? ` · ${daysSinceLastVisit}N` : '';
            const isServicingActive = b.status === 'SERVICING' || bookingSegment === 'SERVICING';
            const countdown = formatArrivalCountdownInMins(b.time12h || b.timeSlot, dateOffset, now);
            const completionInfo = getBookingCompletionInfo(b, now);
            const isDone = bookingSegment === 'DONE' || b.status === 'DONE';
            const doneSummary = isDone ? getDoneBookingSummary(b) : null;

            const isCurrentActiveServicing = Boolean(activeServicingBooking && b.id === activeServicingBooking.id);
            const isOtherCustomerLocked = Boolean(
              activeServicingBooking && b.id !== activeServicingBooking.id && !isCvll && !isAdmin
            );

            // Avatar Ring Indicator
            let avatarRingClass = 'border-2 border-emerald-500'; // Not Combo Live
            if (isComboLive && remainingSessions > 0) {
              avatarRingClass =
                remainingSessions <= 2
                  ? 'border-2 border-amber-400 ring-2 ring-amber-400/30' // Còn 1-2 lần
                  : 'border-2 border-neutral-500'; // Combo Live bình thường
            }

            const isNextQueue =
              b.isNextQueueCustomer || b.isUnassignedQueue || b.bookingAccessTag === 'NEXT_QUEUE_CUSTOMER';

            const isBookedInAdvance = Boolean(
              b.isBookedInAdvance ??
              (!isNextQueue &&
                b.assignedStaffId &&
                b.assignedStaffId > 0 &&
                (b.customerNote?.toLowerCase().includes('book') ||
                  b.customerNote?.toLowerCase().includes('chỉ định') ||
                  b.bookingAccessTag === 'MY_BOOKED_CUSTOMER'))
            );

            const cvStaffAvatar =
              b.assignedStaffAvatar ||
              resolveStaffAvatarUrl(null, b.assignedStaffId, b.assignedStaffName) ||
              'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png';

            const cardBgStyle = isCurrentActiveServicing
              ? 'bg-[#221C0E] border-2 border-amber-400 ring-2 ring-amber-400/30'
              : isOtherCustomerLocked
                ? 'bg-[#18181A] opacity-60 border-neutral-800/80 cursor-not-allowed'
                : 'bg-[#1C1C1E] active:bg-[#2C2C2E] border border-neutral-800/90 hover:border-neutral-700';

            const servicingSubStatus = resolveServicingSubStatus(b);

            return (
              <div
                key={b.id}
                onClick={() => {
                  if (isCurrentActiveServicing) {
                    if (onResumeServicing) onResumeServicing(b.id);
                    else onSelectBooking(b.id);
                    return;
                  }
                  if (isOtherCustomerLocked) {
                    setLockedCustomerModal({
                      isOpen: true,
                      attemptedCustomerName: b.customerName,
                    });
                    return;
                  }
                  onSelectBooking(b.id);
                }}
                className={`rounded-2xl p-3 flex items-start gap-3 transition-all cursor-pointer shadow-xs select-none ${cardBgStyle}`}
              >
                {/* 3.1 Avatar with Number Badge & Dual Corner Badges (Booker bottom-left & CV bottom-right) */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  {/* Badge số thứ tự 1, 2, 3... gắn ở góc trên bên trái của Avatar */}
                  <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2C2C2E] border border-neutral-700 text-[9.5px] font-black text-amber-400 flex items-center justify-center tabular-nums shadow-sm leading-none z-10">
                    {idx + 1}
                  </span>

                  <div
                    className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-neutral-900 shadow-sm ${avatarRingClass}`}
                  >
                    {b.customerAvatar ? (
                      <img
                        src={b.customerAvatar}
                        alt={b.customerName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Góc dưới bên trái: Avatar Người đặt lịch (Booker / Telesales) hoặc Logo 1 cánh trái Wings khi đặt online */}
                  <div
                    className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full overflow-hidden border border-neutral-700 bg-neutral-900 flex items-center justify-center shadow-md z-10"
                    title={b.bookerName ? `Người đặt lịch: ${b.bookerName}` : 'Khách đặt lịch online (Wings)'}
                  >
                    {b.bookerAvatar ? (
                      <img
                        src={b.bookerAvatar}
                        alt={b.bookerName || 'Booker'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1A1500] flex items-center justify-center overflow-hidden">
                        <img
                          src="/images/combo-cards/wings-logo-gold.png"
                          alt="Wings Online"
                          className="w-[180%] max-w-none h-full object-cover object-left"
                        />
                      </div>
                    )}
                  </div>

                  {/* Góc dưới bên phải: Avatar Chuyên Viên (CV) - Viền 1px xanh lá Emerald khi book riêng, Viền 1px xám khi đi theo tua, Để trống khi chưa phân công */}
                  {!isNextQueue && b.assignedStaffId && b.assignedStaffId > 0 && cvStaffAvatar && (
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden shadow-md z-10 ${
                        isBookedInAdvance ? 'border border-emerald-500' : 'border border-neutral-500'
                      } bg-neutral-900 flex items-center justify-center`}
                      title={
                        isBookedInAdvance
                          ? `Book riêng trước: ${b.assignedStaffName || 'Chuyên Viên'}`
                          : `Đi theo tua: ${b.assignedStaffName || 'Chuyên Viên'}`
                      }
                    >
                      <img
                        src={cvStaffAvatar}
                        alt={b.assignedStaffName || 'Chuyên Viên'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 3.2 Middle: 4 Lines Standardized by Danny */}
                <div className="flex-1 min-w-0 pr-1 flex flex-col justify-start">
                  {/* LINE 1: icon 123456 Tên khách (Không còn ****) */}
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`text-[12.5px] font-black flex-shrink-0 select-none ${typeMeta.colorClass}`}
                      title={typeMeta.label}
                    >
                      {typeMeta.symbol}
                    </span>
                    {displayPhone ? (
                      <span className="text-[12px] text-neutral-400 font-bold tabular-nums flex-shrink-0">
                        {displayPhone}
                      </span>
                    ) : null}
                    <span className="text-[14px] font-extrabold text-white truncate tracking-tight">
                      {cleanCustomerName}
                    </span>
                  </div>

                  {/* LINE 2: HyperLight 5X 770 60 (Lược bỏ chi tiết cong, dày, dài) */}
                  <div className="text-[11.5px] font-bold text-amber-400/90 tracking-tight leading-tight mt-0.5 truncate">
                    {formatLashSpecLine(b)}
                  </div>

                  {/* LINE 3: Lần X · 23N Thông tin combo pill mới và dặm nếu có */}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-neutral-400 font-medium tabular-nums">
                      Lần {visits}
                      {daysText}
                    </span>

                    {isOtherCustomerLocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold leading-none">
                        <Lock className="w-2.5 h-2.5 stroke-[2.2] shrink-0" />
                        <span>Chưa thể check-in</span>
                      </span>
                    )}

                    {isComboLive && remainingSessions > 0 && (
                      <ComboSessionBadge
                        normalRemaining={b.comboLiveStatus?.normalRemaining}
                        retainRemaining={b.comboLiveStatus?.retainRemaining}
                        remainingSessions={remainingSessions}
                        comboName={b.comboLiveStatus?.comboName}
                      />
                    )}
                  </div>

                  {/* LINE 4: notes + Ký hiệu xem chi tiết duy nhất */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomerDetail(b);
                    }}
                    className="text-[10.5px] text-neutral-400 hover:text-amber-300 leading-tight mt-1 line-clamp-1 italic font-normal cursor-pointer flex items-center justify-between group pt-0.5"
                    title="Bấm để xem chi tiết ghi chú & thông tin khách hàng"
                  >
                    <span className="truncate">
                      {b.customerNote ? `“${b.customerNote}”` : 'Hồ sơ & thông số khách'}
                    </span>
                    <span className="ml-1.5 shrink-0 not-italic flex items-center text-amber-400/90 group-hover:text-amber-300 transition-colors">
                      <Info className="w-3.5 h-3.5 stroke-[2.2]" />
                    </span>
                  </div>
                </div>

                {/* 3.3 Right Column */}
                {isDone && doneSummary ? (
                  <div className="w-[104px] flex-shrink-0 border-l border-neutral-800/80 pl-2.5 flex flex-col justify-center text-left self-stretch space-y-1">
                    {/* TẦNG 1: THỜI GIAN (09:00 · 55p) */}
                    <div className="text-neutral-400 text-[11px] font-bold tabular-nums tracking-tight leading-none">
                      {doneSummary.timeAndDurationStr}
                    </div>

                    {/* TẦNG 2: TIỀN (Quan trọng nhất: Nợ / Combo / Phụ thu / 0đ) */}
                    <div className="flex items-center gap-1 leading-none flex-wrap">
                      {doneSummary.hasDebt ? (
                        <span className="text-rose-500 font-black text-[12.5px] tabular-nums tracking-tight animate-pulse inline-flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 inline-block mr-1" />-
                          {formatShortMoney(doneSummary.debtAmount)}
                        </span>
                      ) : doneSummary.soldComboPrice > 0 ? (
                        <span className="text-purple-400 font-black text-[12.5px] tabular-nums tracking-tight inline-flex items-center">
                          <Package className="w-3.5 h-3.5 stroke-[2.2] text-purple-400 shrink-0 mr-1" />
                          {formatShortMoney(doneSummary.soldComboPrice)}
                        </span>
                      ) : doneSummary.upgradeOrPaidAmount > 0 ? (
                        <span className="text-emerald-400 font-black text-[12.5px] tabular-nums tracking-tight">
                          +{formatShortMoney(doneSummary.upgradeOrPaidAmount)}
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-bold text-[12px] tabular-nums">0đ</span>
                      )}
                    </div>

                    {/* TẦNG 3: ĐIỂM CV🪶 & TIP (↻ +41 pts · Heart 50K) */}
                    <div className="text-[10px] font-bold text-amber-400 tabular-nums tracking-tight leading-none whitespace-nowrap inline-flex items-center">
                      <span>↻ +{doneSummary.cvPoints}</span>
                      {doneSummary.tipAmount > 0 ? (
                        <span className="inline-flex items-center ml-0.5">
                          p · <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400 shrink-0 mx-0.5" />
                          {formatShortMoney(doneSummary.tipAmount)}
                        </span>
                      ) : (
                        ' pts'
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-[88px] flex-shrink-0 border-l border-neutral-800/80 pl-2.5 flex flex-col justify-center text-left self-stretch">
                    {/* HÀNG 1: THỜI GIAN 24H (Bỏ AM/PM để rộng chỗ) */}
                    <span className="text-amber-400 text-[14px] font-black tabular-nums leading-tight">
                      {isServicingActive ? completionInfo.completionTimeStr : formatTime24h(b.time12h || b.timeSlot)}
                    </span>

                    {/* HÀNG 2: BADGE TRẠNG THÁI (Checkout, Lashing, Cleaning,...) HOẶC COUNTDOWN KHI Ở CHỜ ĐÓN */}
                    {bookingSegment === 'SERVICING' ? (
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border tracking-tight leading-none ${servicingSubStatus.colorClass}`}
                        >
                          {servicingSubStatus.label}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`mt-1 text-[12px] font-extrabold tabular-nums tracking-tight leading-tight ${countdown.colorClass}`}
                        title={
                          countdown.diffMins !== null
                            ? countdown.diffMins >= 0
                              ? `Khách sẽ đến trong ${countdown.diffMins} phút`
                              : `Khách trễ ${Math.abs(countdown.diffMins)} phút`
                            : undefined
                        }
                      >
                        {countdown.text}
                      </div>
                    )}

                    {/* Nút Admin: Hoàn tác đưa khách hàng về Chờ đón (chỉ hiện khi Admin đang ở tab SERVICING) */}
                    {b.status === 'SERVICING' && isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevertConfirmModal({
                            isOpen: true,
                            bookingId: b.id,
                            customerName: cleanCustomerName,
                          });
                        }}
                        className="mt-1.5 w-full py-1 px-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[9.5px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-xs"
                        title="Quyền Admin: Trả khách hàng này về danh sách Chờ đón"
                      >
                        <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                        <span>Về Chờ đón</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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

              {/* Section 4: Gói Combo Live nếu có */}
              {selectedCustomerDetail.comboLiveStatus?.isComboLive && (
                <div className="rounded-2xl bg-[#252528] border border-amber-400/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                      <span>GÓI COMBO LIVE</span>
                    </span>
                    <span className="text-[11px] font-black text-amber-400">
                      Còn {selectedCustomerDetail.comboLiveStatus.remainingSessions} buổi
                    </span>
                  </div>
                  <div className="text-[12px] text-neutral-200">{selectedCustomerDetail.comboLiveStatus.comboName}</div>
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
    </div>
  );
}
