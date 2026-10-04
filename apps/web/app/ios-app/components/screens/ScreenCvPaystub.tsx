'use client';

import React from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { DollarSign, Award, Clock, HeartHandshake, Sparkles, ChevronRight, TrendingUp } from 'lucide-react';

interface ScreenCvPaystubProps {
  onBack?: () => void;
  onOpenSettings?: () => void;
}

export function ScreenCvPaystub({ onBack, onOpenSettings }: ScreenCvPaystubProps) {
  const paystubData = {
    staffName: 'Diễm Hương (CV+)',
    level: 'Chuyên Viên Tự Chủ (Level 3)',
    currentMonth: 'Tháng 10/2026',
    totalEstimatedEarnings: 18450000,
    breakdown: [
      {
        id: 'hourly',
        title: 'Lương Theo Giờ Làm Thực Tế',
        amount: 8200000,
        desc: '164 giờ tích lũy (50.000đ/giờ)',
        icon: Clock,
        color: 'text-blue-500',
      },
      {
        id: 'service',
        title: 'Thưởng Dịch Vụ Nối Mi',
        amount: 5900000,
        desc: '42 ca nối mi & dặm mi hoàn tất',
        icon: Sparkles,
        color: 'text-purple-500',
      },
      {
        id: 'tip',
        title: 'Thưởng Tips Từ Khách Hàng (70%)',
        amount: 2850000,
        desc: '38 lượt tip từ khách (Điều răn TIP-001)',
        icon: HeartHandshake,
        color: 'text-rose-500',
      },
      {
        id: 'combo',
        title: 'Thưởng Bán Chéo Combo & Serum',
        amount: 1500000,
        desc: '15 sản phẩm bọt vệ sinh & serum dưỡng',
        icon: Award,
        color: 'text-amber-500',
      },
    ],
    recentTippedOrders: [
      { customer: 'Chị Quyên', time: 'Hôm nay 15:45', service: 'Flawless 3D Design', tip: 100000, share: 70000 },
      { customer: 'Chị Mai Lan', time: 'Hôm qua 11:20', service: 'Classic Tự Nhiên', tip: 50000, share: 35000 },
      { customer: 'Chị Thu Hà', time: '02/10 16:10', service: 'Volume Glamour', tip: 150000, share: 105000 },
    ],
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
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
        <div className="bg-gradient-to-br from-[#1C1C1E] via-[#2A2A2E] to-[#1C1C1E] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9500]/10 rounded-full blur-2xl"></div>

          <div className="flex items-center justify-between text-xs text-white/70 mb-1">
            <span>
              {paystubData.staffName} · {paystubData.currentMonth}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FF9500]/20 text-[#FFB400] font-semibold text-[10px]">
              {paystubData.level}
            </span>
          </div>

          <div className="mt-2">
            <span className="text-xs text-white/60 font-medium">Tổng Thu Nhập Tạm Tính</span>
            <div className="text-3xl font-extrabold text-[#FFB400] mt-0.5 tabular-nums tracking-tight">
              {new Intl.NumberFormat('vi-VN').format(paystubData.totalEstimatedEarnings)}đ
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/80">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> +18% so với cùng kỳ tháng trước
            </span>
            <span className="text-[11px] text-white/60">Cập nhật lúc 17:30</span>
          </div>
        </div>

        {/* Breakdown List */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
            Chi Tiết Các Khoản Thu Nhập
          </h3>

          <div className="bg-white rounded-xl border border-[#E5E5EA] divide-y divide-[#E5E5EA] overflow-hidden shadow-xs">
            {paystubData.breakdown.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[#F9F9FB] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-[#F2F2F7] flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${item.color} stroke-[2]`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1C1C1E]">{item.title}</div>
                      <div className="text-[11px] text-[#8E8E93] mt-0.5">{item.desc}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-[#1C1C1E] tabular-nums">
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
              Lịch Sử Tiền Tip Gần Đây (CV 70%)
            </h3>
            <span className="text-[11px] text-[#8E8E93]">Ngưỡng $\ge$ 20.000đ</span>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E5EA] divide-y divide-[#E5E5EA] overflow-hidden shadow-xs">
            {paystubData.recentTippedOrders.map((tip, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1C1C1E]">{tip.customer}</div>
                  <div className="text-[11px] text-[#8E8E93]">
                    {tip.service} · {tip.time}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600 tabular-nums">
                    +{new Intl.NumberFormat('vi-VN').format(tip.share)}đ
                  </div>
                  <div className="text-[10px] text-[#8E8E93]">
                    Khách tip {new Intl.NumberFormat('vi-VN').format(tip.tip)}đ
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
