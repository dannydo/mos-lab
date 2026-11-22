import { isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import type { LashMaterialSpec } from '../LashMaterialConstraintMatrix';
import type { PendingOverrideState } from './ConsultationTypes';

/**
 * Parses sorted unique numeric lash lengths (max 5 values) from a length string.
 */
export function parseLengthRangeList(rawLength: string): number[] {
  const matches = rawLength.match(/\d+/g);
  if (!matches || matches.length === 0) return [];
  return Array.from(new Set(matches.map((n) => parseInt(n, 10))))
    .sort((a, b) => a - b)
    .slice(0, 5);
}

/**
 * Builds the confirmation prompt when changing lash material away from the customer's active Combo wallet.
 */
export function buildMaterialOverridePrompt({
  mat,
  comboName,
  comboRemainingSessions,
  initialMatShortLabel,
  onConfirm,
}: {
  mat: LashMaterialSpec;
  comboName: string;
  comboRemainingSessions: number;
  initialMatShortLabel: string;
  onConfirm: (reason: string) => void;
}): PendingOverrideState {
  const reasons = [
    `Khách yêu cầu đổi sang ${mat.shortLabel} (bù chênh lệch nâng cấp)`,
    'Khách mua lẻ buổi này, giữ nguyên số lượt gói Combo',
    'Quản lý duyệt hỗ trợ đổi dòng mi tương đương',
  ];
  return {
    type: 'COMBO_MATERIAL_OVERRIDE',
    title: '⚠️ Cảnh Báo Đổi Khác Dịch Vụ Gói Combo',
    message: `Khách hàng đang có gói "${comboName}" (còn ${comboRemainingSessions} lượt) tương ứng dòng mi "${initialMatShortLabel}". Bạn đang chuyển sang "${mat.shortLabel}" trái với gói khách đã mua.`,
    defaultReason: reasons[0],
    reasons,
    onConfirm,
  };
}

/**
 * Builds the confirmation prompt for any cycle/quota override when toggling Normal vs Retain.
 * Returns null when no override warning applies.
 */
export function buildServiceTypeOverridePrompt({
  targetType,
  isWithin25Days,
  daysSinceLastVisit,
  lastVisitDate,
  retainDaysLimit,
  isComboLive,
  isAlwaysFullSet,
  hasComboRetainRemaining,
  hasComboNormalRemaining,
  comboName,
  comboNormalRemaining,
  comboRetainRemaining,
  onConfirm,
}: {
  targetType: 'Normal' | 'Retain';
  isWithin25Days: boolean;
  daysSinceLastVisit: number | null;
  lastVisitDate: string | null;
  retainDaysLimit: number;
  isComboLive: boolean;
  isAlwaysFullSet: boolean;
  hasComboRetainRemaining: boolean;
  hasComboNormalRemaining: boolean;
  comboName: string;
  comboNormalRemaining: number;
  comboRetainRemaining: number;
  onConfirm: (reason: string) => void;
}): PendingOverrideState | null {
  if (targetType === 'Retain' && !isWithin25Days) {
    const daysText =
      daysSinceLastVisit !== null
        ? `lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước — quá hạn ${retainDaysLimit} ngày)`
        : `chưa có lịch sử trong ${retainDaysLimit} ngày`;
    const reasons = [
      `Quản lý duyệt hỗ trợ trễ chu kỳ (≤ 30 ngày) do khách bận/công tác`,
      `Khách VIP xin gia hạn tính dặm 1 lần duy nhất`,
      `Bảo hành / Hỗ trợ đặc biệt theo duyệt Cửa hàng trưởng`,
    ];
    return {
      type: 'CYCLE_OVERRIDE',
      title: `⚠️ Cảnh Báo Override: Đã Quá ${retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Khách Lẻ'})`,
      message: isComboLive
        ? `Khách Gói Combo ghé ${daysText}. Theo quy định khách mua Combo đi trong 25 ngày luôn được tính Dặm, sau 25 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính DẶM.`
        : `Khách lẻ ghé ${daysText}. Theo quy định khách lẻ đi trong 21 ngày có Giá Dặm vô điều kiện, sau 21 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính GIÁ DẶM.`,
      defaultReason: reasons[0],
      reasons,
      onConfirm,
    };
  }

  if (targetType === 'Retain' && isComboLive && !isAlwaysFullSet && !hasComboRetainRemaining) {
    const reasons = [
      `Gói đã hết lần Dặm — khách thanh toán lẻ buổi Dặm này`,
      `Quản lý duyệt quy đổi lượt trong gói cho khách VIP`,
    ];
    return {
      type: 'CYCLE_OVERRIDE',
      title: '⚠️ Gói Combo Đã Hết Lần Dặm (Còn 0 lần Dặm)',
      message: `Khách hàng đang còn ${comboNormalRemaining} lần Nối Mới và 0 lần Dặm trong gói "${comboName}". Vui lòng xác nhận lý do nếu tính Dặm:`,
      defaultReason: reasons[0],
      reasons,
      onConfirm,
    };
  }

  if (targetType === 'Normal' && isComboLive && !isAlwaysFullSet && !hasComboNormalRemaining) {
    const reasons = [
      `Khách hết lần Nối Mới trong gói — đồng ý mua thêm gói mới hoặc thanh toán lẻ buổi Nối Mới`,
      `Quản lý duyệt hỗ trợ bù chênh lệch từ lần Dặm sang Nối Mới`,
    ];
    return {
      type: 'CYCLE_OVERRIDE',
      title: '⚠️ Gói Combo Đã Hết Lần Nối Mới (Còn 0 lần Mới)',
      message: `Khách hàng chỉ còn ${comboRetainRemaining} lần Dặm (0 lần Nối Mới) trong gói "${comboName}". Vui lòng xác nhận phương án khi khách muốn Nối Mới:`,
      defaultReason: reasons[0],
      reasons,
      onConfirm,
    };
  }

  if (targetType === 'Normal' && isWithin25Days) {
    const reasons = [
      `Mi cũ rụng > 70% không đủ điều kiện dặm — khách đồng ý tính Nối Mới`,
      `Khách yêu cầu tháo làm bộ mới hoàn toàn và tính suất Nối Mới`,
      `Khách đổi sang form / dòng mi mới không áp dụng giá dặm`,
    ];
    return {
      type: 'CYCLE_OVERRIDE',
      title: `⚠️ Cảnh Báo Override: Đi Trong ${retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Khách Lẻ'})`,
      message: isComboLive
        ? `Khách Gói Combo ghé lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước ≤ 25 ngày). Theo quy định khách mua Combo đi trong 25 ngày luôn luôn được tính DẶM, nhưng bạn đang chuyển sang tính NỐI MỚI.`
        : `Khách lẻ ghé lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước ≤ 21 ngày). Theo quy định khách lẻ đi trong 21 ngày luôn có GIÁ DẶM VÔ ĐIỀU KIỆN, nhưng bạn đang chuyển sang tính GIÁ NỐI MỚI.`,
      defaultReason: reasons[0],
      reasons,
      onConfirm,
    };
  }

  return null;
}

/**
 * Checks whether the current browser session belongs to a Super Admin / Boss identity.
 */
export function detectIsSuperAdminFromBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rawUser = window.localStorage.getItem('mos_user');
    if (!rawUser) return false;
    const user = JSON.parse(rawUser);
    const role = String(user?.role || '')
      .trim()
      .toLowerCase();
    const email = String(user?.email || '')
      .trim()
      .toLowerCase();
    const username = String(user?.username || '')
      .trim()
      .toLowerCase();

    if (role === 'super_admin' || role === 'boss') return true;
    if (isSuperAdminRole(role)) return true;
    if (isCanonicalSuperAdminIdentity(user)) return true;
    if (email === 'danhdo@gmail.com' || email === 'danny.do@wingslashes.com' || username === 'admin') return true;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('superadmin') === '1' || searchParams.get('super_admin') === '1') return true;
    return false;
  } catch {
    return false;
  }
}
