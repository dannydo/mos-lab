'use client';

import React, { useState, useMemo } from 'react';
import { Drawer, DatePicker, Avatar, Tag, Tooltip, Alert } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { Appointment } from '@mos-lab/shared';
import { useTheme } from '../../../../../context/ThemeContext';
import { CvDatePicker } from '../../../../../components/booking/CvDatePicker';
import CalendarPlusIcon from '../../../../../components/icons/CalendarPlusIcon';
import { StaffWorkingItem } from './cvDrawerUtils';

export interface CvTimePickerDrawerProps {
  open: boolean;
  onClose: () => void;
  staff: StaffWorkingItem | null;
  currentDate: Dayjs;
  onDateChange: (date: Dayjs) => void;
  appointments: Appointment[];
  onSelectSlot: (slotInfo: { cv: StaffWorkingItem; date: Dayjs; timeSlot: string; isOverbook: boolean }) => void;
  onEditAppointment?: (appt: Appointment) => void;
}

// Generate 15-minute slots from 09:00 to 20:00
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  let current = dayjs().hour(9).minute(0).second(0);
  const end = dayjs().hour(20).minute(0).second(0);

  while (current.isBefore(end) || current.isSame(end, 'minute')) {
    slots.push(current.format('HH:mm'));
    current = current.add(15, 'minute');
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

/**
 * Parses appointment start/end minutes from midnight, using staff average speed when available
 */
function getAppointmentRange(
  appt: Appointment,
  staff?: StaffWorkingItem | null
): {
  rawAppointment: Appointment;
  startMin: number;
  endMin: number;
  customerName: string;
  serviceName: string;
  durationMinutes: number;
  formattedStart: string;
  formattedEnd: string;
} {
  const timeStr = appt.bookingDateStart
    ? dayjs(appt.bookingDateStart).format('HH:mm')
    : (appt as any).bookingTimeStart || (appt as any).time || '09:00';
  const cleanTime = timeStr.replace(/[^0-9:]/g, '');
  const [hStr, mStr] = cleanTime.split(':');
  const startH = parseInt(hStr || '9', 10);
  const startM = parseInt(mStr || '0', 10);

  const startMin = startH * 60 + startM;

  // 1. Calculate from explicit start & end dates if valid and > 0
  let explicitDiff = 0;
  if (appt.bookingDateStart && appt.bookingDateEnd) {
    const dStart = dayjs(appt.bookingDateStart);
    const dEnd = dayjs(appt.bookingDateEnd);
    if (dEnd.isAfter(dStart)) {
      explicitDiff = dEnd.diff(dStart, 'minute');
    }
  }

  // 2. Service type matching on staff's average speed
  const sName = (appt.serviceName || (appt as any).user_service_name || '').toLowerCase();
  let staffSpeedAvg = 0;
  if (staff?.avgDurationMinutes) {
    if (sName.includes('dặm') || sName.includes('refill')) {
      staffSpeedAvg = staff.avgDurationMinutes.retainAvg || staff.avgDurationMinutes.normalAvg || 0;
    } else if (sName.includes('tháo') || sName.includes('remove')) {
      staffSpeedAvg = staff.avgDurationMinutes.removalAvg || staff.avgDurationMinutes.normalAvg || 0;
    } else {
      staffSpeedAvg = staff.avgDurationMinutes.normalAvg || staff.avgDurationMinutes.overallAvg || 0;
    }
  }

  // 3. Explicit service duration on appointment object if available
  const explicitServiceDuration =
    (appt as any).durationMinutes ||
    (appt as any).duration ||
    (appt as any).serviceDuration ||
    (appt as any).service_duration ||
    (appt as any).avgDuration;

  // Determine final durationMinutes:
  // Priority: 1. Staff's personalized speed average -> 2. Specific Service Duration -> 3. Explicit start/end diff -> 4. Default 90m
  const durationMinutes =
    staffSpeedAvg > 0
      ? staffSpeedAvg
      : explicitServiceDuration && explicitServiceDuration > 0
        ? explicitServiceDuration
        : explicitDiff > 0
          ? explicitDiff
          : 90;

  const endMin = startMin + durationMinutes;

  const startObj = dayjs().hour(startH).minute(startM);
  const endObj = startObj.add(durationMinutes, 'minute');

  return {
    rawAppointment: appt,
    startMin,
    endMin,
    customerName: appt.customerName || (appt as any).user_name || 'Khách hàng',
    serviceName: appt.serviceName || (appt as any).user_service_name || 'Dịch vụ mi',
    durationMinutes,
    formattedStart: startObj.format('HH:mm'),
    formattedEnd: endObj.format('HH:mm'),
  };
}

export const CvTimePickerDrawer: React.FC<CvTimePickerDrawerProps> = ({
  open,
  onClose,
  staff,
  currentDate,
  onDateChange,
  appointments,
  onSelectSlot,
  onEditAppointment,
}) => {
  const { themeMode } = useTheme();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Filter appointments for this CV on the selected date
  const staffAppts = useMemo(() => {
    if (!staff) return [];
    return appointments.filter(
      (a) => Number((a as any).technicianId) === Number(staff.id) && a.orderState !== 'Cancelled'
    );
  }, [staff, appointments]);

  // Convert appointments to ranges using staff's personalized speed average
  const apptRanges = useMemo(() => {
    return staffAppts.map((appt) => getAppointmentRange(appt, staff));
  }, [staffAppts, staff]);

  // Check if a specific time HH:mm is covered by any existing appointment
  const getOverlapInfo = (slotTimeStr: string) => {
    const [hStr, mStr] = slotTimeStr.split(':');
    const slotMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);

    const match = apptRanges.find((r) => slotMin >= r.startMin && slotMin < r.endMin);
    return match || null;
  };

  const handleSlotClick = (slotStr: string) => {
    setSelectedSlot(slotStr);
  };

  const handleConfirmBooking = (slotStr: string, isOverbook: boolean) => {
    if (!staff) return;
    onSelectSlot({
      cv: staff,
      date: currentDate,
      timeSlot: slotStr,
      isOverbook,
    });
  };

  const selectedCV = useMemo(() => {
    if (!staff) return undefined;
    return {
      id: staff.id,
      displayName: staff.name,
      offDays: (staff as any).offDays || [],
      approvedOffDates: (staff as any).approvedOffDates || [],
      pendingOffDates: (staff as any).pendingOffDates || [],
      rejectedOffDates: (staff as any).rejectedOffDates || [],
    };
  }, [staff]);

  return (
    <Drawer
      title={null}
      placement="right"
      width={440}
      open={open}
      onClose={onClose}
      closable={false}
      styles={{
        body: {
          padding: 0,
          background: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
          color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
        },
      }}
    >
      {/* Header Bar */}
      <div className="sticky top-0 z-20 border-b p-3 shadow-2xs backdrop-blur-md bg-slate-900/90 border-slate-800 text-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={staff?.avatarUrl}
              icon={!staff?.avatarUrl ? <UserOutlined /> : undefined}
              size={40}
              className="ring-2 ring-emerald-500/50 shrink-0 bg-slate-700"
            />
            <div className="min-w-0">
              <div className="font-extrabold text-sm truncate flex items-center gap-1.5">
                <span>{staff?.name || 'Chuyên viên'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  {staff?.branchName || 'Đề Thám'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{staff?.shift || 'Ca Full'}</span>
                <span>•</span>
                <span className="text-blue-400 font-semibold">{staffAppts.length} Đơn đã book</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <CloseOutlined className="text-xs" />
          </button>
        </div>

        {/* Date Selector bar */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onDateChange(currentDate.subtract(1, 'day'))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer shrink-0"
            title="Ngày trước đó"
          >
            <LeftOutlined />
          </button>

          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
            <div className="shrink-0 min-w-[130px]">
              <CvDatePicker
                value={currentDate}
                onChange={(d) => d && onDateChange(d)}
                selectedCV={selectedCV}
                themeMode={themeMode}
                format="DD/MM/YYYY"
                allowClear={false}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs font-semibold tabular-nums w-full"
              />
            </div>

            <button
              type="button"
              onClick={() => onDateChange(dayjs())}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer whitespace-nowrap shrink-0 border border-emerald-500/30"
            >
              Hôm nay
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDateChange(currentDate.add(1, 'day'))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer shrink-0"
            title="Ngày tiếp theo"
          >
            <RightOutlined />
          </button>
        </div>
      </div>

      {/* Main Timeline View (09:00 -> 20:00, 15-min intervals) */}
      <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400">
          <span>Khung giờ (09:00 - 20:00)</span>
          <span className="text-[10px] text-amber-400">⚡ Chọn mốc bất kỳ để đặt lịch SOP</span>
        </div>

        {TIME_SLOTS.map((slotStr) => {
          const overlap = getOverlapInfo(slotStr);
          const isSelected = selectedSlot === slotStr;
          const isHourMarker = slotStr.endsWith(':00');

          return (
            <div key={slotStr} className="space-y-1">
              <div
                onClick={() => handleSlotClick(slotStr)}
                className={`group flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/50 shadow-md'
                    : overlap
                      ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 hover:border-amber-500/60'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                }`}
              >
                {/* Time Indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded ${
                      isHourMarker
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {slotStr}
                  </span>

                  {overlap ? (
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate">
                        ⛔ Bận: {overlap.customerName}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {overlap.serviceName} • {overlap.durationMinutes}p
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline">
                      Giờ trống
                    </span>
                  )}
                </div>

                {/* Right Action Button */}
                <div className="shrink-0 ml-2 flex items-center gap-1.5">
                  {overlap ? (
                    <>
                      {onEditAppointment && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment(overlap.rawAppointment);
                          }}
                          className="px-2 py-1 text-[11px] font-bold rounded-md bg-blue-500/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                          title="Cập nhật bộ mi / dịch vụ cho đơn này"
                        >
                          <EditOutlined className="text-[10px]" />
                          <span>Sửa mi</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmBooking(slotStr, true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <WarningOutlined />
                        <span>Ép Overbook</span>
                      </button>
                    </>
                  ) : (
                    <Tooltip title={`Đặt lịch mốc ${slotStr}`} placement="left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmBooking(slotStr, false);
                        }}
                        className="w-[26px] h-[26px] rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-2xs hover:shadow-xs hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 border border-amber-400/40"
                      >
                        <CalendarPlusIcon fontSize={14} badgeBg="#10B981" badgeColor="#FFFFFF" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Inline Overlap Warning Banner when slot is selected */}
              {isSelected && overlap && (
                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 space-y-2 animate-fadeIn">
                  <div className="flex items-start gap-2 text-amber-300 text-xs font-medium">
                    <WarningOutlined className="text-amber-400 text-sm shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-200">⚠️ Cảnh báo trùng lịch cho CV {staff?.name}</div>
                      <div>
                        Mốc <b>{slotStr}</b> bị trùng với đơn của <b>{overlap.customerName}</b> ({overlap.serviceName},{' '}
                        {overlap.formattedStart} - {overlap.formattedEnd}).
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/30">
                    {onEditAppointment && (
                      <button
                        type="button"
                        onClick={() => onEditAppointment(overlap.rawAppointment)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <EditOutlined />
                        <span>✏️ Cập nhật bộ mi đơn này</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      Chọn mốc khác
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmBooking(slotStr, true)}
                      className="px-3 py-1 text-[11px] font-bold rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm"
                    >
                      ⚠️ Xác nhận Ép Lịch Overbook
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
};
