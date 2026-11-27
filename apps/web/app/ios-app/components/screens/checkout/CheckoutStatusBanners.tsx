'use client';

import React from 'react';
import { Clock3, GraduationCap, Lock } from 'lucide-react';
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
  isPendingCounterSettlement?: boolean;
  canDirectCounterSettle?: boolean;
  pendingGrandTotal?: number;
  pendingTipAmount?: number;
  pendingPaymentMethod?: string;
}

function formatPendingPaymentMethodLabel(method?: string): string {
  switch (String(method || '').toUpperCase()) {
    case 'CASH':
      return 'Tiền mặt';
    case 'POS':
      return 'Quẹt thẻ POS';
    case 'MIXED':
      return 'Thanh toán hỗn hợp';
    case 'VIETQR':
      return 'VietQR';
    default:
      return 'Tiền mặt / POS';
  }
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
  isPendingCounterSettlement,
  canDirectCounterSettle,
  pendingGrandTotal = 0,
  pendingTipAmount = 0,
  pendingPaymentMethod,
}: CheckoutStatusBannersProps) {
  const pendingMethodLabel = formatPendingPaymentMethodLabel(pendingPaymentMethod);
  const formattedPendingTotal = `${Math.max(0, Math.round(pendingGrandTotal)).toLocaleString('vi-VN')}đ`;
  const pendingTipSuffix =
    pendingTipAmount > 0 ? ` (gồm Tip ${Math.round(pendingTipAmount).toLocaleString('vi-VN')}đ)` : '';

  return (
    <>
      {!isSettled && isPendingCounterSettlement && (
        <div
          data-testid="checkout-pending-counter-banner"
          className={`rounded-2xl border p-3 text-xs flex items-start gap-2.5 shadow-2xs ${
            isDark
              ? 'bg-amber-950/45 border-amber-700/60 text-amber-100'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <Clock3 className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
          <div className="leading-relaxed">
            <strong className="block text-[12px] font-bold">ĐANG CHỜ QUẦY CHỐT (APP CŨ Ở CHECKOUT)</strong>
            <span className="text-[11px] opacity-90">
              {canDirectCounterSettle
                ? `Đơn đang chờ Quầy thu ${pendingMethodLabel} ${formattedPendingTotal}${pendingTipSuffix}. Bấm nút "Xác Nhận Thu..." bên dưới để chốt Completed và out khách đồng bộ trên WingsBeauty.`
                : `Đơn đã lưu ${formattedPendingTotal}${pendingTipSuffix} bằng ${pendingMethodLabel} trên mOS nhưng cần Quầy/CC xác nhận thu tiền, nên app cũ (WingsBeauty) giữ ở trạng thái CheckOut cho tới khi Quầy bấm chốt. Nếu khách chuyển khoản, có thể chọn VietQR để đơn tự hoàn tất ngay.`}
            </span>
          </div>
        </div>
      )}
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
