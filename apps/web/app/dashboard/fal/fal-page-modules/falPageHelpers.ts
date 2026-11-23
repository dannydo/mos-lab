import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { StatusType } from '~/components/ui';
import { getViewportSize } from '~/hooks/useResponsiveTier';
import {
  TRACE_DRAWER_MAX_WIDTH,
  TRACE_DRAWER_MIN_WIDTH,
  type FalCase,
  type FalDateRangeMode,
  type LedgerItem,
  type LedgerRole,
  type TraceService,
} from './falPageTypes';

dayjs.extend(isoWeek);

export function toWingsAvatarUrl(value?: string | null) {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value) || value.startsWith('data:')) return value.replace(/^http:\/\//, 'https://');
  return `https://wingslashes.com/${value.replace(/^\/+/, '')}`;
}

export function formatMoney(value: number) {
  return `${Math.round(value || 0).toLocaleString('vi-VN')}\u00A0đ`;
}

export function clampTraceDrawerWidth(value: number) {
  if (typeof window === 'undefined') return Math.max(TRACE_DRAWER_MIN_WIDTH, Math.min(TRACE_DRAWER_MAX_WIDTH, value));
  const availableWidth = Math.max(320, getViewportSize().width - 40);
  return Math.round(
    Math.max(Math.min(TRACE_DRAWER_MIN_WIDTH, availableWidth), Math.min(TRACE_DRAWER_MAX_WIDTH, availableWidth, value))
  );
}

export function originRule(rule: string) {
  if (rule === 'Fix') {
    return 'Ca gốc: chỉ CV chịu trách nhiệm. Toàn bộ ledger của CV ca gốc bị thu hồi; CC ca gốc giữ nguyên.';
  }
  if (rule === 'Adjust') {
    return 'Ca gốc: chỉ CC chịu trách nhiệm. Toàn bộ ledger của CC ca gốc bị thu hồi; CV ca gốc giữ nguyên.';
  }
  return 'Ca gốc giữ nguyên quyền lợi. Log là do khách thay đổi ý, không mặc định là lỗi của CC/CV.';
}

export function remediationRule(record: FalCase) {
  const minutes = record.fal?.totalMinutes;
  if (!minutes) return 'Chưa có đủ thời lượng thực tế: chưa cấp tua đầu và chưa được chốt quyền lợi tài chính.';
  const rotation =
    minutes <= 25 ? 'CV đã được cấp tua đầu ngay khi hoàn tất ca.' : 'CV trở về tua cuối theo luồng bình thường.';
  if (record.falRule === 'Log' && record.fal?.financialEligibility !== 'READY') {
    return `${rotation} Điểm và thưởng vẫn bị chặn cho đến khi Log được duyệt.`;
  }
  if (minutes <= 25) {
    return `${rotation} CV nhận 15 Chuối; CC nhận tổng 5 Chuối (CC IN khác CC OUT thì chia 50/50). Không cộng thưởng thường chồng lên.`;
  }
  return `${rotation} CC/CV chạy quyền lợi thường. Không cộng Chuối FAL.`;
}

export function rotationLabel(record: FalCase) {
  const priority = record.fal?.rotationPriority;
  if (priority?.status === 'CONSUMED') return `Đã dùng · đơn #${priority.consumedOrderId || '-'}`;
  if (priority?.status === 'EXPIRED') return 'Đã hết hiệu lực';
  if (priority?.status === 'READY') return 'Tua đầu · chờ khách kế tiếp';
  if (record.fal?.rotationMode === 'HEAD') return 'Theo rule: tua đầu · chưa có token';
  if (record.fal?.rotationMode === 'FINAL') return 'Tua cuối';
  return 'Chưa đủ dữ liệu tua';
}

export function ledgerEligibilityMeta(record: FalCase) {
  const eligibility = record.fal?.financialEligibility;
  if (eligibility === 'READY') {
    if (record.falRule === 'Log' && record.logExplanation?.ledgerStatus !== 'APPLIED') {
      return {
        color: 'blue',
        label: 'Đủ điều kiện · chờ ghi thưởng',
        help: 'Log đã được duyệt. Worker Wings sẽ ghi điểm, tiền hoặc Chuối vào staff_bonus trong tối đa 1 phút.',
      };
    }
    return {
      color: 'green',
      label: 'Đủ điều kiện ghi thưởng',
      help: 'Rule cho phép ghi quyền lợi tài chính. Hãy đối chiếu bút toán thực tế trong Trace.',
    };
  }
  if (eligibility === 'PENDING_LOG_APPROVAL') {
    return {
      color: 'gold',
      label: 'Chờ duyệt giải trình',
      help: 'Log chưa được duyệt nên chưa được phép ghi điểm, tiền hoặc Chuối. Tua CV vẫn chạy độc lập.',
    };
  }
  if (eligibility === 'REJECTED') {
    return {
      color: 'red',
      label: 'Từ chối · không ghi thưởng',
      help: 'Giải trình Log bị từ chối; ca này không có bút toán điểm, tiền hoặc Chuối.',
    };
  }
  if (eligibility === 'INVALID_DURATION') {
    return {
      color: 'orange',
      label: 'Thiếu/0 phút · không ghi thưởng',
      help: 'Thiếu servicing_minute hoặc cleaning_minute, hoặc tổng thời lượng bằng 0.',
    };
  }
  return {
    color: 'default',
    label: 'Chưa có dữ liệu điều kiện',
    help: 'API chưa trả về kết quả đánh giá tài chính; đây không phải xác nhận đã được hay mất thưởng.',
  };
}

