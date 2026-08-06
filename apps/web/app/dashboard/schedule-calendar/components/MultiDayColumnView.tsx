'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, Tag, Button, Tooltip, Progress, Badge, Popover, Space, Typography, Avatar, message } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PlusOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  WarningOutlined,
  SwapOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleFilled,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Appointment } from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { useTheme } from '../../../../context/ThemeContext';

const { Text, Title } = Typography;

interface MultiDayColumnViewProps {
  loading: boolean;
  startDate: dayjs.Dayjs;
  daysCount?: number; // 3, 5, or 7 days
  appointments: Appointment[];
  maxCapacityPerDay?: number; // Default e.g. 25 slots
  dailyCapacities?: Record<
    string,
    {
      workingKtvCount: number;
      maxCapacity: number;
      workingStaffList?: Array<{
        id: number;
        name: string;
        branchName?: string;
        shift?: string;
        bookedCount?: number;
        doneCount?: number;
        avgDurationMinutes?: { normalAvg?: number; retainAvg?: number; removalAvg?: number; overallAvg?: number };
      }>;
      offStaffList?: Array<{ id: number; name: string; branchName?: string; reason: string; type?: string }>;
    }
  >;
  onSelectSlot?: (date: dayjs.Dayjs, hour: string) => void;
  onViewCustomerDetail?: (customerId: number) => void;
  onReschedule?: (appointment: Appointment, newDateStr?: string) => void;
}

const HOURS_RANGE = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export function getBranchBadgeInfo(storeId?: number | null, branchName?: string) {
  const name = branchName || '';
  const sId = storeId ? Number(storeId) : 0;
  if (sId === 2 || sId === 9 || name.toLowerCase().includes('phan xích long') || name.toLowerCase().includes('pxl')) {
    return {
      code: 'PXL',
      label: 'Phan Xích Long',
      bgClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/60',
    };
  }
  if (
    sId === 6 ||
    sId === 1 ||
    sId === 3 ||
    name.toLowerCase().includes('đề thám') ||
    name.toLowerCase().includes('de tham')
  ) {
    return {
      code: 'DT',
      label: 'Đề Thám',
      bgClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-300 dark:border-orange-700/60',
    };
  }
  return {
    code: 'EP',
    label: 'Estella Place',
    bgClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
  };
}

