'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Drawer, Tag, Input, Segmented, Button, Tooltip, Space, Avatar } from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { Appointment, CvRealtimeStatusResponse, CvStaffRealtimeStatus, CvQueueEntry } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

export type CvAvailabilityState = 'IDLE' | 'UPCOMING' | 'BUSY' | 'ENDING_SOON' | 'OVERTIME' | 'LOCKED';

export interface CvAvailabilityInfo {
  state: CvAvailabilityState;
  label: string;
  badgeStyle: string;
  cardStyle: string;
  customerName?: string;
  minutesRemaining?: number;
  minutesUntilNext?: number;
}

interface StaffWorkingItem {
  id: number;
  name: string;
  avatarUrl?: string | null;
  branchName?: string;
  shift?: string;
  bookedCount?: number;
  doneCount?: number;
  avgDurationMinutes?: {
    normalAvg?: number;
    retainAvg?: number;
    removalAvg?: number;
    overallAvg?: number;
  };
}

interface StaffOffItem {
  id: number;
  name: string;
  branchName?: string;
  reason: string;
  type?: string;
}

interface DailyCapInfo {
  workingKtvCount: number;
  maxCapacity: number;
  workingStaffList?: StaffWorkingItem[];
  offStaffList?: StaffOffItem[];
}

interface CvScheduleDrawerProps {
  open: boolean;
  onClose: () => void;
  currentDate: Dayjs;
  onDateChange: (newDate: Dayjs) => void;
  dailyCapacities?: Record<string, DailyCapInfo>;
  appointmentsByDay?: Record<string, Appointment[]>;
}

const DEFAULT_WIDTH = 540;
const MIN_WIDTH = 420;
const MAX_WIDTH = 900;
const STORAGE_KEY = 'schedule_calendar_cv_drawer_width';

// ── Status Badge/Card Styles ──────────────────────────────────────────
function getStatusStyles(state: CvAvailabilityState): { badgeStyle: string; cardStyle: string } {
  switch (state) {
    case 'BUSY':
      return {
        badgeStyle: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 font-bold',
        cardStyle: 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60 shadow-xs',
      };
    case 'ENDING_SOON':
      return {
        badgeStyle: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold',
        cardStyle: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 shadow-xs',
      };
    case 'OVERTIME':
      return {
        badgeStyle: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 font-extrabold animate-pulse',
        cardStyle: 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 shadow-xs',
      };
    case 'UPCOMING':
      return {
        badgeStyle: 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-500/40 font-bold',
        cardStyle: 'bg-yellow-50/60 dark:bg-yellow-950/30 border-yellow-200/80 dark:border-yellow-800/60 shadow-xs',
      };
    case 'LOCKED':
      return {
        badgeStyle: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30 font-medium',
        cardStyle: 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/60',
      };
    case 'IDLE':
    default:
      return {
        badgeStyle: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold',
        cardStyle:
          'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs',
      };
  }
}

/**
 * Converts real-time server status to CvAvailabilityInfo for display
 */
function realtimeStatusToAvailability(status: CvStaffRealtimeStatus): CvAvailabilityInfo {
  const state = (status.liveStatus || 'IDLE') as CvAvailabilityState;
  const styles = getStatusStyles(state);
  return {
    state,
    label: status.liveLabel || '🟢 Đang rảnh',
    ...styles,
    customerName: status.currentCustomerName || undefined,
    minutesRemaining: status.estimatedEndMinutes ?? undefined,
  };
}

/**
 * Fallback: Calculates availability from appointments when realtime API is unavailable
 */
