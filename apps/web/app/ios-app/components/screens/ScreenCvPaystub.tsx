'use client';

import React, { useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { CvFeather1Badge, CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile, StaffMonthlyStats } from '../../state/useIosAppState';
import { calculateActorTipBreakdown } from '../../state/useIosBillingCheckout';
import { Award, Clock, HeartHandshake, Sparkles, TrendingUp } from 'lucide-react';

interface ScreenCvPaystubProps {
  actor?: ActiveActorProfile;
  staffStats?: (Partial<StaffMonthlyStats> & Record<string, any>) | null;
  bookings?: BookingItem[];
  isDemoMode?: boolean;
  onBack?: () => void;
  onOpenSettings?: () => void;
}

export function ScreenCvPaystub({
  actor,
  staffStats,
  bookings = [],
  isDemoMode = false,
  onBack,
  onOpenSettings,
}: ScreenCvPaystubProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const now = new Date();
  const currentMonthLabel = `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const staffName = actor?.name || 'Chuyên Viên';
  const isCvll = actor?.tier === 'CVLL';

  const myCompletedBookings = useMemo(() => {
    const actorId = Number(actor?.staffId || 0);
    return bookings.filter((b) => {
      if (b.status !== 'DONE') return false;
      if (!actorId) return true;
      return (
        Number(b.assignedStaffId) === actorId ||
        Number(b.checkInStaffId) === actorId ||
        Number(b.checkOutStaffId) === actorId
      );
    });
  }, [bookings, actor?.staffId]);

  const liveStats = useMemo(() => {
    const completedToday = staffStats?.completedToday ?? myCompletedBookings.length;
    const tipToday =
      staffStats?.tipEarnedToday ??
      myCompletedBookings.reduce((sum, b) => {
        const bd = calculateActorTipBreakdown(b, actor, b.billing?.tipAmount ?? 0);
        return sum + bd.actorEarnedAmount;
      }, 0);
    const comboAndSerumToday =
      (staffStats?.comboBonusToday ?? 0) + (staffStats?.serumBonusToday ?? 0) ||
      myCompletedBookings.reduce(
        (sum, b) =>
          sum + Number(b.cvRewardBreakdown?.comboBonusAmount || 0) + Number(b.cvRewardBreakdown?.serumBonusAmount || 0),
        0
      );

    const monthlyShifts = Number(staffStats?.completedShiftsCount ?? completedToday);
    const liveMonthlyServiceRevenue = Number(staffStats?.monthlyRevenue ?? 0);
    const liveHourlyAmount = isDemoMode ? 8200000 : Number(staffStats?.hourlyPayMonth ?? 0);
    const liveServiceAmount = isDemoMode
      ? 5900000 + completedToday * 140000
      : Number(staffStats?.serviceBonusMonth ?? liveMonthlyServiceRevenue);
    const liveTipAmount = isDemoMode ? 2850000 + tipToday : Number(staffStats?.tipEarnedMonth ?? tipToday);
    const liveComboAmount = isDemoMode
      ? 1500000 + comboAndSerumToday
      : Number(staffStats?.comboBonusMonth ?? comboAndSerumToday);
    const totalEstimatedEarnings = liveHourlyAmount + liveServiceAmount + liveTipAmount + liveComboAmount;

    const recentTippedOrders = myCompletedBookings
      .filter((b) => Number(b.billing?.tipAmount || 0) > 0)
      .slice(0, 5)
      .map((b) => {
        const bd = calculateActorTipBreakdown(b, actor, b.billing?.tipAmount ?? 0);
        return {
          customer: b.customerName,
          time: `Hôm nay ${b.time12h || ''}`.trim(),
          service: b.serviceName,
          tip: Number(b.billing?.tipAmount || 0),
          share: bd.actorEarnedAmount,
          percent: bd.actorEarnedPercent,
        };
      });

    if (isDemoMode && recentTippedOrders.length === 0) {
      recentTippedOrders.push(
        {
          customer: 'Chị Quyên (Demo)',
          time: 'Hôm nay 15:45',
          service: 'Flawless 3D Design',
          tip: 100000,
          share: 90000,
          percent: 90,
        },
        {
          customer: 'Chị Mai Lan (Demo)',
          time: 'Hôm qua 11:20',
          service: 'Classic Tự Nhiên',
          tip: 50000,
          share: 40000,
          percent: 80,
        }
      );
    }

    return {
      completedToday,
      tipToday,
      comboAndSerumToday,
      totalEstimatedEarnings,
      breakdown: [
        {
          id: 'hourly',
          title: 'Lương Theo Giờ Làm Thực Tế',
          amount: liveHourlyAmount,
          desc: isDemoMode
            ? `164 giờ tích lũy · Ca hôm nay: ${staffStats?.shiftHours || '08:30 - 20:00'}`
            : `Ca trực hôm nay: ${staffStats?.shiftHours || 'Theo lịch phân ca'}`,
          icon: Clock,
          color: 'text-blue-500',
        },
        {
          id: 'service',
          title: isDemoMode ? 'Thưởng Dịch Vụ & Điểm Xoay Tua' : 'Doanh Thu & Điểm Dịch Vụ Tích Lũy',
          amount: liveServiceAmount,
          desc: `${monthlyShifts} ca trong tháng (${completedToday} ca hôm nay · +${staffStats?.pointsToday ?? 0} pts)`,
          icon: Sparkles,
          color: 'text-purple-500',
        },
        {
          id: 'tip',
          title: 'Thưởng Tips Phân Bổ (70/10/10)',
          amount: liveTipAmount,
          desc: `Hôm nay: +${tipToday.toLocaleString('vi-VN')}đ (70% Làm mi + 10% In + 10% Out)`,
          icon: HeartHandshake,
          color: 'text-rose-500',
        },
        {
          id: 'combo',
          title: 'Thưởng Chốt Combo & Dưỡng Mi Yeppeum',
          amount: liveComboAmount,
          desc: `Hôm nay: +${comboAndSerumToday.toLocaleString('vi-VN')}đ thưởng bán gói & sản phẩm`,
          icon: Award,
          color: 'text-amber-500',
        },
      ],
      recentTippedOrders,
    };
  }, [staffStats, myCompletedBookings, actor, isDemoMode]);

  return (
    <div className={`flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)]`}>
      <IosNavigationBar
        title="Thu Nhập Tạm Tính (Live Paystub)"
        leftAction={onBack ? { label: 'Quay lại', onClick: onBack } : undefined}
        rightAction={{
          label: 'Cài đặt',
          onClick: onOpenSettings || (() => {}),
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Main Earnings Card */}
        <div className="bg-gradient-to-br from-[#1C1C1E] via-[#2A2A2E] to-[#1C1C1E] rounded-2xl p-5 text-white shadow-md relative overflow-hidden border border-neutral-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9500]/10 rounded-full blur-2xl"></div>

          <div className="flex items-center justify-between text-xs text-white/80 mb-1">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <span>{staffName}</span>
              {isCvll ? <CvFeather2Badge /> : <CvFeather1Badge />}
              <span>· {currentMonthLabel}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FF9500]/20 text-[#FFB400] font-semibold text-[10px] inline-flex items-center gap-1">
              {isCvll ? <CvFeather2Badge /> : <CvFeather1Badge />}
            </span>
          </div>

          <div className="mt-2">
            <span className="text-xs text-white/60 font-medium">Tổng Thu Nhập Tạm Tính Trong Tháng</span>
            <div className="text-3xl font-extrabold text-[#FFB400] mt-0.5 tabular-nums tracking-tight">
              {new Intl.NumberFormat('vi-VN').format(liveStats.totalEstimatedEarnings)}đ
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/80">
            <span className="flex items-center gap-1 tabular-nums">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Hôm nay: +
              {(liveStats.tipToday + liveStats.comboAndSerumToday || 0).toLocaleString('vi-VN')}đ thưởng & tip
            </span>
            <span className="text-[11px] text-white/60 tabular-nums">{liveStats.completedToday} ca hoàn tất</span>
          </div>
        </div>

        {/* Breakdown List */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
            Chi Tiết Các Khoản Thu Nhập
          </h3>

          <div
            className={`${
              isDark
                ? 'bg-[#1C1C1E] border-neutral-800 divide-neutral-800'
                : 'bg-white border-[#E5E5EA] divide-[#E5E5EA]'
            } rounded-xl border divide-y overflow-hidden shadow-xs`}
          >
            {liveStats.breakdown.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-center justify-between ${
                    isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-[#F9F9FB]'
                  } transition-colors`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${
                        isDark ? 'bg-neutral-800' : 'bg-[#F2F2F7]'
                      } flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${item.color} stroke-[2]`} />
                    </div>
                    <div>
                      <div className={`text-xs font-bold text-[var(--mos-text)]`}>{item.title}</div>
                      <div className="text-[11px] text-[#8E8E93] mt-0.5 tabular-nums">{item.desc}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-bold text-[var(--mos-text)] tabular-nums`}>
                      {new Intl.NumberFormat('vi-VN').format(item.amount)}đ
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Tips Log */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              Lịch Sử Tiền Tip Theo Chặng (70/10/10)
            </h3>
            <span className="text-[11px] text-[#8E8E93]">Minh bạch theo ca</span>
          </div>

          <div
            className={`${
              isDark
                ? 'bg-[#1C1C1E] border-neutral-800 divide-neutral-800'
                : 'bg-white border-[#E5E5EA] divide-[#E5E5EA]'
            } rounded-xl border divide-y overflow-hidden shadow-xs`}
          >
            {liveStats.recentTippedOrders.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8E8E93]">Chưa có ca nhận Tip trong ngày hôm nay.</div>
            ) : (
              liveStats.recentTippedOrders.map((tip, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-bold text-[var(--mos-text)]`}>{tip.customer}</div>
                    <div className="text-[11px] text-[#8E8E93] tabular-nums">
                      {tip.service} · {tip.time}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-500 tabular-nums">
                      +{new Intl.NumberFormat('vi-VN').format(tip.share)}đ ({tip.percent}%)
                    </div>
                    <div className="text-[10px] text-[#8E8E93] tabular-nums">
                      Khách tip {new Intl.NumberFormat('vi-VN').format(tip.tip)}đ
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
