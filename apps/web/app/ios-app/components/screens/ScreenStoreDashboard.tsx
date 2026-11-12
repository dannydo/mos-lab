'use client';

import React, { useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { BookingItem } from '../../state/mockData';
import { IosBranchConfig } from '../../state/useIosAppState';
import { Users, Clock, DollarSign, Store, ChevronRight, Activity, ArrowUpRight } from 'lucide-react';

interface ScreenStoreDashboardProps {
  bookings?: BookingItem[];
  currentBranch?: IosBranchConfig;
  isDemoMode?: boolean;
  onSelectBooking?: (id: number) => void;
  onOpenSettings?: () => void;
}

interface FloorBedSlot {
  bed: string;
  bookingId?: number;
  cv: React.ReactNode;
  customer: string;
  service: string;
  status: 'IN_PROGRESS' | 'WAITING' | 'EMPTY';
  timeElapsed: string;
}

const TOTAL_FLOOR_BEDS = 6;

export function ScreenStoreDashboard({
  bookings = [],
  currentBranch,
  isDemoMode = false,
  onSelectBooking,
  onOpenSettings,
}: ScreenStoreDashboardProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const isEstella = currentBranch?.id === 16 || currentBranch?.code === 'EP';
  const branchHeader = isEstella
    ? {
        title: `Wings Lashes — ${currentBranch?.receiptName || 'CN Estella Place'}`,
        address: currentBranch?.address || 'Tầng 3 Estella Place, 88 Song Hành, An Phú, TP. Thủ Đức',
      }
    : {
        title: `Wings Lashes — ${currentBranch?.receiptName || 'CN Đề Thám'}`,
        address: currentBranch?.address || '159A Đề Thám, P. Cô Giang, Q.1, TP.HCM',
      };

  const { storeMetrics, activeBeds } = useMemo(() => {
    const doneBookings = bookings.filter((b) => b.status === 'DONE' || Boolean(b.billing?.completedAt));
    const servicingBookings = bookings.filter((b) => b.status === 'SERVICING' || b.status === 'CHECKED_IN');
    const incomingBookings = bookings.filter((b) => b.status === 'INCOMING');

    const liveRevenue = doneBookings.reduce((sum, b) => sum + Number(b.billing?.grandTotal ?? b.servicePrice ?? 0), 0);
    const uniqueStaff = new Set<number>();
    bookings.forEach((b) => {
      if (b.assignedStaffId && Number(b.assignedStaffId) > 0) uniqueStaff.add(Number(b.assignedStaffId));
    });

    const occupiedCount = Math.min(TOTAL_FLOOR_BEDS, servicingBookings.length);
    const liveOccupancy = Math.round((occupiedCount / TOTAL_FLOOR_BEDS) * 100);

    if (isDemoMode && bookings.length === 0) {
      return {
        storeMetrics: {
          todayRevenue: 24850000,
          totalCompleted: 18,
          inProgressCount: 5,
          waitingCount: 3,
          activeStaffCount: 8,
          occupancyRate: 83,
          occupiedBedsLabel: '5/6 giường đang phục vụ',
        },
        activeBeds: [
          {
            bed: 'Giường 01',
            bookingId: 101,
            cv: (
              <>
                Thảo Ly (<CvFeather1Badge />)
              </>
            ),
            customer: 'Chị Quyên (Demo)',
            service: 'Flawless 3D Design',
            status: 'IN_PROGRESS' as const,
            timeElapsed: '45/75p',
          },
          {
            bed: 'Giường 02',
            cv: 'Trống',
            customer: '--',
            service: 'Sẵn sàng đón khách',
            status: 'EMPTY' as const,
            timeElapsed: '--',
          },
        ],
      };
    }

    const beds: FloorBedSlot[] = Array.from({ length: TOTAL_FLOOR_BEDS }, (_, idx) => {
      const slotLabel = `Giường ${String(idx + 1).padStart(2, '0')}`;
      const matched = servicingBookings[idx];
      if (!matched) {
        return {
          bed: slotLabel,
          cv: 'Trống',
          customer: '--',
          service: 'Sẵn sàng đón khách',
          status: 'EMPTY',
          timeElapsed: '--',
        };
      }
      const elapsedMin = matched.progress?.elapsedSeconds
        ? Math.max(1, Math.round(matched.progress.elapsedSeconds / 60))
        : 0;
      const targetMin = matched.serviceDuration || 65;
      const isCheckedInWaiting = matched.status === 'CHECKED_IN' && !matched.progress?.startedAt;
      return {
        bed: matched.assignedBed || slotLabel,
        bookingId: Number(matched.id),
        cv: matched.assignedStaffName ? (
          <>
            {matched.assignedStaffName} (<CvFeather1Badge />)
          </>
        ) : (
          'Chưa phân công'
        ),
        customer: matched.customerName || 'Khách hàng',
        service: matched.serviceName || 'Dịch vụ mi',
        status: isCheckedInWaiting ? 'WAITING' : 'IN_PROGRESS',
        timeElapsed: isCheckedInWaiting ? 'Đang tư vấn' : `${elapsedMin}/${targetMin}p`,
      };
    });

    return {
      storeMetrics: {
        todayRevenue: liveRevenue,
        totalCompleted: doneBookings.length,
        inProgressCount: servicingBookings.length,
        waitingCount: incomingBookings.length,
        activeStaffCount: uniqueStaff.size,
        occupancyRate: liveOccupancy,
        occupiedBedsLabel: `${occupiedCount}/${TOTAL_FLOOR_BEDS} giường đang phục vụ`,
      },
      activeBeds: beds,
    };
  }, [bookings, isDemoMode]);

  const cardSurface = isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-[#E5E5EA]';

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-[#1C1C1E]'}`}>
      <IosNavigationBar
        title="Quản Lý Salon (Store Manager)"
        rightAction={{
          label: 'Cài đặt',
          onClick: onOpenSettings || (() => {}),
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Salon Branch Header Card */}
        <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] rounded-2xl p-4 text-white shadow-sm flex items-center justify-between border border-neutral-800">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#FF9500] text-black flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <Store className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold truncate">{branchHeader.title}</h2>
              <p className="text-xs text-white/70 truncate">{branchHeader.address}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1 shrink-0 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Đang mở
          </span>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`${cardSurface} rounded-xl p-3 border shadow-xs`}>
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Doanh thu hôm nay</span>
              <DollarSign className="w-4 h-4 text-[#FF9500]" />
            </div>
            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#1C1C1E]'} tabular-nums`}>
              {new Intl.NumberFormat('vi-VN').format(storeMetrics.todayRevenue)}đ
            </div>
            <div className="text-[10px] text-emerald-500 font-medium flex items-center mt-1 tabular-nums">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> {storeMetrics.waitingCount} khách chờ đón
            </div>
          </div>

          <div className={`${cardSurface} rounded-xl p-3 border shadow-xs`}>
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Số ca hoàn tất</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#1C1C1E]'} tabular-nums`}>
              {storeMetrics.totalCompleted} ca
            </div>
            <div className="text-[10px] text-[#8E8E93] mt-1 tabular-nums">
              {storeMetrics.inProgressCount} ca đang làm trên sàn
            </div>
          </div>

          <div className={`${cardSurface} rounded-xl p-3 border shadow-xs`}>
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Hiệu suất giường</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-500 tabular-nums">{storeMetrics.occupancyRate}%</div>
            <div className="text-[10px] text-[#8E8E93] mt-1 tabular-nums">{storeMetrics.occupiedBedsLabel}</div>
          </div>

          <div className={`${cardSurface} rounded-xl p-3 border shadow-xs`}>
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Chuyên Viên có lịch</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#1C1C1E]'} tabular-nums`}>
              {storeMetrics.activeStaffCount} bạn
            </div>
            <div className="text-[10px] text-[#8E8E93] mt-1">Theo lịch ca trực thực tế</div>
          </div>
        </div>

        {/* Live Salon Beds Overview */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              Theo Dõi Sàn Salon Trực Tiếp (Floor Beds)
            </h3>
            <span className="text-xs text-[#FF9500] font-medium tabular-nums">
              {storeMetrics.inProgressCount} đang phục vụ
            </span>
          </div>

          <div
            className={`${
              isDark
                ? 'bg-[#1C1C1E] border-neutral-800 divide-neutral-800'
                : 'bg-white border-[#E5E5EA] divide-[#E5E5EA]'
            } rounded-xl border divide-y overflow-hidden shadow-xs`}
          >
            {activeBeds.map((b, idx) => (
              <div
                key={idx}
                className={`p-3 flex items-center justify-between transition-colors ${
                  b.bookingId
                    ? isDark
                      ? 'hover:bg-neutral-800/60 cursor-pointer'
                      : 'hover:bg-[#F9F9FB] cursor-pointer'
                    : 'opacity-75'
                }`}
                onClick={() => {
                  if (b.bookingId) onSelectBooking?.(b.bookingId);
                }}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 tabular-nums ${
                      b.status === 'IN_PROGRESS'
                        ? isDark
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
                          : 'bg-amber-100 text-amber-800'
                        : b.status === 'WAITING'
                          ? isDark
                            ? 'bg-blue-950/60 text-blue-300 border border-blue-700/50'
                            : 'bg-blue-100 text-blue-800'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-500'
                            : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1C1C1E]'}`}>{b.bed}</span>
                      <span className="text-[11px] text-[#8E8E93] inline-flex items-center gap-0.5 truncate">
                        · {b.cv}
                      </span>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-neutral-300' : 'text-[#3C3C43]'} font-medium truncate`}>
                      {b.customer !== '--' ? `${b.customer} — ${b.service}` : 'Giường đang trống'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                      b.status === 'IN_PROGRESS'
                        ? isDark
                          ? 'bg-amber-950/50 text-amber-300 border border-amber-700/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                        : b.status === 'WAITING'
                          ? isDark
                            ? 'bg-blue-950/50 text-blue-300 border border-blue-700/60'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-400'
                            : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {b.timeElapsed}
                  </span>
                  {b.bookingId && <ChevronRight className="w-4 h-4 text-[#8E8E93]" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
