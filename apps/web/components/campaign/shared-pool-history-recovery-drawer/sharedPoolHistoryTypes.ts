import type { SharedPoolRecoveryAction, SharedPoolRecoveryDto } from '@mos-lab/shared';

export interface SharedPoolHistoryRecoveryDrawerProps {
  open: boolean;
  onClose: () => void;
  campaignId: number;
  isAdmin: boolean;
  onDataChanged?: () => void;
}

export interface DriftConfirmationState {
  dto: SharedPoolRecoveryDto;
  message: string;
  currentStatus?: string;
  targetPreviousStatus?: string;
}

export interface SharedPoolSelectOption {
  label: string;
  value: string;
}

export interface QuickRecoveryActionOption {
  label: string;
  value: SharedPoolRecoveryAction;
}

export interface SharedPoolApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export const ACTION_FILTER_OPTIONS: readonly SharedPoolSelectOption[] = [
  { label: 'Tất cả thao tác', value: 'ALL' },
  { label: '🔒 Lock / Claim (Giữ data)', value: 'CLAIM' },
  { label: '🔓 Nhả Claim (Release)', value: 'RELEASE' },
  { label: '📞 Báo cáo cuộc gọi', value: 'CALL' },
  { label: '🎯 Chốt Booking', value: 'BOOKING' },
  { label: '♻️ Chờ quay lại (Recycle)', value: 'RECYCLE' },
  { label: '🚫 Đã loại (Excluded)', value: 'EXCLUDE' },
  { label: '👑 Can thiệp Quản lý', value: 'MANAGER' },
  { label: '↩️ Đã Khôi phục', value: 'RECOVERY' },
];

export const POOL_STATUS_SELECT_OPTIONS: readonly SharedPoolSelectOption[] = [
  { label: '🟢 Sẵn sàng (AVAILABLE)', value: 'AVAILABLE' },
  { label: '🟣 Chờ quay lại (RECYCLING)', value: 'RECYCLING' },
  { label: '⚪ Đã gọi (EXPLOITED)', value: 'EXPLOITED' },
  { label: '🔵 Đã chốt (BOOKED)', value: 'BOOKED' },
  { label: '🔴 Đã loại (EXCLUDED)', value: 'EXCLUDED' },
];

export const QUICK_RECOVERY_ACTION_OPTIONS: readonly QuickRecoveryActionOption[] = [
  { label: '🔓 Force Unlock (Xóa kẹt Lock / Claim)', value: 'FORCE_UNLOCK' },
  { label: '🟢 Khôi phục EXCLUDED → AVAILABLE', value: 'RESTORE_EXCLUDED' },
  { label: '♻️ Reset Recycle → AVAILABLE', value: 'RESET_RECYCLE' },
  { label: '⚙️ Đổi trạng thái Pool tùy chỉnh', value: 'RESET_POOL_STATUS' },
];
