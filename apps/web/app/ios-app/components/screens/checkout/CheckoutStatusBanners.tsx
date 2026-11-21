'use client';

import React from 'react';
import { GraduationCap, Lock } from 'lucide-react';
import { CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';

export interface CheckoutStatusBannersProps {
  isDark: boolean;
  isSettled: boolean;
  showStaffRewards: boolean;
  isTrainingCvlOrder?: boolean;
  actorTier?: string;
  assignedStaff: string;
  trainingMentorName?: string;
  dualComboTotalBonus: number;
}

export function CheckoutStatusBanners({
  isDark,
  isSettled,
  showStaffRewards,
  isTrainingCvlOrder,
  actorTier,
  assignedStaff,
  trainingMentorName,
  dualComboTotalBonus,
}: CheckoutStatusBannersProps) {
  return (
    <>
      {isSettled && (
        <div
          className={`rounded-2xl border p-3 text-xs flex items-center gap-2.5 shadow-2xs ${
            isDark
              ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="leading-relaxed">
            <strong className="block text-[12px] font-bold">ĐƠN HÀNG ĐÃ CHỐT THANH TOÁN (COMPLETED)</strong>
            <span className="text-[11px] opacity-90">
              Mọi thông tin dịch vụ, khuyến mãi, cấn trừ Kim Cương và thanh toán đã được khóa sổ, không thể chỉnh sửa.
            </span>
          </div>
        </div>
      )}
      {showStaffRewards && isTrainingCvlOrder && actorTier === 'CC' && (
        <div
          className={`rounded-2xl border p-3 text-xs ${
            isDark
              ? 'bg-amber-950/40 border-amber-700/50 text-amber-100'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2 font-bold">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Ca Đào Tạo</span>
              <CvFeather1Badge className="text-[11px] text-amber-500" />
              <span>{assignedStaff}</span>
            </span>
            {trainingMentorName && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300">
                Mentor: CC {trainingMentorName}
              </span>
            )}
          </div>
          <p className={`mt-1 leading-relaxed text-[11px] ${isDark ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
            100% thưởng Gói Combo
            {dualComboTotalBonus > 0 ? ` (+${dualComboTotalBonus.toLocaleString('vi-VN')}đ)` : ''}, Dưỡng mi &amp; +20%
            Tip ca này cộng trực tiếp cho <strong>{assignedStaff}</strong>. CC bấm Check-out giùm nhận{' '}
            <strong className="tabular-nums">0đ</strong> ca này &bull; Cuối tháng Mentor CC nhận{' '}
            <strong className="tabular-nums">1.000.000đ + 50%</strong> khi tỷ lệ Combo &ge; 20%.
          </p>
        </div>
      )}
    </>
  );
}
