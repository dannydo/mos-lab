'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface IosStaffVisibilityToggleProps {
  showStaffRewards: boolean;
  onToggle: () => void;
  isDark: boolean;
  className?: string;
}

/**
 * Nút Con mắt thống nhất trên Header của 4 màn hình khách hàng nhìn chung
 * (Tư vấn, Upsell, Thanh toán, Hóa đơn).
 * Mặc định luôn TẮT (ẩn 100% tên nhân viên, In/Out, Ca Đào Tạo, thưởng & điểm nội bộ);
 * chỉ hiển thị khi nhân viên chủ động chạm để bật xem.
 */
export function IosStaffVisibilityToggle({
  showStaffRewards,
  onToggle,
  isDark,
  className = '',
}: IosStaffVisibilityToggleProps) {
  return (
    <button
      type="button"
      data-testid="ios-staff-visibility-toggle"
      aria-pressed={showStaffRewards}
      aria-label={
        showStaffRewards ? 'Ẩn thông tin nhân viên và thưởng nội bộ' : 'Hiện thông tin nhân viên và thưởng nội bộ'
      }
      title={
        showStaffRewards
          ? 'Đang hiện thông tin nhân viên & thưởng (Nhấn để ẩn)'
          : 'Đang ẩn thông tin nhân viên & thưởng (Nhấn để xem)'
      }
      onClick={onToggle}
      className={`p-1.5 rounded-full inline-flex items-center justify-center leading-none transition-all cursor-pointer active:scale-95 border ${
        showStaffRewards
          ? isDark
            ? 'text-amber-300 bg-amber-950/60 border-amber-500/50 shadow-2xs'
            : 'text-amber-900 bg-amber-100 border-amber-300 shadow-2xs'
          : isDark
            ? 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/70 border-neutral-800'
            : 'text-neutral-500 hover:text-neutral-800 bg-white/90 border-neutral-200'
      } ${className}`}
    >
      {showStaffRewards ? <EyeOff className="w-4 h-4 shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
    </button>
  );
}
