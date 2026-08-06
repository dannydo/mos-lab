'use client';

import React, { useState } from 'react';
import { Card, Tag, Button, Tooltip, Progress, Badge, Popover, Space, Typography, message } from 'antd';
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

export default function MultiDayColumnView({
  loading,
  startDate,
  daysCount = 5,
  appointments,
  maxCapacityPerDay = 25,
  onSelectSlot,
  onViewCustomerDetail,
  onReschedule,
}: MultiDayColumnViewProps) {
  const { makeCall } = useOmiCall();
  const { themeMode } = useTheme();
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null);

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
    <div className="multi-day-column-view overflow-x-auto pb-4">
      <div
        className="grid gap-3 min-w-[900px]"
        style={{ gridTemplateColumns: `80px repeat(${daysCount}, minmax(180px, 1fr))` }}
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
          const capInfo = getCapacityBadge(dayAppts.length, maxCapacityPerDay);
          const isToday = day.isSame(dayjs(), 'day');

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
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {dayAppts.length} / {maxCapacityPerDay} ({capInfo.percentage}%)
                  </span>
                </div>
                <Progress
                  percent={capInfo.percentage}
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
                              <span className="text-slate-400">KTV:</span>{' '}
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
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-bold font-mono text-[11px] tabular-nums">{timeFormatted}</span>
                              <Tag
                                color={isCompleted ? 'success' : isMissed ? 'error' : 'processing'}
                                className="m-0 text-[9px] px-1 py-0 border-0"
                              >
                                {isCompleted ? 'Xong' : isMissed ? 'Bỏ lỡ' : 'Chờ'}
                              </Tag>
                            </div>
                            <div className="font-semibold truncate text-slate-800 dark:text-slate-100">
                              {customerName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {service}
                            </div>
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
