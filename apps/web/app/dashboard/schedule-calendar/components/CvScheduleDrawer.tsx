'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Drawer } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { Appointment, CvRealtimeStatusResponse } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

import nextDynamic from 'next/dynamic';
import {
  DailyCapInfo,
  StaffWorkingItem,
  computeCvAvailability,
  realtimeStatusToAvailability,
} from './cv-drawer/cvDrawerUtils';
import { CvHeaderToolbar } from './cv-drawer/CvHeaderToolbar';
import { CvStatusSummaryBar } from './cv-drawer/CvStatusSummaryBar';
import { CvQueueLaneSection } from './cv-drawer/CvQueueLaneSection';
import { CvSearchFilterBar } from './cv-drawer/CvSearchFilterBar';
import { CvWorkingStaffCard } from './cv-drawer/CvWorkingStaffCard';
import { CvOffStaffCard } from './cv-drawer/CvOffStaffCard';
import { CvTimePickerDrawer } from './cv-drawer/CvTimePickerDrawer';

const BookingWizardDrawer = nextDynamic(() => import('../../../../components/BookingWizardDrawer'), { ssr: false });
const UpdateBookingModal = nextDynamic(
  () => import('../../../../components/UpdateBookingModal').then((m) => m.UpdateBookingModal),
  { ssr: false }
);

export interface CvScheduleDrawerProps {
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

    // Quick CV Booking states
    const [selectedCvForBooking, setSelectedCvForBooking] = useState<StaffWorkingItem | null>(null);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<boolean>(false);

    // Booking SOP Drawer states
    const [isBookingWizardOpen, setIsBookingWizardOpen] = useState<boolean>(false);
    const [bookingPreFill, setBookingPreFill] = useState<{
      cv: StaffWorkingItem | null;
      branch: any;
      date: Dayjs;
      timeSlot: string;
      isOverbook: boolean;
    } | null>(null);

    const handleBookCv = useCallback((staffItem: StaffWorkingItem) => {
      setSelectedCvForBooking(staffItem);
      setIsTimePickerOpen(true);
    }, []);

    const handleSelectSlotFromPicker = useCallback(
      (slotInfo: { cv: StaffWorkingItem; date: Dayjs; timeSlot: string; isOverbook: boolean }) => {
        setIsTimePickerOpen(false);
        const branchNameStr = (slotInfo.cv.branchName || '').toLowerCase();
        const storeId = branchNameStr.includes('estella') ? '6' : '16';

        setBookingPreFill({
          cv: slotInfo.cv,
          branch: storeId,
          date: slotInfo.date,
          timeSlot: slotInfo.timeSlot,
          isOverbook: slotInfo.isOverbook,
        });
        setIsBookingWizardOpen(true);
      },
      []
    );

    // Update Booking Modal states
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

    const handleEditAppointment = useCallback((appt: Appointment) => {
      setEditingAppointment(appt);
      setIsUpdateModalOpen(true);
    }, []);

    // Fallback capacities and appointments fetched internally when props are not provided
    const [fetchedCapacities, setFetchedCapacities] = useState<Record<string, DailyCapInfo>>({});
    const [fetchedAppointments, setFetchedAppointments] = useState<Record<string, Appointment[]>>({});

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

    // Fetch daily capacities and appointments internally if props are not supplied by parent
    useEffect(() => {
      if (!open) return;
      const dayKey = currentDate.format('YYYY-MM-DD');

      if (!dailyCapacities?.[dayKey] || !appointmentsByDay?.[dayKey]) {
        let cancelled = false;
        const fetchScheduleData = async () => {
          try {
            const res = await apiClient.customers.getAppointments({
              dateFrom: dayKey,
              dateTo: dayKey,
            });
            if (cancelled) return;

            if (res.dailyCapacities) {
              setFetchedCapacities((prev) => ({ ...prev, ...res.dailyCapacities }));
            }
            if (res.data) {
              setFetchedAppointments((prev) => ({ ...prev, [dayKey]: res.data }));
            }
          } catch (err) {
            console.warn('Failed to fetch fallback capacities & appointments:', err);
          }
        };

        fetchScheduleData();
      }
    }, [open, currentDate, dailyCapacities, appointmentsByDay]);

    // Listen for booking updates to refresh drawer schedule data immediately
    useEffect(() => {
      const handleRefresh = async () => {
        if (!open) return;
        const dayKey = currentDate.format('YYYY-MM-DD');
        try {
          const res = await apiClient.customers.getAppointments({
            dateFrom: dayKey,
            dateTo: dayKey,
          });
          if (res.dailyCapacities) {
            setFetchedCapacities((prev) => ({ ...prev, ...res.dailyCapacities }));
          }
          if (res.data) {
            setFetchedAppointments((prev) => ({ ...prev, [dayKey]: res.data }));
          }
        } catch (err) {
          console.warn('Failed to refresh drawer appointments:', err);
        }
      };

      window.addEventListener('mos-booking-updated', handleRefresh);
      window.addEventListener('mos-data-updated', handleRefresh);
      return () => {
        window.removeEventListener('mos-booking-updated', handleRefresh);
        window.removeEventListener('mos-data-updated', handleRefresh);
      };
    }, [open, currentDate]);