function MultiDayColumnView({
  loading,
  startDate,
  daysCount = 5,
  appointments,
  maxCapacityPerDay = 25,
  dailyCapacities,
  onSelectSlot,
  onViewCustomerDetail,
  onReschedule,
}: MultiDayColumnViewProps) {
  const { makeCall } = useOmiCall();
  const { themeMode } = useTheme();
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null);

  // Saved resizable Popover dimensions
  const [popoverDimensions, setPopoverDimensions] = useState<{ width: number; height: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mos_lab_cv_popover_size');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.width && parsed?.height && parsed.width >= 280 && parsed.height >= 300) {
            return { width: Number(parsed.width), height: Number(parsed.height) };
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return { width: 340, height: 480 };
  });

  const observerRef = useRef<ResizeObserver | null>(null);

  const setPopoverRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.target.getBoundingClientRect();
          const w = Math.round(rect.width);
          const h = Math.round(rect.height);
          if (w >= 280 && h >= 300) {
            const newSize = { width: w, height: h };
            try {
              localStorage.setItem('mos_lab_cv_popover_size', JSON.stringify(newSize));
            } catch (e) {
              // ignore
            }
          }
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Generate array of days
  const daysList = React.useMemo(() => {
    const list: dayjs.Dayjs[] = [];
    for (let i = 0; i < daysCount; i++) {
      list.push(startDate.clone().add(i, 'day'));
    }
    return list;
  }, [startDate, daysCount]);

  // Group appointments by YYYY-MM-DD
  const appointmentsByDay = React.useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    daysList.forEach((d) => {
      map[d.format('YYYY-MM-DD')] = [];
    });

    appointments.forEach((appt) => {
      if (!appt.bookingDateStart) return;
      const apptDay = dayjs(appt.bookingDateStart).format('YYYY-MM-DD');
      if (map[apptDay]) {
        map[apptDay].push(appt);
      }
    });

    return map;
  }, [appointments, daysList]);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, appt: Appointment) => {
    e.dataTransfer.setData('text/plain', String(appt.id || (appt as any).orderId));
    setDraggedAppt(appt);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: dayjs.Dayjs, targetHour: string) => {
    e.preventDefault();
    if (!draggedAppt) return;

    const [hourNum] = targetHour.split(':');
    const newDateTime = targetDate.clone().hour(parseInt(hourNum, 10)).minute(0).format('YYYY-MM-DD HH:mm:ss');

    if (onReschedule) {
      onReschedule(draggedAppt, newDateTime);
    }
    setDraggedAppt(null);
  };

  const getCapacityBadge = (count: number, maxCap: number) => {
    const percentage = Math.min(100, Math.round((count / maxCap) * 100));
    if (percentage >= 85) {
      return {
        label: 'Quá tải / Kín',
        status: 'error' as const,
        color: '#ef4444',
        progressStatus: 'exception' as const,
        percentage,
      };
    } else if (percentage >= 65) {
      return {
        label: 'Đông khách',
        status: 'warning' as const,
        color: '#f59e0b',
        progressStatus: 'active' as const,
        percentage,
      };
    } else {
      return {
        label: 'Bình thường',
        status: 'success' as const,
        color: '#10b981',
        progressStatus: 'normal' as const,
        percentage,
      };
    }
  };

  return (
    <div className="multi-day-column-view overflow-x-auto pb-4 w-full">
      <div
        className="grid gap-3 w-full min-w-[900px]"
        style={{ gridTemplateColumns: `80px repeat(${daysCount}, minmax(0, 1fr))` }}
      >
        {/* Leftmost Header Column: Time Axis label */}
        <div className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-end items-center shadow-xs">
          <ClockCircleOutlined className="text-slate-400 text-lg mb-1" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Khung giờ</span>
        </div>

        {/* Day Columns Headers */}
        {daysList.map((day) => {
          const dayKey = day.format('YYYY-MM-DD');
          const dayAppts = appointmentsByDay[dayKey] || [];
          const totalRev = dayAppts.reduce((sum, a) => sum + (a.totalPrice || (a as any).orderPrice || 0), 0);

          // Calculate dynamic KTV count & max capacity from server schedule (working KTVs = total active minus OFF days)
          const serverCap = dailyCapacities?.[dayKey];
          const ktvCount = serverCap?.workingKtvCount ?? 14;
          const dynamicMaxCapacity = serverCap?.maxCapacity ?? ktvCount * 5;
          const fillPercentage = Math.round((dayAppts.length / dynamicMaxCapacity) * 100);
          const capInfo = getCapacityBadge(dayAppts.length, dynamicMaxCapacity);
          const isToday = day.isSame(dayjs(), 'day');

          const cvListPopoverContent = (
            <div
              ref={setPopoverRef}
              style={{
                width: `${popoverDimensions.width}px`,
                height: `${popoverDimensions.height}px`,
                resize: 'both',
                overflow: 'hidden',
                minWidth: '320px',
                minHeight: '350px',
                maxWidth: '700px',
                maxHeight: '80vh',
                backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
              }}
              className="p-3 space-y-3 relative group text-xs flex flex-col h-full select-none rounded-xl border border-slate-700/80 shadow-2xl text-slate-800 dark:text-slate-100"
            >
              <div className="font-bold text-slate-800 dark:text-slate-100 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 flex justify-between items-center shrink-0">
                <span className="font-bold text-sm">Lịch CV ({day.format('DD/MM')})</span>
                <div className="flex items-center gap-1">
                  <Tag color="emerald" className="m-0 text-[10px] font-bold">
                    {ktvCount} Đi làm
                  </Tag>
                  {serverCap?.offStaffList && serverCap.offStaffList.length > 0 && (
                    <Tag color="rose" className="m-0 text-[10px] font-bold">
                      {serverCap.offStaffList.length} OFF
                    </Tag>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                {/* Section 1: Working CVs sorted by Most Booked */}
                {(() => {
                  const enrichedWorkingStaff = (serverCap?.workingStaffList || [])
                    .map((staff) => {
                      const staffAppts = dayAppts.filter((a) => Number(a.technicianId) === Number(staff.id));
                      const bookedCount = staff.bookedCount !== undefined ? staff.bookedCount : staffAppts.length;
                      const doneCount =
                        staff.doneCount !== undefined
                          ? staff.doneCount
                          : staffAppts.filter((a) => a.orderState === 'Completed').length;
                      const doneRate = bookedCount > 0 ? Math.round((doneCount / bookedCount) * 100) : 0;
                      return {
                        ...staff,
                        bookedCount,
                        doneCount,
                        doneRate,
                      };
                    })
                    .sort(
                      (a, b) =>
                        b.bookedCount - a.bookedCount || b.doneCount - a.doneCount || a.name.localeCompare(b.name)
                    );

                  return (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                        <span>🟢 CV Đi Làm ({enrichedWorkingStaff.length})</span>
                        <span className="text-[10px] font-normal text-slate-400 normal-case">
                          (Xếp theo Lịch book giảm dần)
                        </span>
                      </div>
                      {enrichedWorkingStaff.map((staff, idx) => (
                        <div
                          key={staff.id}
                          className={`flex items-center justify-between text-xs p-2 rounded-lg border transition-all ${
                            staff.bookedCount > 0
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs'
                              : 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200/40 dark:border-slate-800/40'
                          }`}
                        >
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`font-bold text-[10px] min-w-[20px] text-center px-1 rounded tabular-nums shrink-0 ${
                                  idx === 0 && staff.bookedCount > 0
                                    ? 'bg-amber-500 text-white font-extrabold'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">
                                {staff.name}
                              </span>
                              {idx === 0 && staff.bookedCount > 0 && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                  🔥 Top Booked
                                </span>
                              )}
                            </div>

                            {/* Booked & Done counts */}
                            <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${
                                  staff.bookedCount > 0
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700/50'
                                }`}
                              >
                                📅 {staff.bookedCount} Book
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${
                                  staff.doneCount > 0
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700/50'
                                }`}
                              >
                                ✅ {staff.doneCount} Done
                              </span>

                              {staff.avgDurationMinutes &&
                                (staff.avgDurationMinutes.normalAvg || staff.avgDurationMinutes.retainAvg) && (
                                  <Tooltip
                                    title={
                                      <div className="text-xs space-y-1 p-0.5">
                                        <div className="font-bold text-amber-300 border-b border-amber-500/30 pb-0.5 mb-1">
                                          ⏱️ Tốc độ nối mi trung bình ({staff.name})
                                        </div>
                                        {staff.avgDurationMinutes.normalAvg && (
                                          <div>
                                            • Nối mới:{' '}
                                            <span className="font-bold text-white">
                                              {staff.avgDurationMinutes.normalAvg} phút/bộ
                                            </span>
                                          </div>
                                        )}
                                        {staff.avgDurationMinutes.retainAvg && (
                                          <div>
                                            • Dặm mi:{' '}
                                            <span className="font-bold text-white">
                                              {staff.avgDurationMinutes.retainAvg} phút/bộ
                                            </span>
                                          </div>
                                        )}
                                        {staff.avgDurationMinutes.removalAvg && (
                                          <div>
                                            • Tháo / Sửa:{' '}
                                            <span className="font-bold text-white">
                                              {staff.avgDurationMinutes.removalAvg} phút/ca
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    }
                                  >
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20 tabular-nums cursor-help">
                                      ⚡{' '}
                                      {staff.avgDurationMinutes.normalAvg
                                        ? `${staff.avgDurationMinutes.normalAvg}p mới`
                                        : ''}
                                      {staff.avgDurationMinutes.normalAvg && staff.avgDurationMinutes.retainAvg
                                        ? ' • '
                                        : ''}
                                      {staff.avgDurationMinutes.retainAvg
                                        ? `${staff.avgDurationMinutes.retainAvg}p dặm`
                                        : ''}
                                    </span>
                                  </Tooltip>
                                )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {staff.branchName || 'Đề Thám'}
                            </span>
                            <div className="text-[9px] text-slate-400 mt-0.5 tabular-nums">
                              {staff.shift || 'Ca Full'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Section 2: OFF CVs with Reasons */}
                {serverCap?.offStaffList && serverCap.offStaffList.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <span>🔴 CV Nghỉ / OFF ({serverCap.offStaffList.length})</span>
                    </div>
                    {serverCap.offStaffList.map((staff, idx) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/40"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-500 text-[10px] w-4">#{idx + 1}</span>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">{staff.name}</div>
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                              {staff.reason}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {staff.branchName || 'Đề Thám'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[9px] text-slate-400 text-right pt-1.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                Kéo góc phải dưới để resize • Tự lưu F5
              </div>
            </div>
          );

          return (
            <div
              key={dayKey}
              className={`rounded-xl border p-3 flex flex-col justify-between transition-all shadow-xs ${
                isToday
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/50'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}
                  >
                    {day.format('dddd')} {isToday && '(Hôm nay)'}
                  </span>
                  <Tag color={capInfo.color} className="m-0 text-[10px] px-1.5 py-0 border-0 font-medium">
                    {capInfo.label}
                  </Tag>
                </div>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                  {day.format('DD/MM/YYYY')}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Số đơn:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {dayAppts.length} / {dynamicMaxCapacity} ({fillPercentage}%)
                    </span>
                    <Popover
                      content={cvListPopoverContent}
                      title={undefined}
                      trigger="click"
                      placement="bottom"
                      styles={{
                        body: {
                          padding: 0,
                          overflow: 'hidden',
                          backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                        },
                      }}
                      overlayStyle={{ maxWidth: 'none' }}
                    >
                      <Tag
                        color="cyan"
                        className="m-0 text-[10px] px-1.5 py-0 cursor-pointer font-bold hover:opacity-80 transition-opacity"
                      >
                        • {ktvCount} CV
                      </Tag>
                    </Popover>
                  </div>
                </div>
                <Progress
                  percent={Math.min(100, fillPercentage)}
                  size="small"
                  showInfo={false}
                  strokeColor={capInfo.color}
                  className="m-0"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
                  <span>Dự kiến:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatVND(totalRev)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Time Rows */}
        {HOURS_RANGE.map((hourStr) => (
          <React.Fragment key={hourStr}>
            {/* Time Slot Label Column */}
            <div className="sticky left-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-lg p-2 flex items-center justify-center font-mono text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums shadow-xs">
              {hourStr}
            </div>

            {/* Slots per Day */}
            {daysList.map((day) => {
              const dayKey = day.format('YYYY-MM-DD');
              const dayAppts = appointmentsByDay[dayKey] || [];
              const targetHourNum = parseInt(hourStr.split(':')[0], 10);

              // Filter appointments in this hour slot
              const slotAppts = dayAppts.filter((a) => {
                if (!a.bookingDateStart) return false;
                const h = dayjs(a.bookingDateStart).hour();
                return h === targetHourNum;
              });

              return (
                <div
                  key={`${dayKey}-${hourStr}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day, hourStr)}
                  onClick={() => slotAppts.length === 0 && onSelectSlot && onSelectSlot(day, hourStr)}
                  className={`min-h-[76px] p-1.5 rounded-lg border transition-all relative group flex flex-col gap-1.5 ${
                    slotAppts.length === 0
                      ? 'border-dashed border-slate-200 dark:border-slate-800/70 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  {slotAppts.length === 0 ? (
                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        className="text-[11px] text-emerald-600 border-emerald-400"
                      >
                        Thêm lịch
                      </Button>
                    </div>
                  ) : (
                    slotAppts.map((appt) => {
                      const customerName = appt.customerName || (appt as any).userName || 'Khách hàng';
                      const phone = appt.customerPhone || (appt as any).phone || '';
                      const service = appt.serviceName || (appt as any).packageName || 'Lịch dịch vụ';
                      const timeFormatted = appt.bookingDateStart
                        ? dayjs(appt.bookingDateStart).format('HH:mm')
                        : hourStr;
                      const isCompleted = appt.orderState === 'Completed';
                      const isMissed = appt.orderState === 'Missed' || appt.orderState === 'Cancelled';

                      const cardPopoverContent = (
                        <div className="p-1 max-w-[240px] space-y-2">
                          <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
                            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{customerName}</div>
                            <div className="text-xs text-slate-400 tabular-nums">SĐT: {phone || '-'}</div>
                          </div>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-slate-400">Dịch vụ:</span>{' '}
                              <span className="font-medium text-slate-700 dark:text-slate-200">{service}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Thời gian:</span>{' '}
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {timeFormatted}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">CV:</span>{' '}
                              <span className="text-slate-700 dark:text-slate-300">
                                {appt.technicianName || 'Chưa gán'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Ước tính:</span>{' '}
                              <span className="font-semibold text-emerald-600 tabular-nums">
                                {formatVND(appt.totalPrice || (appt as any).orderPrice || 0)}
                              </span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-1 justify-end">
                            {phone && (
                              <Button
                                size="small"
                                icon={<PhoneOutlined className="text-emerald-500" />}
                                onClick={() => makeCall(phone, customerName)}
                              >
                                Gọi
                              </Button>
                            )}
                            {(appt.customerId || (appt as any).userId) && onViewCustomerDetail && (
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => onViewCustomerDetail(appt.customerId || (appt as any).userId)}
                              >
                                Xem
                              </Button>
                            )}
                            {onReschedule && (
                              <Button size="small" icon={<SwapOutlined />} onClick={() => onReschedule(appt)}>
                                Đổi lịch
                              </Button>
                            )}
                          </div>
                        </div>
                      );

                      return (
                        <Popover
                          key={String(appt.id || (appt as any).orderId || Math.random())}
                          content={cardPopoverContent}
                          title={undefined}
                          trigger="click"
                        >
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, appt)}
                            className={`p-2 rounded-lg border text-xs shadow-2xs cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] ${
                              isCompleted
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                                : isMissed
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 min-w-0 mb-1">
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <span className="font-bold font-mono text-[11px] tabular-nums shrink-0">
                                  {timeFormatted}
                                </span>
                                {(() => {
                                  const branch = getBranchBadgeInfo(appt.storeId, appt.branchName);
                                  return (
                                    <span
                                      className={`text-[9px] font-extrabold px-1 py-0 rounded border uppercase tracking-tighter shrink-0 ${branch.bgClass}`}
                                    >
                                      {branch.code}
                                    </span>
                                  );
                                })()}
                                {appt.technicianName && (
                                  <Tooltip title={`CV chỉ định: ${appt.technicianName}`}>
                                    <Avatar
                                      src={appt.technicianAvatar || undefined}
                                      size={18}
                                      className="shrink-0 border border-emerald-500/40 text-[9px] font-bold bg-emerald-600 text-white shadow-2xs"
                                    >
                                      {appt.technicianName.trim().slice(0, 1).toUpperCase()}
                                    </Avatar>
                                  </Tooltip>
                                )}
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                  {customerName}
                                </span>
                              </div>
                              <Tooltip
                                title={
                                  isCompleted ? 'Đã hoàn thành' : isMissed ? 'Đã bỏ lỡ / Hủy lịch' : 'Chờ check-in'
                                }
                              >
                                <div className="shrink-0 flex items-center justify-center cursor-help">
                                  {isCompleted ? (
                                    <CheckCircleFilled className="text-emerald-500 text-xs" />
                                  ) : isMissed ? (
                                    <CloseCircleFilled className="text-rose-500 text-xs" />
                                  ) : (
                                    <ClockCircleFilled className="text-amber-500 text-xs" />
                                  )}
                                </div>
                              </Tooltip>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{service}</div>
                          </div>
                        </Popover>
                      );
                    })
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default React.memo(MultiDayColumnView);
