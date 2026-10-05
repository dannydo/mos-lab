'use client';

import React from 'react';
import {
  CalendarCheck,
  Users,
  Plus,
  TrendingUp,
  MoreHorizontal,
  Home,
  FileText,
  Clock,
  LayoutDashboard,
  UserCheck,
  Banknote,
  Package,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';

export type IosUserRole = 'CC' | 'CV' | 'STORE' | 'INVENTORY';

interface IosTabBarProps {
  role?: IosUserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCenterPlusClick?: () => void;
  badgeCounts?: Record<string, number>;
}

export function IosTabBar({
  role = 'CC',
  activeTab,
  onTabChange,
  onCenterPlusClick,
  badgeCounts = {},
}: IosTabBarProps) {
  const renderBadge = (count?: number) => {
    if (!count || count <= 0) return null;
    return (
      <span className="absolute -top-1 -right-2 min-w-4.5 h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm leading-none tabular-nums">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <div className="w-full bg-white border-t border-[#E5E5EA] pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] select-none z-40 relative shadow-[0_-2px_10px_rgba(0,0,0,0.04)] flex-shrink-0">
      <div className="h-12 px-2 flex items-center justify-around relative">
        {/* VAI TRÒ 1: TƯ VẤN VIÊN (CC) */}
        {role === 'CC' && (
          <>
            {/* Tab 1: Booking */}
            <button
              onClick={() => onTabChange('booking')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
                activeTab === 'booking' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <div className="relative">
                <CalendarCheck className="w-5 h-5 mb-0.5 stroke-[2.2]" />
                {renderBadge(badgeCounts.booking)}
              </div>
              <span className="text-[10px] font-semibold leading-none">Booking</span>
            </button>

            {/* Tab 2: Customer */}
            <button
              onClick={() => onTabChange('customer')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'customer' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <Users className="w-5 h-5 mb-0.5 stroke-[2]" />
              <span className="text-[10px] font-medium leading-none">Customer</span>
            </button>

            {/* Tab 3: Center Elevated Button (+) */}
            <div className="w-14 flex items-center justify-center -mt-6">
              <button
                onClick={onCenterPlusClick}
                className="w-13 h-13 rounded-full bg-black text-[#FFB400] shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center justify-center active:scale-95 transition-transform border-[3px] border-white"
                title="Tạo lịch hẹn mới"
              >
                <Plus className="w-8 h-8 stroke-[3.5]" />
              </button>
            </div>

            {/* Tab 4: Target (iOS Swift ConfigTabBar.clientConsultantHomeVC) */}
            <button
              onClick={() => onTabChange('target')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'target' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <img
                src="/ios-assets/credit-icon.png"
                alt="Target"
                className={`w-5 h-5 mb-0.5 object-contain ${activeTab === 'target' ? '' : 'grayscale opacity-60'}`}
              />
              <span className="text-[10px] font-medium leading-none">Target</span>
            </button>

            {/* Tab 5: More */}
            <button
              onClick={() => onTabChange('more')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'more' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5 stroke-[2.5]" />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </>
        )}

        {/* VAI TRÒ 2: CHUYÊN VIÊN (CV) */}
        {role === 'CV' && (
          <>
            {/* CV Tab 1: Home */}
            <button
              onClick={() => onTabChange('home')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'home' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <Home className="w-5 h-5 mb-0.5 stroke-[2]" />
              <span className="text-[10px] font-medium leading-none">Home</span>
            </button>

            {/* CV Tab 2: Booking */}
            <button
              onClick={() => onTabChange('booking')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'booking' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <CalendarCheck className="w-5 h-5 mb-0.5 stroke-[2]" />
              <span className="text-[10px] font-medium leading-none">Booking</span>
            </button>

            {/* CV Tab 3: Staff Task */}
            <button
              onClick={() => onTabChange('task')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
                activeTab === 'task' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <div className="relative">
                <FileText className="w-5 h-5 mb-0.5 stroke-[2.2]" />
                {renderBadge(badgeCounts.task || 1)}
              </div>
              <span className="text-[10px] font-semibold leading-none">Staff Task</span>
            </button>

            {/* CV Tab 4: Shift */}
            <button
              onClick={() => onTabChange('shift')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'shift' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <Clock className="w-5 h-5 mb-0.5 stroke-[2]" />
              <span className="text-[10px] font-medium leading-none">Shift</span>
            </button>

            {/* CV Tab 5: More */}
            <button
              onClick={() => onTabChange('more')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'more' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5 stroke-[2.5]" />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </>
        )}

        {/* VAI TRÒ 3: QUẢN LÝ CỬA HÀNG (STORE) */}
        {role === 'STORE' && (
          <>
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'dashboard' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5 stroke-[2.2]" />
              <span className="text-[10px] font-semibold leading-none">Sàn Salon</span>
            </button>

            <button
              onClick={() => onTabChange('staff')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
                activeTab === 'staff' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <div className="relative">
                <UserCheck className="w-5 h-5 mb-0.5 stroke-[2]" />
                {renderBadge(badgeCounts.staff)}
              </div>
              <span className="text-[10px] font-medium leading-none">Nhân Sự</span>
            </button>

            <button
              onClick={() => onTabChange('cash')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'cash' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <Banknote className="w-5 h-5 mb-0.5 stroke-[2]" />
              <span className="text-[10px] font-medium leading-none">Chốt Sổ</span>
            </button>

            <button
              onClick={() => onTabChange('more')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'more' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5 stroke-[2.5]" />
              <span className="text-[10px] font-medium leading-none">Cài Đặt</span>
            </button>
          </>
        )}

        {/* VAI TRÒ 4: QUẢN LÝ KHO (INVENTORY) */}
        {role === 'INVENTORY' && (
          <>
            <button
              onClick={() => onTabChange('stock')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'stock' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <Package className="w-5 h-5 mb-0.5 stroke-[2.2]" />
              <span className="text-[10px] font-semibold leading-none">Tồn Kho</span>
            </button>

            <button
              onClick={() => onTabChange('dispense')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
                activeTab === 'dispense' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <div className="relative">
                <Layers className="w-5 h-5 mb-0.5 stroke-[2]" />
                {renderBadge(badgeCounts.dispense)}
              </div>
              <span className="text-[10px] font-medium leading-none">Cấp Phát</span>
            </button>

            <button
              onClick={() => onTabChange('orders')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'orders' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <ArrowLeftRight className="w-5 h-5 mb-0.5 stroke-[2]" />
              <span className="text-[10px] font-medium leading-none">Nhập/Xuất</span>
            </button>

            <button
              onClick={() => onTabChange('more')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'more' ? 'text-[#FF9500]' : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5 stroke-[2.5]" />
              <span className="text-[10px] font-medium leading-none">Kiểm Kê</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
