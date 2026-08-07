'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar, Tooltip } from 'antd';
import { UserOutlined, HomeOutlined, AimOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { CvQueueEntry, CvStaffRealtimeStatus } from '@mos-lab/shared';
import { getQueueBorderColor, getQueueBgGlow } from './cvDrawerUtils';
import dayjs from 'dayjs';

interface QueueLaneProps {
  storeName: string;
  storeId: number;
  entries: CvQueueEntry[];
  staffStatuses: CvStaffRealtimeStatus[];
}

const QueueLane: React.FC<QueueLaneProps> = React.memo(({ storeName, storeId, entries, staffStatuses }) => {
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
    <div className="space-y-1.5 border-b border-slate-700/40 pb-2 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider inline-flex items-center gap-1">
          <HomeOutlined className="text-cyan-400" />
          <span>{storeName}</span>
        </span>
      </div>

      {/* Row 1: Hàng Chờ Tua (Next In Line) */}
      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <AimOutlined className="text-emerald-400" />
            <span>Hàng chờ tua</span>
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
                  : entry.estimatedWaitMinutes < 0
                    ? `${entry.estimatedWaitMinutes}p`
                    : entry.estimatedWaitMinutes === 0
                      ? '0p'
                      : `~${entry.estimatedWaitMinutes}p`;

              const tooltipContent = (
                <div className="text-xs space-y-1 min-w-[140px]" role="tooltip">
                  <div className="font-bold text-slate-100">{entry.name}</div>
                  {staffStatus && <div className="text-slate-300">{staffStatus.liveLabel}</div>}
                  {entry.isLockedForBooking && entry.nextBookingInMinutes != null && (
                    <div className="text-amber-300 font-medium flex items-center gap-1">
                      <LockOutlined />
                      <span>Khách book trong {entry.nextBookingInMinutes}p</span>
                      {entry.mappedBookingTime ? ` (${entry.mappedBookingTime})` : ''}
                    </div>
                  )}
                  {staffStatus?.currentCustomerName && (
                    <div className="text-blue-300">Khách: {staffStatus.currentCustomerName}</div>
                  )}
                  <div className="font-bold tabular-nums">
                    {entry.estimatedWaitMinutes == null ? (
                      <span className="text-slate-400">Chờ: Chưa có lịch</span>
                    ) : entry.estimatedWaitMinutes < 0 ? (
                      <span className="text-rose-400">
                        Khách trễ: {entry.estimatedWaitMinutes}p ({entry.mappedBookingTime || ''})
                      </span>
                    ) : (
                      <span className="text-emerald-300">
                        Chờ tua: {waitText}
                        {entry.mappedBookingTime ? ` (${entry.mappedBookingTime})` : ''}
                      </span>
                    )}
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
                      tabIndex={0}
                      role="listitem"
                      aria-label={`Chuyên viên ${entry.name}, chờ tua ${waitText}`}
                      className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-full"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className={`relative ring-2 ${borderColor} rounded-full shadow-md ${bgGlow}`}>
                        <Avatar
                          src={entry.avatar}
                          icon={!entry.avatar ? <UserOutlined /> : undefined}
                          size={30}
                          className="bg-slate-700"
                        />
                        {entry.isLockedForBooking && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center text-[7px] border border-slate-800">
                            <LockOutlined className="text-[6px] text-slate-950" />
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
                            : entry.estimatedWaitMinutes < 0
                              ? 'text-rose-400 font-extrabold'
                              : entry.estimatedWaitMinutes === 0
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
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block shrink-0" />
            <span>Đang nối mi / Phục vụ</span>
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
                <div className="text-xs space-y-1 min-w-[150px]" role="tooltip">
                  <div className="font-bold text-slate-100">{staff.name}</div>
                  <div className="text-cyan-300 font-semibold">
                    Khách: {staff.currentCustomerName || 'Chưa cập nhật tên'}
                  </div>
                  <div className="text-slate-300">{staff.liveLabel}</div>
                  {endFormattedTime && (
                    <div className="text-amber-300 tabular-nums font-semibold">Xong dự kiến: {endFormattedTime}</div>
                  )}
                </div>
              );

              return (
                <Tooltip key={staff.staffId} title={tooltipContent} placement="bottom" arrow>
                  <div
                    tabIndex={0}
                    role="listitem"
                    aria-label={`Chuyên viên ${staff.name}, đang phục vụ ${staff.currentCustomerName || ''}, ${endMinText}`}
                    className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full"
                  >
                    <div className="relative ring-2 ring-blue-500/80 rounded-full shadow-md">
                      <Avatar
                        src={staff.avatar}
                        icon={!staff.avatar ? <UserOutlined /> : undefined}
                        size={30}
                        className="bg-slate-700"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-slate-800 flex items-center justify-center text-[6px]">
                        <ThunderboltOutlined className="text-[6px] text-amber-300" />
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

interface CvQueueLaneSectionProps {
  queueStore6: CvQueueEntry[];
  queueStore16: CvQueueEntry[];
  staffStatuses: CvStaffRealtimeStatus[];
}

export const CvQueueLaneSection: React.FC<CvQueueLaneSectionProps> = React.memo(
  ({ queueStore6, queueStore16, staffStatuses }) => {
    if (queueStore6.length === 0 && queueStore16.length === 0) return null;

    return (
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 p-2.5 rounded-xl border border-slate-700/60 shadow-lg">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AimOutlined className="text-cyan-400" />
            <span>Hàng Chờ CV — Next In Line</span>
          </span>
          <span className="text-[8px] font-mono text-cyan-400/80 font-normal">Hover / Tab để xem chi tiết</span>
        </div>
        <div className="space-y-2">
          {queueStore6.length > 0 && (
            <QueueLane storeName="Đề Thám" storeId={6} entries={queueStore6} staffStatuses={staffStatuses} />
          )}
          {queueStore16.length > 0 && (
            <QueueLane storeName="Estella Place" storeId={16} entries={queueStore16} staffStatuses={staffStatuses} />
          )}
        </div>
      </div>
    );
  }
);

CvQueueLaneSection.displayName = 'CvQueueLaneSection';
