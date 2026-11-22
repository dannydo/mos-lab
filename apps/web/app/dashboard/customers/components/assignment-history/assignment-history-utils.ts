import type { StatusType } from '~/components/ui';

export interface AssignmentActionBadge {
  label: string;
  status: StatusType;
  borderLeftClass: string;
}

export function getAssignmentActionBadge(item: SafeAny): AssignmentActionBadge {
  if (item.isUndone) {
    return { label: 'Đã hoàn tác', status: 'default', borderLeftClass: 'border-l-neutral-400' };
  }
  const action = item.actionType?.toUpperCase();
  switch (action) {
    case 'ACCEPT':
    case 'ACCEPT_ALLOCATION':
      return { label: 'Chấp nhận', status: 'success', borderLeftClass: 'border-l-emerald-500' };
    case 'DECLINE':
    case 'DECLINE_ALLOCATION':
      return { label: 'Từ chối', status: 'error', borderLeftClass: 'border-l-rose-500' };
    case 'EXPIRE':
    case 'EXPIRED':
      return { label: 'Hết hạn', status: 'orange', borderLeftClass: 'border-l-orange-500' };
    case 'RECALL':
    case 'RECALL_ALLOCATION':
    case 'REVOKE':
      return { label: 'Thu hồi', status: 'error', borderLeftClass: 'border-l-rose-500' };
    case 'TRANSFER':
      return { label: 'Chuyển Booker', status: 'processing', borderLeftClass: 'border-l-blue-500' };
    case 'RANDOM_SELECT':
    case 'RANDOM':
      return { label: 'Chọn ngẫu nhiên', status: 'purple', borderLeftClass: 'border-l-purple-500' };
    case 'ASSIGN':
    default:
      return { label: 'Phân bổ', status: 'success', borderLeftClass: 'border-l-emerald-500' };
  }
}

export const ASSIGNMENT_ACTION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ASSIGN', label: '🟢 Phân bổ' },
  { value: 'ACCEPT', label: '🟢 Chấp nhận' },
  { value: 'DECLINE', label: '🔴 Từ chối' },
  { value: 'EXPIRED', label: '🟠 Hết hạn' },
  { value: 'REVOKE', label: '🔴 Thu hồi' },
  { value: 'TRANSFER', label: '🔵 Chuyển' },
  { value: 'RANDOM', label: '🟣 Chọn ngẫu nhiên' },
  { value: 'UNDONE', label: '⚪ Đã hoàn tác' },
] as const;