export function computeCvAvailability(
  staffId: number,
  dayAppts: Appointment[],
  currentDate: Dayjs
): CvAvailabilityInfo {
  const now = dayjs();
  const isToday = currentDate.isSame(now, 'day');

  if (!isToday) {
    const isPast = currentDate.isBefore(now, 'day');
    return {
      state: 'IDLE',
      label: isPast ? '🏁 Đã xong ca' : '📅 Đã sẵn sàng ca',
      badgeStyle: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-medium',
      cardStyle: 'bg-white dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60',
    };
  }

  const staffAppts = dayAppts.filter(
    (a) =>
      Number((a as any).technicianId) === Number(staffId) && a.orderState !== 'Cancelled' && a.orderState !== 'Missed'
  );

  const activeAppt = staffAppts.find((a) => {
    if (a.orderState === 'Completed') return false;
    const startStr = a.bookingDateStart || (a as any).booking_date_start || (a as any).date_start;
    const start = dayjs(startStr);
    if (!start.isValid()) return false;
    const duration = (a as any).durationMinutes || (a as any).estimatedMinutes || 75;
    const end = start.add(duration, 'minute');
    return now.isAfter(start.subtract(5, 'minute')) && now.isBefore(end.add(30, 'minute'));
  });

  if (activeAppt) {
    const startStr =
      activeAppt.bookingDateStart || (activeAppt as any).booking_date_start || (activeAppt as any).date_start;
    const start = dayjs(startStr);
    const duration = (activeAppt as any).durationMinutes || (activeAppt as any).estimatedMinutes || 75;
    const estimatedEnd = start.add(duration, 'minute');
    const diffMinutes = estimatedEnd.diff(now, 'minute');
    const custName = activeAppt.customerName || (activeAppt as any).userName || 'Khách hàng';

    if (diffMinutes < -10) {
      const styles = getStatusStyles('OVERTIME');
      return {
        state: 'OVERTIME',
        label: `🔴 Quá giờ (${Math.abs(diffMinutes)}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesRemaining: diffMinutes,
      };
    } else if (diffMinutes <= 10) {
      const styles = getStatusStyles('ENDING_SOON');
      return {
        state: 'ENDING_SOON',
        label: `⚡ Sắp xong (còn ${Math.max(1, diffMinutes)}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesRemaining: diffMinutes,
      };
    } else {
      const styles = getStatusStyles('BUSY');
      return {
        state: 'BUSY',
        label: `🔵 Đang nối (còn ${diffMinutes}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesRemaining: diffMinutes,
      };
    }
  }

  const upcomingAppt = staffAppts
    .filter((a) => {
      if (a.orderState === 'Completed') return false;
      const startStr = a.bookingDateStart || (a as any).booking_date_start || (a as any).date_start;
      const start = dayjs(startStr);
      return start.isValid() && start.isAfter(now);
    })
    .sort((a, b) => dayjs(a.bookingDateStart).diff(dayjs(b.bookingDateStart)))[0];

  if (upcomingAppt) {
    const nextStartStr =
      upcomingAppt.bookingDateStart || (upcomingAppt as any).booking_date_start || (upcomingAppt as any).date_start;
    const nextStart = dayjs(nextStartStr);
    const diffToStart = nextStart.diff(now, 'minute');
    const custName = upcomingAppt.customerName || (upcomingAppt as any).userName || 'Khách hàng';

    if (diffToStart <= 30) {
      const styles = getStatusStyles('UPCOMING');
      return {
        state: 'UPCOMING',
        label: `🟡 Sắp có khách (trong ${Math.max(1, diffToStart)}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesUntilNext: diffToStart,
      };
    }
  }

  const styles = getStatusStyles('IDLE');
  return { state: 'IDLE', label: '🟢 Đang rảnh', ...styles };
}

// ── Queue Lane Avatar Border Colors ──────────────────────────────────
function getQueueBorderColor(entry: CvQueueEntry, staffStatus?: CvStaffRealtimeStatus): string {
  if (entry.isLockedForBooking) return 'ring-amber-400 dark:ring-amber-500';
  if (!entry.isAvailableNow) return 'ring-blue-500 dark:ring-blue-400';
  return 'ring-emerald-500 dark:ring-emerald-400';
}

function getQueueBgGlow(entry: CvQueueEntry): string {
  if (entry.isLockedForBooking) return 'shadow-amber-500/20';
  if (!entry.isAvailableNow) return 'shadow-blue-500/20';
  return 'shadow-emerald-500/20';
}

// ── Queue Lane Component ──────────────────────────────────────────────
interface QueueLaneProps {
  storeName: string;
  storeId: number;
  entries: CvQueueEntry[];
  staffStatuses: CvStaffRealtimeStatus[];
  themeMode: string;
}

const QueueLane: React.FC<QueueLaneProps> = React.memo(({ storeName, storeId, entries, staffStatuses, themeMode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll, entries.length]);

  const servicingStaff = useMemo(() => {
    return staffStatuses.filter((s) => s.storeId === storeId && s.liveStatus !== 'IDLE');
  }, [staffStatuses, storeId]);

  if (entries.length === 0 && servicingStaff.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-slate-700/40 pb-2 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider">🏪 {storeName}</span>
      </div>

      {/* Row 1: Hàng Chờ Tua (Next In Line) */}
      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <span>🎯 Hàng chờ tua</span>
          </span>
          <span className="text-[9px] tabular-nums text-slate-400 font-bold">({entries.length} CV)</span>
        </div>
        <div className="relative">
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-800/80 to-transparent z-10 pointer-events-none rounded-l-lg" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-800/80 to-transparent z-10 pointer-events-none rounded-r-lg" />
          )}
          <div
            ref={scrollRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 px-1"
            style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}
          >
            {entries.map((entry, idx) => {
              const staffStatus = staffStatuses.find((s) => s.staffId === entry.staffId);
              const borderColor = getQueueBorderColor(entry, staffStatus);
              const bgGlow = getQueueBgGlow(entry);
              const waitText =
                entry.estimatedWaitMinutes == null
                  ? '-'
                  : entry.estimatedWaitMinutes <= 0
                    ? '0p'
                    : `~${entry.estimatedWaitMinutes}p`;

              const tooltipContent = (
                <div className="text-xs space-y-1 min-w-[140px]">
                  <div className="font-bold">{entry.name}</div>
                  {staffStatus && <div className="text-slate-300">{staffStatus.liveLabel}</div>}
                  {entry.isLockedForBooking && entry.nextBookingInMinutes != null && (
                    <div className="text-amber-300">
                      🔒 Khách book trong {entry.nextBookingInMinutes}p
                      {entry.mappedBookingTime ? ` (${entry.mappedBookingTime})` : ''}
                    </div>
                  )}
                  {staffStatus?.currentCustomerName && (
                    <div className="text-blue-300">👤 {staffStatus.currentCustomerName}</div>
                  )}
                  <div className="text-emerald-300 font-bold tabular-nums">
                    {entry.estimatedWaitMinutes == null
                      ? 'Chờ: Chưa có lịch'
                      : `Chờ tua: ${waitText}${entry.mappedBookingTime ? ` (${entry.mappedBookingTime})` : ''}`}
                  </div>
                </div>
              );

              return (
                <React.Fragment key={entry.queueId}>
                  {idx > 0 && (
                    <span className="text-[8px] text-slate-600 dark:text-slate-600 shrink-0 select-none">→</span>
                  )}
                  <Tooltip title={tooltipContent} placement="bottom" arrow>
                    <div
                      className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer transition-transform hover:scale-110"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className={`relative ring-2 ${borderColor} rounded-full shadow-md ${bgGlow}`}>
                        <Avatar
                          src={entry.avatar}
                          icon={!entry.avatar ? <UserOutlined /> : undefined}
                          size={32}
                          className="bg-slate-700"
                        />
                        {entry.isLockedForBooking && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center text-[7px] border border-slate-800">
                            🔒
                          </div>
                        )}
                        {!entry.isAvailableNow && !entry.isLockedForBooking && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-slate-800" />
                        )}
                      </div>
                      <span
                        className={`text-[8px] tabular-nums font-bold leading-none ${
                          entry.estimatedWaitMinutes == null
                            ? 'text-slate-500 opacity-60'
                            : entry.estimatedWaitMinutes <= 0
                              ? 'text-emerald-400'
                              : entry.estimatedWaitMinutes <= 15
                                ? 'text-amber-400'
                                : 'text-slate-400'
                        }`}
                      >
                        {waitText}
                      </span>
                    </div>
                  </Tooltip>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Đang Nối Mi (Bận Ca) */}
      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <span>🔵 Đang nối mi / Phục vụ</span>
          </span>
          <span className="text-[9px] tabular-nums text-slate-400 font-bold">({servicingStaff.length} CV)</span>
        </div>
        {servicingStaff.length === 0 ? (
          <div className="text-[9px] text-slate-500 italic px-1 py-0.5">Không có CV nào đang bận ca</div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 px-1">
            {servicingStaff.map((staff) => {
              const endMinText =
                staff.estimatedEndMinutes != null
                  ? staff.estimatedEndMinutes < 0
                    ? `quá ${Math.abs(staff.estimatedEndMinutes)}p`
                    : `còn ${staff.estimatedEndMinutes}p`
                  : 'đang làm';

              const endFormattedTime = staff.bookingDateEnd ? dayjs(staff.bookingDateEnd).format('HH:mm') : null;

              const tooltipContent = (
                <div className="text-xs space-y-1 min-w-[150px]">
                  <div className="font-bold text-slate-100">{staff.name}</div>
                  <div className="text-cyan-300 font-semibold">
                    👤 Khách: {staff.currentCustomerName || 'Chưa cập nhật tên'}
                  </div>
                  <div className="text-slate-300">{staff.liveLabel}</div>
                  {endFormattedTime && (
                    <div className="text-amber-300 tabular-nums font-semibold">⏱️ Xong dự kiến: {endFormattedTime}</div>
                  )}
                </div>
              );

              return (
                <Tooltip key={staff.staffId} title={tooltipContent} placement="bottom" arrow>
                  <div className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer transition-transform hover:scale-110">
                    <div className="relative ring-2 ring-blue-500/80 rounded-full shadow-md">
                      <Avatar
                        src={staff.avatar}
                        icon={!staff.avatar ? <UserOutlined /> : undefined}
                        size={32}
                        className="bg-slate-700"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-slate-800 flex items-center justify-center text-[6px]">
                        ⚡
                      </div>
                    </div>
                    <span
                      className={`text-[8px] tabular-nums font-bold leading-none ${
                        staff.estimatedEndMinutes != null && staff.estimatedEndMinutes < 0
                          ? 'text-rose-400 font-extrabold'
                          : staff.estimatedEndMinutes != null && staff.estimatedEndMinutes <= 15
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                      }`}
                    >
                      {endMinText}
                    </span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
QueueLane.displayName = 'QueueLane';

// ── Main CvScheduleDrawer ─────────────────────────────────────────────
export const CvScheduleDrawer: React.FC<CvScheduleDrawerProps> = React.memo(
  ({ open, onClose, currentDate, onDateChange, dailyCapacities, appointmentsByDay }) => {
    const { themeMode } = useTheme();

    // Drawer resizable width state with localStorage persistence
    const [drawerWidth, setDrawerWidth] = useState<number>(DEFAULT_WIDTH);
    const isResizingRef = useRef(false);

    // Search, Branch & Status Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Real-time status from API
    const [realtimeData, setRealtimeData] = useState<CvRealtimeStatusResponse | null>(null);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const savedWidth = localStorage.getItem(STORAGE_KEY);
        if (savedWidth) {
          const parsed = parseInt(savedWidth, 10);
          if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
            setDrawerWidth(parsed);
          }
        }
      }
    }, []);

    // Fetch real-time CV status when drawer is open and viewing today
    useEffect(() => {
      if (!open) return;
      const isToday = currentDate.isSame(dayjs(), 'day');
      if (!isToday) {
        setRealtimeData(null);
        return;
      }

      let cancelled = false;
      const fetchStatus = async () => {
        try {
          const data = await apiClient.customers.getCvRealtimeStatus();
          if (!cancelled) setRealtimeData(data);
        } catch (err) {
          console.warn('Failed to fetch CV realtime status:', err);
        }
      };

      fetchStatus();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchStatus, 30000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [open, currentDate]);

    // Mouse drag resize handler
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const newWidth = window.innerWidth - moveEvent.clientX;
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
        setDrawerWidth(clampedWidth);
      };

      const handleMouseUp = () => {
        if (isResizingRef.current) {
          isResizingRef.current = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          setDrawerWidth((prev) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, String(prev));
            }
            return prev;
          });
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }, []);

    const dayKey = currentDate.format('YYYY-MM-DD');
    const serverCap = dailyCapacities?.[dayKey];
    const dayAppts = appointmentsByDay?.[dayKey] || [];
    const ktvCount = serverCap?.workingKtvCount ?? 14;
    const isToday = currentDate.isSame(dayjs(), 'day');

    const weekdayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const formattedDayTitle = `${weekdayNames[currentDate.day()]}, ${currentDate.format('DD/MM/YYYY')}`;

    // All Working Staff enriched with 100% Real-Time Availability
    const allWorkingStaffWithAvailability = useMemo(() => {
      const rawList = serverCap?.workingStaffList || [];
      const staffMap = new Map<number, any>();

      rawList.forEach((staff) => {
        const staffAppts = dayAppts.filter((a) => Number((a as any).technicianId) === Number(staff.id));
        const bookedCount = staff.bookedCount !== undefined ? staff.bookedCount : staffAppts.length;
        const doneCount =
          staff.doneCount !== undefined
            ? staff.doneCount
            : staffAppts.filter((a) => a.orderState === 'Completed').length;

        const realtimeStatus = realtimeData?.staffStatuses?.find((s) => s.staffId === staff.id);
        const availability = realtimeStatus
          ? realtimeStatusToAvailability(realtimeStatus)
          : computeCvAvailability(staff.id, dayAppts, currentDate);

        staffMap.set(staff.id, {
          ...staff,
          bookedCount,
          doneCount,
          availability,
          avatarUrl: staff.avatarUrl || realtimeStatus?.avatar || null,
        });
      });

      // Include any staff from realtimeData who might not be in serverCap.workingStaffList
      if (realtimeData?.staffStatuses) {
        realtimeData.staffStatuses.forEach((rt) => {
          if (!staffMap.has(rt.staffId)) {
            const availability = realtimeStatusToAvailability(rt);
            staffMap.set(rt.staffId, {
              id: rt.staffId,
              name: rt.name,
              avatarUrl: rt.avatar,
              branchName: rt.storeName,
              shift: 'Ca Full',
              bookedCount: 0,
              doneCount: 0,
              availability,
            });
          }
        });
      }

      return Array.from(staffMap.values()).sort(
        (a, b) => b.bookedCount - a.bookedCount || b.doneCount - a.doneCount || a.name.localeCompare(b.name)
      );
    }, [serverCap?.workingStaffList, dayAppts, currentDate, realtimeData]);

    // Real-Time Store Summary Counts
    const statusCounts = useMemo(() => {
      const counts = { IDLE: 0, UPCOMING: 0, BUSY: 0, ENDING_SOON: 0, OVERTIME: 0 };
      allWorkingStaffWithAvailability.forEach((s) => {
        const key = s.availability.state === 'LOCKED' ? 'UPCOMING' : s.availability.state;
        if (key in counts) counts[key as keyof typeof counts] = (counts[key as keyof typeof counts] || 0) + 1;
      });
      return counts;
    }, [allWorkingStaffWithAvailability]);

    // Filtered Working Staff List by Search, Branch, and Real-Time Status Filter
    const filteredWorkingStaff = useMemo(() => {
      return allWorkingStaffWithAvailability.filter((staff) => {
        const matchesQuery = !searchQuery.trim() || staff.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        const matchesBranch =
          selectedBranch === 'all' ||
          (staff.branchName || 'Đề Thám').toLowerCase().includes(selectedBranch.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' ||
          staff.availability.state === statusFilter ||
          (statusFilter === 'UPCOMING' && staff.availability.state === 'LOCKED');
        return matchesQuery && matchesBranch && matchesStatus;
      });
    }, [allWorkingStaffWithAvailability, searchQuery, selectedBranch, statusFilter]);

    // Filtered OFF Staff List
    const filteredOffStaff = useMemo(() => {
      const rawList = serverCap?.offStaffList || [];
      return rawList.filter((staff) => {
        const matchesQuery = !searchQuery.trim() || staff.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        const matchesBranch =
          selectedBranch === 'all' ||
          (staff.branchName || 'Đề Thám').toLowerCase().includes(selectedBranch.toLowerCase());
        return matchesQuery && matchesBranch;
      });
    }, [serverCap?.offStaffList, searchQuery, selectedBranch]);

    // Queue data from realtime API
    const queueStore6 = realtimeData?.queueByStore?.[6] || [];
    const queueStore16 = realtimeData?.queueByStore?.[16] || [];

    return (
      <Drawer
        placement="right"
        open={open}
        onClose={onClose}
        width={drawerWidth}
        closeIcon={null}
        styles={{
          header: {
            padding: '12px 16px',
            background: themeMode === 'dark' ? '#0f172a' : '#ffffff',
            borderBottom: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
          },
          body: {
            padding: '16px',
            background: themeMode === 'dark' ? '#0b0f19' : '#f8fafc',
          },
        }}
        title={
          <div className="flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2">
              <Space size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<LeftOutlined />}
                  onClick={() => onDateChange(currentDate.subtract(1, 'day'))}
                  title="Ngày trước đó"
                  className="hover:bg-slate-100 dark:hover:bg-slate-800"
                />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CalendarOutlined className="text-emerald-500" />
                  <span>Lịch CV — {formattedDayTitle}</span>
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<RightOutlined />}
                  onClick={() => onDateChange(currentDate.add(1, 'day'))}
                  title="Ngày tiếp theo"
                  className="hover:bg-slate-100 dark:hover:bg-slate-800"
                />
              </Space>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Tag color="emerald" className="m-0 text-[11px] font-bold py-0.5 px-2 rounded-full">
                🟢 {ktvCount} Đi làm
              </Tag>
              {serverCap?.offStaffList && serverCap.offStaffList.length > 0 && (
                <Tag color="rose" className="m-0 text-[11px] font-bold py-0.5 px-2 rounded-full">
                  🔴 {serverCap.offStaffList.length} OFF
                </Tag>
              )}
              <Button
                type="text"
                size="small"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold ml-1"
              >
                ✕
              </Button>
            </div>
          </div>
        }
      >
        {/* Resizable Left Edge Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-emerald-500/50 active:bg-emerald-600 transition-colors z-50 flex items-center justify-center group"
          title="Kéo thả để thay đổi chiều rộng Side Slide (Tự lưu F5)"
        >
          <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600 group-hover:bg-white rounded-full" />
        </div>

        <div className="space-y-3.5">
          {/* Real-Time Store Availability Summary Bar */}
          {isToday && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-2.5 rounded-xl border border-slate-700/80 shadow-md text-white">
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>⚡ Trạng Thái Sẵn Sàng CV Real-Time</span>
                <span className="text-[9px] font-mono text-emerald-400 font-normal">
                  {realtimeData ? 'LIVE từ order_state' : 'Tự cập nhật theo NOW()'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'IDLE' ? 'all' : 'IDLE')}
                  className={`p-1 rounded-lg border text-[10px] font-bold transition-all ${
                    statusFilter === 'IDLE'
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-2xs'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  }`}
                >
                  <div>🟢 Rảnh</div>
                  <div className="text-xs font-extrabold tabular-nums">{statusCounts.IDLE}</div>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === 'UPCOMING' ? 'all' : 'UPCOMING')}
                  className={`p-1 rounded-lg border text-[10px] font-bold transition-all ${
                    statusFilter === 'UPCOMING'
                      ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-2xs'
                      : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/25'
                  }`}
                >
                  <div>🟡 Sắp hẹn</div>
                  <div className="text-xs font-extrabold tabular-nums">{statusCounts.UPCOMING}</div>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === 'BUSY' ? 'all' : 'BUSY')}
                  className={`p-1 rounded-lg border text-[10px] font-bold transition-all ${
                    statusFilter === 'BUSY'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-2xs'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                  }`}
                >
                  <div>🔵 Đang nối</div>
                  <div className="text-xs font-extrabold tabular-nums">{statusCounts.BUSY}</div>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === 'ENDING_SOON' ? 'all' : 'ENDING_SOON')}
                  className={`p-1 rounded-lg border text-[10px] font-bold transition-all ${
                    statusFilter === 'ENDING_SOON'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-2xs'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                  }`}
                >
                  <div>⚡ Sắp xong</div>
                  <div className="text-xs font-extrabold tabular-nums">{statusCounts.ENDING_SOON}</div>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === 'OVERTIME' ? 'all' : 'OVERTIME')}
                  className={`p-1 rounded-lg border text-[10px] font-bold transition-all ${
                    statusFilter === 'OVERTIME'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-2xs'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                  }`}
                >
                  <div>🔴 Quá giờ</div>
                  <div className="text-xs font-extrabold tabular-nums">{statusCounts.OVERTIME}</div>
                </button>
              </div>
            </div>
          )}

          {/* Queue Lane — Next In Line */}
          {isToday && realtimeData && (queueStore6.length > 0 || queueStore16.length > 0) && (
            <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 p-2.5 rounded-xl border border-slate-700/60 shadow-lg">
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🎯 Hàng Chờ CV — Next In Line</span>
                <span className="text-[8px] font-mono text-cyan-400/80 font-normal ml-auto">Hover để xem chi tiết</span>
              </div>
              <div className="space-y-2">
                {queueStore6.length > 0 && (
                  <QueueLane
                    storeName="Đề Thàm"
                    storeId={6}
                    entries={queueStore6}
                    staffStatuses={realtimeData.staffStatuses}
                    themeMode={themeMode}
                  />
                )}
                {queueStore16.length > 0 && (
                  <QueueLane
                    storeName="Estella Place"
                    storeId={16}
                    entries={queueStore16}
                    staffStatuses={realtimeData.staffStatuses}
                    themeMode={themeMode}
                  />
                )}
              </div>
            </div>
          )}

          {/* Search, Branch & Status Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <Input
              prefix={<SearchOutlined className="text-slate-400 text-xs" />}
              placeholder="Tìm tên Chuyên viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="small"
              className="flex-1 min-w-[160px] text-xs"
            />
            <Segmented
              size="small"
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val as string)}
              options={[
                { label: 'Tất cả', value: 'all' },
                { label: 'Đề Thám', value: 'Đề Thám' },
                { label: 'Estella', value: 'Estella Place' },
              ]}
              className="text-xs shrink-0"
            />
            {statusFilter !== 'all' && (
              <Button
                size="small"
                type="primary"
                danger
                onClick={() => setStatusFilter('all')}
                className="text-[10px] font-bold shrink-0"
              >
                Bỏ lọc trạng thái ✕
              </Button>
            )}
          </div>

          {/* Section 1: Working CVs */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between px-1">
              <span>🟢 CV Đi Làm ({filteredWorkingStaff.length})</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">(Xếp theo Lịch book giảm dần)</span>
            </div>

            {filteredWorkingStaff.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                Không tìm thấy Chuyên viên đi làm phù hợp
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredWorkingStaff.map((staff, idx) => (
                  <div
                    key={staff.id}
                    className={`flex items-center justify-between text-xs p-2.5 rounded-xl border transition-all ${staff.availability.cardStyle}`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span
                          className={`font-bold text-[10px] min-w-[22px] text-center px-1 py-0.5 rounded tabular-nums shrink-0 ${
                            idx === 0 && staff.bookedCount > 0
                              ? 'bg-amber-500 text-white font-extrabold shadow-2xs'
                              : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                          }`}
                        >
                          #{idx + 1}
                        </span>

                        {/* Avatar */}
                        {staff.avatarUrl && (
                          <Avatar
                            src={staff.avatarUrl}
                            size={22}
                            className="shrink-0 ring-1 ring-slate-300 dark:ring-slate-600"
                          />
                        )}

                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{staff.name}</span>
                        {idx === 0 && staff.bookedCount > 0 && (
                          <Tag color="gold" className="m-0 text-[9px] px-1.5 py-0 font-bold shrink-0">
                            🔥 Top Booked
                          </Tag>
                        )}

                        {/* Real-Time Availability Badge */}
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${staff.availability.badgeStyle}`}
                        >
                          {staff.availability.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pl-7 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold tabular-nums">
                          📅 {staff.bookedCount} Book
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold tabular-nums">
                          ✅ {staff.doneCount} Done
                        </span>
                        {staff.avgDurationMinutes?.normalAvg && staff.avgDurationMinutes?.retainAvg && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold tabular-nums">
                            ⚡ {staff.avgDurationMinutes.normalAvg}p nối • {staff.avgDurationMinutes.retainAvg}p dặm
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1 ml-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                        {staff.branchName || 'Đề Thám'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{staff.shift || 'Ca Full'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: OFF CVs */}
          <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between px-1">
              <span>🔴 CV Nghỉ / OFF ({filteredOffStaff.length})</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">
                (🟡 OFF Tuần | 🔴 OFF Gấp | 🟠 OFF Phép)
              </span>
            </div>

            {filteredOffStaff.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                Không có Chuyên viên nghỉ phép ngày này
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredOffStaff.map((staff, idx) => {
                  const reasonStr = staff.reason || '';
                  const isWeeklyOff =
                    staff.type === 'weekly_off' ||
                    reasonStr.includes('Nghỉ hàng tuần') ||
                    reasonStr.includes('OFF Tuần');
                  const isUrgentOff =
                    staff.type === 'urgent_off' || /gấp|đột xuất|bệnh|ốm|khẩn|cấp cứu/i.test(reasonStr);

                  const cardStyle = isWeeklyOff
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/80 shadow-2xs'
                    : isUrgentOff
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/90 dark:border-rose-800/80 shadow-2xs'
                      : 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200/90 dark:border-orange-800/80 shadow-2xs';

                  const numColor = isWeeklyOff
                    ? 'text-amber-600 dark:text-amber-400'
                    : isUrgentOff
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-orange-600 dark:text-orange-400';

                  const reasonColor = isWeeklyOff
                    ? 'text-amber-800 dark:text-amber-300'
                    : isUrgentOff
                      ? 'text-rose-800 dark:text-rose-300'
                      : 'text-orange-800 dark:text-orange-300';

                  const badgeStyleOff = isWeeklyOff
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : isUrgentOff
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      : 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';

                  const typeLabel = isWeeklyOff ? '🟡 OFF Tuần' : isUrgentOff ? '🔴 OFF Gấp' : '🟠 OFF Phép';

                  return (
                    <div
                      key={staff.id}
                      className={`flex items-center justify-between text-xs p-2.5 rounded-xl border transition-all ${cardStyle}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`font-bold text-[10px] w-4 shrink-0 ${numColor}`}>#{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{staff.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${badgeStyleOff}`}
                            >
                              {typeLabel}
                            </span>
                          </div>
                          <div
                            className={`text-[10px] font-medium mt-0.5 whitespace-normal break-words ${reasonColor}`}
                          >
                            {staff.reason}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeStyleOff}`}>
                          {staff.branchName || 'Đề Thám'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    );
  }
);

CvScheduleDrawer.displayName = 'CvScheduleDrawer';
