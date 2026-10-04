'use client';

import React from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { LayoutDashboard, Users, Clock, DollarSign, Store, ChevronRight, Activity, ArrowUpRight } from 'lucide-react';

interface ScreenStoreDashboardProps {
  onSelectBooking?: (id: number) => void;
  onOpenSettings?: () => void;
}

export function ScreenStoreDashboard({ onSelectBooking, onOpenSettings }: ScreenStoreDashboardProps) {
  const storeMetrics = {
    todayRevenue: 24850000,
    totalCompleted: 18,
    inProgressCount: 5,
    waitingCount: 3,
    activeStaffCount: 8,
    occupancyRate: 85,
  };

  const activeBeds = [
    {
      bed: 'Giường 01',
      cv: 'Diễm Hương (CV+)',
      customer: 'Chị Quyên',
      service: 'Flawless 3D Design',
      status: 'IN_PROGRESS',
      timeElapsed: '45/75p',
    },
    {
      bed: 'Giường 02',
      cv: 'Thảo Ly (CV)',
      customer: 'Chị Mai Lan',
      service: 'Classic Tự Nhiên',
      status: 'IN_PROGRESS',
      timeElapsed: '30/60p',
    },
    {
      bed: 'Giường 03',
      cv: 'Kim Tuyến (CV)',
      customer: 'Chị Thu Hà',
      service: 'Volume Glamour',
      status: 'IN_PROGRESS',
      timeElapsed: '65/90p',
    },
    {
      bed: 'Giường 04',
      cv: 'Thu Thảo (CV)',
      customer: 'Chị Phương Anh',
      service: 'Uốn Mi Phủ Keratin',
      status: 'WAITING',
      timeElapsed: 'Đang check-in',
    },
    {
      bed: 'Giường 05',
      cv: 'Ngọc Bích (CV)',
      customer: 'Chị Hoàng Yến',
      service: 'Dặm Mi Thiết Kế',
      status: 'IN_PROGRESS',
      timeElapsed: '15/45p',
    },
    {
      bed: 'Giường 06',
      cv: 'Trống',
      customer: '--',
      service: 'Sẵn sàng đón khách',
      status: 'EMPTY',
      timeElapsed: '--',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <IosNavigationBar
        title="Quản Lý Salon (Store Manager)"
        rightAction={{
          label: 'Cài đặt',
          onClick: onOpenSettings || (() => {}),
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Salon Branch Header Card */}
        <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] rounded-2xl p-4 text-white shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-[#FF9500] text-black flex items-center justify-center font-bold text-lg shadow-sm">
              <Store className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold">Wings Lashes Chi Nhánh Quận 1</h2>
              <p className="text-xs text-white/70">123 Lê Thánh Tôn, Bến Nghé, Q.1</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Đang mở
          </span>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-xl p-3 border border-[#E5E5EA] shadow-xs">
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Doanh thu hôm nay</span>
              <DollarSign className="w-4 h-4 text-[#FF9500]" />
            </div>
            <div className="text-lg font-bold text-[#1C1C1E] tabular-nums">
              {new Intl.NumberFormat('vi-VN').format(storeMetrics.todayRevenue)}đ
            </div>
            <div className="text-[10px] text-emerald-600 font-medium flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12% so với hôm qua
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-[#E5E5EA] shadow-xs">
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Số ca hoàn tất</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-[#1C1C1E] tabular-nums">{storeMetrics.totalCompleted} ca</div>
            <div className="text-[10px] text-[#8E8E93] mt-1">{storeMetrics.inProgressCount} ca đang làm trên sàn</div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-[#E5E5EA] shadow-xs">
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Hiệu suất giường</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-600 tabular-nums">{storeMetrics.occupancyRate}%</div>
            <div className="text-[10px] text-[#8E8E93] mt-1">5/6 giường đang phục vụ</div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-[#E5E5EA] shadow-xs">
            <div className="flex items-center justify-between text-[#8E8E93] mb-1">
              <span className="text-[11px] font-medium">Chuyên Viên trực</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-[#1C1C1E] tabular-nums">{storeMetrics.activeStaffCount} bạn</div>
            <div className="text-[10px] text-[#8E8E93] mt-1">Đủ nhân lực theo định mức</div>
          </div>
        </div>

        {/* Live Salon Beds Overview */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              Theo Dõi Sàn Salon Trực Tiếp (Floor Beds)
            </h3>
            <span className="text-xs text-[#FF9500] font-medium">Xem sơ đồ</span>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E5EA] divide-y divide-[#E5E5EA] overflow-hidden shadow-xs">
            {activeBeds.map((b, idx) => (
              <div
                key={idx}
                className="p-3 flex items-center justify-between hover:bg-[#F9F9FB] transition-colors cursor-pointer"
                onClick={() => onSelectBooking?.(103)}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                      b.status === 'IN_PROGRESS'
                        ? 'bg-amber-100 text-amber-800'
                        : b.status === 'WAITING'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#1C1C1E]">{b.bed}</span>
                      <span className="text-[11px] text-[#8E8E93]">· {b.cv}</span>
                    </div>
                    <div className="text-xs text-[#3C3C43] font-medium">
                      {b.customer !== '--' ? `${b.customer} — ${b.service}` : 'Giường đang trống'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                      b.status === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : b.status === 'WAITING'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {b.timeElapsed}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