    // Mouse drag resize handler optimized with requestAnimationFrame (60fps smooth drag)
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      let animationFrameId: number | null = null;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        if (animationFrameId !== null) return;

        animationFrameId = requestAnimationFrame(() => {
          animationFrameId = null;
          const newWidth = window.innerWidth - moveEvent.clientX;
          if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
            setDrawerWidth(newWidth);
          }
        });
      };

      const handleMouseUp = () => {
        if (isResizingRef.current) {
          isResizingRef.current = false;
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          setDrawerWidth((prev) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, prev.toString());
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
    const serverCap = dailyCapacities?.[dayKey] || fetchedCapacities[dayKey];
    const dayAppts = appointmentsByDay?.[dayKey] || fetchedAppointments[dayKey] || [];
    const ktvCount = serverCap?.workingKtvCount ?? 14;
    const isToday = currentDate.isSame(dayjs(), 'day');

    // Pre-index dayAppts by technicianId for O(1) lookups during staff list rendering
    const apptsByStaffMap = useMemo(() => {
      const map = new Map<number, Appointment[]>();
      (dayAppts || []).forEach((a) => {
        const tid = Number((a as any).technicianId);
        if (!tid) return;
        const list = map.get(tid) || [];
        list.push(a);
        map.set(tid, list);
      });
      return map;
    }, [dayAppts]);

    // All Working Staff enriched with 100% Real-Time Availability
    const allWorkingStaffWithAvailability = useMemo(() => {
      const rawList = serverCap?.workingStaffList || [];
      const offStaffIds = new Set((serverCap?.offStaffList || []).map((s: any) => Number(s.id)));
      const staffMap = new Map<number, any>();

      rawList.forEach((staff) => {
        // Do not include staff if they are in offStaffList (OFF phép / OFF tuần)
        if (offStaffIds.has(Number(staff.id))) return;

        const staffAppts = apptsByStaffMap.get(Number(staff.id)) || [];
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
      // BUT SKIP ANY STAFF WHO ARE IN offStaffList (ON LEAVE/OFF TODAY)
      if (realtimeData?.staffStatuses) {
        realtimeData.staffStatuses.forEach((rt) => {
          if (!staffMap.has(rt.staffId) && !offStaffIds.has(rt.staffId)) {
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
              avgDurationMinutes: (rt as any).avgDurationMinutes,
            });
          }
        });
      }

      return Array.from(staffMap.values()).sort(
        (a, b) => b.bookedCount - a.bookedCount || b.doneCount - a.doneCount || a.name.localeCompare(b.name)
      );
    }, [serverCap?.workingStaffList, serverCap?.offStaffList, dayAppts, currentDate, realtimeData]);

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

    const [staffAvatarMap, setStaffAvatarMap] = useState<Record<number, string>>({});

    useEffect(() => {
      if (!open) return;
      let cancelled = false;
      apiClient.staff
        .list()
        .then((list) => {
          if (cancelled || !list || !Array.isArray(list)) return;
          const map: Record<number, string> = {};
          list.forEach((s: any) => {
            if (s.id && s.avatarUrl) map[s.id] = s.avatarUrl;
          });
          setStaffAvatarMap(map);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [open]);

    // Filtered OFF Staff List
    const filteredOffStaff = useMemo(() => {
      const rawList = serverCap?.offStaffList || [];
      return rawList
        .map((staff) => {
          const realtimeMatch = realtimeData?.staffStatuses?.find((s) => s.staffId === staff.id);
          const workingMatch = serverCap?.workingStaffList?.find((s) => s.id === staff.id);
          return {
            ...staff,
            avatarUrl:
              staff.avatarUrl || workingMatch?.avatarUrl || realtimeMatch?.avatar || staffAvatarMap[staff.id] || null,
          };
        })
        .filter((staff) => {
          const matchesQuery =
            !searchQuery.trim() || staff.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
          const matchesBranch =
            selectedBranch === 'all' ||
            (staff.branchName || 'Đề Thám').toLowerCase().includes(selectedBranch.toLowerCase());
          return matchesQuery && matchesBranch;
        });
    }, [
      serverCap?.offStaffList,
      serverCap?.workingStaffList,
      searchQuery,
      selectedBranch,
      realtimeData,
      staffAvatarMap,
    ]);

    // Queue data from realtime API
    const queueStore6 = realtimeData?.queueByStore?.[6] || [];
    const queueStore16 = realtimeData?.queueByStore?.[16] || [];
    const offStaffList = serverCap?.offStaffList || [];

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
            padding: '14px',
            background: themeMode === 'dark' ? '#0b0f19' : '#f8fafc',
          },
        }}
        title={
          <CvHeaderToolbar
            currentDate={currentDate}
            onDateChange={onDateChange}
            onClose={onClose}
            ktvCount={ktvCount}
            offCount={offStaffList.length}
          />
        }
      >
        {/* Resizable Left Edge Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-emerald-500/50 active:bg-emerald-600 transition-colors z-50 flex items-center justify-center group"
          title="Kéo thả để thay đổi chiều rộng Side Slide (Tự lưu F5)"
          role="separator"
          aria-orientation="vertical"
          aria-label="Thay đổi kích thước Lịch CV"
        >
          <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600 group-hover:bg-white rounded-full" />
        </div>

        <div className="space-y-3">
          {/* Real-Time Store Availability Summary Bar */}
          {isToday && (
            <CvStatusSummaryBar
              statusCounts={statusCounts}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              isLive={!!realtimeData}
            />
          )}

          {/* Queue Lane — Next In Line */}
          {isToday && realtimeData && (
            <CvQueueLaneSection
              queueStore6={queueStore6}
              queueStore16={queueStore16}
              staffStatuses={realtimeData.staffStatuses}
            />
          )}

          {/* Search, Branch & Status Filter Bar */}
          <CvSearchFilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedBranch={selectedBranch}
            setSelectedBranch={setSelectedBranch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />

          {/* Section 1: Working CVs */}
          <div className="space-y-1.5" role="region" aria-label="Danh sách Chuyên viên Đi Làm">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between px-1">
              <span className="tabular-nums flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
                <span>CV Đi Làm ({filteredWorkingStaff.length})</span>
              </span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">(Xếp theo Lịch book giảm dần)</span>
            </div>

            {filteredWorkingStaff.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                Không tìm thấy Chuyên viên đi làm phù hợp
              </div>
            ) : (
              <div className="space-y-1.5" role="list">
                {filteredWorkingStaff.map((staff, idx) => (
                  <CvWorkingStaffCard key={staff.id} staff={staff} rankIndex={idx} onBookCv={handleBookCv} />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: OFF CVs */}
          <div
            className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800"
            role="region"
            aria-label="Danh sách Chuyên viên Nghỉ"
          >
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between px-1">
              <span className="tabular-nums flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 inline-block" />
                <span>CV Nghỉ / OFF ({filteredOffStaff.length})</span>
              </span>
              <span className="text-[10px] font-normal text-slate-400 normal-case inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> OFF Tuần
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> OFF Gấp
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> OFF Phép
                </span>
              </span>
            </div>

            {filteredOffStaff.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                Không có Chuyên viên nghỉ phép ngày này
              </div>
            ) : (
              <div className="space-y-1.5" role="list">
                {filteredOffStaff.map((staff, idx) => (
                  <CvOffStaffCard key={staff.id} staff={staff} rankIndex={idx} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CvTimePickerDrawer: 15-min visual timeline picker */}
        <CvTimePickerDrawer
          open={isTimePickerOpen}
          onClose={() => setIsTimePickerOpen(false)}
          staff={selectedCvForBooking}
          currentDate={currentDate}
          onDateChange={onDateChange}
          appointments={dayAppts}
          onSelectSlot={handleSelectSlotFromPicker}
          onEditAppointment={handleEditAppointment}
        />

        {/* BookingWizardDrawer: Standard Booking SOP with Pre-filled data */}
        {isBookingWizardOpen && bookingPreFill && (
          <BookingWizardDrawer
            open={isBookingWizardOpen}
            onClose={() => setIsBookingWizardOpen(false)}
            onSuccess={() => {
              setIsBookingWizardOpen(false);
              onClose();
            }}
            initialCV={{
              id: bookingPreFill.cv?.id,
              displayName: bookingPreFill.cv?.name,
              avatarUrl: bookingPreFill.cv?.avatarUrl,
            }}
            initialBranch={bookingPreFill.branch}
            initialDate={bookingPreFill.date}
            initialSlot={bookingPreFill.timeSlot}
            initialIsOverbook={bookingPreFill.isOverbook}
          />
        )}

        {/* UpdateBookingModal for editing lash service / technician */}
        {isUpdateModalOpen && editingAppointment && (
          <UpdateBookingModal
            visible={isUpdateModalOpen}
            onClose={() => {
              setIsUpdateModalOpen(false);
              setEditingAppointment(null);
            }}
            onSuccess={() => {
              setIsUpdateModalOpen(false);
              setEditingAppointment(null);
              // Dispatch refresh events to update timeline & drawer data immediately
              window.dispatchEvent(new CustomEvent('mos-booking-updated'));
              window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'booking' } }));
            }}
            booking={editingAppointment}
          />
        )}
      </Drawer>
    );
  }
);

CvScheduleDrawer.displayName = 'CvScheduleDrawer';
