import React from 'react';
import { CalendarDays, CircleCheck, CircleX, Clock3, MessageSquare, Phone, RefreshCw } from 'lucide-react';
import type {
  AcademyCampaignStatus,
  AcademyCampaignTouchpointOutcome,
  CreateAcademyCampaignTouchpointRequest,
} from '@mos-lab/shared';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { AppIcon, type StatusType } from '../../../../../components/ui';

export const ACADEMY_CAMPAIGN_STATUS_LABELS: Record<AcademyCampaignStatus, string> = {
  DRAFT: 'Nháp',
  SCHEDULED: 'Đã lên lịch',
  ACTIVE: 'Đang chạy',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Hoàn tất',
  ARCHIVED: 'Lưu trữ',
  DELETED: 'Đã xóa',
};

export const ACADEMY_CAMPAIGN_STATUS_TONES: Record<AcademyCampaignStatus, StatusType> = {
  DRAFT: 'default',
  SCHEDULED: 'processing',
  ACTIVE: 'success',
  PAUSED: 'warning',
  COMPLETED: 'purple',
  ARCHIVED: 'default',
  DELETED: 'error',
};

export const ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS: Record<AcademyCampaignTouchpointOutcome, string> = {
  SUCCESS: 'Đã kết nối',
  MESSAGED: 'Đã nhắn tin',
  FAILED: 'Không liên hệ được',
  LOST: 'Không phù hợp',
  CALLBACK: 'Hẹn gọi lại',
};

export const ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_TONES: Record<AcademyCampaignTouchpointOutcome, StatusType> = {
  SUCCESS: 'success',
  MESSAGED: 'processing',
  FAILED: 'warning',
  LOST: 'error',
  CALLBACK: 'purple',
};

export const ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_ICONS: Record<AcademyCampaignTouchpointOutcome, React.ReactNode> = {
  SUCCESS: <AppIcon icon={CircleCheck} />,
  MESSAGED: <AppIcon icon={MessageSquare} />,
  FAILED: <AppIcon icon={CircleX} />,
  LOST: <AppIcon icon={CircleX} />,
  CALLBACK: <AppIcon icon={Phone} />,
};

/** Mirrors the established Wings Lashes cadence, but each Academy campaign owns its own saved copy. */
export const DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS: CreateAcademyCampaignTouchpointRequest[] = [
  { key: 'd1', label: 'Chạm D1', icon: 'Smile', daysMin: 1, daysMax: 1, color: '#34ff1a', sortOrder: 1 },
  { key: 'd3', label: 'Chạm D3', icon: 'Handshake', daysMin: 3, daysMax: 3, color: '#2e1ac7', sortOrder: 2 },
  { key: 'd7', label: 'Chạm D7', icon: 'MessageCircle', daysMin: 7, daysMax: 7, color: '#d5fb13', sortOrder: 3 },
  { key: 'd14', label: 'Chạm D14', icon: 'Heart', daysMin: 14, daysMax: 14, color: '#d17d2e', sortOrder: 4 },
  { key: 'd21', label: 'Chạm D21', icon: 'Calendar', daysMin: 21, daysMax: 21, color: '#ff4d4f', sortOrder: 5 },
];

export const ACADEMY_CAMPAIGN_TOUCHPOINT_ICON_FALLBACK = <AppIcon icon={CalendarDays} />;

export const ACADEMY_CAMPAIGN_STATUS_OPTIONS = Object.entries(ACADEMY_CAMPAIGN_STATUS_LABELS)
  .filter(([status]) => status !== 'DELETED')
  .map(([value, label]) => ({ value, label }));

export const ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_OPTIONS = Object.entries(
  ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS
).map(([value, label]) => ({ value, label }));

export function formatCampaignDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return 'Không giới hạn thời gian';
  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const start = startDate ? dateFormatter.format(new Date(startDate)) : 'Chưa xác định';
  const end = endDate ? dateFormatter.format(new Date(endDate)) : 'Chưa xác định';
  return `${start} – ${end}`;
}

export function readAcademyUserRole() {
  if (typeof window === 'undefined') return '';
  try {
    return String(JSON.parse(window.localStorage.getItem('mos_user') || '{}').role || '')
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
}

export function isAcademyCampaignManager(role: string) {
  return (
    isAdminOrSuperAdminRole(role) ||
    String(role || '')
      .trim()
      .toLowerCase() === 'manager'
  );
}

export function getTouchpointOutcomeIcon(outcome: AcademyCampaignTouchpointOutcome | null | undefined) {
  if (!outcome) return <AppIcon icon={Clock3} />;
  return ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_ICONS[outcome] || <AppIcon icon={RefreshCw} />;
}