export function getFalRuleStatus(rule?: string | null): StatusType {
  if (rule === 'Fix') return 'error';
  if (rule === 'Adjust') return 'orange';
  if (rule === 'Log') return 'processing';
  return 'default';
}

export function getLedgerRoleStatus(role: LedgerRole): StatusType {
  if (role === 'CV') return 'purple';
  if (role === 'CC') return 'processing';
  if (role === 'BK') return 'cyan';
  return 'default';
}

export function isSameStaffId(left?: number | null, right?: number | null) {
  return left != null && right != null && Number(left) === Number(right);
}

export function getLedgerRoles(item: LedgerItem, service: TraceService): LedgerRole[] {
  const roles: LedgerRole[] = [];
  if (isSameStaffId(item.staffId, service.bookerId)) roles.push('BK');
  if (isSameStaffId(item.staffId, service.ccInId) || isSameStaffId(item.staffId, service.ccOutId)) roles.push('CC');
  if (isSameStaffId(item.staffId, service.cvId)) roles.push('CV');
  return roles.length ? roles : ['Khác'];
}

export function getLedgerRole(item: LedgerItem, service: TraceService) {
  return getLedgerRoles(item, service)[0];
}

export function compareLedgerByRole(left: LedgerItem, right: LedgerItem, service: TraceService) {
  const rank: Record<string, number> = { BK: 0, CC: 1, CV: 2, Khác: 3 };
  const rankDiff = rank[getLedgerRole(left, service)] - rank[getLedgerRole(right, service)];
  return rankDiff || left.staffName.localeCompare(right.staffName, 'vi');
}

export function getOriginLedgerImpact(
  item: LedgerItem,
  service: TraceService,
  rule: string,
  remediationOrderServiceId: number
) {
  const roles = getLedgerRoles(item, service);
  const responsibleRole = rule === 'Fix' ? 'CV' : rule === 'Adjust' ? 'CC' : null;
  if (!responsibleRole || !roles.includes(responsibleRole)) {
    const isAdjustCvHistoricalMismatch =
      rule === 'Adjust' &&
      roles.includes('CV') &&
      item.bonusPoints === 0 &&
      item.cash === 0 &&
      item.positiveConfiguredRuleCount > 0 &&
      item.pointMultiplier > 0 &&
      item.cashMultiplier > 0;
    return isAdjustCvHistoricalMismatch
      ? 'Cần backfill — 0 trái rule Adjust'
      : roles.every((currentRole) => currentRole === 'Khác' || currentRole === 'BK')
        ? 'Không thuộc FAL'
        : 'Giữ nguyên';
  }
  return item.trackingKeys?.includes(`"next_order_service_id":"${remediationOrderServiceId}"`)
    ? `Đã thu hồi → #${remediationOrderServiceId}`
    : 'Cần kiểm tra thu hồi';
}

export function getFalDateBounds(dateRangeMode: FalDateRangeMode, selectedDate: Dayjs) {
  if (dateRangeMode === 'week') {
    return {
      dateFrom: selectedDate.startOf('isoWeek').format('YYYY-MM-DD'),
      dateTo: selectedDate.endOf('isoWeek').format('YYYY-MM-DD'),
    };
  }
  if (dateRangeMode === 'month') {
    return {
      dateFrom: selectedDate.startOf('month').format('YYYY-MM-DD'),
      dateTo: selectedDate.endOf('month').format('YYYY-MM-DD'),
    };
  }
  const day = selectedDate.format('YYYY-MM-DD');
  return { dateFrom: day, dateTo: day };
}

export function formatFalPeriodLabel(dateRangeMode: FalDateRangeMode, selectedDate: Dayjs) {
  if (dateRangeMode === 'month') return `Tháng ${selectedDate.format('MM/YYYY')}`;
  if (dateRangeMode === 'week') {
    return `Tuần ${selectedDate.isoWeek()} (${selectedDate.startOf('isoWeek').format('DD/MM')} - ${selectedDate
      .endOf('isoWeek')
      .format('DD/MM/YYYY')})`;
  }
  return selectedDate.format('DD/MM/YYYY');
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string' && response.data.message.trim()) {
      return response.data.message;
    }
  }
  return fallback;
}
